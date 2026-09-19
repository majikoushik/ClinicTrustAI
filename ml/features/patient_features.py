"""
Stage 2 — Feature Engineering (Patients)
=========================================
Transforms raw patient documents (from patients.parquet) into a numeric
feature matrix suitable for scikit-learn / XGBoost.

Concepts taught here:
  - Feature extraction from nested JSON / array fields
  - Handling missing values (NaN strategy)
  - Label encoding vs one-hot encoding
  - Feature importance vocabulary (what features a risk model would use)
  - Saving features to Parquet for reproducible experiments

Usage:
    python ml/features/patient_features.py

Input:  ml/data/exports/patients.parquet
Output: ml/data/features/patient_features.parquet
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pandas as pd
import numpy as np
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config.settings import (
    DATA_DIR, FEATURES_DIR,
    HIGH_RISK_TERMS, MEDIUM_RISK_TERMS, CRITICAL_TERMS,
    ANTICOAGULANT_TERMS, NSAID_TERMS,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _age_years(dob) -> float:
    """Convert dateOfBirth to age in years. Returns 0 for missing/unparseable."""
    if pd.isna(dob):
        return 0.0
    try:
        birth = pd.to_datetime(dob)
        return (datetime.utcnow() - birth.to_pydatetime()).days / 365.25
    except Exception:
        return 0.0


def _days_since(date_val) -> float:
    """Returns days since a date. Returns 9999 for missing (= long gap)."""
    if pd.isna(date_val):
        return 9999.0
    try:
        d = pd.to_datetime(date_val)
        return max(0.0, (datetime.utcnow() - d.to_pydatetime()).days)
    except Exception:
        return 9999.0


def _contains_term(text: str, terms: list) -> bool:
    t = (text or "").lower()
    return any(term in t for term in terms)


# ── Per-patient feature extraction ───────────────────────────────────────────

def extract_features(row: dict) -> dict:
    """
    Extracts all numeric features from a single patient record.

    Feature groups:
      1. Demographics        — age, gender
      2. Condition burden    — counts by severity tier
      3. Comorbidity flags   — presence of key conditions
      4. Medication load     — active med count, dangerous combos
      5. Allergy severity    — severe allergy count
      6. Care engagement     — days since last visit, visit count
      7. Label               — riskScore (what we are training to predict)
    """
    features = {"_id": str(row.get("_id", ""))}

    # ── 1. Demographics ───────────────────────────────────────────────────────
    features["age"] = _age_years(row.get("dateOfBirth"))
    features["age_ge_35"] = int(features["age"] >= 35)
    features["age_ge_45"] = int(features["age"] >= 45)
    features["age_ge_55"] = int(features["age"] >= 55)
    features["age_ge_65"] = int(features["age"] >= 65)
    features["age_ge_75"] = int(features["age"] >= 75)

    gender_raw = (row.get("gender") or "").lower()
    features["gender_male"]   = int(gender_raw == "male")
    features["gender_female"] = int(gender_raw == "female")

    # ── 2. Condition burden ───────────────────────────────────────────────────
    conditions = row.get("medicalHistory") or []
    condition_texts = [str(h.get("condition") or "") for h in conditions]

    features["condition_count"] = len(conditions)
    features["critical_condition_count"] = sum(
        1 for c in condition_texts if _contains_term(c, CRITICAL_TERMS)
    )
    features["high_condition_count"] = sum(
        1 for c in condition_texts if _contains_term(c, HIGH_RISK_TERMS)
    )
    features["medium_condition_count"] = sum(
        1 for c in condition_texts if _contains_term(c, MEDIUM_RISK_TERMS)
    )
    features["low_condition_count"] = max(
        0,
        features["condition_count"] - features["critical_condition_count"]
        - features["high_condition_count"] - features["medium_condition_count"],
    )

    # ── 3. Comorbidity flags ──────────────────────────────────────────────────
    all_conditions = " ".join(condition_texts).lower()
    features["has_diabetes"]      = int("diabetes" in all_conditions)
    features["has_heart_failure"]  = int("heart failure" in all_conditions or "chf" in all_conditions)
    features["has_cancer"]         = int("cancer" in all_conditions or "carcinoma" in all_conditions)
    features["has_copd"]           = int("copd" in all_conditions or "chronic obstructive" in all_conditions)
    features["has_ckd"]            = int("chronic kidney" in all_conditions or "renal failure" in all_conditions)
    features["has_dementia"]       = int("dementia" in all_conditions or "alzheimer" in all_conditions)
    features["has_stroke"]         = int("stroke" in all_conditions or "cerebrovascular" in all_conditions)
    features["has_hypertension"]   = int("hypertension" in all_conditions or "high blood pressure" in all_conditions)
    features["has_obesity"]        = int("obesity" in all_conditions)
    features["has_afib"]           = int("atrial fibrillation" in all_conditions or "arrhythmia" in all_conditions)

    # Interaction terms (age × condition) — these mirror the rule-based formula
    features["diabetic_over_65"]       = int(features["has_diabetes"] and features["age"] > 65)
    features["heart_failure_over_75"]  = int(features["has_heart_failure"] and features["age"] > 75)
    features["comorbidity_2plus_high"] = int(
        (features["critical_condition_count"] + features["high_condition_count"]) >= 2
    )
    features["comorbidity_3plus_any"]  = int(features["condition_count"] >= 3)

    # ── 4. Medication load ────────────────────────────────────────────────────
    now = datetime.utcnow()
    medications = row.get("medications") or []
    active_meds = [
        m for m in medications
        if not m.get("endDate") or pd.to_datetime(m["endDate"]) > now
    ]
    features["active_med_count"] = len(active_meds)
    features["polypharmacy_5_9"]  = int(5 <= len(active_meds) <= 9)
    features["polypharmacy_10_plus"] = int(len(active_meds) >= 10)

    med_names = " ".join((m.get("name") or m.get("medication") or "").lower() for m in active_meds)
    has_anticoagulant = any(t in med_names for t in ANTICOAGULANT_TERMS)
    has_nsaid = any(t in med_names for t in NSAID_TERMS)
    features["dangerous_drug_combo"] = int(has_anticoagulant and has_nsaid)

    # ── 5. Allergy severity ───────────────────────────────────────────────────
    allergies = row.get("allergies") or []
    features["severe_allergy_count"] = sum(
        1 for a in allergies if (a.get("severity") or "").lower() == "severe"
    )
    features["has_any_allergy"] = int(len(allergies) > 0)

    # ── 6. Care engagement ────────────────────────────────────────────────────
    visits = [v for v in (row.get("recentVisits") or []) if v.get("date")]
    features["visit_count"] = len(visits)
    features["has_no_visits"] = int(len(visits) == 0)

    if visits:
        dates = sorted(pd.to_datetime(v["date"]) for v in visits)
        features["days_since_last_visit"] = _days_since(dates[-1])
        features["days_since_first_visit"] = _days_since(dates[0])
    else:
        features["days_since_last_visit"]  = 9999.0
        features["days_since_first_visit"] = 9999.0

    features["gap_lt_30_days"]   = int(features["days_since_last_visit"] < 30)
    features["gap_90_to_180"]    = int(90 <= features["days_since_last_visit"] < 180)
    features["gap_180_to_365"]   = int(180 <= features["days_since_last_visit"] < 365)
    features["gap_over_365"]     = int(features["days_since_last_visit"] >= 365)

    # ── 7. Label ──────────────────────────────────────────────────────────────
    features["risk_score"] = float(row.get("riskScore") or 0)

    return features


def build_feature_matrix(parquet_path: Path) -> pd.DataFrame:
    """Reads raw patient parquet, applies extract_features to every row."""
    print(f"Reading {parquet_path}...")
    raw = pd.read_parquet(parquet_path)
    print(f"  {len(raw)} patient records loaded.")

    rows = []
    for _, row in raw.iterrows():
        rows.append(extract_features(row.to_dict()))

    df = pd.DataFrame(rows)
    print(f"  Feature matrix shape: {df.shape}")
    return df


def main():
    raw_path = DATA_DIR / "patients.parquet"
    if not raw_path.exists():
        print(f"patients.parquet not found at {raw_path}")
        print("Run  python ml/data/export_mongodb.py  first.")
        sys.exit(1)

    df = build_feature_matrix(raw_path)

    out = FEATURES_DIR / "patient_features.parquet"
    df.to_parquet(out, index=False)
    print(f"\nFeature matrix saved → {out}")

    print("\n── Feature summary ──────────────────────────────")
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    print(df[numeric_cols].describe().T[["mean", "std", "min", "max"]].to_string())
    print(f"\nLabel distribution (risk_score):")
    bins = [0, 30, 70, 100]
    labels = ["low (0-30)", "medium (30-70)", "high (70-100)"]
    df["risk_bucket"] = pd.cut(df["risk_score"], bins=bins, labels=labels, include_lowest=True)
    print(df["risk_bucket"].value_counts().to_string())
    print("\nNext step: run  python ml/train/train_risk_model.py")


if __name__ == "__main__":
    main()
