/**
 * Phase 2 — Kafka Event Type Constants
 * =====================================
 * Single source of truth for every event key emitted from Express routes.
 * The Python consumer (ml/streaming/consumer.py) reads these same topic names
 * from settings.py — keep both in sync.
 *
 * Why constants instead of raw strings?
 *   - Typos in event names cause silent failures (producer sends, consumer never matches)
 *   - A single rename here ripples everywhere without grep-and-replace
 *   - Enables IDE autocomplete / static analysis
 */

const TOPICS = {
  PATIENT_EVENTS:     'clinictrust.patient.events',
  REFERRAL_EVENTS:    'clinictrust.referral.events',
  APPOINTMENT_EVENTS: 'clinictrust.appointment.events',
};

const EVENT_TYPES = {
  // Patient lifecycle
  PATIENT_UPDATED:    'patient.updated',
  PATIENT_CREATED:    'patient.created',

  // Referral lifecycle
  REFERRAL_STATUS_CHANGED: 'referral.status_changed',
  REFERRAL_CREATED:        'referral.created',

  // Appointment lifecycle
  APPOINTMENT_CREATED:   'appointment.created',
  APPOINTMENT_COMPLETED: 'appointment.completed',
};

module.exports = { TOPICS, EVENT_TYPES };
