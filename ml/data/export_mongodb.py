"""
Stage 1 — Data Platform
=======================
Connects to MongoDB, exports the four key collections to Parquet files.

Why Parquet instead of CSV?
  - Preserves data types (dates stay dates, ints stay ints)
  - ~10× smaller files due to columnar compression
  - Readable by pandas, Polars, Spark, DuckDB — future-proof

Usage:
    python ml/data/export_mongodb.py

Output files (written to ml/data/exports/):
    patients.parquet          — all patients with medicalHistory, medications, etc.
    referral_outcomes.parquet — ReferralOutcome documents with outcomeScore labels
    match_sessions.parquet    — MatchSession documents (for learning-to-rank model)
    predictive_alerts.parquet — PredictiveAlert documents with wasActionTaken labels
    referrals.parquet         — Referral documents with status labels
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # VibeCoding root

import pandas as pd
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# Import central config
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config.settings import MONGODB_URI, DB_NAME, DATA_DIR


def _stringify_objectids(docs: list) -> list:
    """
    Converts ObjectId fields to strings so pandas can handle them.
    MongoDB ObjectIds are not JSON-serializable by default.
    """
    result = []
    for doc in docs:
        clean = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                clean[k] = str(v)
            elif isinstance(v, list):
                clean[k] = [str(i) if isinstance(i, ObjectId) else i for i in v]
            else:
                clean[k] = v
        result.append(clean)
    return result


def export_patients(db) -> int:
    """
    Exports patients with fields needed for risk score model training.

    The label (y) is patient.riskScore — computed by the rule-based
    analyticsCalculationService.js. We are training a model to predict
    this same label from the same features.

    Why include riskScore as label?
    The rule-based score is our "expert baseline". A trained model that
    matches it on training data but generalises better on new patients
    is strictly better — it can interpolate between the hard-coded buckets.
    """
    print("Exporting patients...")
    projection = {
        "_id": 1,
        "name": 1,
        "dateOfBirth": 1,
        "gender": 1,
        "medicalHistory": 1,
        "medications": 1,
        "allergies": 1,
        "recentVisits": 1,
        "riskScore": 1,
        "primaryProvider": 1,
        "insuranceInfo": 1,
        "createdAt": 1,
    }
    docs = list(db.patients.find({}, projection))
    docs = _stringify_objectids(docs)
    df = pd.DataFrame(docs)

    if df.empty:
        print("  No patient documents found — is your MONGODB_URI pointing at the right DB?")
        return 0

    out = DATA_DIR / "patients.parquet"
    df.to_parquet(out, index=False)
    print(f"  Exported {len(df)} patients → {out}")
    return len(df)


def export_referral_outcomes(db) -> int:
    """
    Exports ReferralOutcome documents.

    Label: outcomeScore (0-100, computed by the model's own formula).
    Features: specialty, urgency, accepted, timeToAppointmentDays, etc.
    Use: train a model to predict outcomeScore from features BEFORE the
    outcome is known — at referral creation time.
    """
    print("Exporting referral outcomes...")
    docs = list(db.referraloutcomes.find({}))
    docs = _stringify_objectids(docs)
    df = pd.DataFrame(docs)

    if df.empty:
        print("  No referral outcome documents found.")
        return 0

    out = DATA_DIR / "referral_outcomes.parquet"
    df.to_parquet(out, index=False)
    print(f"  Exported {len(df)} referral outcomes → {out}")
    return len(df)


def export_match_sessions(db) -> int:
    """
    Exports MatchSession documents for learning-to-rank.

    Each session = one referral matching search.
    selectedProviderId = which provider the clinician clicked (positive label).
    suggestions[] = full ranked list with scores (used to construct pairs).

    Learning-to-rank: for each session, pairs of
    (selected provider, non-selected provider) form training examples
    where the selected is preferred. XGBoost ranker or LambdaMART learns
    which provider features correlate with human selection.
    """
    print("Exporting match sessions...")
    docs = list(db.matchsessions.find({}))
    docs = _stringify_objectids(docs)
    df = pd.DataFrame(docs)

    if df.empty:
        print("  No match session documents found.")
        return 0

    out = DATA_DIR / "match_sessions.parquet"
    df.to_parquet(out, index=False)
    print(f"  Exported {len(df)} match sessions → {out}")
    return len(df)


def export_predictive_alerts(db) -> int:
    """
    Exports PredictiveAlert documents for alert precision calibration.

    Label: wasActionTaken (bool) — did the provider act on this alert?
    True = the alert was clinically useful (true positive).
    False = the provider dismissed it (likely false positive).

    Use: compute precision per alert type; calibrate thresholds in
    ml/monitoring/alert_calibration.py.
    """
    print("Exporting predictive alerts...")
    projection = {
        "_id": 1,
        "type": 1,
        "severity": 1,
        "riskScore": 1,
        "previousRiskScore": 1,
        "deltaScore": 1,
        "daysSinceLastVisit": 1,
        "status": 1,
        "wasActionTaken": 1,
        "providerId": 1,
        "patientId": 1,
        "generatedAt": 1,
        "expiresAt": 1,
    }
    docs = list(db.predictivealerts.find({}, projection))
    docs = _stringify_objectids(docs)
    df = pd.DataFrame(docs)

    if df.empty:
        print("  No predictive alert documents found.")
        return 0

    out = DATA_DIR / "predictive_alerts.parquet"
    df.to_parquet(out, index=False)
    print(f"  Exported {len(df)} predictive alerts → {out}")
    return len(df)


def export_referrals(db) -> int:
    """
    Exports Referral documents.
    Label: status (accepted/rejected/completed/cancelled).
    Binary label for classification: was_accepted = status in {accepted, completed}.
    """
    print("Exporting referrals...")
    projection = {
        "_id": 1,
        "patient": 1,
        "referringProvider": 1,
        "receivingProvider": 1,
        "urgency": 1,
        "status": 1,
        "reason": 1,
        "createdAt": 1,
        "appointmentDate": 1,
        "completionDate": 1,
    }
    docs = list(db.referrals.find({}, projection))
    docs = _stringify_objectids(docs)
    df = pd.DataFrame(docs)

    if df.empty:
        print("  No referral documents found.")
        return 0

    out = DATA_DIR / "referrals.parquet"
    df.to_parquet(out, index=False)
    print(f"  Exported {len(df)} referrals → {out}")
    return len(df)


def main():
    print(f"Connecting to MongoDB at {MONGODB_URI[:40]}...")
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10_000)

    try:
        # Verify connection
        client.admin.command("ping")
        print("Connection successful.\n")
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")
        print("Make sure your MONGODB_URI is set in ml/.env")
        sys.exit(1)

    db = client[DB_NAME]

    totals = {
        "patients":          export_patients(db),
        "referral_outcomes": export_referral_outcomes(db),
        "match_sessions":    export_match_sessions(db),
        "predictive_alerts": export_predictive_alerts(db),
        "referrals":         export_referrals(db),
    }

    print("\n── Export summary ──────────────────────────────")
    for name, count in totals.items():
        status = "✓" if count > 0 else "⚠ empty"
        print(f"  {status}  {name}: {count} records")

    print(f"\nParquet files written to: {DATA_DIR}")
    print("Next step: run  python ml/features/patient_features.py")


if __name__ == "__main__":
    main()
