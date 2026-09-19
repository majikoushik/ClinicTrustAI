"""
Stage 9 — RAG: Clinical Q&A System
====================================
Interactive Q&A over patient records using LangChain + Azure OpenAI.

The RAG pipeline:
  Query → Embed query → Find similar documents → Send docs + query to LLM → Answer

Key LangChain concepts:
  - Vectorstore: stores and retrieves documents by semantic similarity
  - Retriever: wraps the vectorstore with search config (k=5 docs, filters, etc.)
  - RetrievalQA: chains retriever + LLM into a single `.run()` call
  - Memory: stores conversation history for multi-turn Q&A

Usage:
    python ml/rag/clinical_rag.py
    # Then type questions interactively

Example queries:
    "Which patients have not been seen in over 90 days?"
    "List patients with both diabetes and heart failure"
    "Who has the highest risk score and why?"
    "Which patients are on warfarin and also taking NSAIDs?"
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config.settings import (
    VECTORSTORE_DIR,
    AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_EMBEDDING_DEPLOYMENT, AZURE_OPENAI_API_VERSION,
)


def load_vectorstore(embeddings):
    """Load the persisted Chroma vectorstore from disk."""
    from langchain_community.vectorstores import Chroma
    if not VECTORSTORE_DIR.exists():
        print(f"Vectorstore not found at {VECTORSTORE_DIR}")
        print("Run  python ml/rag/build_vectorstore.py  first.")
        sys.exit(1)

    vs = Chroma(
        persist_directory=str(VECTORSTORE_DIR),
        embedding_function=embeddings,
        collection_name="clinictrust_patients",
    )
    count = vs._collection.count()
    print(f"Loaded vectorstore: {count} documents indexed.")
    return vs


def build_rag_chain(vectorstore):
    """
    Builds the full RAG chain:

    [User question]
         ↓
    [Embed question with same model used for indexing]
         ↓
    [Find top-k most similar patient documents]
         ↓
    [Inject documents into LLM prompt as context]
         ↓
    [LLM answers using ONLY the provided documents]
         ↓
    [Return answer + source documents]

    The `chain_type="stuff"` means all retrieved documents are "stuffed"
    into the prompt. For very large contexts, use "map_reduce" or "refine".
    """
    from langchain_openai import AzureChatOpenAI
    from langchain.chains import RetrievalQA
    from langchain.prompts import PromptTemplate

    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        azure_deployment=AZURE_OPENAI_DEPLOYMENT,
        api_version=AZURE_OPENAI_API_VERSION,
        temperature=0.1,   # low temp = factual, not creative
        max_tokens=1000,
    )

    # Custom prompt that enforces grounding in retrieved documents
    PROMPT_TEMPLATE = """You are a clinical decision support assistant for ClinicTrust AI.
Answer the question using ONLY the patient records provided below.
If the information needed to answer is not in the records, say so clearly.
Do not invent patient details.

Patient Records:
{context}

Question: {question}

Answer (be concise and clinical):"""

    prompt = PromptTemplate(
        template=PROMPT_TEMPLATE,
        input_variables=["context", "question"],
    )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5},   # retrieve 5 most similar patient records
    )

    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,   # include which patients were referenced
        chain_type_kwargs={"prompt": prompt},
    )

    return chain


def build_fallback_chain(vectorstore):
    """
    Fallback RAG chain for when Azure OpenAI is not configured.
    Uses the vectorstore for similarity search only, without LLM.
    Returns the raw retrieved document texts.
    """
    def fallback_query(question: str) -> dict:
        docs = vectorstore.similarity_search(question, k=5)
        answer = f"[No LLM configured — showing {len(docs)} most similar patient records]\n\n"
        for i, doc in enumerate(docs, 1):
            meta = doc.metadata
            answer += f"{i}. {meta.get('patient_name', 'Unknown')} "
            answer += f"(risk: {meta.get('risk_score', 0):.0f})\n"
            answer += f"   {doc.page_content[:200]}...\n\n"
        return {"result": answer, "source_documents": docs}

    return fallback_query


def interactive_session(chain):
    """
    Runs an interactive CLI Q&A session.
    Type 'exit' to quit, 'clear' to reset conversation history.
    """
    print("\n" + "="*60)
    print("ClinicTrust Clinical Q&A")
    print("="*60)
    print("Ask questions about patient records. Type 'exit' to quit.\n")
    print("Example queries:")
    print("  - Which patients have not been seen in over 90 days?")
    print("  - List patients with both diabetes and heart failure")
    print("  - Who has the highest risk score?")
    print("  - Which patients are on warfarin and also NSAIDs?\n")

    while True:
        try:
            question = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break

        if not question:
            continue
        if question.lower() in ("exit", "quit", "q"):
            break

        print("\nSearching patient records...")
        try:
            if callable(chain) and not hasattr(chain, "run"):
                # Fallback chain
                result = chain(question)
            else:
                result = chain({"query": question})

            print(f"\nAssistant: {result.get('result', 'No answer generated.')}")

            # Show which patients were referenced
            source_docs = result.get("source_documents", [])
            if source_docs:
                referenced = [d.metadata.get("patient_name", "?") for d in source_docs]
                print(f"  [Referenced: {', '.join(set(referenced))}]")

        except Exception as e:
            print(f"Error: {e}")

        print()


def main():
    # ── Set up embeddings ─────────────────────────────────────────────────────
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
        except Exception as e:
            print(f"Azure OpenAI embeddings error: {e}")

    if embeddings is None:
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            print("Using local HuggingFace embeddings.")
        except Exception as e:
            print(f"Cannot load any embedding model: {e}")
            sys.exit(1)

    # ── Load vectorstore ──────────────────────────────────────────────────────
    vectorstore = load_vectorstore(embeddings)

    # ── Build chain ───────────────────────────────────────────────────────────
    if AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY:
        print("Building RAG chain with Azure OpenAI GPT-4...")
        try:
            chain = build_rag_chain(vectorstore)
        except Exception as e:
            print(f"LLM chain error: {e}. Using similarity-only fallback.")
            chain = build_fallback_chain(vectorstore)
    else:
        print("Azure OpenAI not configured — using similarity-search only mode.")
        print("Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in ml/.env for full RAG.")
        chain = build_fallback_chain(vectorstore)

    interactive_session(chain)


if __name__ == "__main__":
    main()
