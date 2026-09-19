const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Referral = require('../models/Referral');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { createConsentRecord, verifyConsent } = require('../blockchain/contracts');
const { ehiAudit } = require('../middleware/ehiAudit');
const { oncDeny } = require('../config/oncExceptions');
const logger = require('../utils/logger');

// Patient._id is a plain string, normally set equal to patientId at creation
// (see POST / below) — but seed scripts (populate_db.js) can seed them with
// different internal _id / patientId values. The client always links via
// patientId, so resolve on either field rather than assuming they match.
const findPatientByAnyId = (id) => Patient.findOne({ $or: [{ _id: id }, { patientId: id }] });

// @route   POST api/patients
// @desc    Create a new patient record
// @access  Private (doctors, clinics, hospitals)
router.post(
  '/',
  protect,
  authorize('doctor', 'clinic', 'hospital'),
  ehiAudit('Patient', 'CREATE'),
  async (req, res) => {
    try {
      const {
        patientId,
        name,
        dateOfBirth,
        gender,
        contactInfo,
        insuranceInfo,
        medicalHistory,
        medications,
        allergies,
      } = req.body;

      const generatePatientId = async (fullName) => {
        const prefix = (fullName || 'PAT')
          .split(' ')[0]
          .replace(/[^a-zA-Z]/g, '')
          .toUpperCase()
          .slice(0, 3)
          .padEnd(3, 'X');
        for (let attempt = 0; attempt < 10; attempt++) {
          const digits = String(Math.floor(1000 + Math.random() * 9000));
          const id = `PT-${prefix}-${digits}`;
          if (!(await Patient.exists({ patientId: id }))) return id;
        }
        // Extremely unlikely fallback: append timestamp suffix
        return `PT-${prefix}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
      };

      const resolvedId = await generatePatientId(name);

      let patient = await Patient.findOne({ patientId: resolvedId });
      if (patient) {
        return res.status(400).json({ success: false, error: 'Patient already exists' });
      }

      patient = new Patient({
        _id: resolvedId,
        patientId: resolvedId,
        name,
        dateOfBirth,
        gender,
        contactInfo,
        primaryProvider: req.user.id,
        insuranceInfo,
        medicalHistory: medicalHistory || [],
        medications: medications || [],
        allergies: allergies || [],
      });

      await patient.save();
      res.status(201).json({ success: true, data: patient });
    } catch (error) {
      logger.error('Create patient error', logger.reqCtx(req, error));
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// @route   GET api/patients
// @desc    Get patients the provider has a care relationship with.
//          Access tiers:
//            1. Own patients  — primaryProvider === this provider
//            2. Referral access — receivingProvider on any referral for that patient
//            3. Consent access — explicit consentRecord (labs / other roles)
// @access  Private (all healthcare providers)
router.get(
  '/',
  protect,
  authorize('doctor', 'clinic', 'hospital', 'lab'),
  ehiAudit('Patient', 'READ'),
  async (req, res) => {
    try {
      const page  = parseInt(req.query.page)  || 0;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const { gender, riskLevel, sortBy = 'name', sortOrder = 'asc' } = req.query;

      const PROVIDER_ROLES = ['doctor', 'clinic', 'hospital'];

      // ── Build DB-level access filter ──────────────────────────────────────
      let accessFilter;

      if (PROVIDER_ROLES.includes(req.user.role)) {
        // Patients reachable via active referrals sent TO this provider
        const referralPatientIds = await Referral.distinct('patient', {
          receivingProvider: req.user.id,
        });

        accessFilter = {
          $or: [
            { primaryProvider: req.user.id },
            { _id: { $in: referralPatientIds } },
          ],
        };
      } else {
        // Lab / other roles: explicit consent only
        accessFilter = {
          consentRecords: {
            $elemMatch: {
              providerId: req.user.id,
              accessLevel: { $in: ['full', 'partial'] },
            },
          },
        };
      }

      // ── Combine access filter with optional search / gender / risk-level ──
      const andClauses = [accessFilter];

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        andClauses.push({
          $or: [
            { name: searchRegex },
            { patientId: searchRegex },
            { 'contactInfo.email': searchRegex },
          ],
        });
      }

      if (gender && gender !== 'all') {
        andClauses.push({ gender: new RegExp(`^${gender}$`, 'i') });
      }

      // Risk bands mirror the client's getRiskLevel(): high >=70, medium >=30, low <30
      if (riskLevel && riskLevel !== 'all') {
        const riskRange = {
          high:   { $gte: 70 },
          medium: { $gte: 30, $lt: 70 },
          low:    { $lt: 30 },
        }[riskLevel];
        if (riskRange) andClauses.push({ riskScore: riskRange });
      }

      const dbFilter = andClauses.length > 1 ? { $and: andClauses } : andClauses[0];

      // Whitelist sortable fields to prevent arbitrary field injection
      const sortFieldMap = {
        name: 'name',
        dateOfBirth: 'dateOfBirth',
        riskScore: 'riskScore',
        updatedAt: 'updatedAt',
        createdAt: 'createdAt',
      };
      const sortField = sortFieldMap[sortBy] || 'name';
      const sortDirection = sortOrder === 'desc' ? -1 : 1;

      const [patients, totalPatients] = await Promise.all([
        Patient.find(dbFilter)
          .select('-consentRecords')
          .sort({ [sortField]: sortDirection })
          .skip(page * limit)
          .limit(limit)
          .lean(),
        Patient.countDocuments(dbFilter),
      ]);

      return res.status(200).json({
        success: true,
        patients,
        pagination: {
          total: totalPatients,
          page,
          limit,
          pages: Math.ceil(totalPatients / limit),
        },
      });
    } catch (error) {
      logger.error('Get patients error', logger.reqCtx(req, error));
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// @route   GET api/patients/:id
// @desc    Get a single patient
// @access  Private — primary provider, referral-granted provider, admin, or consent holder
router.get('/:id', protect, ehiAudit('Patient', 'READ'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    let hasConsent = false;
    let hasReferralAccess = false;

    if (!isPrimaryProvider && !isAdmin) {
      // Check referral-granted access: any referral where this provider is the receiver
      hasReferralAccess = !!(await Referral.exists({
        patient: patient._id,
        receivingProvider: req.user.id,
      }));

      if (!hasReferralAccess) {
        hasConsent = await verifyConsent(patient.patientId, req.user.id, 'demographics');

        if (!hasConsent) {
          return oncDeny(res, 'GET /api/patients/:id').status(403).json({
            success: false,
            error: 'You do not have consent to access this patient record',
          });
        }
      }
    }

    // Resolve primaryProvider ID to a display name + org/specialty
    let primaryProviderName = patient.primaryProvider;
    let primaryProviderOrganization = '';
    let primaryProviderSpecialty = '';
    if (patient.primaryProvider) {
      const provider = await User.findById(patient.primaryProvider).select('name organization specialty').lean();
      if (provider) {
        primaryProviderName = provider.name;
        primaryProviderOrganization = provider.organization || '';
        primaryProviderSpecialty = provider.specialty || '';
      }
    }

    if (!isPrimaryProvider && !isAdmin && hasConsent && !hasReferralAccess) {
      const consentRecord = patient.consentRecords.find(
        (r) => r.providerId.toString() === req.user.id
      );

      if (consentRecord && consentRecord.accessLevel !== 'full') {
        const allowedFields = consentRecord.dataElements || [];
        const filteredPatient = {
          _id: patient._id, patientId: patient.patientId, name: patient.name,
          primaryProviderName, primaryProviderOrganization, primaryProviderSpecialty,
        };
        allowedFields.forEach((field) => {
          if (patient[field]) filteredPatient[field] = patient[field];
        });
        return res.status(200).json({
          success: true,
          data: filteredPatient,
          consentLevel: consentRecord.accessLevel,
        });
      }
    }

    const patientData = patient.toObject();
    patientData.primaryProviderName = primaryProviderName;
    patientData.primaryProviderOrganization = primaryProviderOrganization;
    patientData.primaryProviderSpecialty = primaryProviderSpecialty;

    res.status(200).json({
      success: true,
      data: patientData,
      consentLevel: isPrimaryProvider ? 'primary' : 'full',
    });
  } catch (error) {
    logger.error('Get patient error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT api/patients/:id
// @desc    Update a patient record
// @access  Private (primary provider or with edit consent)
router.put('/:id', protect, ehiAudit('Patient', 'UPDATE'), async (req, res) => {
  try {
    let patient = await findPatientByAnyId(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;

    if (!isPrimaryProvider) {
      const hasEditConsent = await verifyConsent(patient.patientId, req.user.id, 'edit');
      if (!hasEditConsent) {
        return oncDeny(res, 'PUT /api/patients/:id').status(403).json({
          success: false,
          error: 'You do not have consent to edit this patient record',
        });
      }
    }

    // Strip immutable/client-only fields before updating
    const { _id, __v, patientId, primaryProvider, primaryProviderName, createdAt, consentRecords, ...updateFields } = req.body;

    patient = await Patient.findByIdAndUpdate(
      patient._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
	
	// Phase 2: emit Kafka event so ML consumer can re-score in real time (fire-and-forget)
    setImmediate(() => {
      try {
        const { emitPatientEvent } = require('../kafka/producer');
        const { EVENT_TYPES }      = require('../kafka/events');
        emitPatientEvent(patient._id.toString(), EVENT_TYPES.PATIENT_UPDATED, {
          riskScore: patient.riskScore,
          patientId: patient.patientId,
        });
      } catch (_) {}
    });

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    logger.error('Update patient error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST api/patients/:id/consent
// @desc    Create a consent record for a patient
// @access  Private (primary provider only)
router.post('/:id/consent', protect, ehiAudit('Patient', 'CONSENT_GRANT'), async (req, res) => {
  try {
    const { providerId, accessLevel, dataElements, expiryDate } = req.body;

    const patient = await findPatientByAnyId(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    if (patient.primaryProvider.toString() !== req.user.id) {
      return oncDeny(res, 'POST /api/patients/:id/consent').status(403).json({
        success: false,
        error: 'Only the primary provider can create consent records',
      });
    }

    const blockchainConsent = await createConsentRecord(
      patient.patientId,
      providerId,
      accessLevel,
      dataElements,
      expiryDate ? new Date(expiryDate) : null
    );

    const consentRecord = {
      providerId,
      accessLevel,
      dataElements,
      consentDate: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      blockchainTransactionId: blockchainConsent.transactionId,
    };

    patient.consentRecords.push(consentRecord);
    await patient.save();

    res.status(201).json({
      success: true,
      data: consentRecord,
      blockchainTransaction: blockchainConsent,
    });
  } catch (error) {
    logger.error('Create consent error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id/medical-records
// @desc    Get all medical records for a patient
// @access  Private (with consent verification)
router.get('/:id/medical-records', protect, ehiAudit('Patient', 'READ'), async (req, res) => {
  try {
    const patient = await findPatientByAnyId(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const isPrimaryProvider = patient.primaryProvider.toString() === req.user.id;
    const isAdminRole = ['admin', 'superadmin'].includes(req.user.role);

    if (!isPrimaryProvider && !isAdminRole) {
      const hasReferral = !!(await Referral.exists({
        patient: patient._id,
        receivingProvider: req.user.id,
      }));

      if (!hasReferral) {
        const hasConsent = await verifyConsent(patient.patientId, req.user.id, 'medical_records');
        if (!hasConsent) {
          return oncDeny(res, 'GET /api/patients/:id/medical-records').status(403).json({
            success: false,
            error: "You do not have consent to access this patient's medical records",
          });
        }
      }
    }

    const medicalRecords = patient.medicalHistory.map((item) => ({
      id: item._id,
      patientId: patient._id,
      condition: item.condition,
      diagnosedDate: item.diagnosedDate,
      notes: item.notes,
      type: 'condition',
    }));

    const medicationRecords = patient.medications.map((item) => ({
      id: item._id,
      patientId: patient._id,
      name: item.name,
      dosage: item.dosage,
      frequency: item.frequency,
      startDate: item.startDate,
      endDate: item.endDate,
      type: 'medication',
    }));

    const allRecords = [...medicalRecords, ...medicationRecords].sort((a, b) => {
      const dateA = a.diagnosedDate || a.startDate;
      const dateB = b.diagnosedDate || b.startDate;
      return new Date(dateB) - new Date(dateA);
    });

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const paginatedRecords = allRecords.slice(page * limit, page * limit + limit);

    res.status(200).json({
      success: true,
      count: allRecords.length,
      data: {
        records: paginatedRecords,
        pagination: {
          total: allRecords.length,
          page,
          limit,
          pages: Math.ceil(allRecords.length / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get medical records error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id/consent-records
// @desc    Get all consent records for a patient
// @access  Private (primary provider only)
router.get('/:id/consent-records', protect, ehiAudit('Patient', 'READ'), async (req, res) => {
  try {
    const patient = await findPatientByAnyId(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    if (patient.primaryProvider.toString() !== req.user.id) {
      return oncDeny(res, 'GET /api/patients/:id/consent-records').status(403).json({
        success: false,
        error: 'Only the primary provider can view all consent records',
      });
    }

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;

    let filteredRecords = patient.consentRecords;
    if (req.query.status) {
      filteredRecords = patient.consentRecords.filter((record) => {
        const recordStatus =
          record.expiryDate && new Date(record.expiryDate) < new Date() ? 'expired' : 'active';
        return recordStatus === req.query.status;
      });
    }

    filteredRecords.sort((a, b) => new Date(b.consentDate) - new Date(a.consentDate));
    const paginatedRecords = filteredRecords.slice(page * limit, page * limit + limit);

    const formattedRecords = paginatedRecords.map((record) => ({
      id: record._id,
      patientId: patient._id,
      providerId: record.providerId,
      providerName: 'Provider Name',
      accessLevel: record.accessLevel,
      dataElements: record.dataElements,
      grantedAt: record.consentDate,
      expiresAt: record.expiryDate,
      status:
        record.expiryDate && new Date(record.expiryDate) < new Date() ? 'expired' : 'active',
      blockchainTransactionId: record.blockchainTransactionId,
    }));

    res.status(200).json({
      success: true,
      count: filteredRecords.length,
      data: {
        records: formattedRecords,
        pagination: {
          total: filteredRecords.length,
          page,
          limit,
          pages: Math.ceil(filteredRecords.length / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get consent records error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET api/patients/:id/export
// @desc    Export complete EHI record for a patient
// @access  Private (primary provider or admin)
//
// ONC 21st Century Cures Act — Information Blocking Rule
// This endpoint fulfils the requirement that health IT platforms provide an
// unblocked, machine-readable export of all EHI held for a patient on request.
// Access is restricted to the primary treating provider and administrators under
// the Privacy Exception (45 CFR § 171.202).
router.get('/:id/export', protect, ehiAudit('Patient', 'EXPORT'), async (req, res) => {
  try {
    logger.info('[EHI] export request', { patientId: req.params.id, userId: req.user?.id });

    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    logger.info('[EHI] patient found', { patientId: patient.patientId, primaryProvider: patient.primaryProvider });

    const isPrimaryProvider = patient.primaryProvider && patient.primaryProvider.toString() === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    logger.info('[EHI] access check', { isPrimaryProvider, isAdmin });

    if (!isPrimaryProvider && !isAdmin) {
      return oncDeny(res, 'GET /api/patients/:id/export').status(403).json({
        success: false,
        error:
          'EHI export is restricted to the primary treating provider or an administrator.',
      });
    }

    const patientInternalId = patient._id?.toString();
    logger.info('[EHI] querying referrals', { patientInternalId });
    const referrals = await Referral.find({
      $or: [
        { patient: patientInternalId },
        { patientId: patientInternalId },
      ],
    })
      .populate('referringProvider', 'name email specialty organization')
      .populate('receivingProvider', 'name email specialty organization');
    logger.info('[EHI] referrals found', { count: referrals.length });

    const exportBundle = {
      exportMetadata: {
        exportedAt:     new Date().toISOString(),
        exportedBy:     req.user.email,
        exportedByRole: req.user.role,
        platform:       'ClinicTrustAI',
        version:        '1.0',
        oncCompliance: {
          standard:      '21st Century Cures Act — Information Blocking Rule',
          regulation:    '45 CFR Part 171',
          exportFormat:  'JSON (FHIR R4 compatible structure)',
          auditLogged:   true,
        },
      },
      patient: {
        id:             patient._id,
        patientId:      patient.patientId,
        name:           patient.name,
        dateOfBirth:    patient.dateOfBirth,
        gender:         patient.gender,
        contactInfo:    patient.contactInfo,
        insuranceInfo:  patient.insuranceInfo,
        medicalHistory: patient.medicalHistory,
        medications:    patient.medications,
        allergies:      patient.allergies,
        riskScore:      patient.riskScore,
        consentRecords: patient.consentRecords,
        createdAt:      patient.createdAt,
        updatedAt:      patient.updatedAt,
      },
      referrals: referrals.map((r) => ({
        id:                      r._id,
        reason:                  r.reason,
        urgency:                 r.urgency,
        status:                  r.status,
        notes:                   r.notes,
        diagnosis:               r.diagnosis,
        treatment:               r.treatment,
        followUpRecommendations: r.followUpRecommendations,
        appointmentDate:         r.appointmentDate,
        completionDate:          r.completionDate,
        referringProvider:       r.referringProvider,
        receivingProvider:       r.receivingProvider,
        createdAt:               r.createdAt,
        updatedAt:               r.updatedAt,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ehi-export-${patient.patientId}-${Date.now()}.json"`
    );
    res.setHeader('X-ONC-Compliant',  'true');
    res.setHeader('X-ONC-Standard',   '21st-century-cures-act-information-blocking-rule');

    res.status(200).json({ success: true, data: exportBundle });
  } catch (error) {
    logger.error('[EHI] export error', logger.reqCtx(req, error));
    res.status(500).json({ success: false, error: 'Server error during EHI export', detail: error.message });
  }
});

module.exports = router;
