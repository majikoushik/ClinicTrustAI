"""
Stage 8 — Monitoring: Alert Threshold Calibration (Gap 5 Fix)
==============================================================
Reads alert feedback (wasActionTaken) and computes precision per alert type.
Suggests updated threshold values and writes them to AIConfig in MongoDB.

This closes GAP 5: predictiveAlertService.js uses hardcoded thresholds,
but AIConfig already stores them. This script auto-tunes those values
from real provider feedback data.

Calibration logic:
  For each alert type, compute precision = (alerts where wasActionTaken=True) / total_alerts.
  If precision < 0.6, suggest raising the threshold (fewer, higher-quality alerts).
  If precision > 0.9 and alert count is low, suggest lowering the threshold
  (we may be missing actionable cases).

Usage:
    python ml/monitoring/alert_calibration.py
    python ml/monitoring/alert_calibration.py --apply   # writes to MongoDB
"""

import sys
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
from pymongo import MongoClient

from config.settings import MONGODB_URI, DB_NAME, DATA_DIR


# Current defaults (from predictiveAlertService.js THRESHOLDS object)
CURRENT_THRESHOLDS = {
    "readmission_risk":     {"field": "riskScore.highRiskThreshold", "current": 75},
    "care_gap":             {"field": "riskScore.careGapDays",        "current": 60},
    "medication_adherence": {"field": "riskScore.medAdherenceDays",   "current": 120},
    "risk_score_increase":  {"field": "riskScore.alertOnIncrease",    "current": 15},
}

TARGET_PRECISION    = 0.65   # below this → raise threshold (reduce false positives)
PRECISION_CEILING   = 0.90   # above this with low count → lower threshold


def compute_precision_by_type(df: pd.DataFrame) -> dict:
    """
    Computes alert precision = True positive rate per alert type.

    In clinical terms: of all the alerts we fired for this type,
    what fraction did the provider consider worth acting on?

    Only includes alerts that have been reviewed (status != 'active' or wasActionTaken is set).
    """
    reviewed = df.dropna(subset=["wasActionTaken"])
    if reviewed.empty:
        print("No reviewed alerts found. Providers must acknowledge/resolve alerts to generate feedback.")
        return {}

    stats = {}
    for alert_type, group in reviewed.groupby("type"):
        total     = len(group)
        acted_on  = group["wasActionTaken"].astype(int).sum()
        precision = acted_on / total if total > 0 else 0
        stats[alert_type] = {
            "total":     total,
            "acted_on":  int(acted_on),
            "precision": round(float(precision), 3),
        }

    return stats


def suggest_threshold_changes(stats: dict) -> list[dict]:
    """
    Based on precision metrics, suggests threshold adjustments.
    Returns a list of suggested AIConfig updates.
    """
    suggestions = []

    for alert_type, s in stats.items():
        if alert_type not in CURRENT_THRESHOLDS:
            continue

        cfg  = CURRENT_THRESHOLDS[alert_type]
        prec = s["precision"]
        n    = s["total"]

        if prec < TARGET_PRECISION and n >= 10:
            # Too many false positives — raise the threshold
            if alert_type == "readmission_risk":
                new_val = min(cfg["current"] + 5, 90)
            elif alert_type == "care_gap":
                new_val = min(cfg["current"] + 10, 120)
            else:
                new_val = cfg["current"] + 5

            suggestions.append({
                "key":       cfg["field"],
                "old_value": cfg["current"],
                "new_value": new_val,
                "reason":    f"Precision {prec:.1%} < {TARGET_PRECISION:.0%} ({n} alerts reviewed)",
                "direction": "raise",
            })

        elif prec > PRECISION_CEILING and n < 20:
            # Very high precision but low volume — we might be too conservative
            if alert_type == "readmission_risk":
                new_val = max(cfg["current"] - 3, 65)
            elif alert_type == "care_gap":
                new_val = max(cfg["current"] - 5, 30)
            else:
                new_val = max(cfg["current"] - 3, 5)

            suggestions.append({
                "key":       cfg["field"],
                "old_value": cfg["current"],
                "new_value": new_val,
                "reason":    f"Precision {prec:.1%} > {PRECISION_CEILING:.0%} but only {n} alerts — threshold may be too high",
                "direction": "lower",
            })

    return suggestions


def apply_to_mongodb(suggestions: list, client: MongoClient):
    """
    Writes suggested thresholds to AIConfig collection.
    These will be picked up by predictiveAlertService.js on its next run
    AFTER you apply the Gap 5 fix that reads from AIConfig at runtime.
    """
    db = client[DB_NAME]
    for s in suggestions:
        db.aiconfigs.update_one(
            {"key": s["key"]},
            {"$set": {
                "value":     s["new_value"],
                "updatedBy": "ml-calibration-job",
                "updatedAt": pd.Timestamp.utcnow().isoformat(),
                "calibrationReason": s["reason"],
            }},
            upsert=True,
        )
        print(f"  Updated AIConfig {s['key']}: {s['old_value']} → {s['new_value']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write changes to MongoDB AIConfig")
    args = parser.parse_args()

    alert_path = DATA_DIR / "predictive_alerts.parquet"
    if not alert_path.exists():
        print(f"predictive_alerts.parquet not found at {alert_path}")
        print("Run  python ml/data/export_mongodb.py  first.")
        sys.exit(1)

    df = pd.read_parquet(alert_path)
    print(f"Loaded {len(df)} alert records.")

    # Precision by type
    stats = compute_precision_by_type(df)
    if not stats:
        sys.exit(0)

    print("\n── Alert Precision by Type ──────────────────────────────────────────")
    for alert_type, s in stats.items():
        flag = "⚠" if s["precision"] < TARGET_PRECISION else "✓"
        print(f"  {flag} {alert_type:30s} precision={s['precision']:.1%}  n={s['total']}")

    suggestions = suggest_threshold_changes(stats)

    print("\n── Suggested Threshold Adjustments ─────────────────────────────────")
    if not suggestions:
        print("  No adjustments needed — all alert types within target precision range.")
    else:
        for s in suggestions:
            arrow = "↑" if s["direction"] == "raise" else "↓"
            print(f"  {arrow} {s['key']}: {s['old_value']} → {s['new_value']}")
            print(f"    Reason: {s['reason']}")

    if args.apply and suggestions:
        print("\nApplying changes to MongoDB AIConfig...")
        mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10_000)
        apply_to_mongodb(suggestions, mongo_client)
        print("Done. Thresholds updated.")
        print("Note: predictiveAlertService.js must be updated to read from AIConfig")
        print("      (see the Gap 5 fix in server/services/predictiveAlertService.js)")
    elif suggestions:
        print("\nRun with --apply to write changes to MongoDB.")


if __name__ == "__main__":
    main()
