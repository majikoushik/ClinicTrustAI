"""
Phase 2 — Real-time Streaming: Kafka Consumer
==============================================
Why real-time matters vs batch:
  Current pipeline: patient record changes → weekly retrain job → risk score updated
  Problem: a patient with 2 readmissions this week won't get a risk alert until Sunday.
  Real-time pipeline: patient updated → Kafka event → risk rescored in < 5 seconds.

Architecture:
  Express API (PUT /patients/:id)
      │ fire-and-forget, never blocks HTTP response
      ▼
  Kafka Topic: clinictrust.patient.events
      │
      ▼
  Python KafkaConsumer (this file)
      │ 1. Dedup check (Redis TTL 60s — skip duplicates)
      │ 2. Fetch full patient from MongoDB
      │ 3. Compute features (same logic as patient_features.py)
      │ 4. Write to Redis feature store (TTL 1h)
      │ 5. POST /score/risk → FastAPI ML server
      │ 6. If delta > RESCORE_DELTA_THRESHOLD: update MongoDB riskScore
      │ 7. If threshold crossed (30/70/85): generate fresh predictive alerts
      ▼
  MongoDB: riskScore updated, new predictive alerts created

Event schema (produced by server/kafka/producer.js):
  {
    "event_type": "patient.updated" | "patient.created" | ...,
    "patient_id": "ml-patient-42",
    "timestamp":  "2026-09-18T10:00:00Z",
    "changed_fields": ["medications", "recentVisits"],
    "source": "express_api"
  }

Deduplication:
  If the same patient generates multiple Kafka events within 60 seconds
  (e.g., rapid successive saves), only the first is processed.
  Redis key: dedup:patient:{id}  TTL: 60s
  This prevents thundering herd on busy patients.

Usage:
    # Start the consumer (runs until Ctrl-C)
    python ml/streaming/consumer.py

    # Dry-run: print events without taking action
    python ml/streaming/consumer.py --dry-run

    # Process a single mock event (for testing without Kafka)
    python ml/streaming/consumer.py --demo
"""

import sys
import json
import time
import signal
import logging
import argparse
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config.settings import (
    MONGODB_URI, DB_NAME,
    KAFKA_BOOTSTRAP_SERVERS, KAFKA_PATIENT_EVENTS_TOPIC,
    KAFKA_REFERRAL_EVENTS_TOPIC, KAFKA_CONSUMER_GROUP,
    ML_SERVING_URL,
    RESCORE_DELTA_THRESHOLD,
)
from feature_store.redis_store import get_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [consumer] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
DEDUP_TTL_SECONDS    = 60    # ignore duplicate events for the same patient within 1 min
RESCORE_TIMEOUT_S    = 5.0   # FastAPI /score/risk request timeout
MONGO_TIMEOUT_MS     = 3000  # MongoDB operation timeout
RISK_THRESHOLDS      = [30, 70, 85]   # crossing these triggers alert generation
ALERT_TYPES_ALL      = ["readmission_risk", "care_gap", "medication_adherence", "risk_score_increase"]


# ── Feature extraction (mirrors patient_features.py) ─────────────────────────

def _extract_features(patient: dict) -> dict:
    """
    Compute the same 45+ feature vector that patient_features.py produces.
    Kept as a standalone function here so the consumer has no circular imports.

    Critical design rule: this function MUST stay in sync with patient_features.py.
    If you change feature engineering there, update this too — or both will
    reference the same helper module (preferred, left as exercise).
    """
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    def days_since(date_val):
        if date_val is None:
            return 9999
        try:
            if isinstance(date_val, str):
                date_val = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
            if date_val.tzinfo is None:
                date_val = date_val.replace(tzinfo=timezone.utc)
            return max(0, (now - date_val).days)
        except Exception:
            return 9999

    age = patient.get("age", 0)
    if not age:
        dob = patient.get("dateOfBirth")
        if dob:
            try:
                if isinstance(dob, str):
                    dob = datetime.fromisoformat(dob.replace("Z", "+00:00"))
                if dob.tzinfo is None:
                    dob = dob.replace(tzinfo=timezone.utc)
                age = (now - dob).days // 365
            except Exception:
                age = 0

    # Condition analysis
    med_hx = patient.get("medicalHistory", [])
    CRIT_TERMS = {"metastatic","stage 4","stage iv","sepsis","end-stage","esrd","advanced heart failure","ejection fraction"}
    HIGH_TERMS = {"heart failure","chf","copd","chronic obstructive","stroke","cerebrovascular","chronic kidney","renal failure","cirrhosis","dementia","alzheimer","cancer","carcinoma","lymphoma"}
    MED_TERMS  = {"diabetes","hypertension","high blood pressure","atrial fibrillation","asthma","obesity","coronary artery","sleep apnea"}

    n_crit = n_high = n_med = 0
    has_diabetes = has_heart_failure = has_cancer = has_copd = has_ckd = has_htn = 0
    for h in med_hx:
        c = (h.get("condition") or "").lower()
        if any(t in c for t in CRIT_TERMS):  n_crit += 1
        elif any(t in c for t in HIGH_TERMS): n_high += 1
        elif any(t in c for t in MED_TERMS):  n_med  += 1
        if "diabetes" in c:        has_diabetes     = 1
        if "heart failure" in c or "chf" in c: has_heart_failure = 1
        if "cancer" in c or "carcinoma" in c: has_cancer = 1
        if "copd" in c or "chronic obstructive" in c: has_copd = 1
        if "kidney" in c or "renal" in c or "esrd" in c: has_ckd = 1
        if "hypertension" in c or "high blood pressure" in c: has_htn = 1

    # Medications
    meds = patient.get("medications", [])
    active_meds = [m for m in meds if m.get("active", True) and not m.get("endDate")]
    active_med_count = len(active_meds)
    med_names = [m.get("name", "").lower() for m in active_meds]
    ANTICOAG = {"warfarin","apixaban","rivaroxaban","dabigatran"}
    NSAID    = {"ibuprofen","naproxen","diclofenac","celecoxib"}
    has_anticoag = any(n in med_names for n in ANTICOAG)
    has_nsaid    = any(n in med_names for n in NSAID)

    # Allergies
    allergies = patient.get("allergies", [])
    severe_allergy_count = sum(1 for a in allergies if a.get("severity") == "Severe")

    # Visits
    visits = patient.get("recentVisits", [])
    visit_count = len(visits)
    days_last = 9999
    if visits:
        try:
            dates = [v.get("date") for v in visits if v.get("date")]
            if dates:
                latest = max(datetime.fromisoformat(str(d).replace("Z","+00:00")) if isinstance(d,str) else d for d in dates)
                if latest.tzinfo is None: latest = latest.replace(tzinfo=timezone.utc)
                days_last = max(0, (now - latest).days)
        except Exception:
            pass

    # Lab values — use latest panel
    lab_vals = patient.get("labValues", [])
    latest_lab = {}
    if lab_vals:
        try:
            sorted_labs = sorted(lab_vals, key=lambda l: l.get("date", ""), reverse=True)
            latest_lab = sorted_labs[0]
        except Exception:
            pass

    features = {
        "age":                     age,
        "age_ge_65":               int(age >= 65),
        "age_ge_75":               int(age >= 75),
        "condition_count":         len(med_hx),
        "critical_condition_count": n_crit,
        "high_condition_count":    n_high,
        "medium_condition_count":  n_med,
        "has_diabetes":            has_diabetes,
        "has_heart_failure":       has_heart_failure,
        "has_cancer":              has_cancer,
        "has_copd":                has_copd,
        "has_ckd":                 has_ckd,
        "has_hypertension":        has_htn,
        "diabetic_over_65":        int(has_diabetes and age >= 65),
        "comorbidity_2plus_high":  int((n_high + n_crit) >= 2),
        "active_med_count":        active_med_count,
        "polypharmacy_5_9":        int(5 <= active_med_count <= 9),
        "polypharmacy_10_plus":    int(active_med_count >= 10),
        "dangerous_drug_combo":    int(has_anticoag and has_nsaid),
        "severe_allergy_count":    severe_allergy_count,
        "visit_count":             visit_count,
        "days_since_last_visit":   days_last if days_last < 9999 else 730,
        "gap_over_365":            int(days_last > 365),
        "gap_180_365":             int(180 < days_last <= 365),
        "readmissionCount":        patient.get("readmissionCount", 0),
        "edVisitCount":            patient.get("edVisitCount", 0),
        "charlsonScore":           patient.get("charlsonScore", 0),
        # Lab features (None = missing → model handles as 0 via fillna)
        "egfr_latest":             latest_lab.get("egfr"),
        "bnp_latest":              latest_lab.get("bnp"),
        "hba1c_latest":            latest_lab.get("hba1c"),
        "creatinine_latest":       latest_lab.get("creatinine"),
        "ldl_latest":              latest_lab.get("ldl"),
        "troponin_latest":         latest_lab.get("troponin"),
        "haemoglobin_latest":      latest_lab.get("haemoglobin"),
        "glucose_latest":          latest_lab.get("glucose"),
        "sodium_latest":           latest_lab.get("sodium"),
        "potassium_latest":        latest_lab.get("potassium"),
        "wbc_latest":              latest_lab.get("wbc"),
    }
    return features


# ── Scoring helper ────────────────────────────────────────────────────────────

def _score_via_fastapi(features: dict, patient_id: str) -> Optional[float]:
    """POST to FastAPI /score/risk and return the predicted risk score."""
    import requests
    # Replace None with 0 — FastAPI /score/risk expects numeric inputs
    payload = {k: (v if v is not None else 0) for k, v in features.items()}
    try:
        resp = requests.post(
            f"{ML_SERVING_URL}/score/risk",
            json=payload,
            timeout=RESCORE_TIMEOUT_S,
        )
        resp.raise_for_status()
        return float(resp.json()["risk_score"])
    except Exception as e:
        logger.warning(f"FastAPI scoring failed for {patient_id}: {e}")
        return None


# ── MongoDB helpers ───────────────────────────────────────────────────────────

def _get_mongo_db():
    from pymongo import MongoClient
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=MONGO_TIMEOUT_MS)
    return client[DB_NAME]


def _fetch_patient(db, patient_id: str) -> Optional[dict]:
    try:
        doc = db["patients"].find_one(
            {"$or": [{"_id": patient_id}, {"patientId": patient_id}]}
        )
        return doc
    except Exception as e:
        logger.warning(f"MongoDB fetch failed for {patient_id}: {e}")
        return None


def _update_risk_score(db, patient_id: str, new_score: float):
    risk_level = "high" if new_score >= 70 else "medium" if new_score >= 30 else "low"
    try:
        db["patients"].update_one(
            {"$or": [{"_id": patient_id}, {"patientId": patient_id}]},
            {"$set": {
                "riskScore":  new_score,
                "riskLevel":  risk_level,
                "updatedAt":  datetime.now(timezone.utc),
                "_mlRescored": True,
            }},
        )
        logger.info(f"Patient {patient_id}: riskScore updated to {new_score} ({risk_level})")
    except Exception as e:
        logger.error(f"MongoDB update failed for {patient_id}: {e}")


def _crossed_threshold(old_score: float, new_score: float) -> bool:
    """True if the score crossed a clinically significant boundary."""
    for t in RISK_THRESHOLDS:
        if (old_score < t <= new_score) or (new_score < t <= old_score):
            return True
    return False


def _generate_alerts(db, patient: dict, new_score: float):
    """
    Insert fresh predictive alerts for a patient whose risk score just changed.
    Mirrors the logic in predictiveAlertService.js but called from Python.
    """
    patient_id   = str(patient.get("_id", patient.get("patientId", "")))
    provider_id  = patient.get("primaryProvider", "user-2")
    patient_name = patient.get("name", "Unknown")
    expiry       = datetime(now := datetime.now(timezone.utc).year,
                            datetime.now(timezone.utc).month,
                            datetime.now(timezone.utc).day + 30 if datetime.now(timezone.utc).day + 30 <= 28 else 28,
                            tzinfo=timezone.utc)

    alerts_to_insert = []

    if new_score >= 75:
        severity = "critical" if new_score >= 85 else "high"
        alerts_to_insert.append({
            "_id":          f"rt-alert-{patient_id}-{int(time.time())}",
            "patientId":    patient_id,
            "patientName":  patient_name,
            "providerId":   provider_id,
            "type":         "readmission_risk",
            "status":       "active",
            "severity":     severity,
            "title":        f"{'Critical' if severity=='critical' else 'High'} Readmission Risk — {patient_name}",
            "description":  f"Real-time rescore: risk score {new_score}/100.",
            "recommendation": "Schedule urgent follow-up within 48 hours." if severity=="critical" else "Schedule follow-up within 7 days.",
            "riskScore":    new_score,
            "wasActionTaken": False,
            "source":       "realtime_kafka_consumer",
            "generatedAt":  datetime.now(timezone.utc),
            "createdAt":    datetime.now(timezone.utc),
        })

    # Care gap alert if patient hasn't been seen recently
    visits = patient.get("recentVisits", [])
    if visits:
        try:
            latest = max(
                (v.get("date") for v in visits if v.get("date")),
                default=None,
            )
            if latest:
                if isinstance(latest, str):
                    latest = datetime.fromisoformat(latest.replace("Z", "+00:00"))
                if latest.tzinfo is None:
                    latest = latest.replace(tzinfo=timezone.utc)
                days_since = (datetime.now(timezone.utc) - latest).days
                if days_since >= 60 and new_score >= 40:
                    alerts_to_insert.append({
                        "_id":         f"rt-caregap-{patient_id}-{int(time.time())}",
                        "patientId":   patient_id,
                        "patientName": patient_name,
                        "providerId":  provider_id,
                        "type":        "care_gap",
                        "status":      "active",
                        "severity":    "high" if new_score >= 70 else "medium",
                        "title":       f"Care Gap — {patient_name}",
                        "description": f"Not seen in {days_since} days. Risk {new_score}/100.",
                        "recommendation": "Outreach to schedule visit within 5 business days.",
                        "riskScore":   new_score,
                        "daysSinceLastVisit": days_since,
                        "wasActionTaken": False,
                        "source":      "realtime_kafka_consumer",
                        "generatedAt": datetime.now(timezone.utc),
                        "createdAt":   datetime.now(timezone.utc),
                    })
        except Exception:
            pass

    if alerts_to_insert:
        try:
            db["predictivealerts"].insert_many(alerts_to_insert)
            logger.info(f"Generated {len(alerts_to_insert)} real-time alert(s) for {patient_id}")
        except Exception as e:
            logger.error(f"Alert insert failed for {patient_id}: {e}")


# ── Core event processor ──────────────────────────────────────────────────────

def process_event(event: dict, store, db, dry_run: bool = False) -> dict:
    """
    Process a single patient event from Kafka.

    Returns a result dict with: patient_id, action, old_score, new_score, delta.
    """
    patient_id  = event.get("patient_id") or event.get("patientId", "")
    event_type  = event.get("event_type", "unknown")
    result      = {"patient_id": patient_id, "event_type": event_type, "action": "skipped"}

    if not patient_id:
        logger.warning("Event missing patient_id — skipping.")
        return result

    # Deduplication: skip if we processed this patient recently
    if not store.set_dedup(patient_id, ttl_seconds=DEDUP_TTL_SECONDS):
        logger.debug(f"Duplicate event for {patient_id} within dedup window — skipping.")
        result["action"] = "deduplicated"
        return result

    logger.info(f"Processing {event_type} for patient {patient_id}")

    # Fetch patient
    patient = _fetch_patient(db, patient_id)
    if not patient:
        logger.warning(f"Patient {patient_id} not found in MongoDB.")
        result["action"] = "patient_not_found"
        return result

    old_score = float(patient.get("riskScore", 0))
    result["old_score"] = old_score

    # Extract features
    features = _extract_features(patient)

    if dry_run:
        logger.info(f"[DRY RUN] Would write features and score for {patient_id}")
        result["action"] = "dry_run"
        result["features_computed"] = len(features)
        return result

    # Write to feature store
    store.write(patient_id, features)

    # Score via FastAPI
    new_score = _score_via_fastapi(features, patient_id)
    if new_score is None:
        result["action"] = "scoring_failed"
        return result

    delta = abs(new_score - old_score)
    result.update({"new_score": new_score, "old_score": old_score, "delta": round(delta, 1)})

    # Update MongoDB if meaningful change
    if delta >= RESCORE_DELTA_THRESHOLD:
        _update_risk_score(db, patient_id, new_score)
        result["action"] = "rescored"

        # Generate alerts if threshold boundary crossed
        if _crossed_threshold(old_score, new_score):
            _generate_alerts(db, patient, new_score)
            result["alerts_generated"] = True
    else:
        result["action"] = "no_change"
        logger.debug(f"Patient {patient_id}: delta {delta:.1f} < threshold {RESCORE_DELTA_THRESHOLD} — no update.")

    return result


# ── Kafka consumer ────────────────────────────────────────────────────────────

class ClinicalEventConsumer:
    """
    Long-running Kafka consumer for ClinicTrust patient events.
    Gracefully handles: Kafka unavailability, MongoDB failures, Redis failures.
    """

    def __init__(self, dry_run: bool = False):
        self.dry_run     = dry_run
        self.store       = get_store()
        self.db          = _get_mongo_db()
        self._running    = False
        self._consumer   = None
        self._stats      = {
            "events_received": 0,
            "events_processed": 0,
            "events_skipped": 0,
            "rescored": 0,
            "errors": 0,
        }

    def _build_consumer(self):
        from kafka import KafkaConsumer
        topics = [KAFKA_PATIENT_EVENTS_TOPIC, KAFKA_REFERRAL_EVENTS_TOPIC]
        self._consumer = KafkaConsumer(
            *topics,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
            group_id=KAFKA_CONSUMER_GROUP,
            auto_offset_reset="latest",       # only process new events (not historical backlog)
            enable_auto_commit=True,
            value_deserializer=lambda b: json.loads(b.decode("utf-8")),
            consumer_timeout_ms=1000,         # unblock poll() so we can check _running flag
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )
        logger.info(f"Kafka consumer connected. Topics: {topics}")

    def start(self):
        """Start consuming events. Blocks until stop() is called."""
        try:
            self._build_consumer()
        except Exception as e:
            logger.error(f"Could not connect to Kafka at {KAFKA_BOOTSTRAP_SERVERS}: {e}")
            logger.error("Start Kafka with: docker compose -f ml/docker-compose.yml up kafka")
            return

        self._running = True
        logger.info("Consumer started. Waiting for events...")
        logger.info(f"Redis feature store: {'connected' if self.store.health() else 'unavailable (fallback mode)'}")

        try:
            while self._running:
                try:
                    for message in self._consumer:
                        if not self._running:
                            break
                        self._stats["events_received"] += 1
                        try:
                            event  = message.value
                            result = process_event(event, self.store, self.db, self.dry_run)
                            if result["action"] in ("rescored", "no_change", "dry_run"):
                                self._stats["events_processed"] += 1
                                if result["action"] == "rescored":
                                    self._stats["rescored"] += 1
                            else:
                                self._stats["events_skipped"] += 1
                        except Exception as e:
                            self._stats["errors"] += 1
                            logger.error(f"Event processing error: {e}", exc_info=True)
                except StopIteration:
                    pass  # consumer_timeout_ms elapsed — loop back to check _running
        finally:
            if self._consumer:
                self._consumer.close()
            logger.info(f"Consumer stopped. Stats: {self._stats}")

    def stop(self):
        self._running = False

    def get_stats(self) -> dict:
        return {**self._stats, "redis_health": self.store.health()}


# ── Demo mode (no Kafka needed) ───────────────────────────────────────────────

def _run_demo():
    """Runs the full processing pipeline on a mock event — no Kafka required."""
    print("\nDemo mode — processing a mock patient.updated event\n")
    mock_event = {
        "event_type": "patient.updated",
        "patient_id": "ml-patient-1",
        "timestamp":  datetime.now(timezone.utc).isoformat(),
        "changed_fields": ["medications", "recentVisits"],
        "source":     "express_api",
    }
    print(f"Mock event: {json.dumps(mock_event, indent=2)}\n")

    store = get_store()
    try:
        db     = _get_mongo_db()
        result = process_event(mock_event, store, db, dry_run=True)
        print(f"Result: {json.dumps(result, indent=2)}")
    except Exception as e:
        print(f"Demo failed (MongoDB likely not running): {e}")
        print("\nExpected result structure:")
        print(json.dumps({
            "patient_id":        "ml-patient-1",
            "event_type":        "patient.updated",
            "action":            "rescored",
            "old_score":         68.0,
            "new_score":         74.5,
            "delta":             6.5,
            "alerts_generated":  True,
        }, indent=2))


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ClinicTrust real-time patient event consumer")
    parser.add_argument("--dry-run", action="store_true", help="Process events but don't write to MongoDB")
    parser.add_argument("--demo",    action="store_true", help="Run without Kafka using a mock event")
    args = parser.parse_args()

    if args.demo:
        _run_demo()
        return

    consumer = ClinicalEventConsumer(dry_run=args.dry_run)

    # Graceful shutdown on SIGTERM / SIGINT
    def _handle_signal(sig, frame):
        logger.info(f"Signal {sig} received — shutting down consumer...")
        consumer.stop()

    signal.signal(signal.SIGINT,  _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    consumer.start()


if __name__ == "__main__":
    main()
