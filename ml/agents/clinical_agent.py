"""
Stage 10 — Agents: Clinical Reasoning Agent
============================================
An AI agent that can reason over the ClinicTrust platform using the tools
defined in tools.py. It can handle complex multi-step clinical queries
that require combining multiple API calls and data analysis.

What is a LangChain Agent?
  Unlike a simple LLM call (question → answer), an agent has a LOOP:

    Thought: "I need to find high-risk patients, then check their alerts"
    Action:  call get_high_risk_patients(75)
    Observation: "Found 5 patients: John (87), Mary (82)..."
    Thought: "Now check alerts for these patients"
    Action:  call get_active_alerts("critical")
    Observation: "3 critical alerts including John..."
    Final Answer: "John has both high risk (87) and a critical alert..."

  The agent DECIDES which tools to use and in what order.
  This is fundamentally different from hardcoded multi-step scripts.

Agent types available:
  - "openai-functions" (best for Azure OpenAI GPT-4) — uses OpenAI function calling
  - "react" (works with any LLM) — uses ReAct (Reason + Act) prompting

Usage:
    python ml/agents/clinical_agent.py
    # Interactive session — type queries, agent runs multi-step reasoning

    python ml/agents/clinical_agent.py --query "Run analytics then list all critical risk patients"
"""

import sys
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config.settings import (
    AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION,
)

from agents.tools import (
    get_high_risk_patients,
    get_patient_details,
    get_care_gaps,
    trigger_analytics_job,
    get_platform_analytics,
    find_referral_matches,
    get_active_alerts,
    score_patient_risk_ml,
)

ALL_TOOLS = [
    get_high_risk_patients,
    get_patient_details,
    get_care_gaps,
    trigger_analytics_job,
    get_platform_analytics,
    find_referral_matches,
    get_active_alerts,
    score_patient_risk_ml,
]

SYSTEM_PROMPT = """You are a clinical decision support AI agent for the ClinicTrust platform.
You have access to tools that can query patient data, run analytics, and find referral matches.

Guidelines:
- Always verify patient identity before sharing clinical details
- Use the analytics job tool sparingly (it updates the database)
- When reporting risk scores, always include what the score means (high ≥ 70, medium 30-69, low < 30)
- Prioritise patient safety — flag critical cases immediately
- Be concise but complete — clinicians are busy

You can handle multi-step queries like:
"Run the analytics job, then show me all high-risk patients and their active alerts"
"Find cardiologists for a patient with heart failure and Blue Cross insurance"
"Which patients haven't been seen in 6 months and have risk scores above 60?"
"""


def build_agent(verbose: bool = True):
    """
    Builds a LangChain agent with Azure OpenAI and all clinical tools.

    Agent type "openai-tools" uses OpenAI's native function-calling capability.
    The LLM itself decides which function to call and with what arguments —
    more reliable than ReAct prompting for structured tool calls.
    """
    if not AZURE_OPENAI_ENDPOINT or not AZURE_OPENAI_API_KEY:
        print("Azure OpenAI not configured — agent requires LLM.")
        print("Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in ml/.env")
        return None

    from langchain_openai import AzureChatOpenAI
    from langchain.agents import create_tool_calling_agent, AgentExecutor
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain.memory import ConversationBufferWindowMemory

    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        azure_deployment=AZURE_OPENAI_DEPLOYMENT,
        api_version=AZURE_OPENAI_API_VERSION,
        temperature=0,   # deterministic tool calls
        streaming=False,
    )

    # Prompt with memory placeholder — the agent remembers context across turns
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human",  "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # Memory keeps the last 10 exchanges — agent remembers earlier parts of conversation
    memory = ConversationBufferWindowMemory(
        memory_key="chat_history",
        return_messages=True,
        k=10,
    )

    agent = create_tool_calling_agent(llm, ALL_TOOLS, prompt)

    executor = AgentExecutor(
        agent=agent,
        tools=ALL_TOOLS,
        memory=memory,
        verbose=verbose,     # prints each thought/action step (great for learning)
        max_iterations=8,    # safety limit — prevents infinite loops
        handle_parsing_errors=True,
    )

    return executor


def demo_no_llm():
    """
    Demo mode that runs each tool directly without an LLM,
    so you can see what data each tool returns even without Azure credentials.
    """
    print("Running in demo mode (no LLM — testing tools directly)\n")

    print("── Tool: get_platform_analytics ─────────────────────────────────────")
    print(get_platform_analytics.run(""))

    print("\n── Tool: get_high_risk_patients(threshold=70) ───────────────────────")
    print(get_high_risk_patients.run("70"))

    print("\n── Tool: get_active_alerts(severity=critical) ────────────────────────")
    print(get_active_alerts.run("critical"))

    print("\n── Tool: get_care_gaps(days=90) ──────────────────────────────────────")
    print(get_care_gaps.run("90"))


def interactive_session(agent):
    """Multi-turn interactive Q&A with the agent."""
    print("\n" + "="*60)
    print("ClinicTrust Clinical Agent")
    print("="*60)
    print("Ask complex clinical questions. Type 'exit' to quit.\n")
    print("Example queries:")
    for q in [
        "What is the current platform health status?",
        "List all critical risk patients and their active alerts",
        "Find cardiology providers for urgent referrals",
        "Which patients have care gaps and also need medication review?",
        "Run the analytics job then show me the updated risk distribution",
    ]:
        print(f"  - {q}")
    print()

    while True:
        try:
            query = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break

        if not query:
            continue
        if query.lower() in ("exit", "quit"):
            break

        print()
        try:
            result = agent.invoke({"input": query})
            print(f"Agent: {result.get('output', 'No response.')}\n")
        except Exception as e:
            print(f"Error: {e}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query",   help="Run a single query and exit")
    parser.add_argument("--demo",    action="store_true", help="Run demo without LLM")
    parser.add_argument("--verbose", action="store_true", default=True,
                        help="Show agent reasoning steps (default: True)")
    args = parser.parse_args()

    if args.demo or not AZURE_OPENAI_ENDPOINT:
        demo_no_llm()
        return

    agent = build_agent(verbose=args.verbose)
    if agent is None:
        demo_no_llm()
        return

    if args.query:
        print(f"Query: {args.query}\n")
        result = agent.invoke({"input": args.query})
        print(f"\nAnswer: {result.get('output')}")
    else:
        interactive_session(agent)


if __name__ == "__main__":
    main()
