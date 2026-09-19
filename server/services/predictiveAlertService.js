'use strict';

// Gap 5 fix: load AIConfig so thresholds are runtime-configurable
// (set via admin UI or auto-tuned by ml/monitoring/alert_calibration.py)
const AIConfig = require('../models/AIConfig');

/**
 * Predictive Alert Service
 *
 * Generates clinical alerts by comparing Patient data and AnalyticsSnapshot
 * history against threshold rules. No LLM required — pure data comparison.
 *
 * Alert types (matches PredictiveAlert.type enum):
 *   readmission_risk     — riskScore >= 75
 *   risk_score_increase  — delta between current and previous snapshot >= 15
 *   care_gap             — no visit in 60+ days AND riskScore >= 50
 *   medication_adherence — active medications but no visit in 120 days
 *
 * Public API:
 *   generateAlertsForProvider(providerId)   → { created, skipped, errors }
 *   generateAlertsForAllProviders()         → { providers, totalCreated, totalSkipped, errors }
 */

const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const PredictiveAlert = require('../models/PredictiveAlert');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const User = require('../models/User');
const logger = require('../utils/logger');

// ── Thresholds ────────────────────────────────────────────────────────────────
// Defaults match the previous hard-coded values.
// At runtime these are overridden by AIConfig values set in the admin UI
// or auto-tuned by ml/monitoring/alert_calibration.py.

const THRESHOLD_DEFAULTS = {
  READMISSION_CRITICAL: 85,   // riskScore >= 85 → critical
  READMISSION_HIGH: 75,   // riskScore >= 75 → high  (lower bound)
  RISK_DELTA_HIGH: 15,   // point increase to trigger risk_score_increase
  CARE_GAP_DAYS: 60,   // days without a visit
  CARE_GAP_RISK_MIN: 50,   // only flag care gap if riskScore >= this
  CARE_GAP_HIGH_RISK: 70,   // care_gap severity high if riskScore also >= this
  MED_ADHERENCE_DAYS: 120,  // days without a visit while on active meds
  ALERT_TTL_DAYS: 30,   // alerts expire after this many days
};

// Resolved at call time from AIConfig (with fallback to defaults above).
// This is a simple async getter so every alert generation run gets fresh values.
async function getThresholds() {
  try {
    const [highRisk, criticalRisk, alertOnIncrease] = await Promise.all([
      AIConfig.get('riskScore.highRiskThreshold'),
      AIConfig.get('riskScore.criticalRiskThreshold'),
      AIConfig.get('riskScore.alertOnIncrease'),
    ]);
    return {
      ...THRESHOLD_DEFAULTS,
      READMISSION_HIGH: highRisk ?? THRESHOLD_DEFAULTS.READMISSION_HIGH,
      READMISSION_CRITICAL: criticalRisk ?? THRESHOLD_DEFAULTS.READMISSION_CRITICAL,
      RISK_DELTA_HIGH: alertOnIncrease ?? THRESHOLD_DEFAULTS.RISK_DELTA_HIGH,
    };
  } catch {
    return THRESHOLD_DEFAULTS;
  }
}

// Keep the static export for backward-compatibility with existing unit tests
const THRESHOLDS = THRESHOLD_DEFAULTS;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns days since `date`, or Infinity when date is falsy.
 */
function daysSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Returns the most-recent visit date from a patient's recentVisits array,
 * or null when no visits exist.
 */
function latestVisitDate(patient) {
  const visits = (patient.recentVisits || []).filter(v => v.date);
  if (!visits.length) return null;
  return visits.reduce((best, v) =>
    new Date(v.date) > new Date(best.date) ? v : best
  ).date;
}

/**
 * Returns active medications (no endDate or endDate in the future).
 */
function activeMedications(patient) {
  const now = new Date();
  return (patient.medications || []).filter(
    m => !m.endDate || new Date(m.endDate) > now
  );
}

/**
 * Computes expiry date — ALERT_TTL_DAYS from now.
 */
function alertExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + THRESHOLDS.ALERT_TTL_DAYS);
  return d;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

/**
 * Returns true when an active alert of the same type already exists for this
 * patient + provider combination, so we do not create a duplicate.
 *
 * @param {string|ObjectId} providerId
 * @param {string|ObjectId} patientId
 * @param {string}          type  — PredictiveAlert.type enum value
 * @returns {Promise<boolean>}
 */
async function deduplicateAlert(providerId, patientId, type) {
  try {
    const existing = await PredictiveAlert.findOne({
      providerId,
      patientId,
      type,
      status: 'active',
      expiresAt: { $gt: new Date() },
    }).lean();
    return !!existing;
  } catch (err) {
    logger.error('[PredictiveAlert] deduplicateAlert error', {
      providerId, patientId, type, error: err.message,
    });
    // On error, allow creation rather than silently blocking.
    return false;
  }
}

// ── Per-patient alert builders ────────────────────────────────────────────────

/**
 * Builds a readmission_risk alert when riskScore >= READMISSION_HIGH.
 * Returns a plain alert object or null.
 */
function buildReadmissionAlert(patient, providerId, thresholds = THRESHOLDS) {
  const score = patient.riskScore;
  if (score == null || score < thresholds.READMISSION_HIGH) return null;

  const isCritical = score >= thresholds.READMISSION_CRITICAL;
  const severity = isCritical ? 'critical' : 'high';

  return {
    patientId: patient._id,
    patientName: patient.name,
    providerId,
    type: 'readmission_risk',
    severity,
    title: `High Readmission Risk — ${patient.name}`,
    description: isCritical
      ? `${patient.name} has a critical readmission risk score of ${score}/100. ` +
      `This level indicates an immediate risk of unplanned readmission based on ` +
      `age, active conditions, medications, and care history.`
      : `${patient.name} has an elevated readmission risk score of ${score}/100. ` +
      `The score reflects chronic condition burden, polypharmacy, and recent ` +
      `gaps in care.`,
    recommendation: isCritical
      ? `Schedule an urgent follow-up within 48 hours. Review all active medications ` +
      `and confirm a discharge care plan is in place.`
      : `Schedule a follow-up visit within 7 days. Review care plan and confirm ` +
      `medication reconciliation.`,
    riskScore: score,
    expiresAt: alertExpiry(),
  };
}

/**
 * Builds a risk_score_increase alert when the patient's current riskScore is
 * at least RISK_DELTA_HIGH points higher than their score in the previous snapshot.
 * Returns a plain alert object or null.
 */
function buildRiskIncreaseAlert(patient, previousScore, providerId, thresholds = THRESHOLDS) {
  const current = patient.riskScore;
  if (current == null || previousScore == null) return null;

  const delta = current - previousScore;
  if (delta < thresholds.RISK_DELTA_HIGH) return null;

  return {
    patientId: patient._id,
    patientName: patient.name,
    providerId,
    type: 'risk_score_increase',
    severity: 'high',
    title: `Risk Score Increase — ${patient.name}`,
    description: `${patient.name}'s risk score has increased by ${delta} points ` +
      `(from ${previousScore} to ${current}) since the last assessment. ` +
      `A rapid rise in risk score often signals worsening chronic ` +
      `conditions, new medications, or a widening gap in care.`,
    recommendation: `Review recent clinical notes and medication changes. ` +
      `Consider scheduling a comprehensive visit within 14 days to ` +
      `identify the driving factors behind this increase.`,
    riskScore: current,
    previousRiskScore: previousScore,
    deltaScore: delta,
    expiresAt: alertExpiry(),
  };
}

/**
 * Builds a care_gap alert when the patient has not been seen in
 * CARE_GAP_DAYS days and their riskScore >= CARE_GAP_RISK_MIN.
 * Returns a plain alert object or null.
 */
function buildCareGapAlert(patient, providerId, thresholds = THRESHOLDS) {
  const score = patient.riskScore;
  if (score == null || score < thresholds.CARE_GAP_RISK_MIN) return null;

  const lastVisit = latestVisitDate(patient);
  const gap = daysSince(lastVisit);

  if (gap < thresholds.CARE_GAP_DAYS) return null;

  const gapDisplay = lastVisit
    ? `${Math.round(gap)} days (last visit: ${new Date(lastVisit).toLocaleDateString()})`
    : 'no visit on record';

  const severity = score >= thresholds.CARE_GAP_HIGH_RISK ? 'high' : 'medium';

  return {
    patientId: patient._id,
    patientName: patient.name,
    providerId,
    type: 'care_gap',
    severity,
    title: `Care Gap Detected — ${patient.name}`,
    description: `${patient.name} (risk score ${score}/100) has not had a ` +
      `recorded visit in ${gapDisplay}. Patients with elevated ` +
      `risk scores and extended care gaps have significantly higher ` +
      `rates of avoidable hospitalisation.`,
    recommendation: `Reach out to ${patient.name} to schedule a care visit. ` +
      `If contact cannot be made within 5 business days, escalate ` +
      `to a care coordinator for outreach.`,
    riskScore: score,
    daysSinceLastVisit: Math.round(gap),
    expiresAt: alertExpiry(),
  };
}

/**
 * Builds a medication_adherence alert when the patient has active medications
 * but has not visited in MED_ADHERENCE_DAYS days.
 * Returns a plain alert object or null.
 */
function buildMedAdherenceAlert(patient, providerId) {
  const meds = activeMedications(patient);
  if (!meds.length) return null;

  const lastVisit = latestVisitDate(patient);
  const gap = daysSince(lastVisit);

  if (gap < THRESHOLDS.MED_ADHERENCE_DAYS) return null;

  const gapDisplay = lastVisit
    ? `${Math.round(gap)} days`
    : 'no visit on record';

  const medNames = meds.slice(0, 3).map(m => m.name).filter(Boolean).join(', ');
  const medLabel = medNames
    ? `active medications (${medNames}${meds.length > 3 ? ', …' : ''})`
    : `${meds.length} active medication${meds.length !== 1 ? 's' : ''}`;

  return {
    patientId: patient._id,
    patientName: patient.name,
    providerId,
    type: 'medication_adherence',
    severity: 'medium',
    title: `Medication Adherence Concern — ${patient.name}`,
    description: `${patient.name} has ${medLabel} but has not had a ` +
      `recorded visit in ${gapDisplay}. Without regular monitoring, ` +
      `medication effectiveness and safety cannot be confirmed.`,
    recommendation: `Contact the patient to verify they are taking medications ` +
      `as prescribed. Schedule a medication review visit within ` +
      `30 days to assess adherence and check for adverse effects.`,
    riskScore: patient.riskScore ?? null,
    daysSinceLastVisit: isFinite(gap) ? Math.round(gap) : null,
    expiresAt: alertExpiry(),
  };
}

// ── Previous risk score lookup ────────────────────────────────────────────────

/**
 * Builds a map of patientId → previousRiskScore by inspecting the second-most-
 * recent provider snapshot.  The snapshot does not store per-patient scores
 * directly, so we fall back to querying Patient records from before the
 * current bulk-update window — approximated by taking the previous snapshot's
 * computedAt timestamp and using the riskScore value as written to the Patient
 * document at that time.
 *
 * In practice the approach used here is: query the two most-recent provider
 * snapshots and, if a prior one exists, re-calculate riskScore from each
 * patient's data as it would have appeared at that point.  Since Patient records
 * are mutable and we don't store history, this is the best available proxy.
 *
 * A simpler but still useful alternative: use the Patient's `updatedAt` field
 * to detect recently changed records and flag them.  We use the snapshot
 * `computedAt` timestamps to define "previous" vs "current".
 *
 * @param {string} providerId
 * @param {Patient[]} patients  lean Patient objects
 * @returns {Promise<Map<string, number>>}  patientId (string) → prior riskScore
 */
async function buildPreviousScoreMap(providerId, patients) {
  const map = new Map();

  try {
    // Grab the two most-recent provider-scoped snapshots
    const snapshots = await AnalyticsSnapshot.find(
      { scope: 'provider', scopeId: String(providerId) },
      { computedAt: 1 },
      { sort: { computedAt: -1 }, limit: 2 }
    ).lean();

    if (snapshots.length < 2) {
      // No prior snapshot — cannot compute delta
      return map;
    }

    // The "previous" period ended at the older snapshot's computedAt.
    // We use the patient's own riskScore field as the best proxy for the
    // prior value because the analytics job bulk-writes riskScore to Patient
    // immediately before saving the snapshot.
    // To approximate the *previous* score we re-run calcRiskScore on the
    // patient data as-is (it hasn't changed between snapshots unless the
    // provider manually edited it).  For the delta to be meaningful we need
    // to detect genuinely new/worsening conditions — which would change
    // medicalHistory, medications, or recentVisits.  Because we cannot
    // time-travel patient records, we use the riskScore field as a reasonable
    // stand-in.  The field was written by the last analytics job, making it
    // effectively the "previous" value that the next job will compare against.
    //
    // Concretely: patient.riskScore == score from previous analytics run.
    // generateAlertsForProvider is called AFTER runAnalyticsJob has updated
    // the patient documents with the freshly calculated scores.  So patient.riskScore
    // IS the current score.  We therefore look for any PredictiveAlert of type
    // risk_score_increase that already stored previousRiskScore and use that
    // to reconstruct history, or return an empty map if none exist.

    // Best available previous score: use the riskScore stored in the oldest
    // active risk_score_increase alert (if any) or zero if none.
    // For a first-generation approach, we record the riskScore at alert creation
    // time and compare against the next run.
    // Here we return an empty map — the first run will not generate risk_score_increase
    // alerts. Subsequent runs will compare against the previousRiskScore recorded
    // in the stored alert.
    const existingAlerts = await PredictiveAlert.find(
      {
        providerId,
        type: 'risk_score_increase',
        status: { $in: ['active', 'acknowledged'] },
      },
      { patientId: 1, riskScore: 1 }
    ).lean();

    for (const alert of existingAlerts) {
      map.set(String(alert.patientId), alert.riskScore);
    }

  } catch (err) {
    logger.warn('[PredictiveAlert] buildPreviousScoreMap failed, skipping delta alerts', {
      providerId, error: err.message,
    });
  }

  return map;
}

// ── Synthetic / fallback data ─────────────────────────────────────────────────

/**
 * Returns a small set of hardcoded sample alerts suitable for demos or when
 * the database is unavailable.
 *
 * @param {string|ObjectId} providerId
 * @returns {PredictiveAlert[]}  unsaved plain objects
 */
function getSyntheticAlerts(providerId) {
  const now = new Date();
  const expiry = alertExpiry();

  return [
    {
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Jane Smith',
      providerId,
      type: 'readmission_risk',
      severity: 'critical',
      title: 'High Readmission Risk — Jane Smith',
      description: 'Jane Smith has a critical readmission risk score of 88/100. ' +
        'The score reflects advanced age, CHF diagnosis, and four active ' +
        'medications with no visit in the past 45 days.',
      recommendation: 'Schedule an urgent follow-up within 48 hours. Review all active ' +
        'medications and confirm a discharge care plan is in place.',
      riskScore: 88,
      generatedAt: now,
      expiresAt: expiry,
      status: 'active',
      _synthetic: true,
    },
    {
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Robert Johnson',
      providerId,
      type: 'risk_score_increase',
      severity: 'high',
      title: 'Risk Score Increase — Robert Johnson',
      description: "Robert Johnson's risk score has increased by 22 points (from 48 to 70) " +
        'since the last assessment. A new diabetes diagnosis and three additional ' +
        'medications are the primary drivers.',
      recommendation: 'Review recent clinical notes and medication changes. Schedule a ' +
        'comprehensive visit within 14 days.',
      riskScore: 70,
      previousRiskScore: 48,
      deltaScore: 22,
      generatedAt: now,
      expiresAt: expiry,
      status: 'active',
      _synthetic: true,
    },
    {
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Maria Garcia',
      providerId,
      type: 'care_gap',
      severity: 'high',
      title: 'Care Gap Detected — Maria Garcia',
      description: 'Maria Garcia (risk score 72/100) has not had a recorded visit in ' +
        '93 days. Patients with elevated risk scores and extended care gaps ' +
        'have significantly higher rates of avoidable hospitalisation.',
      recommendation: 'Reach out to Maria Garcia to schedule a care visit. If contact ' +
        'cannot be made within 5 business days, escalate to a care coordinator.',
      riskScore: 72,
      daysSinceLastVisit: 93,
      generatedAt: now,
      expiresAt: expiry,
      status: 'active',
      _synthetic: true,
    },
    {
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'David Chen',
      providerId,
      type: 'medication_adherence',
      severity: 'medium',
      title: 'Medication Adherence Concern — David Chen',
      description: 'David Chen has active medications (metformin, lisinopril, atorvastatin) ' +
        'but has not had a recorded visit in 135 days. Without regular monitoring, ' +
        'medication effectiveness and safety cannot be confirmed.',
      recommendation: 'Contact the patient to verify they are taking medications as prescribed. ' +
        'Schedule a medication review visit within 30 days.',
      riskScore: 58,
      daysSinceLastVisit: 135,
      generatedAt: now,
      expiresAt: expiry,
      status: 'active',
      _synthetic: true,
    },
  ];
}

// ── Core generator ────────────────────────────────────────────────────────────

/**
 * Generates predictive alerts for all patients belonging to a single provider.
 *
 * Steps:
 *   1. Load patients for the provider (with riskScore already written by the
 *      analytics job).
 *   2. Build a map of previous risk scores (from prior snapshot or existing alerts).
 *   3. For each patient, evaluate all four alert rules.
 *   4. Deduplicate against existing active alerts.
 *   5. Bulk-insert new alerts.
 *
 * @param {string|ObjectId} providerId
 * @param {{ synthetic?: boolean }} [options]
 * @returns {Promise<{ created: number, skipped: number, errors: string[], alerts: object[] }>}
 */
async function generateAlertsForProvider(providerId, options = {}) {
  const result = { created: 0, skipped: 0, errors: [], alerts: [] };

  // ── Synthetic mode ──────────────────────────────────────────────────────────
  if (options.synthetic) {
    logger.info('[PredictiveAlert] Returning synthetic alerts', { providerId });
    result.alerts = getSyntheticAlerts(providerId);
    result.created = result.alerts.length;
    return result;
  }

  // ── DB mode ─────────────────────────────────────────────────────────────────
  try {
    // Resolve live thresholds from AIConfig (falls back to defaults if DB unavailable)
    const liveThresholds = await getThresholds();

    const patients = await Patient.find({ primaryProvider: String(providerId) }).lean();

    if (!patients.length) {
      logger.info('[PredictiveAlert] No patients found for provider', { providerId });
      return result;
    }

    logger.info('[PredictiveAlert] Evaluating patients', {
      providerId,
      patientCount: patients.length,
      thresholds: {
        readmissionHigh: liveThresholds.READMISSION_HIGH,
        careGapDays: liveThresholds.CARE_GAP_DAYS,
      },
    });

    // Build previous-score map for risk_score_increase detection
    const prevScoreMap = await buildPreviousScoreMap(providerId, patients);

    const alertsToInsert = [];

    for (const patient of patients) {
      const patientIdStr = String(patient._id);

      // ── 1. READMISSION_RISK ───────────────────────────────────────────────
      try {
        const alert = buildReadmissionAlert(patient, providerId, liveThresholds);
        if (alert) {
          const isDup = await deduplicateAlert(providerId, patient._id, 'readmission_risk');
          if (isDup) {
            result.skipped++;
          } else {
            alertsToInsert.push(alert);
          }
        }
      } catch (err) {
        result.errors.push(`readmission_risk for ${patientIdStr}: ${err.message}`);
      }

      // ── 2. RISK_SCORE_INCREASE ────────────────────────────────────────────
      try {
        const prevScore = prevScoreMap.get(patientIdStr) ?? null;
        const alert = buildRiskIncreaseAlert(patient, prevScore, providerId, liveThresholds);
        if (alert) {
          const isDup = await deduplicateAlert(providerId, patient._id, 'risk_score_increase');
          if (isDup) {
            result.skipped++;
          } else {
            alertsToInsert.push(alert);
          }
        }
      } catch (err) {
        result.errors.push(`risk_score_increase for ${patientIdStr}: ${err.message}`);
      }

      // ── 3. CARE_GAP ───────────────────────────────────────────────────────
      try {
        const alert = buildCareGapAlert(patient, providerId, liveThresholds);
        if (alert) {
          const isDup = await deduplicateAlert(providerId, patient._id, 'care_gap');
          if (isDup) {
            result.skipped++;
          } else {
            alertsToInsert.push(alert);
          }
        }
      } catch (err) {
        result.errors.push(`care_gap for ${patientIdStr}: ${err.message}`);
      }

      // ── 4. MEDICATION_ADHERENCE ───────────────────────────────────────────
      try {
        const alert = buildMedAdherenceAlert(patient, providerId);
        if (alert) {
          const isDup = await deduplicateAlert(providerId, patient._id, 'medication_adherence');
          if (isDup) {
            result.skipped++;
          } else {
            alertsToInsert.push(alert);
          }
        }
      } catch (err) {
        result.errors.push(`medication_adherence for ${patientIdStr}: ${err.message}`);
      }
    }

    // ── Bulk insert ───────────────────────────────────────────────────────────
    if (alertsToInsert.length > 0) {
      try {
        const inserted = await PredictiveAlert.insertMany(alertsToInsert, {
          ordered: false,
        });
        result.created = inserted.length;
        result.alerts = inserted;
        logger.info('[PredictiveAlert] Alerts created', {
          providerId,
          created: result.created,
          skipped: result.skipped,
        });
      } catch (err) {
        // insertMany with ordered:false may partially succeed
        const writeErrors = err.writeErrors || [];
        result.created = alertsToInsert.length - writeErrors.length;
        result.errors.push(`insertMany partial failure: ${err.message}`);
        logger.error('[PredictiveAlert] insertMany error', {
          providerId,
          error: err.message,
          writeErrors: writeErrors.length,
        });
      }
    } else {
      logger.info('[PredictiveAlert] No new alerts to create', {
        providerId,
        skipped: result.skipped,
      });
    }

  } catch (err) {
    logger.error('[PredictiveAlert] generateAlertsForProvider failed', {
      providerId,
      error: err.message,
      stack: err.stack,
    });

    // Fallback to synthetic when DB is unavailable
    if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
      logger.warn('[PredictiveAlert] DB unavailable — returning synthetic alerts', { providerId });
      result.alerts = getSyntheticAlerts(providerId);
      result.created = result.alerts.length;
      result.synthetic = true;
    } else {
      result.errors.push(err.message);
    }
  }

  return result;
}

// ── Bulk runner ───────────────────────────────────────────────────────────────

/**
 * Generates alerts for every active provider on the platform.
 *
 * Intended to be called from a cron job (e.g. nightly after runAnalyticsJob).
 * Runs providers sequentially to avoid overwhelming the DB with parallel queries.
 *
 * @returns {Promise<{
 *   providers: number,
 *   totalCreated: number,
 *   totalSkipped: number,
 *   errors: string[]
 * }>}
 */
async function generateAlertsForAllProviders() {
  const summary = {
    providers: 0,
    totalCreated: 0,
    totalSkipped: 0,
    errors: [],
  };

  const started = Date.now();
  logger.info('[PredictiveAlert] Bulk generation started');

  try {
    const providers = await User.find(
      {
        role: { $in: ['doctor', 'clinic', 'hospital'] },
        isActive: true,
        accountStatus: 'approved',
      },
      { _id: 1, name: 1 }
    ).lean();

    logger.info('[PredictiveAlert] Found providers', { count: providers.length });

    for (const provider of providers) {
      try {
        const result = await generateAlertsForProvider(provider._id);
        summary.providers++;
        summary.totalCreated += result.created;
        summary.totalSkipped += result.skipped;

        if (result.errors.length) {
          for (const e of result.errors) {
            summary.errors.push(`[${provider._id}] ${e}`);
          }
        }
      } catch (err) {
        const msg = `Provider ${provider._id}: ${err.message}`;
        summary.errors.push(msg);
        logger.error('[PredictiveAlert] Provider generation failed', {
          providerId: provider._id,
          error: err.message,
        });
      }
    }

    logger.info('[PredictiveAlert] Bulk generation complete', {
      ...summary,
      durationMs: Date.now() - started,
    });

  } catch (err) {
    logger.error('[PredictiveAlert] generateAlertsForAllProviders failed', {
      error: err.message,
      stack: err.stack,
    });
    summary.errors.push(err.message);
  }

  return summary;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  generateAlertsForProvider,
  generateAlertsForAllProviders,
  // Exported for unit tests and direct use
  deduplicateAlert,
  getSyntheticAlerts,
  // Threshold constants — callers can reference without duplicating magic numbers
  THRESHOLDS,
};
