"""
Phase 1 — Explainability: SHAP-based Risk Score Explanation
============================================================
Why this matters for an AI Solution Architect:
  A model that says "risk score 87" is legally and clinically useless without
  a reason. Clinicians won't adopt it. Regulators (FDA, EU AI Act) require it.
  SHAP (SHapley Additive exPlanations) is the industry standard for explaining
  tree-based models because it provides:
    1. Mathematically rigorous attribution (based on game theory)
    2. Both global (population-level) and local (per-patient) explanations
    3. Fast exact computation for tree models via TreeExplainer

What SHAP values mean:
  base_value              — the model's average output across all training patients
  shap_value[feature_i]  — how much feature_i PUSHED this patient's score
                           above or below the base_value
  sum(shap_values) + base_value == prediction   (always true — it's additive)

  Example: base_value=45, readmissionCount SHAP=+18, eGFR SHAP=+12
  → "Readmission history added 18 points; low kidney function added 12 points"

Architecture:
  This module can run in two modes:
  1. Standalone CLI: python ml/explain/shap_explainer.py --patient-id PT-ML-0001
  2. FastAPI router:  imported by ml/serving/app.py and mounted at /explain

Usage:
    # Explain a single patient from the feature Parquet
    python ml/explain/shap_explainer.py --patient-id PT-ML-0001

    # Generate population-level summary plot
    python ml/explain/shap_explainer.py --summary

    # Explain from raw feature dict (for serving integration)
    python ml/explain/shap_explainer.py --demo
"""

import sys
import json
import logging
import argparse
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")   # non-interactive backend — safe in servers and CI
import matplotlib.pyplot as plt

from config.settings import (
    FEATURES_DIR, ARTIFACTS_DIR, EXPLAIN_DIR,
    MLFLOW_TRACKING_URI, MODEL_NAME_RISK,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Clinical names for every feature in the risk model ───────────────────────
# Maps internal feature column names → human-readable clinical labels.
# Organised from most actionable (top) to least actionable (bottom),
# which guides the ordering of explanations shown to clinicians.
FEATURE_CLINICAL_NAMES = {
    # Lab values (highest clinical signal)
    "egfr_latest":           "Kidney function (eGFR)",
    "bnp_latest":            "Heart failure marker (BNP)",
    "hba1c_latest":          "Blood sugar control (HbA1c)",
    "troponin_latest":       "Cardiac injury marker (Troponin)",
    "creatinine_latest":     "Kidney waste marker (Creatinine)",
    "haemoglobin_latest":    "Anaemia indicator (Haemoglobin)",
    "ldl_latest":            "Cholesterol (LDL)",
    "glucose_latest":        "Blood glucose",
    "wbc_latest":            "White blood cell count",
    "sodium_latest":         "Sodium level",
    "potassium_latest":      "Potassium level",
    # Readmission / utilisation
    "readmissionCount":      "Prior hospital readmissions (12 months)",
    "edVisitCount":          "Emergency department visits (12 months)",
    "charlsonScore":         "Comorbidity severity (Charlson Index)",
    # Care gaps
    "days_since_last_visit": "Days without a clinical visit",
    "gap_over_365":          "Care gap > 1 year",
    "gap_180_365":           "Care gap 6-12 months",
    "visit_count":           "Total visit count",
    # Age
    "age":                   "Patient age",
    "age_ge_75":             "Age 75 or older",
    "age_ge_65":             "Age 65 or older",
    # Condition burden
    "critical_condition_count":  "Critical diagnoses",
    "high_condition_count":      "Serious diagnoses",
    "medium_condition_count":    "Moderate diagnoses",
    "condition_count":           "Total diagnosis count",
    # Comorbidity flags
    "has_cancer":            "Active cancer diagnosis",
    "has_heart_failure":     "Heart failure",
    "has_ckd":               "Chronic kidney disease",
    "has_copd":              "COPD / respiratory disease",
    "has_diabetes":          "Diabetes mellitus",
    "has_hypertension":      "Hypertension",
    "comorbidity_2plus_high":"2+ serious comorbidities",
    "diabetic_over_65":      "Diabetes in patient over 65",
    # Medication
    "active_med_count":      "Active medications",
    "polypharmacy_10_plus":  "High polypharmacy (10+ meds)",
    "polypharmacy_5_9":      "Polypharmacy (5-9 meds)",
    "dangerous_drug_combo":  "Anticoagulant + NSAID combination",
    # Allergies
    "severe_allergy_count":  "Severe allergies",
}

# Recommendation templates keyed by top-driver feature
RECOMMENDATIONS = {
    "readmissionCount":      "Schedule urgent follow-up. Review discharge summary and care transitions.",
    "egfr_latest":           "Refer to nephrology if not already done. Review nephrotoxic medications.",
    "bnp_latest":            "Cardiology review recommended. Assess for fluid overload. Daily weight monitoring.",
    "hba1c_latest":          "Diabetes management review needed. Consider intensifying glycaemic control.",
    "days_since_last_visit": "Outreach to schedule care visit within 5 business days.",
    "gap_over_365":          "Extended care gap. Comprehensive review appointment required urgently.",
    "critical_condition_count": "Multiple critical diagnoses. Multidisciplinary team review recommended.",
    "charlsonScore":         "High comorbidity burden. Consider care coordination and social support assessment.",
    "dangerous_drug_combo":  "Medication safety alert: anticoagulant + NSAID combination. Urgent medication review.",
    "has_heart_failure":     "Heart failure management review. Assess NYHA class and optimise therapy.",
    "has_cancer":            "Oncology coordination needed. Ensure palliative and supportive care plan in place.",
    "troponin_latest":       "Elevated troponin detected. Cardiology review recommended.",
    "haemoglobin_latest":    "Anaemia noted. Review iron studies and investigate underlying cause.",
    "polypharmacy_10_plus":  "High polypharmacy risk. Medication reconciliation and deprescribing review needed.",
}
DEFAULT_RECOMMENDATION = "Schedule routine follow-up within 14 days. Review care plan and medication list."


# ── Model loader ──────────────────────────────────────────────────────────────

def _load_model_and_explainer():
    """
    Load the XGBoost model from MLflow registry and build a SHAP TreeExplainer.

    Why TreeExplainer over KernelExplainer?
      TreeExplainer is O(T * depth) per sample — fast and exact.
      KernelExplainer is model-agnostic but O(n_features^2) — too slow for
      real-time serving. Always use the specialised explainer when available.
    """
    import shap
    import mlflow

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    model_uri = f"models:/{MODEL_NAME_RISK}/Production"

    try:
        pyfunc_model = mlflow.pyfunc.load_model(model_uri)
        # Unwrap to get the native XGBoost booster for TreeExplainer
        native = pyfunc_model.unwrap_python_model() if hasattr(pyfunc_model, "unwrap_python_model") else None
        if native is None:
            # Try accessing the underlying model directly
            native = pyfunc_model._model_impl.xgb_model if hasattr(pyfunc_model._model_impl, "xgb_model") else None
        if native is None:
            raise ValueError("Could not unwrap native model from pyfunc.")
        explainer = shap.TreeExplainer(native)
        logger.info(f"Loaded {MODEL_NAME_RISK} and built TreeExplainer.")
        return pyfunc_model, explainer
    except Exception as e:
        logger.warning(f"Could not load from MLflow registry: {e}")
        # Fallback: try loading a locally saved artifact
        local_path = ARTIFACTS_DIR / "risk_model.pkl"
        if local_path.exists():
            import joblib
            artifact = joblib.load(local_path)
            native_model = artifact.get("model")
            explainer = shap.TreeExplainer(native_model)
            logger.info("Loaded risk model from local artifact.")
            return native_model, explainer
        raise RuntimeError(
            "Risk model not found. Run: python ml/train/train_risk_model.py"
        ) from e


# ── Core explanation function ─────────────────────────────────────────────────

def explain_patient(features: dict, model=None, explainer=None) -> dict:
    """
    Explain a single patient's risk score using SHAP values.

    Args:
        features:  dict of feature_name → value (same schema as RiskScoreRequest)
        model:     optional pre-loaded pyfunc model (avoids reloading)
        explainer: optional pre-loaded SHAP explainer (avoids reloading)

    Returns:
        {
          "prediction":     float,          # final risk score 0-100
          "base_value":     float,          # average model output
          "shap_values":    {feature: float, ...},
          "top_factors":    [               # top 5 by |SHAP| descending
            {
              "feature":       str,
              "clinical_name": str,
              "value":         float,
              "shap":          float,
              "direction":     "raises" | "lowers"
            }, ...
          ],
          "nl_explanation": str,            # human-readable paragraph
          "recommendation": str,            # clinical action based on top driver
          "risk_level":     str,
          "explained_at":   str,
        }
    """
    import shap
    from datetime import datetime

    if explainer is None:
        _, explainer = _load_model_and_explainer()

    X = pd.DataFrame([features])
    shap_values = explainer.shap_values(X)

    # shap_values is (1, n_features) for single-output regressors
    sv = shap_values[0] if shap_values.ndim > 1 else shap_values
    base_value = float(explainer.expected_value)
    feature_names = list(X.columns)

    # Build SHAP dict
    shap_dict = {fn: float(sv[i]) for i, fn in enumerate(feature_names)}

    # Sort by absolute SHAP descending
    ranked = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
    top5 = ranked[:5]

    top_factors = []
    for feat, sv_val in top5:
        top_factors.append({
            "feature":       feat,
            "clinical_name": FEATURE_CLINICAL_NAMES.get(feat, feat.replace("_", " ").title()),
            "value":         float(features.get(feat, 0)),
            "shap":          round(sv_val, 2),
            "direction":     "raises" if sv_val > 0 else "lowers",
        })

    # Natural language explanation
    prediction = float(np.clip(base_value + sum(shap_dict.values()), 0, 100))
    risk_level = "critical" if prediction >= 85 else "high" if prediction >= 70 else "medium" if prediction >= 30 else "low"

    nl_parts = []
    for f in top_factors:
        arrow = "↑" if f["direction"] == "raises" else "↓"
        nl_parts.append(
            f"{f['clinical_name']} ({arrow}{abs(f['shap']):.1f} pts)"
        )

    nl_explanation = (
        f"Risk score of {prediction:.0f}/100 [{risk_level}] is primarily driven by: "
        f"{', '.join(nl_parts[:3])}. "
    )
    if top_factors[0]["direction"] == "raises":
        nl_explanation += (
            f"The single largest contributor is {top_factors[0]['clinical_name']}, "
            f"adding {abs(top_factors[0]['shap']):.1f} points above the population baseline of {base_value:.0f}."
        )
    else:
        nl_explanation += (
            f"Protective factors are reducing the score — primarily {top_factors[0]['clinical_name']}."
        )

    # Recommendation based on top driver
    top_feature = top_factors[0]["feature"] if top_factors else ""
    recommendation = RECOMMENDATIONS.get(top_feature, DEFAULT_RECOMMENDATION)

    return {
        "prediction":     round(prediction, 1),
        "base_value":     round(base_value, 2),
        "shap_values":    {k: round(v, 3) for k, v in shap_dict.items()},
        "top_factors":    top_factors,
        "nl_explanation": nl_explanation,
        "recommendation": recommendation,
        "risk_level":     risk_level,
        "explained_at":   datetime.utcnow().isoformat(),
    }


# ── Batch explanation ─────────────────────────────────────────────────────────

def explain_batch(df: pd.DataFrame, explainer=None) -> pd.DataFrame:
    """
    Compute SHAP values for all rows in df. Returns df with SHAP columns appended.
    Used for population-level analysis and fairness auditing.
    """
    import shap

    if explainer is None:
        _, explainer = _load_model_and_explainer()

    shap_values = explainer.shap_values(df)
    shap_df = pd.DataFrame(shap_values, columns=[f"shap_{c}" for c in df.columns], index=df.index)
    return pd.concat([df, shap_df], axis=1)


# ── Plot generators ───────────────────────────────────────────────────────────

def generate_waterfall_plot(features: dict, patient_id: str, explainer=None) -> Path:
    """
    Generates a SHAP waterfall plot for one patient.
    Waterfall = the clearest per-patient explanation chart —
    each bar shows one feature's contribution, stacked from base to final score.
    """
    import shap

    if explainer is None:
        _, explainer = _load_model_and_explainer()

    X = pd.DataFrame([features])
    shap_values = explainer.shap_values(X)
    explanation = shap.Explanation(
        values=shap_values[0],
        base_values=float(explainer.expected_value),
        data=X.values[0],
        feature_names=[FEATURE_CLINICAL_NAMES.get(c, c) for c in X.columns],
    )

    plt.figure(figsize=(12, 8))
    shap.waterfall_plot(explanation, max_display=15, show=False)
    plt.title(f"Risk Score Explanation — Patient {patient_id}", fontsize=14, pad=15)
    plt.tight_layout()

    out_path = EXPLAIN_DIR / f"waterfall_{patient_id}.png"
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close()
    logger.info(f"Waterfall plot saved: {out_path}")
    return out_path


def generate_summary_plot(df: pd.DataFrame, explainer=None, n_samples: int = 200) -> Path:
    """
    Generates a SHAP beeswarm/summary plot across all patients.

    Beeswarm plot shows:
      - Which features have the MOST impact on the model (y-axis order)
      - For each patient (dot), the direction and magnitude of impact (x-axis)
      - Feature value (colour: red = high, blue = low)

    This is the primary plot for explaining the MODEL to stakeholders.
    """
    import shap

    if explainer is None:
        _, explainer = _load_model_and_explainer()

    sample = df.sample(min(n_samples, len(df)), random_state=42)
    shap_values = explainer.shap_values(sample)

    plt.figure(figsize=(14, 10))
    shap.summary_plot(
        shap_values,
        sample,
        feature_names=[FEATURE_CLINICAL_NAMES.get(c, c) for c in sample.columns],
        max_display=20,
        show=False,
        plot_size=(14, 10),
    )
    plt.title("Feature Impact on Risk Score — Population Summary", fontsize=14)
    plt.tight_layout()

    out_path = EXPLAIN_DIR / "summary_beeswarm.png"
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close()
    logger.info(f"Summary plot saved: {out_path}")
    return out_path


def generate_bar_importance_plot(df: pd.DataFrame, explainer=None) -> Path:
    """
    Mean absolute SHAP bar chart — the simplest global explanation.
    Good for executive presentations: "These are the top 10 factors driving risk."
    """
    import shap

    if explainer is None:
        _, explainer = _load_model_and_explainer()

    shap_values = explainer.shap_values(df)
    mean_abs = np.abs(shap_values).mean(axis=0)
    importance_df = pd.DataFrame({
        "feature":       df.columns,
        "clinical_name": [FEATURE_CLINICAL_NAMES.get(c, c) for c in df.columns],
        "mean_abs_shap": mean_abs,
    }).sort_values("mean_abs_shap", ascending=True).tail(15)

    fig, ax = plt.subplots(figsize=(10, 8))
    colors = ["#d32f2f" if v > importance_df["mean_abs_shap"].median() else "#1976d2"
              for v in importance_df["mean_abs_shap"]]
    ax.barh(importance_df["clinical_name"], importance_df["mean_abs_shap"], color=colors)
    ax.set_xlabel("Mean |SHAP value| — average impact on risk score", fontsize=11)
    ax.set_title("Global Feature Importance (SHAP) — ClinicTrust Risk Model", fontsize=13)
    ax.axvline(x=0, color="black", linewidth=0.5)
    plt.tight_layout()

    out_path = EXPLAIN_DIR / "global_importance.png"
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close()
    logger.info(f"Global importance plot saved: {out_path}")
    return out_path


# ── FastAPI router (mounted by serving/app.py) ────────────────────────────────

def get_explain_router():
    """
    Returns a FastAPI APIRouter with /explain endpoints.
    Mounted in serving/app.py as: app.include_router(get_explain_router(), prefix="")

    Why a separate router?
      Keeps explainability concerns isolated from core serving logic.
      The router can be disabled with a feature flag without touching app.py.
    """
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel

    router = APIRouter(tags=["Explainability"])

    class ExplainRequest(BaseModel):
        features: dict
        patient_id: str = "unknown"
        include_plot: bool = False

    @router.post("/explain/risk")
    def explain_risk_endpoint(request: ExplainRequest):
        """
        Returns SHAP-based explanation for a risk score prediction.

        Response includes:
          - prediction: the risk score
          - base_value: population average (model baseline)
          - top_factors: top 5 features with clinical names and contribution
          - nl_explanation: human-readable paragraph for clinicians
          - recommendation: clinical action based on the top driver
        """
        try:
            result = explain_patient(request.features)
            if request.include_plot:
                out_path = generate_waterfall_plot(request.features, request.patient_id)
                result["plot_path"] = str(out_path)
            return result
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

    @router.get("/explain/global-importance")
    def global_importance():
        """
        Returns mean absolute SHAP values across the training population.
        Use this to explain the model to non-technical stakeholders.
        """
        parquet_path = FEATURES_DIR / "patient_features.parquet"
        if not parquet_path.exists():
            raise HTTPException(
                status_code=503,
                detail="Feature file not found. Run: python ml/features/patient_features.py"
            )
        df = pd.read_parquet(parquet_path)
        label_col = "risk_score"
        X = df.drop(columns=[c for c in [label_col, "patient_id", "_id"] if c in df.columns])

        _, explainer = _load_model_and_explainer()
        shap_values = explainer.shap_values(X)
        mean_abs = np.abs(shap_values).mean(axis=0)

        return {
            "feature_importance": [
                {
                    "feature":       col,
                    "clinical_name": FEATURE_CLINICAL_NAMES.get(col, col),
                    "mean_abs_shap": round(float(val), 3),
                }
                for col, val in sorted(
                    zip(X.columns, mean_abs),
                    key=lambda x: x[1], reverse=True
                )
            ]
        }

    return router


# ── CLI ───────────────────────────────────────────────────────────────────────

def _demo_mode():
    """Runs without a trained model — shows the explanation structure using mock data."""
    print("\nDemo mode — showing explanation output structure (no model required)\n")
    mock_features = {
        "age": 74, "age_ge_65": 1, "age_ge_75": 0,
        "condition_count": 3, "critical_condition_count": 0,
        "high_condition_count": 2, "medium_condition_count": 1,
        "has_diabetes": 1, "has_heart_failure": 1, "has_cancer": 0,
        "has_copd": 0, "has_ckd": 1, "has_hypertension": 1,
        "diabetic_over_65": 1, "comorbidity_2plus_high": 1,
        "active_med_count": 7, "polypharmacy_5_9": 1, "polypharmacy_10_plus": 0,
        "dangerous_drug_combo": 0, "severe_allergy_count": 1,
        "visit_count": 2, "days_since_last_visit": 148, "gap_over_365": 0,
        "readmissionCount": 2, "charlsonScore": 5,
        "egfr_latest": 34.0, "bnp_latest": 480.0, "hba1c_latest": 8.9,
    }
    mock_result = {
        "prediction": 84.0,
        "base_value": 45.2,
        "top_factors": [
            {"feature": "readmissionCount",  "clinical_name": "Prior hospital readmissions (12 months)", "value": 2,     "shap": 16.2, "direction": "raises"},
            {"feature": "egfr_latest",       "clinical_name": "Kidney function (eGFR)",                  "value": 34.0,  "shap": 12.8, "direction": "raises"},
            {"feature": "bnp_latest",        "clinical_name": "Heart failure marker (BNP)",              "value": 480.0, "shap": 8.4,  "direction": "raises"},
            {"feature": "hba1c_latest",      "clinical_name": "Blood sugar control (HbA1c)",             "value": 8.9,   "shap": 6.1,  "direction": "raises"},
            {"feature": "days_since_last_visit","clinical_name":"Days without a clinical visit",         "value": 148,   "shap": 4.3,  "direction": "raises"},
        ],
        "nl_explanation": (
            "Risk score of 84/100 [high] is primarily driven by: "
            "Prior hospital readmissions (↑16.2 pts), Kidney function (↑12.8 pts), "
            "Heart failure marker (↑8.4 pts). "
            "The single largest contributor is Prior hospital readmissions, "
            "adding 16.2 points above the population baseline of 45."
        ),
        "recommendation": "Schedule urgent follow-up. Review discharge summary and care transitions.",
        "risk_level": "high",
    }
    print(json.dumps(mock_result, indent=2))
    print("\nTo run with a real trained model:")
    print("  python ml/train/train_risk_model.py")
    print("  python ml/explain/shap_explainer.py --patient-id PT-ML-0001")


def main():
    parser = argparse.ArgumentParser(description="SHAP-based risk score explainer")
    parser.add_argument("--patient-id",  help="Patient ID from feature Parquet to explain")
    parser.add_argument("--summary",     action="store_true", help="Generate population summary plot")
    parser.add_argument("--importance",  action="store_true", help="Generate global importance plot")
    parser.add_argument("--demo",        action="store_true", help="Run demo without trained model")
    args = parser.parse_args()

    if args.demo or (not args.patient_id and not args.summary and not args.importance):
        _demo_mode()
        return

    parquet_path = FEATURES_DIR / "patient_features.parquet"
    if not parquet_path.exists():
        print(f"Feature file not found: {parquet_path}")
        print("Run: python ml/features/patient_features.py")
        return

    df = pd.read_parquet(parquet_path)
    label_col = "risk_score"
    id_cols = [c for c in ["patient_id", "_id"] if c in df.columns]
    X = df.drop(columns=[c for c in [label_col] + id_cols if c in df.columns])

    _, explainer = _load_model_and_explainer()

    if args.summary:
        path = generate_summary_plot(X, explainer)
        print(f"Summary plot: {path}")
        path2 = generate_bar_importance_plot(X, explainer)
        print(f"Importance plot: {path2}")
        return

    if args.importance:
        path = generate_bar_importance_plot(X, explainer)
        print(f"Global importance plot: {path}")
        return

    if args.patient_id:
        id_col = id_cols[0] if id_cols else None
        if id_col and args.patient_id in df[id_col].values:
            row = df[df[id_col] == args.patient_id].iloc[0]
        else:
            print(f"Patient {args.patient_id} not found, using first row.")
            row = df.iloc[0]

        features = row.drop([label_col] + id_cols, errors="ignore").to_dict()
        result = explain_patient(features, explainer=explainer)
        print(json.dumps(result, indent=2))

        plot_path = generate_waterfall_plot(features, args.patient_id, explainer)
        print(f"\nWaterfall plot: {plot_path}")


if __name__ == "__main__":
    main()
