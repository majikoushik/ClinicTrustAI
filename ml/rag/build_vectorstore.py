"""
Stage 9 — RAG: Build Patient Knowledge Vectorstore
===================================================
Converts patient records and clinical notes into vector embeddings
stored in a Chroma local vector database.

RAG (Retrieval-Augmented Generation) explained:
  Instead of sending ALL patient data to GPT-4 (expensive, context-limited),
  we:
  1. Index all patient data as vectors (semantic representations)
  2. At query time, find the MOST RELEVANT patients/notes (vector similarity search)
  3. Send only those to GPT-4 as context
  4. GPT-4 answers grounded in actual patient data

This prevents hallucination — GPT cannot make up patient details because
it must answer from the retrieved documents.

Vector similarity:
  "diabetic patients over 65" → embedding → finds documents semantically
  similar, even if they don't contain those exact words.

Usage:
    python ml/rag/build_vectorstore.py

Requires: AZURE_OPENAI_* env vars (or falls back to local HuggingFace embeddings)
Output:   ml/data/vectorstore/   (Chroma persistent store)
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pandas as pd
from config.settings import (
    DATA_DIR, VECTORSTORE_DIR,
    AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT, AZURE_OPENAI_API_VERSION,
)


def format_patient_document(row: dict) -> tuple[str, dict]:
    """
    Converts a patient dict into a text document for embedding.

    The text must be rich enough for semantic search to work well.
    Include all clinically relevant fields as natural language.

    Returns (text_content, metadata_dict)
    Metadata is stored alongside the vector and returned with search results.
    It is NOT embedded — it's used for filtering (e.g. by provider, by risk level).
    """
    patient_id = str(row.get("_id", ""))
    name       = row.get("name", "Unknown")
    risk_score = row.get("riskScore") or 0

    # Format medical history
    history = row.get("medicalHistory") or []
    conditions = "; ".join(
        h.get("condition", "") for h in history if h.get("condition")
    ) or "No known conditions"

    # Format medications
    meds = row.get("medications") or []
    med_list = "; ".join(
        f"{m.get('name', '')} {m.get('dosage', '')}".strip()
        for m in meds if m.get("name")
    ) or "No current medications"

    # Format allergies
    allergies = row.get("allergies") or []
    allergy_list = "; ".join(
        f"{a.get('allergen', '')} ({a.get('severity', '')})"
        for a in allergies if a.get("allergen")
    ) or "No known allergies"

    # Format recent visits
    visits = row.get("recentVisits") or []
    visit_count = len(visits)
    last_visit = visits[-1].get("date", "unknown") if visits else "no visits on record"

    text = f"""
Patient: {name}
Risk Score: {risk_score}/100
Medical Conditions: {conditions}
Current Medications: {med_list}
Allergies: {allergy_list}
Visit History: {visit_count} visits recorded. Last visit: {last_visit}
    """.strip()

    metadata = {
        "patient_id":  patient_id,
        "patient_name": name,
        "risk_score":  float(risk_score),
        "condition_count": len(history),
        "has_diabetes": int(any("diabetes" in str(h.get("condition","")).lower() for h in history)),
    }

    return text, metadata


def build_vectorstore():
    """
    Reads patient parquet, formats documents, embeds them, stores in Chroma.
    """
    raw_path = DATA_DIR / "patients.parquet"
    if not raw_path.exists():
        print(f"patients.parquet not found. Run  python ml/data/export_mongodb.py  first.")
        sys.exit(1)

    df = pd.read_parquet(raw_path)
    print(f"Loaded {len(df)} patients.")

    # ── Choose embedding model ────────────────────────────────────────────────
    embeddings = None

    if AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY:
        try:
            from langchain_openai import AzureOpenAIEmbeddings
            embeddings = AzureOpenAIEmbeddings(
                azure_endpoint=AZURE_OPENAI_ENDPOINT,
                api_key=AZURE_OPENAI_API_KEY,
                azure_deployment=AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
                api_version=AZURE_OPENAI_API_VERSION,
            )
            print(f"Using Azure OpenAI embeddings ({AZURE_OPENAI_EMBEDDING_DEPLOYMENT})")
        except Exception as e:
            print(f"Azure OpenAI embeddings failed: {e}")

    if embeddings is None:
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            # 'all-MiniLM-L6-v2' is small (80MB), fast, and good quality
            # for medical text similarity
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            print("Using HuggingFace all-MiniLM-L6-v2 embeddings (local, no API key needed)")
        except Exception as e:
            print(f"HuggingFace embeddings failed: {e}")
            print("Install with:  pip install sentence-transformers")
            sys.exit(1)

    # ── Build documents ───────────────────────────────────────────────────────
    from langchain.docstore.document import Document

    documents = []
    for _, row in df.iterrows():
        text, metadata = format_patient_document(row.to_dict())
        documents.append(Document(page_content=text, metadata=metadata))

    print(f"Built {len(documents)} documents.")

    # ── Create Chroma vectorstore ─────────────────────────────────────────────
    # Chroma stores embeddings on disk — no server needed for development.
    # For production, switch to Azure AI Search or Pinecone.
    from langchain_community.vectorstores import Chroma

    print(f"Embedding and indexing (this takes a moment for large datasets)...")
    vectorstore = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory=str(VECTORSTORE_DIR),
        collection_name="clinictrust_patients",
    )
    vectorstore.persist()

    print(f"\nVectorstore saved → {VECTORSTORE_DIR}")
    print(f"  Documents indexed: {len(documents)}")
    print("\nTest with a quick similarity search:")
    results = vectorstore.similarity_search("diabetic patients with high risk", k=3)
    for r in results:
        print(f"  - {r.metadata.get('patient_name')} (risk: {r.metadata.get('risk_score')})")

    print("\nNext step: run  python ml/rag/clinical_rag.py")
    return vectorstore


if __name__ == "__main__":
    build_vectorstore()
