"""
Phase 1 — Fairness & Bias Audit
================================
Why this is non-negotiable for healthcare AI:
  A risk model with RMSE=8 on the whole population may have RMSE=6 for
  commercially-insured young patients and RMSE=14 for elderly Medicare
  patients. The model LOOKS good overall but systematically under-serves
  the patients who need it most. This is both an ethical problem and a
  regulatory risk (HHS non-discrimination requirements, EU AI Act Article 9).

What we measure:
  1. RMSE (Root Mean Squared Error) per demographic group
     — Is prediction error equal across groups?
  2. Prediction bias (mean predicted - mean actual) per group
     — Does the model systematically over/under-score any group?
  3. Disparate impact ratio (worst group RMSE / best group RMSE)
     — Industry threshold: flag if ratio > 1.25 (25% worse)
  4. Coverage gap (% patients with complete lab data)
     — If a group gets fewer lab tests, the model has less signal for them

Sensitive groups audited:
  - Age bracket: young (18-44), middle (45-64), senior (65-74), elderly (75+)
  - Gender: male, female, other
  - Insurance type: commercial vs government (Medicare/Medicaid)

Fairlearn MetricFrame:
  This is the standard tool for auditing ML fairness. It computes any
  metric you pass, broken down by any sensitive feature, and flags
  inter-group differences that exceed acceptable thresholds.

Usage:
    python ml/evaluate/fairness_audit.py
    python ml/evaluate/fairness_audit.py --model risk --report
    python ml/evaluate/fairness_audit.py --model referral --threshold 1.30
"""

import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

from config.settings import (
    FEATURES_DIR, ARTIFACTS_DIR, EVAL_DIR,
    MLFLOW_TRACKING_URI, MODEL_NAME_RISK, MODEL_NAME_REFERRAL,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Flag if worst group's RMSE is more than this factor worse than the best group
DISPARATE_IMPACT_THRESHOLD = 1.25

# ── Metric helpers ────────────────────────────────────────────────────────────

def _rmse(y_true, y_pred):
    return float(np.sqrt(np.mean((np.array(y_true) - np.array(y_pred)) ** 2)))

def _mae(y_true, y_pred):
    return float(np.mean(np.abs(np.array(y_true) - np.array(y_pred))))

def _mean_bias(y_true, y_pred):
    """Positive = model over-predicts (over-scores risk); Negative = under-predicts."""
    return float(np.mean(np.array(y_pred) - np.array(y_true)))

def _r2(y_true, y_pred):
    ss_res = np.sum((np.array(y_true) - np.array(y_pred)) ** 2)
    ss_tot = np.sum((np.array(y_true) - np.mean(y_true)) ** 2)
    return float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0


# ── Sensitive feature constructors ───────────────────────────────────────────

def _build_sensitive_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Builds demographic group columns from the feature matrix.
    These are the sensitive attributes we audit against.

    Groups are defined conservatively to have enough samples per cell —
    too-granular groups produce unreliable metrics.
    """
    sensitive = pd.DataFrame(index=df.index)

    # Age bracket
    if "age" in df.columns:
        sensitive["age_group"] = pd.cut(
            df["age"],
            bins=[0, 44, 64, 74, 120],
            labels=["young_18_44", "middle_45_64", "senior_65_74", "elderly_75plus"],
        ).astype(str)
    elif "age_ge_75" in df.columns and "age_ge_65" in df.columns:
        # Reconstruct approximate group from binary flags
        def _age_group(row):
            if row.get("age_ge_75", 0): return "elderly_75plus"
            if row.get("age_ge_65", 0): return "senior_65_74"
            return "younger_under_65"
        sensitive["age_group"] = df.apply(_age_group, axis=1)
    else:
        sensitive["age_group"] = "unknown"

    # Insurance type: government (Medicare/Medicaid) vs commercial vs other
    if "insurance_type" in df.columns:
        def _ins_class(v):
            v = str(v).lower()
            if any(x in v for x in ["medicare", "medicaid", "tricare", "wellcare", "centene", "molina"]):
                return "government"
            if any(x in v for x in ["blue cross", "aetna", "cigna", "united", "humana", "anthem", "oscar", "kaiser"]):
                return "commercial"
            return "other"
        sensitive["insurance_class"] = df["insurance_type"].map(_ins_class)
    else:
        sensitive["insurance_class"] = "unknown"

    # Gender
    if "gender" in df.columns:
        sensitive["gender"] = df["gender"].map(
            lambda g: str(g).lower() if str(g).lower() in ("male", "female") else "other"
        )
    else:
        sensitive["gender"] = "unknown"

    # Lab completeness tier: does this patient have complete labs?
    lab_cols = [c for c in df.columns if c.endswith("_latest")]
    if lab_cols:
        lab_completeness = df[lab_cols].notna().mean(axis=1)
        sensitive["lab_completeness"] = pd.cut(
            lab_completeness,
            bins=[-0.01, 0.33, 0.66, 1.01],
            labels=["sparse_labs", "partial_labs", "complete_labs"],
        ).astype(str)
    else:
        sensitive["lab_completeness"] = "unknown"

    return sensitive


# ── Core audit function ───────────────────────────────────────────────────────

def run_fairness_audit(
    model_name: str = "risk",
    threshold: float = DISPARATE_IMPACT_THRESHOLD,
    save_report: bool = True,
) -> dict:
    """
    Runs the full fairness audit for the specified model.

    Steps:
      1. Load feature Parquet and labels
      2. Load model and generate predictions
      3. Build sensitive feature groups
      4. Compute MetricFrame — RMSE, MAE, bias per group
      5. Flag groups exceeding the disparate impact threshold
      6. Generate HTML report and console summary

    Returns a dict with full audit results (also printed to console).
    """
    import mlflow

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

    # ── Load features & labels ────────────────────────────────────────────────
    feature_file = {
        "risk":     FEATURES_DIR / "patient_features.parquet",
        "referral": FEATURES_DIR / "referral_features.parquet",
    }.get(model_name)

    if feature_file is None or not feature_file.exists():
        raise FileNotFoundError(
            f"Feature file not found: {feature_file}. "
            f"Run: python ml/features/{'patient' if model_name=='risk' else 'referral'}_features.py"
        )

    df = pd.read_parquet(feature_file)
    label_col = "risk_score" if model_name == "risk" else "outcome_score"
    id_cols   = [c for c in ["patient_id", "_id", "referral_id"] if c in df.columns]

    if label_col not in df.columns:
        raise ValueError(f"Label column '{label_col}' not found in feature file.")

    y_true = df[label_col].values
    meta_cols = [label_col] + id_cols
    X = df.drop(columns=[c for c in meta_cols if c in df.columns])

    # ── Load model & predict ──────────────────────────────────────────────────
    model_registry_name = MODEL_NAME_RISK if model_name == "risk" else MODEL_NAME_REFERRAL
    model_uri = f"models:/{model_registry_name}/Production"

    try:
        model = mlflow.pyfunc.load_model(model_uri)
        y_pred = model.predict(X)
        y_pred = np.clip(y_pred, 0, 100)
        model_source = "mlflow_registry"
        logger.info(f"Loaded {model_registry_name} from MLflow registry.")
    except Exception as e:
        logger.warning(f"Could not load from MLflow: {e}. Attempting local fallback.")
        import joblib
        local = ARTIFACTS_DIR / f"{model_name}_model.pkl"
        if not local.exists():
            raise RuntimeError(f"No model available. Run: python ml/train/train_{model_name}_model.py") from e
        artifact = joblib.load(local)
        m = artifact.get("model")
        y_pred = np.clip(m.predict(X), 0, 100)
        model_source = "local_artifact"

    y_pred = np.array(y_pred, dtype=float)

    # ── Build sensitive features ──────────────────────────────────────────────
    sensitive = _build_sensitive_features(df)

    # ── Compute metrics per group ─────────────────────────────────────────────
    overall = {
        "rmse":  _rmse(y_true, y_pred),
        "mae":   _mae(y_true, y_pred),
        "bias":  _mean_bias(y_true, y_pred),
        "r2":    _r2(y_true, y_pred),
        "n":     len(y_true),
    }

    group_results = {}
    flags = []

    for sens_col in ["age_group", "insurance_class", "gender", "lab_completeness"]:
        if sens_col not in sensitive.columns:
            continue
        groups = sensitive[sens_col].unique()
        group_metrics = {}
        for grp in groups:
            mask = sensitive[sens_col] == grp
            if mask.sum() < 10:
                continue  # skip groups with too few samples
            group_metrics[grp] = {
                "rmse":  _rmse(y_true[mask], y_pred[mask]),
                "mae":   _mae(y_true[mask], y_pred[mask]),
                "bias":  _mean_bias(y_true[mask], y_pred[mask]),
                "r2":    _r2(y_true[mask], y_pred[mask]),
                "n":     int(mask.sum()),
            }

        if not group_metrics:
            continue
        group_results[sens_col] = group_metrics

        # Disparate impact check
        rmse_vals = {k: v["rmse"] for k, v in group_metrics.items()}
        best_rmse = min(rmse_vals.values())
        worst_rmse = max(rmse_vals.values())
        di_ratio = worst_rmse / best_rmse if best_rmse > 0 else 1.0

        if di_ratio > threshold:
            worst_grp = max(rmse_vals, key=rmse_vals.get)
            best_grp  = min(rmse_vals, key=rmse_vals.get)
            flags.append({
                "dimension":   sens_col,
                "worst_group": worst_grp,
                "best_group":  best_grp,
                "di_ratio":    round(di_ratio, 3),
                "worst_rmse":  round(worst_rmse, 2),
                "best_rmse":   round(best_rmse, 2),
                "severity":    "HIGH" if di_ratio > 1.5 else "MEDIUM",
                "message": (
                    f"[{sens_col}] Group '{worst_grp}' has {di_ratio:.2f}x worse RMSE "
                    f"than '{best_grp}' ({worst_rmse:.1f} vs {best_rmse:.1f}). "
                    f"Threshold: {threshold:.2f}x."
                ),
            })

    # ── Try fairlearn MetricFrame (optional dependency) ───────────────────────
    fairlearn_available = False
    try:
        from fairlearn.metrics import MetricFrame, mean_absolute_error as fl_mae
        from sklearn.metrics import mean_squared_error

        def _rmse_sklearn(y_true, y_pred):
            return float(np.sqrt(mean_squared_error(y_true, y_pred)))

        if "age_group" in sensitive.columns:
            mf = MetricFrame(
                metrics={"rmse": _rmse_sklearn, "mae": fl_mae},
                y_true=y_true,
                y_pred=y_pred,
                sensitive_features=sensitive["age_group"],
            )
            fairlearn_summary = {
                "by_age_group": mf.by_group.to_dict(),
                "overall":      mf.overall.to_dict(),
                "group_min":    mf.group_min().to_dict(),
                "group_max":    mf.group_max().to_dict(),
                "difference":   mf.difference().to_dict(),   # max - min
                "ratio":        mf.ratio().to_dict(),         # min / max
            }
            fairlearn_available = True
        else:
            fairlearn_summary = {}
    except ImportError:
        logger.warning("fairlearn not installed. Running manual group analysis only.")
        fairlearn_summary = {}
    except Exception as e:
        logger.warning(f"fairlearn MetricFrame failed: {e}")
        fairlearn_summary = {}

    # ── Compile results ───────────────────────────────────────────────────────
    audit_result = {
        "model":              model_name,
        "model_source":       model_source,
        "audited_at":         datetime.utcnow().isoformat(),
        "n_patients":         int(len(y_true)),
        "overall_metrics":    {k: round(v, 3) if isinstance(v, float) else v for k, v in overall.items()},
        "group_metrics":      group_results,
        "fairlearn":          fairlearn_summary,
        "disparate_impact_threshold": threshold,
        "flags":              flags,
        "passed":             len(flags) == 0,
        "summary": (
            f"PASS — no disparate impact detected across {len(group_results)} dimensions."
            if len(flags) == 0 else
            f"FAIL — {len(flags)} disparate impact flag(s) detected. Review required."
        ),
    }

    # ── Console output ────────────────────────────────────────────────────────
    _print_audit_summary(audit_result)

    # ── Save report ───────────────────────────────────────────────────────────
    if save_report:
        report_path = _save_report(audit_result, model_name)
        audit_result["report_path"] = str(report_path)

    return audit_result


# ── Console summary ───────────────────────────────────────────────────────────

def _print_audit_summary(result: dict):
    print("\n" + "="*70)
    print(f"  FAIRNESS AUDIT — {result['model'].upper()} MODEL")
    print("="*70)
    om = result["overall_metrics"]
    print(f"\n  Overall Performance (n={om['n']})")
    print(f"    RMSE  : {om['rmse']:.2f}  |  MAE: {om['mae']:.2f}  |  R²: {om['r2']:.3f}")
    print(f"    Bias  : {om['bias']:+.2f} (positive = model over-scores risk)")

    for dim, groups in result.get("group_metrics", {}).items():
        print(f"\n  [{dim}]")
        print(f"    {'Group':<22} {'N':>5}  {'RMSE':>6}  {'MAE':>6}  {'Bias':>7}")
        print(f"    {'-'*50}")
        for grp, m in sorted(groups.items()):
            flag = "  ⚠" if any(f["worst_group"]==grp and f["dimension"]==dim for f in result["flags"]) else ""
            print(f"    {grp:<22} {m['n']:>5}  {m['rmse']:>6.2f}  {m['mae']:>6.2f}  {m['bias']:>+7.2f}{flag}")

    print(f"\n  {'─'*68}")
    if result["flags"]:
        print(f"  ⚠  {len(result['flags'])} DISPARATE IMPACT FLAG(S):")
        for f in result["flags"]:
            print(f"     [{f['severity']}] {f['message']}")
    else:
        print(f"  ✓  No disparate impact detected (threshold: {result['disparate_impact_threshold']:.2f}x)")

    print(f"\n  VERDICT: {result['summary']}")
    print("="*70 + "\n")


# ── HTML report generator ─────────────────────────────────────────────────────

def _save_report(result: dict, model_name: str) -> Path:
    """Saves both a JSON and an HTML report."""
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    # JSON
    json_path = EVAL_DIR / f"fairness_audit_{model_name}_{ts}.json"
    with open(json_path, "w") as f:
        json.dump(result, f, indent=2, default=str)
    logger.info(f"Audit JSON: {json_path}")

    # HTML
    html_path = EVAL_DIR / f"fairness_audit_{model_name}_{ts}.html"
    _write_html_report(result, html_path)
    logger.info(f"Audit HTML: {html_path}")
    return html_path


def _write_html_report(result: dict, path: Path):
    flag_html = ""
    for f in result.get("flags", []):
        colour = "#d32f2f" if f["severity"] == "HIGH" else "#f57c00"
        flag_html += (
            f'<div style="background:{colour};color:white;padding:10px 15px;'
            f'margin:6px 0;border-radius:4px;">'
            f'<strong>[{f["severity"]}]</strong> {f["message"]}</div>'
        )
    if not flag_html:
        flag_html = '<div style="background:#388e3c;color:white;padding:10px 15px;border-radius:4px;">✓ No disparate impact detected</div>'

    group_tables = ""
    for dim, groups in result.get("group_metrics", {}).items():
        rows = ""
        for grp, m in sorted(groups.items()):
            flagged = any(f["worst_group"]==grp and f["dimension"]==dim for f in result.get("flags",[]))
            bg = "#fff3e0" if flagged else ""
            rows += (
                f'<tr style="background:{bg};">'
                f'<td>{grp}</td><td>{m["n"]}</td>'
                f'<td>{m["rmse"]:.2f}</td><td>{m["mae"]:.2f}</td>'
                f'<td>{m["bias"]:+.2f}</td><td>{m["r2"]:.3f}</td></tr>'
            )
        group_tables += f"""
        <h3 style="margin-top:24px;">{dim}</h3>
        <table border="1" cellpadding="6" cellspacing="0"
               style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead style="background:#1976d2;color:white;">
            <tr><th>Group</th><th>N</th><th>RMSE</th><th>MAE</th><th>Bias</th><th>R²</th></tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>"""

    om = result["overall_metrics"]
    verdict_colour = "#388e3c" if result["passed"] else "#d32f2f"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ClinicTrust Fairness Audit — {result['model'].upper()}</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #212121; }}
  h1 {{ color: #1565c0; }} h2 {{ color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom:4px; }}
  .verdict {{ font-size: 18px; font-weight: bold; color: {verdict_colour}; padding: 12px;
              background: #f5f5f5; border-left: 5px solid {verdict_colour}; }}
  table {{ font-size: 13px; }} td, th {{ padding: 6px 10px; }}
</style>
</head>
<body>
<h1>ClinicTrust AI — Fairness &amp; Bias Audit</h1>
<p><strong>Model:</strong> {result['model']} &nbsp;|&nbsp;
   <strong>Audited:</strong> {result['audited_at']} &nbsp;|&nbsp;
   <strong>Patients:</strong> {result['n_patients']}</p>

<h2>Overall Performance</h2>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>RMSE</td><td>{om['rmse']:.3f}</td></tr>
  <tr><td>MAE</td><td>{om['mae']:.3f}</td></tr>
  <tr><td>Mean Bias</td><td>{om['bias']:+.3f}</td></tr>
  <tr><td>R²</td><td>{om['r2']:.4f}</td></tr>
</table>

<h2>Disparate Impact Findings</h2>
{flag_html}

<h2>Performance by Demographic Group</h2>
<p style="color:#555;font-size:12px;">Rows highlighted in orange indicate a flagged disparity.
Threshold: {result['disparate_impact_threshold']:.2f}x.</p>
{group_tables}

<h2>Audit Verdict</h2>
<div class="verdict">{result['summary']}</div>

<hr style="margin-top:32px;">
<p style="font-size:11px;color:#888;">
  Generated by ClinicTrust ML Pipeline &nbsp;|&nbsp;
  Disparate impact threshold: {result['disparate_impact_threshold']:.2f}x &nbsp;|&nbsp;
  Fairlearn: {'available' if result.get('fairlearn') else 'not installed'}
</p>
</body>
</html>"""

    with open(path, "w", encoding="utf-8") as f:
        f.write(html)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fairness audit for ClinicTrust ML models")
    parser.add_argument("--model",     default="risk",  choices=["risk","referral"], help="Which model to audit")
    parser.add_argument("--threshold", default=1.25,    type=float, help="Disparate impact threshold (default 1.25)")
    parser.add_argument("--report",    action="store_true", help="Save HTML report (default: True)")
    parser.add_argument("--no-report", action="store_true", help="Skip saving report")
    args = parser.parse_args()

    save = not args.no_report
    result = run_fairness_audit(model_name=args.model, threshold=args.threshold, save_report=save)

    # Exit code for CI: non-zero if audit fails (enables pipeline to fail on bias)
    if not result["passed"]:
        print(f"\nAudit FAILED — {len(result['flags'])} flag(s). Review report before promoting model.")
        sys.exit(1)
    else:
        print(f"\nAudit PASSED.")
        sys.exit(0)


if __name__ == "__main__":
    main()
