"""
Stage 5 — Model Registry: Promote If Better
============================================
Compares the latest trained model version against the current Production model.
If the new model is statistically better (RMSE improved by PROMOTE_MIN_IMPROVEMENT_RMSE),
it advances from Staging → Production and archives the old Production version.

This is the "champion/challenger" pattern used in production ML systems.

  Challenger (new run) → competes against → Champion (Production)
  If challenger wins → it becomes the new Champion

MLflow Model Registry stages:
  None      → freshly registered, not yet evaluated
  Staging   → validated, ready for A/B testing or shadow deployment
  Production → serving live traffic
  Archived  → retired, kept for audit/rollback

Usage:
    python ml/evaluate/promote_if_better.py --model clinictrust-risk-score
    python ml/evaluate/promote_if_better.py --model clinictrust-referral-outcome
"""

import sys
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mlflow
from mlflow.tracking import MlflowClient

from config.settings import (
    MLFLOW_TRACKING_URI,
    MODEL_NAME_RISK, MODEL_NAME_REFERRAL, MODEL_NAME_ALERT,
    PROMOTE_MIN_IMPROVEMENT_RMSE,
)

ALL_MODELS = [MODEL_NAME_RISK, MODEL_NAME_REFERRAL, MODEL_NAME_ALERT]


def get_metric(client: MlflowClient, run_id: str, metric_name: str) -> float | None:
    """Fetches a single metric value from a completed MLflow run."""
    try:
        metric = client.get_metric_history(run_id, metric_name)
        if metric:
            return metric[-1].value  # last logged value
    except Exception:
        pass
    return None


def promote_model(model_name: str, client: MlflowClient, dry_run: bool = False):
    """
    Champion/challenger promotion for one registered model.

    Steps:
      1. Find the most recent version in 'None' stage (newest candidate)
      2. Find the current 'Production' version (champion), if any
      3. Compare cv_rmse_mean metrics
      4. If challenger is better by PROMOTE_MIN_IMPROVEMENT_RMSE → promote
    """
    print(f"\n── {model_name} ─────────────────────────────────────────────────────")

    versions = client.search_model_versions(f"name='{model_name}'")
    if not versions:
        print("  No versions registered yet.")
        return

    # Sort by creation time, newest first
    versions_sorted = sorted(versions, key=lambda v: v.creation_timestamp, reverse=True)

    # Find challenger: latest version in 'None' stage
    challenger = next((v for v in versions_sorted if v.current_stage == "None"), None)
    # Find champion: current Production version
    champion = next((v for v in versions_sorted if v.current_stage == "Production"), None)

    if not challenger:
        print("  No undeployed versions (stage=None) to evaluate.")
        return

    print(f"  Challenger: version {challenger.version} (run {challenger.run_id[:8]}...)")

    # Get challenger metric
    challenger_rmse = get_metric(client, challenger.run_id, "cv_rmse_mean")
    if challenger_rmse is None:
        # Try AUC for classifiers
        challenger_rmse = get_metric(client, challenger.run_id, "model_a_cv_accuracy_mean")

    if champion:
        print(f"  Champion:   version {champion.version} (run {champion.run_id[:8]}...)")
        champion_rmse = get_metric(client, champion.run_id, "cv_rmse_mean")
        if champion_rmse is None:
            champion_rmse = get_metric(client, champion.run_id, "model_a_cv_accuracy_mean")
    else:
        print("  Champion:   none (first deployment)")
        champion_rmse = None

    print(f"  Challenger RMSE: {challenger_rmse}")
    print(f"  Champion RMSE:   {champion_rmse}")

    # Decision logic
    should_promote = False
    reason = ""

    if champion_rmse is None:
        should_promote = True
        reason = "No existing Production model — promoting first version."
    elif challenger_rmse is None:
        should_promote = False
        reason = "Challenger has no tracked metric — skipping promotion."
    else:
        improvement = champion_rmse - challenger_rmse
        if improvement >= PROMOTE_MIN_IMPROVEMENT_RMSE:
            should_promote = True
            reason = f"Improvement of {improvement:.3f} exceeds threshold {PROMOTE_MIN_IMPROVEMENT_RMSE}."
        else:
            should_promote = False
            reason = (
                f"Improvement of {improvement:.3f} below threshold {PROMOTE_MIN_IMPROVEMENT_RMSE}. "
                "Keeping current Production version."
            )

    print(f"  Decision: {'PROMOTE' if should_promote else 'KEEP CHAMPION'}")
    print(f"  Reason:   {reason}")

    if should_promote and not dry_run:
        # Archive existing Production (if any)
        if champion:
            client.transition_model_version_stage(
                name=model_name,
                version=champion.version,
                stage="Archived",
                archive_existing_versions=False,
            )
            print(f"  Archived version {champion.version}.")

        # Promote challenger to Production
        client.transition_model_version_stage(
            name=model_name,
            version=challenger.version,
            stage="Production",
            archive_existing_versions=False,
        )
        print(f"  Promoted version {challenger.version} → Production.")
    elif dry_run:
        print("  (DRY RUN — no changes made)")


def main():
    parser = argparse.ArgumentParser(description="Promote ML models to Production if improved.")
    parser.add_argument("--model", choices=ALL_MODELS + ["all"], default="all",
                        help="Which model to evaluate (default: all)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print decisions without making changes")
    args = parser.parse_args()

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    client = MlflowClient()

    models_to_check = ALL_MODELS if args.model == "all" else [args.model]

    print(f"MLflow tracking URI: {MLFLOW_TRACKING_URI}")
    print(f"Evaluating {len(models_to_check)} model(s)...")

    for model_name in models_to_check:
        try:
            promote_model(model_name, client, dry_run=args.dry_run)
        except Exception as e:
            print(f"  ERROR evaluating {model_name}: {e}")

    print("\nDone. View the registry at:")
    print(f"  {MLFLOW_TRACKING_URI}/#/models")


if __name__ == "__main__":
    main()
