"""
Stage 3 — Model Training: Patient Risk Score Regressor
========================================================
Trains an XGBoost regression model to predict patient riskScore (0-100).

What you learn here:
  1. How to structure an MLflow experiment run
  2. Cross-validation vs train/test split (and why CV is better for small datasets)
  3. Hyperparameter logging
  4. SHAP values — understand WHY the model made a prediction
  5. How to compare ML model vs the existing rule-based baseline

MLflow concepts:
  - mlflow.start_run()       : opens a new experiment run (like a git commit for ML)
  - mlflow.log_param()       : records hyperparameters
  - mlflow.log_metric()      : records performance numbers
  - mlflow.log_artifact()    : saves files (plots, reports) linked to the run
  - mlflow.xgboost.log_model : saves the model itself + registers in Model Registry

Usage:
    # Start MLflow server first (one-time setup):
    mlflow server --backend-store-uri sqlite:///ml/data/mlflow.db \\
                  --default-artifact-root ./ml/data/artifacts \\
                  --host 0.0.0.0 --port 5000

    # Then run training:
    python ml/train/train_risk_model.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import numpy as np
import mlflow
import mlflow.xgboost
import xgboost as xgb
import shap
import matplotlib.pyplot as plt
import joblib
from sklearn.model_selection import cross_val_score, KFold
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

from config.settings import (
    MLFLOW_TRACKING_URI, EXPERIMENT_RISK, MODEL_NAME_RISK,
    FEATURES_DIR, ARTIFACTS_DIR,
)


# ── Feature columns ───────────────────────────────────────────────────────────
# These are all the columns produced by patient_features.py
# We explicitly list them to avoid accidentally training on the ID or label.
FEATURE_COLS = [
    "age", "age_ge_35", "age_ge_45", "age_ge_55", "age_ge_65", "age_ge_75",
    "gender_male", "gender_female",
    "condition_count", "critical_condition_count", "high_condition_count",
    "medium_condition_count", "low_condition_count",
    "has_diabetes", "has_heart_failure", "has_cancer", "has_copd", "has_ckd",
    "has_dementia", "has_stroke", "has_hypertension", "has_obesity", "has_afib",
    "diabetic_over_65", "heart_failure_over_75",
    "comorbidity_2plus_high", "comorbidity_3plus_any",
    "active_med_count", "polypharmacy_5_9", "polypharmacy_10_plus", "dangerous_drug_combo",
    "severe_allergy_count", "has_any_allergy",
    "visit_count", "has_no_visits", "days_since_last_visit", "days_since_first_visit",
    "gap_lt_30_days", "gap_90_to_180", "gap_180_to_365", "gap_over_365",
]
LABEL_COL = "risk_score"


# ── Hyperparameters ───────────────────────────────────────────────────────────
# Deliberately conservative for a small healthcare dataset.
# In production, use Optuna or MLflow's hyperparameter search.
PARAMS = {
    "n_estimators":   300,
    "max_depth":      5,
    "learning_rate":  0.05,
    "subsample":      0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "reg_alpha":      0.1,   # L1 regularisation — reduces overfitting
    "reg_lambda":     1.0,   # L2 regularisation
    "random_state":   42,
    "n_jobs":         -1,
}


def rule_based_baseline(df: pd.DataFrame) -> float:
    """
    The EXISTING rule-based score IS the label, so the 'baseline' here means:
    what RMSE does a simple mean-prediction give? This is the floor —
    any model should beat it.

    For learning purposes: if we cannot beat predicting the mean, our features
    have no predictive signal and we need to rethink.
    """
    y = df[LABEL_COL].values
    mean_pred = np.full_like(y, y.mean())
    return float(np.sqrt(mean_squared_error(y, mean_pred)))


def train_and_evaluate(df: pd.DataFrame) -> tuple:
    """
    Trains XGBoost with 5-fold cross-validation.

    Why 5-fold CV instead of a single train/test split?
    With small healthcare datasets (hundreds to low thousands of patients),
    a single 80/20 split gives a high-variance estimate. CV averages
    across 5 non-overlapping test sets — far more reliable.

    Returns: (trained_model, cv_metrics_dict)
    """
    # Drop rows where the label is missing or zero
    # (zero riskScore means the analytics job hasn't run yet for this patient)
    df_clean = df.dropna(subset=[LABEL_COL])
    df_clean = df_clean[df_clean[LABEL_COL] > 0].copy()

    if len(df_clean) < 20:
        print(f"WARNING: Only {len(df_clean)} labelled patients. "
              "Run the analytics job (POST /api/admin/analytics/run-job) to generate risk scores.")

    # Handle any remaining NaN values with median imputation
    X = df_clean[FEATURE_COLS].fillna(df_clean[FEATURE_COLS].median())
    y = df_clean[LABEL_COL].values

    print(f"Training on {len(X)} patients, {len(FEATURE_COLS)} features.")

    model = xgb.XGBRegressor(**PARAMS)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    cv_rmse = -cross_val_score(model, X, y, cv=kf, scoring="neg_root_mean_squared_error")
    cv_mae  = -cross_val_score(model, X, y, cv=kf, scoring="neg_mean_absolute_error")
    cv_r2   =  cross_val_score(model, X, y, cv=kf, scoring="r2")

    metrics = {
        "cv_rmse_mean": float(cv_rmse.mean()),
        "cv_rmse_std":  float(cv_rmse.std()),
        "cv_mae_mean":  float(cv_mae.mean()),
        "cv_r2_mean":   float(cv_r2.mean()),
        "baseline_rmse": rule_based_baseline(df_clean),
        "n_samples":    len(X),
        "n_features":   len(FEATURE_COLS),
    }

    # Fit on full dataset for the final model
    model.fit(X, y)
    return model, metrics, X, y


def plot_feature_importance(model, feature_names: list, out_dir: Path):
    """
    Creates two feature importance plots:
    1. XGBoost's built-in 'gain' importance (how much each feature improves splits)
    2. SHAP summary plot (how each feature AFFECTS predictions — positive or negative)

    SHAP = SHapley Additive exPlanations. The gold standard for model explainability.
    Healthcare context: every risk prediction must be explainable to a clinician.
    """
    # Standard importance
    fig, ax = plt.subplots(figsize=(10, 8))
    xgb.plot_importance(model, ax=ax, max_num_features=20, importance_type="gain")
    ax.set_title("XGBoost Feature Importance (Gain)")
    fig.tight_layout()
    imp_path = out_dir / "feature_importance.png"
    fig.savefig(imp_path, dpi=150, bbox_inches="tight")
    plt.close(fig)

    # SHAP — needs the training data
    try:
        explainer = shap.TreeExplainer(model)
        # Use a subsample for speed
        X_sample = pd.DataFrame(
            model.get_booster().get_score(importance_type="gain"),
        )
        print("  Skipping SHAP plot (requires training data reference — run interactively for full SHAP).")
    except Exception as e:
        print(f"  SHAP plot skipped: {e}")

    return imp_path


def main():
    # ── Load features ─────────────────────────────────────────────────────────
    feat_path = FEATURES_DIR / "patient_features.parquet"
    if not feat_path.exists():
        print(f"Feature file not found: {feat_path}")
        print("Run  python ml/features/patient_features.py  first.")
        sys.exit(1)

    df = pd.read_parquet(feat_path)

    # ── MLflow setup ──────────────────────────────────────────────────────────
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_RISK)

    print(f"MLflow tracking URI: {MLFLOW_TRACKING_URI}")
    print(f"Experiment: {EXPERIMENT_RISK}\n")

    with mlflow.start_run(run_name="xgb_risk_regressor_v1") as run:
        run_id = run.info.run_id
        print(f"MLflow run ID: {run_id}")

        # Log all hyperparameters — every param is tracked, not just the ones you think matter
        mlflow.log_params(PARAMS)
        mlflow.log_param("feature_set_version", "v1")
        mlflow.log_param("label", LABEL_COL)

        # ── Train ─────────────────────────────────────────────────────────────
        model, metrics, X, y = train_and_evaluate(df)

        # ── Log metrics ───────────────────────────────────────────────────────
        for k, v in metrics.items():
            mlflow.log_metric(k, v)

        print("\n── Cross-validation results ────────────────────────")
        print(f"  RMSE:     {metrics['cv_rmse_mean']:.2f} ± {metrics['cv_rmse_std']:.2f}")
        print(f"  MAE:      {metrics['cv_mae_mean']:.2f}")
        print(f"  R²:       {metrics['cv_r2_mean']:.3f}")
        print(f"  Baseline RMSE (mean predictor): {metrics['baseline_rmse']:.2f}")
        improvement = metrics['baseline_rmse'] - metrics['cv_rmse_mean']
        print(f"  Improvement over baseline: {improvement:.2f} RMSE points")

        # ── Feature importance plot ───────────────────────────────────────────
        imp_path = plot_feature_importance(model, FEATURE_COLS, ARTIFACTS_DIR)
        mlflow.log_artifact(str(imp_path), artifact_path="plots")

        # ── Save model locally as backup ──────────────────────────────────────
        local_model_path = ARTIFACTS_DIR / "risk_model.json"
        model.save_model(str(local_model_path))
        mlflow.log_artifact(str(local_model_path), artifact_path="model_backup")

        # ── Register model in MLflow Model Registry ───────────────────────────
        # This creates a new version in the registry.
        # Versions start in "None" stage — use promote_if_better.py to advance to Staging → Production.
        model_uri = f"runs:/{run_id}/model"
        mlflow.xgboost.log_model(
            model,
            artifact_path="model",
            registered_model_name=MODEL_NAME_RISK,
        )

        print(f"\nModel registered: {MODEL_NAME_RISK}")
        print(f"View in MLflow UI: {MLFLOW_TRACKING_URI}/#/experiments")
        print("\nNext step: run  python ml/evaluate/promote_if_better.py  to promote to Staging")


if __name__ == "__main__":
    main()
