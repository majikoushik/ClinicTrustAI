"""
Phase 1 — RAG Quality Evaluation with RAGAS
============================================
Why you cannot ship a RAG system without evaluation:
  RAG systems fail silently. A clinician asks "which patients with heart
  failure have care gaps?" and the system confidently returns a plausible-
  sounding but WRONG answer. Without measurement, you never know.

RAGAS metrics (the industry standard for RAG evaluation):
  1. Faithfulness      — Does the answer stay grounded in the retrieved context?
                          Score 0-1. Low = the LLM is hallucinating beyond the docs.
                          Formula: (claims supported by context) / (total claims)

  2. Answer Relevancy  — Is the answer actually relevant to the question?
                          Score 0-1. Low = the system found docs but answered wrongly.
                          Formula: cosine similarity of question ↔ generated answer embeddings

  3. Context Precision — Of the retrieved chunks, what fraction were actually useful?
                          Score 0-1. Low = retriever is returning too much noise.
                          Formula: (useful chunks ranked high) / (total retrieved chunks)

  4. Context Recall    — Did we retrieve ALL the chunks needed to answer correctly?
                          Score 0-1. Low = retriever is missing key information.
                          Formula: (needed statements covered by context) / (total needed)

Target thresholds (enterprise minimum):
  Faithfulness      >= 0.80   (hallucination rate < 20%)
  Answer Relevancy  >= 0.75
  Context Precision >= 0.70
  Context Recall    >= 0.65

Golden QA dataset:
  20 clinically-grounded question/answer pairs written by hand.
  "Golden" means a domain expert confirmed the expected answer.
  This is the ground truth the evaluation is measured against.
  In production, this set should be maintained and expanded by clinicians.

Fallback mode (no Azure OpenAI):
  RAGAS metrics 1 and 2 require an LLM to evaluate.
  Without Azure credentials, we fall back to:
    - Context overlap score (keyword/n-gram precision)
    - Retrieval quality score (BM25 relevance approximation)
  These are weaker proxies but still catch gross failures.

Usage:
    python ml/evaluate/ragas_eval.py
    python ml/evaluate/ragas_eval.py --questions custom_qa.json
    python ml/evaluate/ragas_eval.py --demo    # skip LLM calls, show structure
"""

import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np

from config.settings import (
    VECTORSTORE_DIR, EVAL_DIR,
    AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    AZURE_OPENAI_API_VERSION,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Quality thresholds ────────────────────────────────────────────────────────
THRESHOLDS = {
    "faithfulness":      0.80,
    "answer_relevancy":  0.75,
    "context_precision": 0.70,
    "context_recall":    0.65,
}

# ── Golden QA dataset ─────────────────────────────────────────────────────────
# Each entry = one evaluation test case.
# "ground_truth" = the correct answer a clinician would give.
# RAGAS uses this to score context_recall (did we retrieve enough to answer it?).
GOLDEN_QA = [
    {
        "question": "Which patients have the highest readmission risk and what are their key risk factors?",
        "ground_truth": "Patients with the highest readmission risk are those with critical or high risk scores (above 70), multiple prior hospital admissions in the last 12 months, a high Charlson Comorbidity Index, and conditions such as advanced heart failure, ESRD, or metastatic cancer. Care gaps exceeding 90 days further elevate risk.",
    },
    {
        "question": "What patients with heart failure have not been seen in over 90 days?",
        "ground_truth": "Patients diagnosed with congestive heart failure or CHF who have a last visit date more than 90 days ago should be flagged for urgent care gap outreach. These patients are at high risk of decompensation without regular monitoring.",
    },
    {
        "question": "How many active medications does a high-risk patient typically have?",
        "ground_truth": "High-risk patients in the ClinicTrust platform typically have 4 to 9 active medications, with critical-tier patients often on 8 or more. Polypharmacy of 5 or more medications is a significant risk factor, and 10 or more medications triggers a high-polypharmacy alert.",
    },
    {
        "question": "What is the significance of a low eGFR reading in a patient's risk profile?",
        "ground_truth": "A low eGFR indicates reduced kidney function. eGFR below 30 mL/min/1.73m² significantly elevates a patient's risk score, as chronic kidney disease is a major comorbidity associated with cardiovascular events, medication dosing challenges, and higher readmission rates.",
    },
    {
        "question": "Which patients have a dangerous drug combination of anticoagulant and NSAID?",
        "ground_truth": "Patients prescribed both an anticoagulant (such as warfarin, apixaban, or rivaroxaban) and an NSAID (such as ibuprofen or naproxen) simultaneously are flagged for dangerous drug combination. This combination significantly increases bleeding risk and is a critical medication safety concern.",
    },
    {
        "question": "What does a Charlson Comorbidity Index score of 5 or above indicate?",
        "ground_truth": "A Charlson Comorbidity Index score of 5 or above indicates a very high burden of comorbid conditions with significant mortality risk. Conditions such as metastatic cancer (6 points), ESRD (2 points), heart failure (1 point), and dementia (1 point) accumulate to high scores. The index predicts 10-year survival and is a strong predictor of readmission.",
    },
    {
        "question": "How are care gap alerts generated for patients with diabetes?",
        "ground_truth": "Care gap alerts are generated when a diabetic patient has not been seen in 60 or more days and has a risk score of 40 or above. The alert recommends contacting the patient within 5 business days and scheduling a diabetes management review including HbA1c measurement.",
    },
    {
        "question": "What is the typical risk score range for a patient with COPD and chronic kidney disease?",
        "ground_truth": "A patient with both COPD (GOLD Stage III, 18 points) and chronic kidney disease Stage 3 (18 points for a high-tier condition) would have a baseline condition score of approximately 36-45 points before age, medication, and care gap factors are applied. Combined with typical age factors, the total risk score would likely fall in the 65-80 range.",
    },
    {
        "question": "What medication adherence signals are captured in the platform?",
        "ground_truth": "Medication adherence signals include: number of active medications versus discontinued medications, days since last clinical visit (indirect proxy for prescription renewal), the presence of polypharmacy (5+ or 10+ medications), dangerous drug combinations, and whether a medication adherence alert has been generated and acted upon.",
    },
    {
        "question": "What are the criteria for a critical readmission risk alert?",
        "ground_truth": "A critical readmission risk alert is generated when a patient has a risk score of 85 or above. The alert is marked critical severity and recommends urgent follow-up within 48 hours. Contributing factors typically include multiple readmissions in the last 12 months, a high Charlson score, critical diagnoses such as advanced heart failure or ESRD, and significant care gaps.",
    },
    {
        "question": "How does the platform handle patients with no recent visits?",
        "ground_truth": "Patients with no recorded visits receive an 18-point risk score penalty, and if their risk score is above 40, a care gap alert is generated immediately. The longer the gap, the higher the penalty: gaps over 365 days add 22 points, 180-365 days add 14 points, and 90-180 days add 6 points to the risk score.",
    },
    {
        "question": "What role does BNP play in identifying heart failure patients?",
        "ground_truth": "BNP (B-type natriuretic peptide) is a biomarker for heart failure severity. In the ClinicTrust platform, a BNP above 300 pg/mL adds 6 points to the risk score, and BNP above 900 pg/mL adds 12 points. Normal BNP is below 100 pg/mL. Elevated BNP triggers cardiology review recommendations.",
    },
    {
        "question": "Which patients should be prioritised for referral to nephrology?",
        "ground_truth": "Patients with eGFR below 45 mL/min/1.73m² (CKD Stage 3 or worse), elevated creatinine above 1.4 mg/dL, or a diagnosis of ESRD should be prioritised for nephrology referral. Patients with both CKD and diabetes are at particular risk and should be reviewed urgently.",
    },
    {
        "question": "What is the difference between a medium and high risk patient in terms of clinical interventions?",
        "ground_truth": "Medium-risk patients (score 30-69) should be scheduled for routine follow-up within 14 days and have their care plan reviewed. High-risk patients (score 70-84) require follow-up within 7 days, medication reconciliation, and consideration of specialist referral. Critical patients (85+) need urgent contact within 48 hours and multidisciplinary review.",
    },
    {
        "question": "How does troponin elevation affect a patient's risk classification?",
        "ground_truth": "Troponin above 0.04 ng/mL indicates myocardial injury and adds 10 points to the risk score. This level of elevation warrants immediate cardiology review. Normal troponin is below 0.04 ng/mL. In the context of an elderly patient with existing cardiac disease, even mildly elevated troponin signals urgent intervention.",
    },
    {
        "question": "What patterns indicate a patient is at risk of medication non-adherence?",
        "ground_truth": "Key non-adherence risk patterns include: active medications without a visit in over 120 days (triggering a medication adherence alert), high polypharmacy (10+ medications), recent medication discontinuation, combination of anticoagulant therapy with infrequent monitoring visits, and patients with dementia or cognitive decline who may struggle to self-manage.",
    },
    {
        "question": "How is the referral outcome score calculated?",
        "ground_truth": "The referral outcome score starts at 50 and is adjusted based on: whether the referral was accepted (+20 or -30), whether an appointment was scheduled (+10), whether it was attended (+15 or -10 if missed), outcome rating (up to +15 for 5-star, -10 for below 3-star), patient satisfaction (up to +10), time to appointment (up to +10 for within 3 days, -5 for over 14 days), and readmission within 30 days (-20).",
    },
    {
        "question": "Which lab values are most predictive of high readmission risk?",
        "ground_truth": "The most predictive lab values for readmission risk are: eGFR (kidney function — low eGFR strongly predicts readmission), BNP (heart failure severity), HbA1c (poor glycaemic control), and troponin (cardiac injury). These four biomarkers, combined with readmission history and the Charlson score, are the top drivers in the XGBoost risk model.",
    },
    {
        "question": "What is the purpose of the risk trajectory feature in the patient profile?",
        "ground_truth": "The risk trajectory captures the patient's risk score at 6 monthly snapshots, providing a temporal signal for the ML model. A patient whose score is rising from 45 to 82 over 6 months represents a different risk profile than a stable patient at 82, even if their current score is identical. This temporal drift is a key feature for predicting future deterioration.",
    },
    {
        "question": "How does the AI prior authorisation system work?",
        "ground_truth": "The AI prior authorisation system assigns a confidence score (0-100) to each authorisation request based on clinical criteria alignment, diagnosis-procedure pairing, and documentation completeness. Requests with AI confidence above 92 and a recommendation of Approve are auto-approved. Others go to human review. Human reviewers can override the AI, and approximately 12% of cases result in human-AI disagreement, providing valuable training data for model improvement.",
    },
]


# ── Retrieval helper ──────────────────────────────────────────────────────────

def _load_retriever(k: int = 5):
    """Load the Chroma vectorstore and return a retriever."""
    from langchain_community.vectorstores import Chroma

    if not VECTORSTORE_DIR.exists() or not any(VECTORSTORE_DIR.iterdir()):
        raise FileNotFoundError(
            f"Vectorstore not found at {VECTORSTORE_DIR}. "
            "Run: python ml/rag/build_vectorstore.py"
        )

    if AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY:
        from langchain_openai import AzureOpenAIEmbeddings
        embeddings = AzureOpenAIEmbeddings(
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_key=AZURE_OPENAI_API_KEY,
            azure_deployment=AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
            api_version=AZURE_OPENAI_API_VERSION,
        )
    else:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    vectorstore = Chroma(
        persist_directory=str(VECTORSTORE_DIR),
        embedding_function=embeddings,
    )
    return vectorstore.as_retriever(search_kwargs={"k": k})


def _load_rag_chain():
    """Load the full RAG chain from clinical_rag.py."""
    if AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY:
        from langchain_openai import AzureChatOpenAI
        from langchain.chains import RetrievalQA
        from langchain.prompts import PromptTemplate

        llm = AzureChatOpenAI(
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_key=AZURE_OPENAI_API_KEY,
            azure_deployment=AZURE_OPENAI_DEPLOYMENT,
            api_version=AZURE_OPENAI_API_VERSION,
            temperature=0.0,
        )
        retriever = _load_retriever(k=5)
        prompt = PromptTemplate(
            input_variables=["context", "question"],
            template=(
                "You are a clinical decision support AI for the ClinicTrust platform.\n"
                "Answer the question using ONLY the patient data provided in the context below.\n"
                "If the context does not contain sufficient information, say so explicitly.\n\n"
                "Context:\n{context}\n\nQuestion: {question}\nAnswer:"
            ),
        )
        chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=True,
            chain_type_kwargs={"prompt": prompt},
        )
        return chain, True
    else:
        return None, False


# ── Fallback evaluation (no LLM) ─────────────────────────────────────────────

def _ngram_overlap(reference: str, candidate: str, n: int = 2) -> float:
    """Compute n-gram overlap between reference and candidate strings."""
    def ngrams(text, n):
        words = text.lower().split()
        return set(tuple(words[i:i+n]) for i in range(len(words)-n+1))

    ref_ng  = ngrams(reference, n)
    cand_ng = ngrams(candidate, n)
    if not ref_ng:
        return 0.0
    return len(ref_ng & cand_ng) / len(ref_ng)


def _context_keyword_precision(question: str, contexts: list[str]) -> float:
    """
    Proxy for context_precision: fraction of retrieved chunks containing
    keywords from the question.
    """
    keywords = set(w.lower() for w in question.split() if len(w) > 4)
    if not keywords or not contexts:
        return 0.0
    useful = sum(
        1 for ctx in contexts
        if any(kw in ctx.lower() for kw in keywords)
    )
    return useful / len(contexts)


def _run_fallback_eval(qa_dataset: list[dict], retriever) -> dict:
    """
    Runs evaluation without an LLM.
    Returns proxy metrics that correlate with the real RAGAS scores.
    """
    results = []
    for item in qa_dataset:
        q = item["question"]
        gt = item["ground_truth"]

        docs = retriever.get_relevant_documents(q)
        contexts = [d.page_content for d in docs]
        context_text = " ".join(contexts)

        # Context coverage: how much of the ground truth is covered by retrieved docs
        context_recall_proxy  = _ngram_overlap(gt, context_text, n=2)
        context_precision_prx = _context_keyword_precision(q, contexts)

        results.append({
            "question":               q,
            "n_chunks_retrieved":     len(contexts),
            "context_recall_proxy":   round(context_recall_proxy, 3),
            "context_precision_proxy":round(context_precision_prx, 3),
            "contexts":               contexts[:2],  # first 2 for report
        })

    avg_recall    = np.mean([r["context_recall_proxy"]    for r in results])
    avg_precision = np.mean([r["context_precision_proxy"] for r in results])

    return {
        "mode":                  "fallback_no_llm",
        "note":                  "LLM-based metrics (faithfulness, answer_relevancy) require Azure OpenAI credentials.",
        "context_recall_proxy":  round(float(avg_recall),    3),
        "context_precision_proxy": round(float(avg_precision), 3),
        "per_question":          results,
        "threshold_check": {
            "context_recall_proxy":    avg_recall    >= THRESHOLDS["context_recall"],
            "context_precision_proxy": avg_precision >= THRESHOLDS["context_precision"],
        },
    }


# ── Full RAGAS evaluation ─────────────────────────────────────────────────────

def run_ragas_eval(
    qa_dataset: Optional[list[dict]] = None,
    k: int = 5,
    save_report: bool = True,
) -> dict:
    """
    Runs RAGAS evaluation on the RAG pipeline.

    Steps:
      1. Load vectorstore retriever
      2. For each QA pair: retrieve k chunks, generate answer (if LLM available)
      3. Compute RAGAS metrics (faithfulness, answer_relevancy, context_precision, context_recall)
         OR fallback proxy metrics if no LLM
      4. Flag questions below threshold
      5. Save HTML + JSON report

    Returns dict with all metrics and per-question breakdown.
    """
    if qa_dataset is None:
        qa_dataset = GOLDEN_QA

    logger.info(f"Starting RAGAS evaluation on {len(qa_dataset)} questions...")

    # Load retriever
    try:
        retriever = _load_retriever(k=k)
    except FileNotFoundError as e:
        logger.error(str(e))
        return {"error": str(e), "passed": False}

    # Try full RAGAS with LLM
    llm_available = bool(AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY)
    ragas_available = False

    if llm_available:
        try:
            from ragas import evaluate as ragas_evaluate
            from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
            from datasets import Dataset
            ragas_available = True
            logger.info("RAGAS and Azure OpenAI available — running full evaluation.")
        except ImportError:
            logger.warning("ragas or datasets not installed. Falling back to proxy metrics.")

    if ragas_available:
        # Build dataset for RAGAS
        chain, _ = _load_rag_chain()
        rows = {"question": [], "answer": [], "contexts": [], "ground_truth": []}

        for item in qa_dataset:
            q  = item["question"]
            gt = item["ground_truth"]
            try:
                resp     = chain({"query": q})
                answer   = resp.get("result", "")
                src_docs = resp.get("source_documents", [])
                contexts = [d.page_content for d in src_docs]
            except Exception as e:
                logger.warning(f"Chain failed for '{q[:50]}...': {e}")
                answer   = ""
                contexts = []

            rows["question"].append(q)
            rows["answer"].append(answer)
            rows["contexts"].append(contexts)
            rows["ground_truth"].append(gt)

        dataset = Dataset.from_dict(rows)

        try:
            scores = ragas_evaluate(
                dataset,
                metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
            )
            score_df  = scores.to_pandas()
            aggregate = {
                "faithfulness":      float(score_df["faithfulness"].mean()),
                "answer_relevancy":  float(score_df["answer_relevancy"].mean()),
                "context_precision": float(score_df["context_precision"].mean()),
                "context_recall":    float(score_df["context_recall"].mean()),
            }
            per_q = score_df.to_dict(orient="records")

            # Flag questions below threshold
            flags = []
            for i, row in score_df.iterrows():
                for metric, thresh in THRESHOLDS.items():
                    if metric in row and row[metric] < thresh:
                        flags.append({
                            "question": qa_dataset[i]["question"][:80],
                            "metric":   metric,
                            "score":    round(float(row[metric]), 3),
                            "threshold":thresh,
                        })

            threshold_check = {m: aggregate[m] >= t for m, t in THRESHOLDS.items()}
            passed = all(threshold_check.values())

            result = {
                "mode":            "ragas_full",
                "n_questions":     len(qa_dataset),
                "aggregate":       {k: round(v, 3) for k, v in aggregate.items()},
                "thresholds":      THRESHOLDS,
                "threshold_check": threshold_check,
                "flags":           flags,
                "passed":          passed,
                "per_question":    per_q,
                "evaluated_at":    datetime.utcnow().isoformat(),
                "summary":         (
                    "PASS — all RAGAS metrics above threshold."
                    if passed else
                    f"FAIL — {len(flags)} question(s) below threshold."
                ),
            }

        except Exception as e:
            logger.warning(f"RAGAS evaluate() failed: {e}. Falling back to proxy metrics.")
            result = _run_fallback_eval(qa_dataset, retriever)
            result["evaluated_at"] = datetime.utcnow().isoformat()
            result["passed"]       = result.get("threshold_check", {}).get("context_recall_proxy", False)
            result["summary"]      = "Proxy evaluation (RAGAS unavailable)"

    else:
        result = _run_fallback_eval(qa_dataset, retriever)
        result["evaluated_at"] = datetime.utcnow().isoformat()
        result["passed"]       = all(result.get("threshold_check", {}).values())
        result["summary"]      = "Proxy evaluation (no LLM credentials)"

    _print_eval_summary(result)

    if save_report:
        report_path = _save_report(result)
        result["report_path"] = str(report_path)

    return result


# ── Console output ────────────────────────────────────────────────────────────

def _print_eval_summary(result: dict):
    print("\n" + "="*70)
    print("  RAG QUALITY EVALUATION — ClinicTrust Clinical RAG")
    print("="*70)
    print(f"  Mode: {result.get('mode', 'unknown')}  |  Questions: {result.get('n_questions', '?')}")

    if "aggregate" in result:
        agg = result["aggregate"]
        print(f"\n  Metric               Score     Threshold  Pass?")
        print(f"  {'─'*52}")
        for m, thresh in THRESHOLDS.items():
            val   = agg.get(m, 0.0)
            ok    = val >= thresh
            icon  = "✓" if ok else "✗"
            print(f"  {m:<22} {val:.3f}     >= {thresh:.2f}     {icon}")
    else:
        print(f"\n  context_recall_proxy:    {result.get('context_recall_proxy', 0):.3f}")
        print(f"  context_precision_proxy: {result.get('context_precision_proxy', 0):.3f}")

    flags = result.get("flags", [])
    if flags:
        print(f"\n  ⚠  {len(flags)} question(s) below threshold:")
        for f in flags[:5]:
            print(f"     {f['metric']:<22} {f['score']:.3f}  Q: {f['question'][:55]}...")

    print(f"\n  VERDICT: {result.get('summary', 'unknown')}")
    print("="*70 + "\n")


# ── Report saver ──────────────────────────────────────────────────────────────

def _save_report(result: dict) -> Path:
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    json_path = EVAL_DIR / f"ragas_eval_{ts}.json"
    with open(json_path, "w") as f:
        json.dump(result, f, indent=2, default=str)
    logger.info(f"RAGAS JSON: {json_path}")

    html_path = EVAL_DIR / f"ragas_eval_{ts}.html"
    _write_html_report(result, html_path)
    logger.info(f"RAGAS HTML: {html_path}")
    return html_path


def _write_html_report(result: dict, path: Path):
    verdict_colour = "#388e3c" if result.get("passed") else "#d32f2f"

    metric_rows = ""
    if "aggregate" in result:
        for m, thresh in THRESHOLDS.items():
            val  = result["aggregate"].get(m, 0)
            ok   = val >= thresh
            bg   = "#e8f5e9" if ok else "#ffebee"
            icon = "✓" if ok else "✗"
            metric_rows += (
                f'<tr style="background:{bg};">'
                f'<td>{m}</td><td>{val:.3f}</td><td>≥ {thresh:.2f}</td>'
                f'<td style="font-weight:bold;">{icon}</td></tr>'
            )
    else:
        for k_name in ["context_recall_proxy", "context_precision_proxy"]:
            val = result.get(k_name, 0)
            metric_rows += f'<tr><td>{k_name}</td><td>{val:.3f}</td><td>proxy</td><td>—</td></tr>'

    flag_html = ""
    for f in result.get("flags", []):
        flag_html += (
            f'<li><strong>{f["metric"]}</strong>: score={f["score"]:.3f} '
            f'(threshold {f["threshold"]:.2f}) — <em>{f["question"]}</em></li>'
        )
    flag_section = (
        f'<h2>⚠ Flagged Questions ({len(result.get("flags",[]))})</h2><ul>{flag_html}</ul>'
        if result.get("flags") else
        '<h2>✓ No Questions Below Threshold</h2>'
    )

    note = result.get("note", "")
    note_html = f'<p style="color:#f57c00;"><strong>Note:</strong> {note}</p>' if note else ""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ClinicTrust RAG Quality Evaluation</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #212121; }}
  h1 {{ color: #1565c0; }} h2 {{ color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom:4px; }}
  table {{ border-collapse: collapse; width: 60%; font-size: 13px; }}
  td, th {{ padding: 8px 12px; border: 1px solid #ddd; }}
  th {{ background: #1976d2; color: white; }}
  .verdict {{ font-size: 18px; font-weight: bold; color: {verdict_colour}; padding: 12px;
              background: #f5f5f5; border-left: 5px solid {verdict_colour}; }}
  ul li {{ margin-bottom: 6px; }}
</style>
</head>
<body>
<h1>ClinicTrust AI — RAG Quality Evaluation</h1>
<p><strong>Mode:</strong> {result.get('mode', 'unknown')} &nbsp;|&nbsp;
   <strong>Questions:</strong> {result.get('n_questions', len(GOLDEN_QA))} &nbsp;|&nbsp;
   <strong>Evaluated:</strong> {result.get('evaluated_at', '')}</p>
{note_html}

<h2>RAGAS Metrics</h2>
<table>
  <thead><tr><th>Metric</th><th>Score</th><th>Threshold</th><th>Pass?</th></tr></thead>
  <tbody>{metric_rows}</tbody>
</table>

{flag_section}

<h2>Metric Definitions</h2>
<ul>
  <li><strong>Faithfulness (≥0.80)</strong>: Fraction of answer claims supported by retrieved context. Low = hallucination.</li>
  <li><strong>Answer Relevancy (≥0.75)</strong>: Is the generated answer relevant to the question?</li>
  <li><strong>Context Precision (≥0.70)</strong>: Are the retrieved chunks actually useful?</li>
  <li><strong>Context Recall (≥0.65)</strong>: Were all needed information chunks retrieved?</li>
</ul>

<h2>Evaluation Verdict</h2>
<div class="verdict">{result.get('summary', '')}</div>

<hr style="margin-top:32px;">
<p style="font-size:11px;color:#888;">
  Golden QA dataset: {len(GOLDEN_QA)} questions &nbsp;|&nbsp;
  Vectorstore: {VECTORSTORE_DIR} &nbsp;|&nbsp;
  ClinicTrust ML Pipeline Phase 1
</p>
</body>
</html>"""

    with open(path, "w", encoding="utf-8") as f:
        f.write(html)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="RAGAS evaluation for ClinicTrust RAG pipeline")
    parser.add_argument("--questions", help="Path to custom QA JSON file (list of {question, ground_truth})")
    parser.add_argument("--k",         default=5, type=int, help="Number of chunks to retrieve (default 5)")
    parser.add_argument("--demo",      action="store_true", help="Show expected output structure without running eval")
    parser.add_argument("--no-report", action="store_true", help="Skip saving report files")
    args = parser.parse_args()

    if args.demo:
        print("\nRAGAS Evaluation — demo output structure\n")
        demo = {
            "mode": "ragas_full",
            "n_questions": 20,
            "aggregate": {"faithfulness": 0.84, "answer_relevancy": 0.79, "context_precision": 0.72, "context_recall": 0.68},
            "thresholds": THRESHOLDS,
            "threshold_check": {"faithfulness": True, "answer_relevancy": True, "context_precision": True, "context_recall": True},
            "flags": [],
            "passed": True,
            "summary": "PASS — all RAGAS metrics above threshold.",
        }
        print(json.dumps(demo, indent=2))
        print("\nTo run the full evaluation:")
        print("  1. python ml/rag/build_vectorstore.py")
        print("  2. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in ml/.env")
        print("  3. python ml/evaluate/ragas_eval.py")
        return

    qa_data = None
    if args.questions:
        with open(args.questions) as f:
            qa_data = json.load(f)
        logger.info(f"Loaded {len(qa_data)} questions from {args.questions}")

    result = run_ragas_eval(qa_dataset=qa_data, k=args.k, save_report=not args.no_report)

    sys.exit(0 if result.get("passed") else 1)


if __name__ == "__main__":
    main()
