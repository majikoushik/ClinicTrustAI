const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Referral = require('../models/Referral');
const User = require('../models/User');
const appointmentSlotService = require('../services/appointmentSlotService');
const { processTokenTransaction } = require('../blockchain/contracts');
const { sendPatientNotification } = require('../services/patientEngagementService');
const { sendEmail, appointmentConfirmationHtml, appointmentConfirmationText } = require('../services/emailService');
const logger = require('../utils/logger');

const PROVIDER_TOKEN_REWARD = 15;

// GET /available-slots
router.get('/available-slots', async (req, res) => {
  try {
    const { providerId, startDate, endDate } = req.query;

    if (!providerId) {
      return res.status(400).json({ success: false, message: 'providerId is required' });
    }

    const today = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const slots = await appointmentSlotService.getAvailableSlots(
      providerId,
      startDate || today,
      endDate || defaultEnd
    );

    return res.json({ success: true, data: { slots, providerId } });
  } catch (err) {
    logger.error('available-slots error', { providerId: req.query.providerId, err: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /stats (provider's own stats)
router.get('/stats', async (req, res) => {
  try {
    const providerId = req.user._id;

    const appointments = await Appointment.find({ providerId });

    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const noShow = appointments.filter(a => a.status === 'no_show').length;
    const now = new Date();
    const upcoming = appointments.filter(
      a => new Date(a.scheduledDate) > now && ['scheduled', 'confirmed'].includes(a.status)
    ).length;

    const denominator = completed + noShow;
    const noShowRate = denominator > 0 ? Math.round((noShow / denominator) * 1000) / 10 : 0;

    return res.json({
      success: true,
      data: { total, completed, cancelled, noShow, upcoming, noShowRate }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /my-schedule (provider's appointments — day/week view)
router.get('/my-schedule', async (req, res) => {
  try {
    const { startDate, endDate, includeAll } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(defaultEnd.getDate() + 7);

    const rangeStart = startDate ? new Date(startDate) : today;
    const rangeEnd = endDate ? new Date(endDate) : defaultEnd;

    const filter = {
      providerId: req.user._id,
      scheduledDate: { $gte: rangeStart, $lte: rangeEnd }
    };

    if (!includeAll || includeAll !== 'true') {
      filter.status = { $nin: ['cancelled', 'no_show'] };
    }

    const appointments = await Appointment.find(filter).sort({ scheduledDate: 1, startTime: 1 });

    return res.json({
      success: true,
      data: { appointments, startDate: rangeStart, endDate: rangeEnd }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// GET / (patient's appointments)
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10, upcoming, past } = req.query;

    const filter = {
      $or: [{ patientId: req.user._id }, { patientId: req.user.patientId }]
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sort = {};

    if (upcoming === 'true') {
      filter.scheduledDate = { $gte: today };
      filter.status = { $nin: ['cancelled', 'no_show'] };
      sort = { scheduledDate: 1 };
    } else if (past === 'true') {
      filter.$or = [
        { scheduledDate: { $lt: today } },
        { status: { $in: ['completed', 'no_show', 'cancelled'] } }
      ];
      sort = { scheduledDate: -1 };
    } else {
      sort = { scheduledDate: 1 };
      if (status) filter.status = status;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter).sort(sort).skip(skip).limit(limitNum),
      Appointment.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: { appointments, total, page: pageNum, limit: limitNum }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST / (book appointment)
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientEmail,
      patientPhone,
      providerId,
      providerName,
      providerSpecialty,
      appointmentType,
      scheduledDate,
      startTime,
      endTime,
      durationMinutes,
      location,
      chiefComplaint,
      reasonForVisit,
      linkedReferralId,
      intakeResponses,
      organizationName
    } = req.body;

    if (!providerId || !scheduledDate || !startTime || !endTime || !appointmentType) {
      return res.status(400).json({
        success: false,
        message: 'providerId, scheduledDate, startTime, endTime, and appointmentType are required'
      });
    }

    const available = await appointmentSlotService.isSlotAvailable(
      providerId,
      scheduledDate,
      startTime,
      endTime
    );

    if (!available) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is no longer available. Please select another slot.'
      });
    }

    const appointment = await Appointment.create({
      patientId: patientId || req.user._id,
      patientName,
      patientEmail,
      patientPhone,
      providerId,
      providerName,
      providerSpecialty,
      appointmentType,
      scheduledDate,
      startTime,
      endTime,
      durationMinutes,
      location,
      chiefComplaint,
      reasonForVisit,
      linkedReferralId,
      intakeResponses,
      organizationName,
      createdBy: 'provider'
    });
	
	// Phase 2: emit Kafka event for ML consumer (fire-and-forget)
    setImmediate(() => {
      try {
        const { emitAppointmentEvent } = require('../kafka/producer');
        const { EVENT_TYPES }          = require('../kafka/events');
        emitAppointmentEvent(appointment._id.toString(), EVENT_TYPES.APPOINTMENT_CREATED, {
          patientId:       (patientId || req.user._id)?.toString(),
          providerId:      providerId?.toString(),
          appointmentType: appointmentType,
        });
      } catch (_) {}
    });

    // Move linked referral to accepted state
    if (linkedReferralId) {
      try {
        await Referral.findByIdAndUpdate(linkedReferralId, { status: 'accepted' });
      } catch (refErr) {
        logger.error('Referral status update error', logger.reqCtx(req, refErr));
      }
    }

    // Send confirmation email to patient (fire-and-forget — never blocks response)
    if (patientEmail) {
      const emailPayload = {
        patientName:       patientName || 'Patient',
        providerName:      providerName || '',
        providerSpecialty: providerSpecialty || '',
        appointmentType,
        scheduledDate,
        startTime,
        endTime,
        location,
        appointmentId:    appointment.appointmentId,
        organizationName: organizationName || '',
      };
      sendEmail({
        to:       patientEmail,
        subject:  `Appointment Confirmed — ${new Date(scheduledDate + (scheduledDate.includes('T') ? '' : 'T00:00:00Z')).toDateString()}`,
        html:     appointmentConfirmationHtml(emailPayload),
        text:     appointmentConfirmationText(emailPayload),
        category: 'appointment',
      }).catch(err => logger.error('Appointment confirmation email failed', { patientEmail, err: err.message }));
    }

    return res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const userId = req.user._id.toString();
    const isPatient = appointment.patientId && appointment.patientId.toString() === userId;
    const isProvider = appointment.providerId && appointment.providerId.toString() === userId;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isPatient && !isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, data: appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:id/check-in
router.post('/:id/check-in', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the provider can check in patients' });
    }

    appointment.status = 'checked_in';
    await appointment.save();

    return res.json({ success: true, data: appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// PUT /:id/cancel
router.put('/:id/cancel', async (req, res) => {
  try {
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const userId = req.user._id.toString();
    const isPatient = appointment.patientId && appointment.patientId.toString() === userId;
    const isProvider = appointment.providerId && appointment.providerId.toString() === userId;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isPatient && !isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an appointment with status '${appointment.status}'`
      });
    }

    const now = new Date();
    const scheduledAt = new Date(appointment.scheduledDate);
    const diffMs = scheduledAt - now;
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (diffMs < twoHoursMs && appointment.status === 'checked_in') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an appointment that is checked in and less than 2 hours away'
      });
    }

    appointment.status = 'cancelled';
    appointment.cancellationReason = cancellationReason;
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user._id;
    await appointment.save();

    return res.json({ success: true, data: appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id/reschedule
router.put('/:id/reschedule', async (req, res) => {
  try {
    const { newDate, newStartTime, newEndTime, reason } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const userId = req.user._id.toString();
    const isPatient = appointment.patientId && appointment.patientId.toString() === userId;
    const isProvider = appointment.providerId && appointment.providerId.toString() === userId;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isPatient && !isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const available = await appointmentSlotService.isSlotAvailable(
      appointment.providerId,
      newDate,
      newStartTime,
      newEndTime
    );

    if (!available) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is no longer available. Please select another slot.'
      });
    }

    if (!appointment.rescheduleHistory) {
      appointment.rescheduleHistory = [];
    }

    appointment.rescheduleHistory.push({
      fromDate: appointment.scheduledDate,
      fromStartTime: appointment.startTime,
      toDate: newDate,
      toStartTime: newStartTime,
      reason,
      changedBy: req.user.role,
      changedAt: new Date()
    });

    appointment.scheduledDate = newDate;
    appointment.startTime = newStartTime;
    appointment.endTime = newEndTime;
    appointment.status = 'rescheduled';
    await appointment.save();

    appointment.status = 'scheduled';
    await appointment.save();

    return res.json({ success: true, data: appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /:id/status (provider/admin update status)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, notes, outcomeNotes, diagnosis, followUpNeeded, followUpTimeframe } = req.body;

    const validTransitions = ['confirmed', 'checked_in', 'in_progress', 'completed', 'no_show'];

    if (!validTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validTransitions.join(', ')}`
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const isProvider = appointment.providerId && appointment.providerId.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the provider or admin can update appointment status' });
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;

    // Capture outcome fields when completing
    if (status === 'completed') {
      if (outcomeNotes) appointment.outcomeNotes = outcomeNotes;
      if (diagnosis) appointment.diagnosis = diagnosis;
      if (followUpNeeded !== undefined) appointment.followUpNeeded = followUpNeeded;
      if (followUpTimeframe) appointment.followUpTimeframe = followUpTimeframe;

      // Award provider tokens if not already done
      if (!appointment.tokenRewardIssued) {
        try {
          let reward = PROVIDER_TOKEN_REWARD;
          try {
            const TokenEarnPolicy = require('../models/TokenEarnPolicy');
            const policy = await TokenEarnPolicy.getSingleton();
            reward = policy.appointmentCompleted || PROVIDER_TOKEN_REWARD;
          } catch (_) {}
          await processTokenTransaction(
            'system',
            appointment.providerId.toString(),
            reward,
            'Appointment completion reward',
            { appointmentId: appointment._id.toString() }
          );
          await User.findByIdAndUpdate(appointment.providerId, {
            $inc: { tokenBalance: reward }
          });
          appointment.tokenRewardIssued = true;
          appointment.tokenRewardAmount = reward;
        } catch (tokenErr) {
          logger.error('Token reward error', logger.reqCtx(req, tokenErr));
        }
      }

      // Close linked referral
      if (appointment.linkedReferralId) {
        try {
          await Referral.findByIdAndUpdate(appointment.linkedReferralId, {
            status: 'completed',
            completionDate: new Date()
          });
        } catch (refErr) {
          logger.error('Referral closure error', logger.reqCtx(req, refErr));
        }
      }
    }

    if (status === 'no_show') {
      appointment.noShowMarkedAt = new Date();
    }

    await appointment.save();

    return res.json({ success: true, data: appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:id/reminder (send pre-visit reminder)
router.post('/:id/reminder', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const isProvider = appointment.providerId && appointment.providerId.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const apptDate = new Date(appointment.scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });

    try {
      await sendPatientNotification({
        patientEmail: appointment.patientEmail,
        patientPhone: appointment.patientPhone,
        title: 'Appointment Reminder',
        message: `This is a reminder for your ${appointment.appointmentType.replace('_', ' ')} appointment on ${apptDate} at ${appointment.startTime} with ${appointment.providerName}.`,
        channels: ['email', 'sms']
      });
    } catch (notifyErr) {
      logger.error('Reminder notification error', logger.reqCtx(req, notifyErr));
    }

    appointment.reminderSentAt = new Date();
    appointment.remindersSent.push({ type: 'reminder_24h', sentAt: new Date(), channel: 'email' });
    await appointment.save();

    return res.json({ success: true, message: 'Reminder sent successfully', data: appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    return res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
