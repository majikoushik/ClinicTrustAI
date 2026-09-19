"""
Central configuration for the ML pipeline.
All other modules import from here — change values once, applies everywhere.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve .env relative to this file's parent (ml/)
_ML_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ML_ROOT / ".env")

# ── Paths ─────────────────────────────────────────────────────────────────────
ML_ROOT          = _ML_ROOT
DATA_DIR         = ML_ROOT / "data" / "exports"
FEATURES_DIR     = ML_ROOT / "data" / "features"
ARTIFACTS_DIR    = ML_ROOT / "data" / "artifacts"
VECTORSTORE_DIR  = ML_ROOT / "data" / "vectorstore"
MONITORING_DIR   = ML_ROOT / "data" / "monitoring"
EXPLAIN_DIR      = ML_ROOT / "data" / "explanations"   # SHAP plots + per-patient explanations
EVAL_DIR         = ML_ROOT / "data" / "evaluations"    # fairness + RAGAS reports

for _d in [DATA_DIR, FEATURES_DIR, ARTIFACTS_DIR, VECTORSTORE_DIR, MONITORING_DIR, EXPLAIN_DIR, EVAL_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME     = "clinictrust"

# ── MLflow ────────────────────────────────────────────────────────────────────
MLFLOW_TRACKING_URI        = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
EXPERIMENT_RISK            = os.getenv("MLFLOW_EXPERIMENT_RISK",     "clinictrust-risk-scoring")
EXPERIMENT_REFERRAL        = os.getenv("MLFLOW_EXPERIMENT_REFERRAL", "clinictrust-referral-outcome")
EXPERIMENT_ALERT           = os.getenv("MLFLOW_EXPERIMENT_ALERT",    "clinictrust-alert-classifier")

# Model registry names (used for promotion)
MODEL_NAME_RISK     = "clinictrust-risk-score"
MODEL_NAME_REFERRAL = "clinictrust-referral-outcome"
MODEL_NAME_ALERT    = "clinictrust-alert-classifier"

# ── Express API ───────────────────────────────────────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")
ADMIN_TOKEN  = os.getenv("ADMIN_TOKEN", "")

# ── Azure OpenAI ──────────────────────────────────────────────────────────────
AZURE_OPENAI_ENDPOINT             = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY              = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_DEPLOYMENT           = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
AZURE_OPENAI_EMBEDDING_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002")
AZURE_OPENAI_API_VERSION          = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

# ── Model thresholds ─────────────────────────────────────────────────────────
PROMOTE_MIN_IMPROVEMENT_RMSE = 1.0   # minimum RMSE improvement to auto-promote
PROMOTE_MIN_IMPROVEMENT_AUC  = 0.01  # minimum AUC improvement to auto-promote

# ── Feature constants (mirrors analyticsCalculationService.js) ────────────────
HIGH_RISK_TERMS    = ["cancer","carcinoma","lymphoma","leukemia","tumor",
                      "heart failure","congestive heart failure","chf",
                      "copd","chronic obstructive","stroke","cerebrovascular",
                      "chronic kidney disease","renal failure","esrd",
                      "cirrhosis","liver failure","dementia","alzheimer"]
MEDIUM_RISK_TERMS  = ["diabetes","hypertension","high blood pressure",
                      "atrial fibrillation","arrhythmia","asthma","obesity",
                      "coronary artery disease","angina","sleep apnea"]
CRITICAL_TERMS     = ["metastatic","stage 4","stage iv","sepsis",
                      "multi-organ failure","end-stage kidney","esrd",
                      "advanced heart failure","ejection fraction < 30"]
ANTICOAGULANT_TERMS = ["warfarin","heparin","apixaban","rivaroxaban",
                        "dabigatran","anticoagulant","blood thinner"]
NSAID_TERMS         = ["ibuprofen","naproxen","diclofenac","celecoxib","nsaid","aspirin"]

# ── Phase 2: Redis feature store ─────────────────────────────────────────────
REDIS_HOST        = os.getenv("REDIS_HOST",     "localhost")
REDIS_PORT        = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD    = os.getenv("REDIS_PASSWORD", "")
REDIS_DB          = int(os.getenv("REDIS_DB",   "0"))
REDIS_FEATURE_TTL = int(os.getenv("REDIS_FEATURE_TTL", "3600"))  # 1 hour

# ── Phase 2: Kafka streaming ──────────────────────────────────────────────────
KAFKA_BOOTSTRAP_SERVERS       = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_PATIENT_EVENTS_TOPIC    = os.getenv("KAFKA_PATIENT_EVENTS_TOPIC",  "clinictrust.patient.events")
KAFKA_REFERRAL_EVENTS_TOPIC   = os.getenv("KAFKA_REFERRAL_EVENTS_TOPIC", "clinictrust.referral.events")
KAFKA_APPOINTMENT_EVENTS_TOPIC = os.getenv("KAFKA_APPOINTMENT_EVENTS_TOPIC", "clinictrust.appointment.events")
KAFKA_CONSUMER_GROUP          = os.getenv("KAFKA_CONSUMER_GROUP", "clinictrust-ml-pipeline")

# ── Phase 2: ML serving (self-referential URL for consumer → scoring) ─────────
ML_SERVING_URL           = os.getenv("ML_SERVING_URL",           "http://localhost:8000")
RESCORE_DELTA_THRESHOLD  = float(os.getenv("RESCORE_DELTA_THRESHOLD", "5.0"))  # re-alert if risk shifts ≥5 pts
