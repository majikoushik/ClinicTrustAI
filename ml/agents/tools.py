"""
Stage 10 — Agents: LangChain Tools wrapping Express API
=========================================================
Each tool is a function the AI agent can call to interact with the live
ClinicTrust platform. The agent decides WHICH tools to use and in what
ORDER based on the user's natural language request.

LangChain Tool contract:
  - @tool decorator marks a function as a tool
  - The docstring IS the tool description (what the agent reads to decide when to use it)
  - Arguments must have type annotations (LangChain uses them for validation)
  - Return value should be a string (agent reads it to decide next step)

Tool design principles:
  - One responsibility per tool
  - Rich docstring so the agent understands when to use it
  - Graceful error handling — return error text, don't raise exceptions
  - No side effects unless the docstring says so

Usage:
  Import tools into clinical_agent.py, don't run this file directly.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import json
import requests
from langchain.tools import tool

from config.settings import API_BASE_URL, ADMIN_TOKEN


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {ADMIN_TOKEN}",
        "Content-Type":  "application/json",
    }


def _api_get(path: str, params: dict = None) -> dict:
    try:
        r = requests.get(f"{API_BASE_URL}{path}", headers=_headers(), params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        return {"error": str(e)}


def _api_post(path: str, body: dict) -> dict:
    try:
        r = requests.post(f"{API_BASE_URL}{path}", headers=_headers(), json=body, timeout=15)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        return {"error": str(e)}


# ── Patient Tools ─────────────────────────────────────────────────────────────

@tool
def get_high_risk_patients(risk_threshold: int = 75) -> str:
    """
    Fetches patients with a risk score above the given threshold.
    Use this to identify patients who need urgent attention.
    Default threshold is 75 (high risk). Use 90 for critical risk only.
    Returns a summary of patient names, risk scores, and primary conditions.
    """
    result = _api_get("/api/patients", {"riskScoreMin": risk_threshold, "limit": 20})
    if "error" in result:
        return f"Error fetching patients: {result['error']}"

    patients = result.get("patients") or result.get("data") or []
    if not patients:
        return f"No patients found with risk score >= {risk_threshold}."

    lines = [f"Found {len(patients)} patients with risk >= {risk_threshold}:"]
    for p in patients[:10]:
        conditions = [h.get("condition", "") for h in (p.get("medicalHistory") or [])[:2]]
        cond_str = ", ".join(conditions) if conditions else "no conditions listed"
        lines.append(f"  - {p.get('name', 'Unknown')}: risk={p.get('riskScore', '?')}, {cond_str}")

    return "\n".join(lines)


@tool
def get_patient_details(patient_name: str) -> str:
    """
    Fetches detailed clinical information for a patient by name.
    Use when you need medications, allergies, visit history, or full risk factors.
    Returns full patient profile including medical history and recent visits.
    """
    result = _api_get("/api/patients", {"search": patient_name, "limit": 3})
    if "error" in result:
        return f"Error: {result['error']}"

    patients = result.get("patients") or result.get("data") or []
    if not patients:
        return f"No patient found matching '{patient_name}'."

    p = patients[0]
    history = [h.get("condition", "") for h in (p.get("medicalHistory") or [])]
    meds = [m.get("name", "") for m in (p.get("medications") or [])]
    allergies = [a.get("allergen", "") for a in (p.get("allergies") or [])]
    visits = p.get("recentVisits") or []
    last_visit = visits[-1].get("date", "unknown") if visits else "no visits"

    return (
        f"Patient: {p.get('name')}\n"
        f"Risk Score: {p.get('riskScore', '?')}/100\n"
        f"Conditions: {', '.join(history) or 'none'}\n"
        f"Medications: {', '.join(meds) or 'none'}\n"
        f"Allergies: {', '.join(allergies) or 'none'}\n"
        f"Last Visit: {last_visit}\n"
        f"Total Visits: {len(visits)}"
    )


@tool
def get_care_gaps(days_without_visit: int = 90) -> str:
    """
    Lists patients who have not been seen in the specified number of days.
    Use to identify patients overdue for a follow-up visit.
    Default is 90 days. Returns patient name, last visit date, and risk score.
    """
    result = _api_get("/api/patients", {"limit": 100})
    if "error" in result:
        return f"Error: {result['error']}"

    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=days_without_visit)

    patients = result.get("patients") or result.get("data") or []
    gap_patients = []
    for p in patients:
        visits = [v for v in (p.get("recentVisits") or []) if v.get("date")]
        if not visits:
            gap_patients.append(p)
            continue
        last = max(datetime.fromisoformat(str(v["date"])[:10]) for v in visits)
        if last < cutoff:
            gap_patients.append(p)

    if not gap_patients:
        return f"No patients found without a visit in the last {days_without_visit} days."

    lines = [f"{len(gap_patients)} patients have not been seen in {days_without_visit}+ days:"]
    for p in gap_patients[:10]:
        lines.append(f"  - {p.get('name')}: risk={p.get('riskScore', '?')}")
    return "\n".join(lines)


# ── Analytics Tools ───────────────────────────────────────────────────────────

@tool
def trigger_analytics_job() -> str:
    """
    Triggers the analytics recalculation job on the platform.
    This updates all patient risk scores and generates a new AnalyticsSnapshot.
    Use when you suspect risk scores are stale or after significant data changes.
    Returns the job completion status and number of patients updated.
    WARNING: This is a write operation that updates the database.
    """
    result = _api_post("/api/admin/analytics/run-job", {})
    if "error" in result:
        return f"Analytics job failed: {result['error']}"
    return (
        f"Analytics job complete. "
        f"Patients updated: {result.get('patientsUpdated', '?')}. "
        f"Snapshot ID: {result.get('snapshot', {}).get('snapshotId', '?')}"
    )


@tool
def get_platform_analytics() -> str:
    """
    Fetches the latest platform-wide analytics snapshot.
    Returns key metrics: patient engagement, treatment adherence, risk distribution,
    referral volume, and acceptance rate. Use to understand overall platform health.
    """
    result = _api_get("/api/admin/analytics/run-job")
    if "error" in result:
        return f"Error fetching analytics: {result['error']}"

    metrics = result.get("metrics") or {}
    engagement  = metrics.get("patientEngagement",  {}).get("value", "?")
    adherence   = metrics.get("treatmentAdherence", {}).get("value", "?")
    risk_dist   = metrics.get("riskDistribution", {})
    ref_vol     = metrics.get("referralVolume",   {}).get("value", "?")
    ref_rate    = metrics.get("referralAcceptanceRate", {}).get("value", "?")

    return (
        f"Platform Analytics Snapshot:\n"
        f"  Patient Engagement:    {engagement}%\n"
        f"  Treatment Adherence:   {adherence}%\n"
        f"  Risk Distribution:     high={risk_dist.get('high',0)}, "
        f"medium={risk_dist.get('medium',0)}, low={risk_dist.get('low',0)}\n"
        f"  Referral Volume:       {ref_vol}\n"
        f"  Referral Acceptance:   {ref_rate}%"
    )


# ── Referral Tools ────────────────────────────────────────────────────────────

@tool
def find_referral_matches(specialty: str, insurance: str = "", urgency: str = "routine") -> str:
    """
    Finds the best matching providers for a referral by specialty and insurance.
    Use when a clinician needs to create a referral and wants provider recommendations.
    Returns top providers with match scores and availability status.
    """
    body = {
        "specialty":       specialty,
        "patientInsurance": insurance,
        "urgency":          urgency,
    }
    result = _api_post("/api/referrals/match", body)
    if "error" in result:
        return f"Matching error: {result['error']}"

    matches = result.get("matches") or []
    if not matches:
        return f"No providers found for {specialty} specialty."

    lines = [f"Top {specialty} providers:"]
    for m in matches[:5]:
        lines.append(
            f"  - {m.get('providerName', '?')}: "
            f"score={m.get('matchScore', '?')}, "
            f"accepting={'yes' if m.get('isAcceptingReferrals') else 'no'}"
        )
    return "\n".join(lines)


@tool
def get_active_alerts(severity: str = "") -> str:
    """
    Fetches active predictive alerts for the platform.
    Use to see which patients have been flagged by the AI alert system.
    Optional severity filter: 'critical', 'high', 'medium', 'low'.
    Returns alert type, patient name, severity, and recommendation.
    """
    params = {"status": "active", "limit": 20}
    if severity:
        params["severity"] = severity

    result = _api_get("/api/predictive-alerts", params)
    if "error" in result:
        return f"Error fetching alerts: {result['error']}"

    alerts = result.get("alerts") or result.get("data") or []
    if not alerts:
        return "No active alerts found."

    lines = [f"{len(alerts)} active alerts:"]
    for a in alerts[:10]:
        lines.append(
            f"  [{a.get('severity','?').upper()}] {a.get('type','?')}: "
            f"{a.get('patientName','?')} — {a.get('recommendation','')[:80]}"
        )
    return "\n".join(lines)


# ── ML Tools ──────────────────────────────────────────────────────────────────

@tool
def score_patient_risk_ml(patient_name: str) -> str:
    """
    Scores a patient's risk using the ML model (not the rule-based formula).
    Fetches the patient from the API, extracts features, and calls the FastAPI
    ML serving endpoint. Returns both ML score and rule-based score for comparison.
    Requires the FastAPI ML server to be running (python ml/serving/app.py).
    """
    import requests as req

    # Fetch patient
    patient_result = _api_get("/api/patients", {"search": patient_name, "limit": 1})
    patients = patient_result.get("patients") or patient_result.get("data") or []
    if not patients:
        return f"Patient '{patient_name}' not found."

    p = patients[0]

    # Build minimal feature vector
    from datetime import datetime
    history  = p.get("medicalHistory") or []
    meds     = [m for m in (p.get("medications") or []) if not m.get("endDate")]
    visits   = [v for v in (p.get("recentVisits") or []) if v.get("date")]
    last_visit_days = 9999
    if visits:
        try:
            last = max(datetime.fromisoformat(str(v["date"])[:10]) for v in visits)
            last_visit_days = (datetime.utcnow() - last).days
        except Exception:
            pass

    features = {
        "age": 0,  # would need DOB calculation
        "condition_count":          len(history),
        "high_condition_count":     sum(1 for h in history if any(t in str(h.get("condition","")).lower()
                                         for t in ["cancer","heart failure","copd","stroke"])),
        "active_med_count":         len(meds),
        "polypharmacy_5_9":         int(5 <= len(meds) <= 9),
        "polypharmacy_10_plus":     int(len(meds) >= 10),
        "days_since_last_visit":    last_visit_days,
        "gap_over_365":             int(last_visit_days >= 365),
    }

    try:
        r = req.post("http://localhost:8000/score/risk", json=features, timeout=5)
        ml_result = r.json()
        return (
            f"Risk score for {p.get('name')}:\n"
            f"  ML Model:       {ml_result.get('risk_score')}/100 "
            f"(v{ml_result.get('model_version')}, source={ml_result.get('source')})\n"
            f"  Rule-Based:     {p.get('riskScore', '?')}/100 (stored)"
        )
    except Exception as e:
        return f"ML server not reachable: {e}. Start it with: uvicorn ml.serving.app:app --port 8000"
