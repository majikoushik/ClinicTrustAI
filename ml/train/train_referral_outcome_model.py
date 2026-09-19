"""
Stage 3 — Model Training: Referral Outcome Predictor
=====================================================
Trains a LightGBM model to predict referral outcome score (0-100).

Why LightGBM instead of XGBoost?
  - Faster on larger datasets (leaf-wise growth vs level-wise)
  - Handles categorical features natively (no need to one-hot encode)
  - Often produces better RMSE on tabular data with mixed feature types
  - Industry standard alongside XGBoost — worth knowing both

Business value:
  At referral creation time, predict the likely outcome score for each
  potential receiving provider. Feed this into referral matching to
  proactively route referrals to providers with the best predicted outcomes.

Usage:
    python ml/train/train_referral_outcome_model.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import numpy as np
import mlflow
import mlflow.lightgbm
import lightgbm as lgb
from sklearn.model_selection import KFold, cross_val_score
from sklearn.metrics import mean_squared_error, r2_score

from config.settings import (
    MLFLOW_TRACKING_URI, EXPERIMENT_REFERRAL, MODEL_NAME_REFERRAL,
    FEATURES_DIR, ARTIFACTS_DIR,
)

FEATURE_COLS = [
    "urgency_code", "urgency_routine", "urgency_urgent", "urgency_emergency",
    "accepted", "appointment_scheduled",
    "time_to_appt_days",
    "tta_lt_3", "tta_4_7", "tta_8_14", "tta_gt_14",
    "outcome_rating", "patient_satisfaction", "has_rating",
    "readmission_30d",
]
LABEL_COL = "outcome_score"

# Note: we do NOT include appointment_attended here because that happens
# after the referral — using it would be data leakage (the model would
# see information it cannot have at prediction time).

PARAMS = {
    "n_estimators":   400,
    "max_depth":      4,
    "learning_rate":  0.04,
    "num_leaves":     15,
    "subsample":      0.75,
    "colsample_bytree": 0.75,
    "min_child_samples": 5,
    "reg_alpha":      0.05,
    "reg_lambda":     0.8,
    "random_state":   42,
    "n_jobs":         -1,
    "verbose":        -1,
}


def main():
    feat_path = FEATURES_DIR / "referral_outcome_features.parquet"
    if not feat_path.exists():
        print(f"Feature file not found: {feat_path}")
        print("Run  python ml/features/referral_features.py  first.")
        sys.exit(1)

    df = pd.read_parquet(feat_path)
    df_clean = df.dropna(subset=[LABEL_COL])
    df_clean = df_clean[df_clean[LABEL_COL] > 0].copy()

    available_features = [c for c in FEATURE_COLS if c in df_clean.columns]
    X = df_clean[available_features].fillna(0)
    y = df_clean[LABEL_COL].values

    print(f"Training on {len(X)} referral outcomes, {len(available_features)} features.")

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_REFERRAL)

    with mlflow.start_run(run_name="lgbm_referral_outcome_v1") as run:
        mlflow.log_params(PARAMS)
        mlflow.log_param("n_features", len(available_features))
        mlflow.log_param("n_samples", len(X))

        model = lgb.LGBMRegressor(**PARAMS)
        kf = KFold(n_splits=5, shuffle=True, random_state=42)

        cv_rmse = -cross_val_score(model, X, y, cv=kf, scoring="neg_root_mean_squared_error")
        cv_r2   =  cross_val_score(model, X, y, cv=kf, scoring="r2")

        mlflow.log_metric("cv_rmse_mean", float(cv_rmse.mean()))
        mlflow.log_metric("cv_rmse_std",  float(cv_rmse.std()))
        mlflow.log_metric("cv_r2_mean",   float(cv_r2.mean()))

        print(f"  RMSE: {cv_rmse.mean():.2f} ± {cv_rmse.std():.2f}")
        print(f"  R²:   {cv_r2.mean():.3f}")

        model.fit(X, y)

        mlflow.lightgbm.log_model(
            model,
            artifact_path="model",
            registered_model_name=MODEL_NAME_REFERRAL,
        )
        print(f"\nModel registered: {MODEL_NAME_REFERRAL}")
        print(f"Run ID: {run.info.run_id}")


if __name__ == "__main__":
    main()
