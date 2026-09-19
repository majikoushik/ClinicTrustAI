"""
Stage 3 — Model Training: Predictive Alert Classifier
======================================================
Trains a multi-class classifier to predict WHICH alert type a patient
will trigger, and a binary classifier to predict IF the alert will
result in provider action (alert precision prediction).

Two models in one script:
  Model A: Multi-class classifier
    Input:  patient features
    Output: {readmission_risk, care_gap, medication_adherence, risk_score_increase, none}
    Use:    Proactively surface the most likely alert type before the
            rules fire — gives clinicians earlier warning.

  Model B: Alert action predictor (binary)
    Input:  alert features (type, severity, riskScore, daysSinceLastVisit)
    Output: probability that wasActionTaken == True
    Use:    Rank active alerts by "actionability" — surface alerts the
            provider is most likely to act on first.

Usage:
    python ml/train/train_alert_classifier.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import numpy as np
import mlflow
import mlflow.sklearn
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report

from config.settings import (
    MLFLOW_TRACKING_URI, EXPERIMENT_ALERT, MODEL_NAME_ALERT,
    FEATURES_DIR, DATA_DIR, ARTIFACTS_DIR,
)

# Features from patient_features.parquet (for Model A)
PATIENT_FEATURES = [
    "age", "age_ge_65", "age_ge_75",
    "condition_count", "high_condition_count", "critical_condition_count",
    "has_diabetes", "has_heart_failure", "has_copd", "has_ckd",
    "active_med_count", "polypharmacy_5_9", "polypharmacy_10_plus",
    "severe_allergy_count",
    "days_since_last_visit", "has_no_visits",
    "gap_90_to_180", "gap_180_to_365", "gap_over_365",
    "risk_score",
]

# Features from predictive_alerts.parquet (for Model B)
ALERT_FEATURES = [
    "riskScore", "daysSinceLastVisit",
]
ALERT_TYPE_COLS = ["type_readmission_risk", "type_care_gap",
                   "type_medication_adherence", "type_risk_score_increase"]
SEVERITY_COLS   = ["severity_low", "severity_medium", "severity_high", "severity_critical"]


def train_model_a(mlflow_run):
    """
    Model A: Predict which alert type a patient will receive.

    We construct the label from patient_features + which alerts actually
    fired for each patient (from predictive_alerts export).
    If a patient has no alerts, label = 'none'.
    """
    print("\n── Model A: Alert Type Classifier ───────────────────────────────────")

    feat_path  = FEATURES_DIR / "patient_features.parquet"
    alert_path = DATA_DIR / "predictive_alerts.parquet"

    if not feat_path.exists() or not alert_path.exists():
        print("  Skipping Model A — requires patient_features.parquet and predictive_alerts.parquet")
        return

    patients = pd.read_parquet(feat_path)
    alerts   = pd.read_parquet(alert_path)

    if alerts.empty or patients.empty:
        print("  Skipping Model A — insufficient data.")
        return

    # Build label: for each patient, take the most severe alert type they received
    # (priority: readmission_risk > care_gap > medication_adherence > risk_score_increase)
    PRIORITY = {
        "readmission_risk": 4,
        "risk_score_increase": 3,
        "care_gap": 2,
        "medication_adherence": 1,
    }
    if "patientId" in alerts.columns and "_id" in patients.columns:
        alert_labels = (
            alerts
            .groupby("patientId")["type"]
            .apply(lambda types: max(types, key=lambda t: PRIORITY.get(t, 0)))
            .reset_index()
            .rename(columns={"patientId": "_id", "type": "alert_label"})
        )
        df = patients.merge(alert_labels, on="_id", how="left")
        df["alert_label"] = df["alert_label"].fillna("none")
    else:
        print("  Cannot join patients to alerts — id fields missing.")
        return

    avail = [c for c in PATIENT_FEATURES if c in df.columns]
    X = df[avail].fillna(0)
    y = df["alert_label"].values

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    print(f"  Samples: {len(X)}, Classes: {list(le.classes_)}")

    model = GradientBoostingClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.05, random_state=42
    )
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_acc = cross_val_score(model, X, y_enc, cv=skf, scoring="accuracy")

    mlflow.log_metric("model_a_cv_accuracy_mean", float(cv_acc.mean()))
    mlflow.log_metric("model_a_cv_accuracy_std",  float(cv_acc.std()))
    print(f"  CV Accuracy: {cv_acc.mean():.3f} ± {cv_acc.std():.3f}")

    model.fit(X, y_enc)

    import joblib
    path_a = ARTIFACTS_DIR / "alert_type_classifier.pkl"
    joblib.dump({"model": model, "label_encoder": le, "feature_cols": avail}, str(path_a))
    mlflow.log_artifact(str(path_a), artifact_path="model_a")
    print(f"  Saved → {path_a}")


def train_model_b(mlflow_run):
    """
    Model B: Predict if a provider will act on an alert (alert precision).

    Label: wasActionTaken (bool).
    A high-precision alert model means fewer noisy alerts surfaced to
    already-overloaded clinicians.
    """
    print("\n── Model B: Alert Action Predictor ──────────────────────────────────")

    alert_path = DATA_DIR / "predictive_alerts.parquet"
    if not alert_path.exists():
        print("  Skipping Model B — requires predictive_alerts.parquet")
        return

    df = pd.read_parquet(alert_path)
    df = df.dropna(subset=["wasActionTaken"])

    if df.empty:
        print("  Skipping Model B — no alerts with wasActionTaken labels yet.")
        print("  Tip: resolve some alerts in the UI, then re-export and retrain.")
        return

    # One-hot encode alert type and severity
    if "type" in df.columns:
        type_dummies = pd.get_dummies(df["type"], prefix="type")
        df = pd.concat([df, type_dummies], axis=1)
    if "severity" in df.columns:
        sev_dummies = pd.get_dummies(df["severity"], prefix="severity")
        df = pd.concat([df, sev_dummies], axis=1)

    feat_cols = (
        [c for c in ["riskScore", "daysSinceLastVisit"] if c in df.columns]
        + [c for c in ALERT_TYPE_COLS + SEVERITY_COLS if c in df.columns]
    )

    X = df[feat_cols].fillna(0)
    y = df["wasActionTaken"].astype(int).values

    print(f"  Samples: {len(X)}, Positive rate: {y.mean():.1%}")

    model = RandomForestClassifier(
        n_estimators=200, max_depth=5, random_state=42, n_jobs=-1
    )
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(model, X, y, cv=skf, scoring="roc_auc")

    mlflow.log_metric("model_b_cv_auc_mean", float(cv_auc.mean()))
    mlflow.log_metric("model_b_cv_auc_std",  float(cv_auc.std()))
    print(f"  CV AUC: {cv_auc.mean():.3f} ± {cv_auc.std():.3f}")

    model.fit(X, y)

    import joblib
    path_b = ARTIFACTS_DIR / "alert_action_predictor.pkl"
    joblib.dump({"model": model, "feature_cols": feat_cols}, str(path_b))
    mlflow.log_artifact(str(path_b), artifact_path="model_b")
    print(f"  Saved → {path_b}")


def main():
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_ALERT)

    with mlflow.start_run(run_name="alert_classifiers_v1") as run:
        train_model_a(run)
        train_model_b(run)
        print(f"\nRun ID: {run.info.run_id}")
        print("Next step: run  python ml/evaluate/promote_if_better.py")


if __name__ == "__main__":
    main()
