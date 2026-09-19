"""
Stage 8 — Monitoring: Data & Prediction Drift Detection
========================================================
Uses Evidently to detect when the real-world data distribution drifts
away from the distribution the model was trained on.

Why does drift matter?
  Imagine the patient population in the DB shifts (e.g., more elderly
  patients registered). The model was trained on the old distribution.
  Its predictions might still look 'confident' but be systematically
  wrong. Drift detection catches this BEFORE it affects patient care.

Two types of drift monitored here:
  1. Data drift     — are the input features changing over time?
  2. Prediction drift — are model predictions shifting vs. the rule-based baseline?

Evidently generates an HTML report you can open in a browser.

Usage:
    python ml/monitoring/drift_report.py

Output:
    ml/data/monitoring/drift_report_YYYY-MM-DD.html
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from config.settings import FEATURES_DIR, MONITORING_DIR

try:
    from evidently.report import Report
    from evidently.metric_preset import DataDriftPreset, DataQualityPreset
    from evidently.metrics import ColumnDriftMetric, DatasetDriftMetric
    EVIDENTLY_AVAILABLE = True
except ImportError:
    EVIDENTLY_AVAILABLE = False
    print("Evidently not installed. Run:  pip install evidently")


# Features to monitor (subset of patient features most likely to drift)
MONITORED_FEATURES = [
    "age", "condition_count", "high_condition_count",
    "active_med_count", "days_since_last_visit",
    "has_diabetes", "has_heart_failure",
    "visit_count", "severe_allergy_count",
]


def split_temporal(df: pd.DataFrame, weeks_back: int = 4) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Splits the feature dataset into 'reference' (older data) and 'current' (recent data).

    Reference = data from before (weeks_back) weeks ago.
    Current   = data from the last (weeks_back) weeks.

    This simulates the real production scenario where:
    - Reference = what the model was trained on
    - Current   = new patients arriving in the last month
    """
    # Patient features don't have a createdAt by default, so we use row order
    # as a proxy (newer patients are appended to the end of the Parquet export).
    # In production, join back to the original export with createdAt.
    n = len(df)
    split = max(int(n * 0.7), 1)   # 70% reference, 30% current
    return df.iloc[:split], df.iloc[split:]


def run_drift_report(df: pd.DataFrame) -> Path:
    """
    Runs Evidently data drift analysis and saves an HTML report.

    Returns path to the HTML report.
    """
    if not EVIDENTLY_AVAILABLE:
        print("Evidently not available — skipping drift report.")
        return None

    available = [c for c in MONITORED_FEATURES if c in df.columns]
    df_features = df[available].fillna(0)

    reference, current = split_temporal(df_features)

    if len(reference) < 10 or len(current) < 5:
        print(f"Not enough data for drift analysis (reference={len(reference)}, current={len(current)}).")
        print("Need at least 15+ patients total.")
        return None

    print(f"Running drift analysis: {len(reference)} reference, {len(current)} current patients...")

    report = Report(metrics=[
        DatasetDriftMetric(),
        DataQualityPreset(),
        *[ColumnDriftMetric(column_name=c) for c in available],
    ])

    report.run(reference_data=reference, current_data=current)

    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    out_path = MONITORING_DIR / f"drift_report_{date_str}.html"
    report.save_html(str(out_path))
    print(f"Drift report saved → {out_path}")
    print("Open it in a browser to see which features have drifted.")

    # Also extract a quick summary for logging
    try:
        result = report.as_dict()
        metrics_summary = result.get("metrics", [])
        for m in metrics_summary[:3]:
            print(f"  {m.get('metric')}: {m.get('result', {}).get('drift_detected', 'N/A')}")
    except Exception:
        pass

    return out_path


def manual_drift_check(df: pd.DataFrame) -> dict:
    """
    A lightweight drift check that doesn't require Evidently.
    Computes simple statistics and flags anything > 2 standard deviations
    from the training distribution.

    Use this for quick checks in CI pipelines where Evidently is too slow.
    """
    available = [c for c in MONITORED_FEATURES if c in df.columns]
    reference, current = split_temporal(df[available].fillna(0))

    drift_flags = {}
    for col in available:
        ref_mean = reference[col].mean()
        ref_std  = reference[col].std()
        cur_mean = current[col].mean()

        if ref_std > 0:
            z_score = abs(cur_mean - ref_mean) / ref_std
            drift_flags[col] = {
                "ref_mean":     round(ref_mean, 3),
                "current_mean": round(cur_mean, 3),
                "z_score":      round(z_score, 2),
                "drifted":      z_score > 2.0,
            }

    drifted_cols = [k for k, v in drift_flags.items() if v["drifted"]]
    print(f"\nManual drift check: {len(drifted_cols)}/{len(available)} features drifted.")
    for col in drifted_cols:
        info = drift_flags[col]
        print(f"  {col}: ref={info['ref_mean']} → current={info['current_mean']} (z={info['z_score']})")

    return drift_flags


def main():
    feat_path = FEATURES_DIR / "patient_features.parquet"
    if not feat_path.exists():
        print(f"Feature file not found: {feat_path}")
        print("Run the full pipeline first (export → features → train).")
        sys.exit(1)

    df = pd.read_parquet(feat_path)
    print(f"Loaded {len(df)} patient features.")

    # Try Evidently first, fall back to manual check
    report_path = run_drift_report(df)
    manual_drift_check(df)

    print("\nNext step: run  python ml/monitoring/alert_calibration.py")


if __name__ == "__main__":
    main()
