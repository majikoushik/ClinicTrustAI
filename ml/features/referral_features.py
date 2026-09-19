"""
Stage 2 — Feature Engineering (Referral Outcomes)
==================================================
Transforms referral_outcomes.parquet into numeric features for the
referral outcome prediction model.

The target question: given a referral at creation time, what is the
probability that it will result in a high outcome score?

Usage:
    python ml/features/referral_features.py

Input:  ml/data/exports/referral_outcomes.parquet
Output: ml/data/features/referral_outcome_features.parquet
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pandas as pd
import numpy as np
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config.settings import DATA_DIR, FEATURES_DIR


SPECIALTY_CATEGORIES = [
    "cardiology", "oncology", "neurology", "orthopedics", "dermatology",
    "gastroenterology", "pulmonology", "nephrology", "endocrinology", "psychiatry",
    "urology", "rheumatology", "ophthalmology", "otolaryngology", "general",
]

URGENCY_MAP = {"routine": 0, "urgent": 1, "emergency": 2}


def extract_outcome_features(row: dict) -> dict:
    """
    Extracts features from a single ReferralOutcome document.

    Key insight: we only use features available AT THE TIME of referral creation.
    We cannot use 'appointmentAttended' (happens later) as a feature —
    that would be data leakage. But we CAN use it as an additional label.

    Available at creation time:
      - specialty (what was requested)
      - urgency
      - patient insurance (matched/not-matched proxy)
      - whether provider accepted

    Outcome labels:
      - outcomeScore (0-100 regression label)
      - accepted (binary classification label)
    """
    features = {"_id": str(row.get("_id", ""))}

    # ── Urgency ───────────────────────────────────────────────────────────────
    urgency = (row.get("urgency") or "routine").lower()
    features["urgency_code"] = URGENCY_MAP.get(urgency, 0)
    for u in ["routine", "urgent", "emergency"]:
        features[f"urgency_{u}"] = int(urgency == u)

    # ── Specialty ─────────────────────────────────────────────────────────────
    specialty = (row.get("specialty") or "general").lower().strip()
    for s in SPECIALTY_CATEGORIES:
        features[f"specialty_{s}"] = int(s in specialty)
    features["specialty_other"] = int(not any(s in specialty for s in SPECIALTY_CATEGORIES))

    # ── Outcome indicators ────────────────────────────────────────────────────
    features["accepted"]              = int(bool(row.get("accepted", False)))
    features["appointment_scheduled"] = int(bool(row.get("appointmentScheduled", False)))
    features["appointment_attended"]  = int(bool(row.get("appointmentAttended", False)))
    features["no_show"]               = int(
        bool(row.get("appointmentScheduled")) and not bool(row.get("appointmentAttended"))
    )
    features["readmission_30d"]       = int(bool(row.get("readmissionWithin30Days", False)))

    # ── Time to appointment ───────────────────────────────────────────────────
    tta = row.get("timeToAppointmentDays")
    if tta is not None and not pd.isna(tta):
        features["time_to_appt_days"] = float(tta)
        features["tta_lt_3"]  = int(tta <= 3)
        features["tta_4_7"]   = int(4 <= tta <= 7)
        features["tta_8_14"]  = int(8 <= tta <= 14)
        features["tta_gt_14"] = int(tta > 14)
    else:
        features["time_to_appt_days"] = np.nan
        features["tta_lt_3"]  = 0
        features["tta_4_7"]   = 0
        features["tta_8_14"]  = 0
        features["tta_gt_14"] = 0

    # ── Ratings ───────────────────────────────────────────────────────────────
    features["outcome_rating"]        = float(row.get("outcomeRating") or 0)
    features["patient_satisfaction"]  = float(row.get("patientSatisfaction") or 0)
    features["has_rating"]            = int(features["outcome_rating"] > 0)

    # ── Label ─────────────────────────────────────────────────────────────────
    features["outcome_score"] = float(row.get("outcomeScore") or 0)

    return features


def main():
    raw_path = DATA_DIR / "referral_outcomes.parquet"
    if not raw_path.exists():
        print(f"referral_outcomes.parquet not found at {raw_path}")
        print("Run  python ml/data/export_mongodb.py  first.")
        sys.exit(1)

    print(f"Reading {raw_path}...")
    raw = pd.read_parquet(raw_path)
    print(f"  {len(raw)} referral outcome records loaded.")

    rows = [extract_outcome_features(r.to_dict()) for _, r in raw.iterrows()]
    df = pd.DataFrame(rows)

    out = FEATURES_DIR / "referral_outcome_features.parquet"
    df.to_parquet(out, index=False)
    print(f"Feature matrix saved → {out}  shape: {df.shape}")
    print("\nNext step: run  python ml/train/train_referral_outcome_model.py")


if __name__ == "__main__":
    main()
