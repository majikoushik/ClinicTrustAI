const express = require('express');
const router = express.Router();
const Referral = require('../models/Referral');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { createReferralContract, updateReferralContract, verifyConsent } = require('../blockchain/contracts');
const { processTokenTransaction } = require('../blockchain/contracts');
const { ehiAudit } = require('../middleware/ehiAudit');
const { oncDeny } = require('../config/oncExceptions');
const logger = require('../utils/logger');
const {
  sendEmail,
  referralReceivedHtml, referralReceivedText,
  referralStatusUpdateHtml, referralStatusUpdateText,
} = require('../services/emailService');

// @route   POST api/referrals
// @desc    Create a new referral
// @access  Private (doctors, clinics, hospitals)
router.post('/', protect, authorize('doctor', 'clinic', 'hospital', 'provider'), ehiAudit('Referral', 'CREATE'), async (req, res) => {
  try {
    const {
      patientId,
      receivingProviderId,
      reason,
      urgency,
      notes,
      attachedRecords,
      appointmentDate
    } = req.body;

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Check if receiving provider exists
    const receivingProvider = await User.findById(receivingProviderId);
    if (!receivingProvider) {
      return res.status(404).json({ success: false, error: 'Receiving provider not found' });
    }

    // Check if user has permission to refer this patient
    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    let hasReferPermission = false;
    
    if (!isPrimaryProvider) {
      // Check blockchain for consent
      hasReferPermission = await verifyConsent(
        patient.patientId,
        req.user.id,
        'refer'
      );
      
      if (!hasReferPermission) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to refer this patient'
        });
      }
    }

    // Create new referral
    const referral = new Referral({
      patient: patientId,
      referringProvider: req.user.id,
      receivingProvider: receivingProviderId,
      reason,
      urgency: urgency || 'routine',
      notes,
      attachedRecords: attachedRecords || [],
      appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
      billing: {
        status: 'pending'
      }
    });

    // Create referral contract on blockchain
    const blockchainReferral = await createReferralContract(referral);

    // Update referral with blockchain data
    referral.billing.smartContractId = blockchainReferral.contractId;
    referral.billing.transactionId = blockchainReferral.transactionId;

    // Save referral to database
    await referral.save();
	
	// Phase 2: emit Kafka event for ML consumer (fire-and-forget)
    setImmediate(() => {
      try {
        const { emitReferralEvent } = require('../kafka/producer');
        const { EVENT_TYPES }       = require('../kafka/events');
        emitReferralEvent(referral._id.toString(), EVENT_TYPES.REFERRAL_STATUS_CHANGED, {
          status:    referral.status,
          patientId: referral.patient?.toString(),
        });
      } catch (_) {}
    });

    // Notify receiving provider — fire-and-forget, non-fatal
    setImmediate(async () => {
      try {
        const sender = await User.findById(req.user.id).select('name firstName organization specialty');
        const recipient = await User.findById(receivingProviderId).select('name firstName email');
        if (recipient && recipient.email) {
          const fromName = sender ? (sender.firstName || sender.name) : 'A colleague';
          const fromOrg  = sender ? sender.organization : '';
          const toName   = recipient.firstName || recipient.name;
          await sendEmail({
            to: recipient.email,
            subject: `New${referral.urgency !== 'routine' ? ` ${referral.urgency.toUpperCase()}` : ''} referral received from ${fromName}`,
            html: referralReceivedHtml({
              toName,
              fromName,
              fromOrg,
              specialty:       sender ? sender.specialty : '',
              urgency:         referral.urgency,
              referralId:      referral._id,
              reason:          referral.reason,
              appointmentDate: referral.appointmentDate,
            }),
            text: referralReceivedText({
              toName, fromName, fromOrg,
              specialty:       sender ? sender.specialty : '',
              urgency:         referral.urgency,
              referralId:      referral._id,
              reason:          referral.reason,
              appointmentDate: referral.appointmentDate,
            }),
            category: 'referral',
          });
        }
      } catch (emailErr) {
        logger.warn('Referral received email failed (non-fatal)', { error: emailErr.message, referralId: referral._id });
      }
    });

    res.status(201).json({
      success: true,
      data: referral,
      blockchainTransaction: blockchainReferral
    });
  } catch (error) {
    logger.error('Create referral error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/referrals/status-counts
// @desc    Get referral counts grouped by status for the current provider
// @access  Private
router.get('/status-counts', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const baseQuery = {
      $or: [{ referringProvider: userId }, { receivingProvider: userId }],
    };

    const [all, pending, accepted, completed, rejected, cancelled] = await Promise.all([
      Referral.countDocuments(baseQuery),
      Referral.countDocuments({ ...baseQuery, status: 'pending' }),
      Referral.countDocuments({ ...baseQuery, status: 'accepted' }),
      Referral.countDocuments({ ...baseQuery, status: 'completed' }),
      Referral.countDocuments({ ...baseQuery, status: 'rejected' }),
      Referral.countDocuments({ ...baseQuery, status: 'cancelled' }),
    ]);

    res.status(200).json({ success: true, data: { all, pending, accepted, completed, rejected, cancelled } });
  } catch (error) {
    logger.error('Status counts error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/referrals
// @desc    Get all referrals for the provider (sent or received)
// @access  Private (all healthcare providers)
router.get('/', protect, authorize('doctor', 'clinic', 'hospital', 'lab', 'provider'), ehiAudit('Referral', 'READ'), async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};

    // Filter by type (sent or received)
    if (type === 'sent') {
      query.referringProvider = req.user.id;
    } else if (type === 'received') {
      query.receivingProvider = req.user.id;
    } else {
      // Default: get both sent and received
      query.$or = [
        { referringProvider: req.user.id },
        { receivingProvider: req.user.id }
      ];
    }

    // Filter by status if provided (ignore 'all' sentinel)
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get referrals
    const referrals = await Referral.find(query)
      .populate('patient', 'patientId name dateOfBirth gender')
      .populate('referringProvider', 'name organization specialty')
      .populate('receivingProvider', 'name organization specialty')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: referrals.length,
      data: referrals
    });
  } catch (error) {
    logger.error('Get referrals error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/referrals/:id
// @desc    Get a single referral
// @access  Private (referring or receiving provider only)
router.get('/:id', protect, ehiAudit('Referral', 'READ'), async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('patient', 'patientId name dateOfBirth gender contactInfo')
      .populate('referringProvider', 'name organization specialty')
      .populate('receivingProvider', 'name organization specialty');
    
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }

    // Check if user is the referring or receiving provider
    const refId = referral.referringProvider?._id || referral.referringProvider;
    const recId = referral.receivingProvider?._id || referral.receivingProvider;
    if (
      refId?.toString() !== req.user.id &&
      recId?.toString() !== req.user.id
    ) {
      return oncDeny(res, 'GET /api/referrals/:id').status(403).json({
        success: false,
        error: 'You are not authorized to view this referral',
      });
    }

    res.status(200).json({
      success: true,
      data: referral
    });
  } catch (error) {
    logger.error('Get referral error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT api/referrals/:id/status
// @desc    Update referral status
// @access  Private (referring or receiving provider only)
router.put('/:id/status', protect, ehiAudit('Referral', 'UPDATE'), async (req, res) => {
  try {
    const { status, notes, diagnosis, treatment, followUpRecommendations } = req.body;
    
    const referral = await Referral.findById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }

    // Check if user is the referring or receiving provider
    const isReferringProvider = referral.referringProvider.toString() === req.user.id;
    const isReceivingProvider = referral.receivingProvider.toString() === req.user.id;
    
    if (!isReferringProvider && !isReceivingProvider) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update this referral'
      });
    }

    // Validate status transitions
    const validStatusTransitions = {
      pending: ['accepted', 'rejected', 'cancelled'],
      accepted: ['completed', 'cancelled'],
      completed: [],
      rejected: [],
      cancelled: []
    };

    if (!validStatusTransitions[referral.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from ${referral.status} to ${status}`
      });
    }

    // Update referral status on blockchain
    const updateData = { status };
    if (notes) updateData.notes = notes;
    if (diagnosis) updateData.diagnosis = diagnosis;
    if (treatment) updateData.treatment = treatment;
    if (followUpRecommendations) updateData.followUpRecommendations = followUpRecommendations;

    const blockchainUpdate = await updateReferralContract(
      referral.billing.transactionId,
      status,
      updateData
    );

    // Update referral in database
    referral.status = status;
    if (notes) referral.notes = notes;
    if (diagnosis) referral.diagnosis = diagnosis;
    if (treatment) referral.treatment = treatment;
    if (followUpRecommendations) referral.followUpRecommendations = followUpRecommendations;

    if (status === 'completed') {
      referral.completionDate = new Date();
      
      // Process token rewards for completed referrals
      try {
        // Earn rates from policy (DB-configurable); fall back to hardcoded defaults
        let referralSentReward = 5, referralAcceptedReward = 10;
        try {
          const TokenEarnPolicy = require('../models/TokenEarnPolicy');
          const policy = await TokenEarnPolicy.getSingleton();
          referralSentReward = policy.referralSent || 5;
          referralAcceptedReward = policy.referralAccepted || 10;
        } catch (_) {}

        // Reward tokens to both providers for completing the referral
        const referringTokens = await processTokenTransaction(
          'system',
          referral.referringProvider.toString(),
          referralSentReward,
          'Referral completion reward',
          { referralId: referral._id.toString() }
        );

        const receivingTokens = await processTokenTransaction(
          'system',
          referral.receivingProvider.toString(),
          referralAcceptedReward,
          'Referral handling reward',
          { referralId: referral._id.toString() }
        );

        // Update user token balances
        await User.findByIdAndUpdate(
          referral.referringProvider,
          { $inc: { tokenBalance: referralSentReward } }
        );

        await User.findByIdAndUpdate(
          referral.receivingProvider,
          { $inc: { tokenBalance: referralAcceptedReward } }
        );
        
        // Store token transaction IDs
        referral.billing.tokenTransactions = {
          referring: referringTokens.transactionId,
          receiving: receivingTokens.transactionId
        };
      } catch (tokenError) {
        logger.warn('Token reward error (non-fatal)', { error: tokenError.message, stack: tokenError.stack });
        // Continue even if token rewards fail
      }
    }

    await referral.save();

    // Notify the other party — fire-and-forget, non-fatal
    setImmediate(async () => {
      try {
        const actor     = await User.findById(req.user.id).select('name firstName organization specialty');
        const othererId = isReceivingProvider ? referral.referringProvider : referral.receivingProvider;
        const other     = await User.findById(othererId).select('name firstName email specialty');
        if (other && other.email) {
          const actorName  = actor ? (actor.firstName || actor.name) : 'Your colleague';
          const actorOrg   = actor ? actor.organization : '';
          const toName     = other.firstName || other.name;
          const specialty  = actor ? actor.specialty : '';
          const statusSubjects = {
            accepted:  `Referral accepted by ${actorName}`,
            rejected:  `Referral declined by ${actorName}`,
            completed: `Referral marked as completed by ${actorName}`,
            cancelled: `Referral has been cancelled`,
          };
          const html = referralStatusUpdateHtml({ toName, actorName, actorOrg, status, referralId: referral._id, specialty, notes });
          const text = referralStatusUpdateText({ toName, actorName, status, referralId: referral._id, specialty });
          if (html) {
            await sendEmail({
              to: other.email,
              subject: statusSubjects[status] || `Referral status updated to ${status}`,
              html,
              text,
              category: 'referral',
            });
          }
        }
      } catch (emailErr) {
        logger.warn('Referral status email failed (non-fatal)', { error: emailErr.message, referralId: referral._id, status });
      }
    });

    res.status(200).json({
      success: true,
      data: referral,
      blockchainTransaction: blockchainUpdate
    });
  } catch (error) {
    logger.error('Update referral status error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT api/referrals/:id/billing
// @desc    Update referral billing information
// @access  Private (receiving provider only)
router.put('/:id/billing', protect, async (req, res) => {
  try {
    const { amount, currency, insuranceClaim } = req.body;
    
    const referral = await Referral.findById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }

    // Check if user is the receiving provider
    if (referral.receivingProvider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the receiving provider can update billing information'
      });
    }

    // Update billing information
    referral.billing.amount = amount || referral.billing.amount;
    referral.billing.currency = currency || referral.billing.currency;
    
    if (insuranceClaim) {
      referral.billing.insuranceClaim = {
        ...referral.billing.insuranceClaim,
        ...insuranceClaim,
        submissionDate: insuranceClaim.submissionDate ? new Date(insuranceClaim.submissionDate) : new Date()
      };
    }

    // Update blockchain contract
    const blockchainUpdate = await updateReferralContract(
      referral.billing.transactionId,
      referral.status,
      { billing: referral.billing }
    );

    await referral.save();

    res.status(200).json({
      success: true,
      data: referral.billing,
      blockchainTransaction: blockchainUpdate
    });
  } catch (error) {
    logger.error('Update referral billing error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
