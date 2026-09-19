"""
Stage 7 — Model Deployment: FastAPI Inference Server
=====================================================
Serves trained ML models via HTTP endpoints that the Express backend can call.

Architecture:
  React client  →  Express API  →  FastAPI ML server  →  MLflow Model Registry
                                        ↑
                               (falls back to rule-based if model unavailable)

Endpoints:
  POST /score/risk          — predict patient risk score (0-100)
  POST /score/referral      — predict referral outcome score (0-100)
  POST /score/alert-action  — predict if an alert will get provider action
  GET  /health              — liveness check
  GET  /models              — list loaded model versions

FastAPI concepts taught here:
  - Pydantic models for request/response validation (type-safe APIs)
  - Startup events for loading models once (not on every request)
  - Background tasks for logging predictions
  - Dependency injection for model registry access

Usage:
    uvicorn ml.serving.app:app --host 0.0.0.0 --port 8000 --reload

Test with curl:
    curl -X POST http://localhost:8000/score/risk \\
         -H "Content-Type: application/json" \\
         -d '{"age": 72, "condition_count": 3, "high_condition_count": 2,
              "active_med_count": 6, "days_since_last_visit": 95}'
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import logging
from typing import Optional
from datetime import datetime

import mlflow.pyfunc
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config.settings import (
    MLFLOW_TRACKING_URI,
    MODEL_NAME_RISK, MODEL_NAME_REFERRAL, MODEL_NAME_ALERT,
    EXPLAIN_DIR,
)

# ── Phase 2: Prometheus metrics ───────────────────────────────────────────────
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    from prometheus_client import Counter, Histogram
    _PROMETHEUS_AVAILABLE = True
except ImportError:
    _PROMETHEUS_AVAILABLE = False

if _PROMETHEUS_AVAILABLE:
    PREDICTION_COUNTER = Counter(
        "ml_predictions_total",
        "Total predictions served",
        ["model", "source"],
    )
    PREDICTION_LATENCY = Histogram(
        "ml_prediction_latency_seconds",
        "Model inference latency",
        ["model"],
        buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
    )
    FALLBACK_COUNTER = Counter(
        "ml_fallback_total",
        "Predictions served by rule-based fallback (model unavailable)",
        ["model"],
    )
else:
    class _Noop:
        def labels(self, **_):   return self
        def inc(self, *_):       pass
        def observe(self, *_):   pass
        def time(self):
            import contextlib
            return contextlib.nullcontext()
    PREDICTION_COUNTER = _Noop()
    PREDICTION_LATENCY = _Noop()
    FALLBACK_COUNTER   = _Noop()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ClinicTrust ML Inference Server",
    description=(
        "Serves trained ML models for risk scoring, referral outcome prediction, "
        "and alert ranking. Phase 1: SHAP explanations. Phase 2: Prometheus metrics."
    ),
    version="2.1.0",
)

if _PROMETHEUS_AVAILABLE:
    Instrumentator().instrument(app).expose(app)  # exposes /metrics endpoint

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Model registry (loaded once at startup) ───────────────────────────────────
_models: dict = {}
_model_versions: dict = {}


@app.on_event("startup")
async def mount_explain_router():
    """
    Mount the SHAP explainability router at startup.
    Adds /explain/risk and /explain/global-importance endpoints.
    Isolated in a try/except so a missing shap install never breaks core serving.
    """
    try:
        from explain.shap_explainer import get_explain_router
        app.include_router(get_explain_router())
        logger.info("Explainability router mounted (/explain/risk, /explain/global-importance)")
    except Exception as e:
        logger.warning(f"Explainability router not available: {e}")


@app.on_event("startup")
async def load_models():
    """
    Load all Production models from MLflow registry at startup.
    MLflow pyfunc.load_model() returns a unified interface regardless of
    whether the model is XGBoost, LightGBM, scikit-learn, or TensorFlow.

    This is the power of MLflow's pyfunc flavour:
    your serving code never needs to know which framework trained the model.
    """
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

    for name, key in [
        (MODEL_NAME_RISK,     "risk"),
        (MODEL_NAME_REFERRAL, "referral"),
        (MODEL_NAME_ALERT,    "alert"),
    ]:
        model_uri = f"models:/{name}/Production"
        try:
            _models[key] = mlflow.pyfunc.load_model(model_uri)
            client = mlflow.tracking.MlflowClient()
            versions = client.get_latest_versions(name, stages=["Production"])
            _model_versions[key] = versions[0].version if versions else "unknown"
            logger.info(f"Loaded {name} (v{_model_versions[key]})")
        except Exception as e:
            logger.warning(f"Could not load {name}: {e}. Will use rule-based fallback.")
            _models[key] = None


# ── Request/Response schemas ──────────────────────────────────────────────────

class RiskScoreRequest(BaseModel):
    """Features needed to score one patient. All numeric, all optional (default 0)."""
    age:                         float = Field(0, ge=0, le=120)
    age_ge_65:                   int   = Field(0, ge=0, le=1)
    age_ge_75:                   int   = Field(0, ge=0, le=1)
    condition_count:             int   = Field(0, ge=0)
    critical_condition_count:    int   = Field(0, ge=0)
    high_condition_count:        int   = Field(0, ge=0)
    medium_condition_count:      int   = Field(0, ge=0)
    has_diabetes:                int   = Field(0, ge=0, le=1)
    has_heart_failure:           int   = Field(0, ge=0, le=1)
    has_cancer:                  int   = Field(0, ge=0, le=1)
    has_copd:                    int   = Field(0, ge=0, le=1)
    has_ckd:                     int   = Field(0, ge=0, le=1)
    has_hypertension:            int   = Field(0, ge=0, le=1)
    diabetic_over_65:            int   = Field(0, ge=0, le=1)
    comorbidity_2plus_high:      int   = Field(0, ge=0, le=1)
    active_med_count:            int   = Field(0, ge=0)
    polypharmacy_5_9:            int   = Field(0, ge=0, le=1)
    polypharmacy_10_plus:        int   = Field(0, ge=0, le=1)
    dangerous_drug_combo:        int   = Field(0, ge=0, le=1)
    severe_allergy_count:        int   = Field(0, ge=0)
    visit_count:                 int   = Field(0, ge=0)
    days_since_last_visit:       float = Field(0, ge=0)
    gap_over_365:                int   = Field(0, ge=0, le=1)


class RiskScoreResponse(BaseModel):
    risk_score:       float
    model_version:    str
    source:           str   # "ml_model" or "rule_based_fallback"
    scored_at:        str


class ReferralRequest(BaseModel):
    urgency_code:          int   = Field(0, ge=0, le=2)
    accepted:              int   = Field(0, ge=0, le=1)
    time_to_appt_days:     Optional[float] = None
    outcome_rating:        float = Field(0, ge=0, le=5)
    patient_satisfaction:  float = Field(0, ge=0, le=5)


class AlertActionRequest(BaseModel):
    riskScore:            float = Field(0, ge=0, le=100)
    daysSinceLastVisit:   float = Field(0, ge=0)
    alert_type:           str   = "care_gap"
    severity:             str   = "medium"


# ── Rule-based fallback functions ─────────────────────────────────────────────
# These mirror the logic in analyticsCalculationService.js so the serving
# layer degrades gracefully when the ML model is unavailable.

def _rule_based_risk(req: RiskScoreRequest) -> float:
    score = 0.0
    age = req.age
    if age >= 75:   score += 25
    elif age >= 65: score += 20
    elif age >= 55: score += 12
    elif age >= 45: score += 6

    score += req.critical_condition_count * 24
    score += req.high_condition_count     * 18
    score += req.medium_condition_count   * 12

    if req.comorbidity_2plus_high:
        score *= 1.3
    score += req.diabetic_over_65 * 5
    score += req.polypharmacy_5_9 * 12
    score += req.polypharmacy_10_plus * 20
    score += req.dangerous_drug_combo * 5
    score += req.severe_allergy_count * 8

    gap = req.days_since_last_visit
    if gap > 365:   score += 20
    elif gap > 180: score += 12
    elif gap > 90:  score += 5
    elif gap < 30:  score -= 5

    return float(max(0, min(100, round(score))))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": {k: v is not None for k, v in _models.items()},
        "model_versions": _model_versions,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/models")
def list_models():
    """Lists all loaded models and their registry versions."""
    return {
        "models": [
            {
                "key": k,
                "loaded": v is not None,
                "version": _model_versions.get(k, "not loaded"),
            }
            for k, v in _models.items()
        ]
    }


@app.post("/score/risk", response_model=RiskScoreResponse)
def score_risk(request: RiskScoreRequest, background_tasks: BackgroundTasks):
    """
    Predict patient risk score (0-100).

    Uses the Production ML model from MLflow Registry.
    Falls back to the rule-based formula if the model is unavailable.
    """
    model = _models.get("risk")

    with PREDICTION_LATENCY.labels(model="risk").time():
        if model is not None:
            try:
                features = pd.DataFrame([request.model_dump()])
                prediction = model.predict(features)[0]
                score = float(max(0, min(100, round(prediction, 1))))
                source = "ml_model"
            except Exception as e:
                logger.error(f"ML model prediction failed: {e}. Using fallback.")
                score  = _rule_based_risk(request)
                source = "rule_based_fallback"
                FALLBACK_COUNTER.labels(model="risk").inc()
        else:
            score  = _rule_based_risk(request)
            source = "rule_based_fallback"
            FALLBACK_COUNTER.labels(model="risk").inc()

    PREDICTION_COUNTER.labels(model="risk", source=source).inc()

    return RiskScoreResponse(
        risk_score=score,
        model_version=_model_versions.get("risk", "none"),
        source=source,
        scored_at=datetime.utcnow().isoformat(),
    )


@app.post("/score/referral")
def score_referral(request: ReferralRequest):
    """Predict referral outcome score (0-100)."""
    model = _models.get("referral")
    if model is None:
        raise HTTPException(status_code=503, detail="Referral outcome model not loaded.")

    features = pd.DataFrame([request.model_dump()])
    features = features.fillna(0)
    prediction = model.predict(features)[0]
    return {
        "outcome_score": float(max(0, min(100, round(prediction, 1)))),
        "model_version": _model_versions.get("referral", "none"),
        "scored_at":     datetime.utcnow().isoformat(),
    }


@app.post("/score/alert-action")
def score_alert_action(request: AlertActionRequest):
    """
    Predict probability that a provider will act on this alert.
    Returns a score 0-1 (higher = more actionable alert).
    Use to rank alerts in the provider dashboard.
    """
    import joblib
    from config.settings import ARTIFACTS_DIR

    model_path = ARTIFACTS_DIR / "alert_action_predictor.pkl"
    if not model_path.exists():
        raise HTTPException(status_code=503, detail="Alert action predictor not trained yet.")

    artifact = joblib.load(str(model_path))
    model = artifact["model"]
    feat_cols = artifact["feature_cols"]

    row = {
        "riskScore": request.riskScore,
        "daysSinceLastVisit": request.daysSinceLastVisit,
        f"type_{request.alert_type}": 1,
        f"severity_{request.severity}": 1,
    }
    X = pd.DataFrame([{c: row.get(c, 0) for c in feat_cols}])
    prob = model.predict_proba(X)[0][1]

    return {
        "action_probability": float(round(prob, 3)),
        "scored_at":          datetime.utcnow().isoformat(),
    }
