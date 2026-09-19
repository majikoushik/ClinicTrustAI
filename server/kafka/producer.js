/**
 * Phase 2 — Kafka Producer (KafkaJS)
 * ====================================
 * Thin wrapper around KafkaJS that Express routes call to emit clinical events.
 *
 * Design decisions:
 *  1. Lazy connection — producer connects on first emit, not at module load.
 *     This avoids blocking the Express startup if Kafka isn't running yet.
 *
 *  2. Graceful degradation — if Kafka is unavailable (not installed, not running,
 *     network issue), emit() logs a warning and returns false.
 *     The HTTP response is NEVER blocked or errored due to Kafka.
 *
 *  3. Fire-and-forget from routes — routes call emit() without await.
 *     The async work happens inside a setImmediate so it never delays the response.
 *
 *  4. Message envelope — every message has a standard { type, payload, metadata }
 *     shape. The Python consumer pattern-matches on `type`.
 *
 * Usage in a route:
 *   const { emitPatientEvent } = require('../kafka/producer');
 *   // After Patient.findByIdAndUpdate():
 *   setImmediate(() => emitPatientEvent(patient._id.toString(), 'patient.updated', { riskScore: patient.riskScore }));
 */

const logger = require('../config/logger');
const { TOPICS } = require('./events');

let _kafka        = null;   // Kafka instance (KafkaJS)
let _producer     = null;   // Connected producer
let _connecting   = false;
let _available    = false;  // false until first successful connect

async function _getProducer() {
  if (_producer && _available) return _producer;
  if (_connecting)             return null;   // already trying — skip this emit

  _connecting = true;
  try {
    const { Kafka } = require('kafkajs');
    if (!_kafka) {
      _kafka = new Kafka({
        clientId: 'clinictrust-express',
        brokers:  (process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092').split(','),
        retry: { retries: 3, initialRetryTime: 200 },
        connectionTimeout: 3000,
        requestTimeout:    5000,
        logLevel: 2,  // WARN — suppress INFO noise from KafkaJS
      });
    }

    _producer = _kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    await _producer.connect();
    _available  = true;
    _connecting = false;
    logger.info('Kafka producer connected', { brokers: process.env.KAFKA_BOOTSTRAP_SERVERS });
    return _producer;
  } catch (err) {
    _connecting = false;
    _available  = false;
    logger.warn('Kafka producer unavailable — events will be skipped', { error: err.message });
    return null;
  }
}

/**
 * Core emit function.
 * Returns true on success, false on any failure (never throws).
 */
async function emit(topic, key, type, payload) {
  try {
    const producer = await _getProducer();
    if (!producer) return false;

    const message = {
      key,
      value: JSON.stringify({
        type,
        payload,
        metadata: {
          emittedAt:  new Date().toISOString(),
          service:    'express-api',
          schemaVersion: '1',
        },
      }),
    };

    await producer.send({ topic, messages: [message] });
    return true;
  } catch (err) {
    logger.warn('Kafka emit failed (non-fatal)', { topic, type, error: err.message });
    _available = false;  // force reconnect on next call
    _producer  = null;
    return false;
  }
}

// ── Typed helpers used by routes ──────────────────────────────────────────────

function emitPatientEvent(patientId, eventType, payload = {}) {
  return emit(TOPICS.PATIENT_EVENTS, patientId, eventType, { patientId, ...payload });
}

function emitReferralEvent(referralId, eventType, payload = {}) {
  return emit(TOPICS.REFERRAL_EVENTS, referralId, eventType, { referralId, ...payload });
}

function emitAppointmentEvent(appointmentId, eventType, payload = {}) {
  return emit(TOPICS.APPOINTMENT_EVENTS, appointmentId, eventType, { appointmentId, ...payload });
}

async function disconnectProducer() {
  if (_producer) {
    try { await _producer.disconnect(); } catch (_) {}
    _producer  = null;
    _available = false;
  }
}

module.exports = {
  emitPatientEvent,
  emitReferralEvent,
  emitAppointmentEvent,
  disconnectProducer,
};
