# ClinicTrust AI — Complete MLOps Learning Guide

> **Purpose:** Learn the full ML/MLOps workflow end-to-end using the ClinicTrust platform as your training ground. Every concept is grounded in real code in this repository.

---

## What This Guide Covers

| Stage | What You Learn | File |
|---|---|---|
| 1. Data Platform | MongoDB export, Parquet, data quality | `ml/data/export_mongodb.py` |
| 2. Feature Engineering | Numeric feature extraction from JSON | `ml/features/patient_features.py` |
| 3. Model Training | XGBoost, LightGBM, cross-validation | `ml/train/train_risk_model.py` |
| 4. MLflow Tracking | Experiment runs, params, metrics | Same training files |
| 5. Model Registry | Champion/challenger promotion | `ml/evaluate/promote_if_better.py` |
| 6. CI/CD | GitHub Actions automated retraining | `.github/workflows/ml_retrain.yml` |
| 7. Deployment | FastAPI serving, MLflow pyfunc | `ml/serving/app.py` |
| 8. Monitoring | Evidently drift, threshold calibration | `ml/monitoring/` |
| 9. RAG | LangChain vectorstore, semantic search | `ml/rag/` |
| 10. Agents | LangChain tools, ReAct reasoning | `ml/agents/` |

---

## Prerequisites

### Install Python dependencies
```bash
cd VibeCoding/ml
pip install -r requirements.txt
```

### Configure environment
```bash
cp ml/.env.example ml/.env
# Edit ml/.env and fill in:
#   MONGODB_URI — your MongoDB Atlas connection string (same as server/.env)
#   MLFLOW_TRACKING_URI — http://localhost:5000 (for local setup)
#   AZURE_OPENAI_* — only needed for Stage 9 (RAG) and Stage 10 (Agents)
```

### Start MLflow tracking server (keep this running in a terminal)
```bash
mlflow server \
  --backend-store-uri sqlite:///ml/data/mlflow.db \
  --default-artifact-root ./ml/data/artifacts \
  --host 0.0.0.0 --port 5000
```
Open **http://localhost:5000** in your browser — this is the MLflow UI.

---

## Stage 1 — Data Platform

### Concept: Why Parquet over CSV?

CSV is text. Every number is stored as characters and parsed on each read.
Parquet is columnar binary format — integers are stored as integers, dates as dates.
Benefits:
- **10× smaller** files (columnar compression)
- **5× faster** reads for ML (no parsing, native types)
- **Schema enforced** — you cannot accidentally coerce a date to a string

### Run the export
```bash
python ml/data/export_mongodb.py
```

### What happens
1. Connects to MongoDB Atlas using `MONGODB_URI`
2. Queries `patients`, `referraloutcomes`, `matchsessions`, `predictivealerts`, `referrals`
3. Converts ObjectIds to strings (MongoDB's `_id` is not JSON-serializable)
4. Writes 5 Parquet files to `ml/data/exports/`

### What to verify
```bash
python -c "
import pandas as pd
df = pd.read_parquet('ml/data/exports/patients.parquet')
print(df.shape)           # (N_patients, N_columns)
print(df['riskScore'].describe())  # should show 0-100 distribution
print(df.dtypes)          # check types are correct
"
```

### Key learning: The Label
The `riskScore` column is our **label** (y). It was computed by `analyticsCalculationService.js`
using the rule-based formula. We will train a model to predict this exact label.
Later, you can use ACTUAL clinical outcomes (readmissions, hospitalizations) as labels
instead — that's where the model becomes genuinely valuable.

---

## Stage 2 — Feature Engineering

### Concept: Feature engineering is 80% of ML work

Raw data (JSON patient documents) → numeric feature matrix → model training.
The quality of your features determines model quality more than algorithm choice.

### Key decisions in `patient_features.py`

**Binary flags vs. counts:**
```python
# Count (numeric) — more information
features["high_condition_count"] = 3

# Flag (binary) — simpler, sometimes better for rare conditions
features["has_diabetes"] = 1
```
We use both. Tree models (XGBoost/LightGBM) handle both equally well.

**Interaction terms:**
```python
features["diabetic_over_65"] = int(has_diabetes and age > 65)
```
This mirrors the rule-based formula's age-condition interaction.
The model CAN discover this interaction itself, but giving it explicitly
speeds up training and helps in small datasets.

**Missing value strategy:**
```python
features["days_since_last_visit"] = 9999.0   # no visits → maximum gap
```
We impute 9999 (not NaN) because tree models can split on large values naturally.
This encodes "no visits" as a meaningful signal rather than missing data.

### Run feature engineering
```bash
python ml/features/patient_features.py
python ml/features/referral_features.py
```

### What to verify
```bash
python -c "
import pandas as pd
df = pd.read_parquet('ml/data/features/patient_features.parquet')
print('Shape:', df.shape)
print('\nFeature correlations with risk_score:')
print(df.corr()['risk_score'].sort_values(ascending=False).head(10))
"
```
High correlation features = the model will weight them heavily.

---

## Stage 3 — Model Training

### Concept: XGBoost explained simply

XGBoost = Extreme Gradient Boosting. A collection of decision trees where
each tree corrects the errors of the previous trees.

```
Tree 1: predicts age-based risk (30% accuracy)
Tree 2: looks at Tree 1's errors, focuses on condition-based risk
Tree 3: looks at Tree 1+2's errors, focuses on medication interactions
...
Tree 300: tiny corrections to remaining errors
Final prediction = sum of all 300 tree outputs
```

Why better than a single deep decision tree?
- Ensemble = wisdom of the crowd
- Each tree is simple (max_depth=5) → no single tree overfits
- Regularisation (reg_alpha, reg_lambda) prevents collective overfitting

### Run training
```bash
python ml/train/train_risk_model.py
```

### Watch the MLflow UI
Open **http://localhost:5000** and find the `clinictrust-risk-scoring` experiment.
You'll see:
- Parameters: n_estimators, max_depth, learning_rate
- Metrics: cv_rmse_mean, cv_mae_mean, cv_r2_mean, baseline_rmse
- Artifacts: feature_importance.png

### Concept: Cross-validation vs. train/test split

```python
kf = KFold(n_splits=5, shuffle=True, random_state=42)
cv_rmse = -cross_val_score(model, X, y, cv=kf, scoring="neg_root_mean_squared_error")
```

With a single 80/20 split:
- You get ONE estimate of model performance
- High variance — a lucky split can make a bad model look good

With 5-fold CV:
- Dataset is split into 5 parts
- Train on 4, evaluate on 1 — repeat 5 times
- Take the mean → much more reliable estimate
- No data is "wasted" on test-only use

**Rule of thumb:** Use CV when N < 10,000. Use a single split when N > 100,000.

### Concept: RMSE vs. MAE vs. R²

| Metric | Meaning | Use when |
|---|---|---|
| RMSE | Average error in same units as label (risk score points) | Penalise large errors |
| MAE | Median error magnitude | Robust to outliers |
| R² | Proportion of variance explained (0-1) | How much better than mean prediction |

A baseline RMSE of 20 means: predicting the mean risk score is on average 20 points wrong.
An ML model with RMSE of 12 explains 40% more variance — it's meaningfully better.

### Run all three training scripts
```bash
python ml/train/train_risk_model.py
python ml/train/train_referral_outcome_model.py
python ml/train/train_alert_classifier.py
```

**Learning exercise:** Change `max_depth` from 5 to 10 and retrain.
Look at how cv_rmse_mean vs. cv_rmse_std changes. Deeper trees = lower mean but higher std = overfitting.

---

## Stage 4 — MLflow Tracking (inside the training scripts)

### Concept: MLflow = Git for ML experiments

Without MLflow:
- You train a model, it runs, you check RMSE in terminal
- Next week you try different hyperparameters
- Which run was better? What were the hyperparameters? You forgot.

With MLflow:
- Every run is recorded with all params, metrics, artifacts
- You can compare 10 runs side by side in the UI
- You can reproduce any past run exactly

### MLflow anatomy
```python
with mlflow.start_run(run_name="xgb_risk_v1") as run:
    mlflow.log_param("n_estimators", 300)   # single value: records "300"
    mlflow.log_params({"max_depth": 5, "lr": 0.05})  # dict: records both at once
    
    mlflow.log_metric("cv_rmse", 12.4)      # single value
    # log_metric inside a loop with step= builds a time-series chart
    
    mlflow.log_artifact("plots/importance.png")  # saves the file to the run
    
    mlflow.xgboost.log_model(model, "model")  # saves model + registers it
```

### View in UI
1. Go to http://localhost:5000
2. Click `clinictrust-risk-scoring` experiment
3. Click any run
4. See Parameters, Metrics, Artifacts tabs
5. Select 2-3 runs → "Compare" to see metrics side by side

### Learning exercise: Run a hyperparameter sweep

Edit `train_risk_model.py`, change PARAMS to these 3 configurations and run each:
```python
# Config A (conservative)
PARAMS = {"n_estimators": 100, "max_depth": 3, "learning_rate": 0.1, ...}

# Config B (default)  
PARAMS = {"n_estimators": 300, "max_depth": 5, "learning_rate": 0.05, ...}

# Config C (complex)
PARAMS = {"n_estimators": 500, "max_depth": 7, "learning_rate": 0.02, ...}
```
Compare all three in MLflow. You'll see the classic bias-variance tradeoff visually.

---

## Stage 5 — Model Registry

### Concept: Champion/Challenger promotion

In production, you never just "replace" a model. You compare:
- **Champion**: current Production model, serving real patients
- **Challenger**: newly trained model, not yet deployed

Only promote if the challenger is demonstrably better by a meaningful margin
(not just statistical noise).

```
[Train] → [Register: stage=None] → [Compare vs Production] → [Promote to Staging]
                                                                      ↓
                                                       [A/B test or shadow mode]
                                                                      ↓
                                                          [Promote to Production]
                                                                      ↓
                                                          [Archive old Production]
```

### Model Registry stages in MLflow

| Stage | Meaning |
|---|---|
| None | Freshly registered, not evaluated |
| Staging | Validated, ready for final review |
| Production | Serving live traffic |
| Archived | Retired, kept for rollback |

### Run promotion
```bash
python ml/evaluate/promote_if_better.py --dry-run   # see what would happen
python ml/evaluate/promote_if_better.py              # apply changes
```

### View registry
Open http://localhost:5000/#/models to see all registered models and their versions.

---

## Stage 6 — CI/CD

### Concept: Automated retraining

Manual training workflow:
1. Someone notices model is stale
2. Someone runs training manually
3. Someone manually checks metrics
4. Someone manually promotes

Automated CI/CD workflow:
1. New data accumulates every week
2. GitHub Actions runs on Sunday night:
   - Export fresh data
   - Build features
   - Train all models
   - Compare vs Production
   - Auto-promote if better
   - Save drift report as artifact

This is what "MLOps" means operationally — keeping models fresh without human toil.

### Setup
1. Push your code to GitHub
2. Add secrets in GitHub → Settings → Secrets → Actions:
   - `MONGODB_URI` — your connection string
   - `MLFLOW_TRACKING_URI` — your MLflow server URL (Azure or hosted)
3. The workflow in `.github/workflows/ml_retrain.yml` will run automatically

### Manual trigger
Go to GitHub → Actions → "ML Retrain Pipeline" → "Run workflow" → select model → Run.

---

## Stage 7 — Deployment

### Concept: Model serving with FastAPI

Trained model → pickled file → loaded into memory → HTTP endpoint → Express calls it.

Why FastAPI?
- Fastest Python web framework (comparable to Node.js)
- Pydantic validation: requests are type-checked before reaching your model
- OpenAPI docs auto-generated at `/docs`
- Async support for concurrent requests

### Start the serving endpoint
```bash
# In a separate terminal
uvicorn ml.serving.app:app --host 0.0.0.0 --port 8000 --reload
```

### Test it
```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/score/risk \
  -H "Content-Type: application/json" \
  -d '{
    "age": 72,
    "condition_count": 4,
    "high_condition_count": 2,
    "active_med_count": 8,
    "polypharmacy_5_9": 1,
    "days_since_last_visit": 95,
    "gap_90_to_180": 1
  }'
```

### View auto-generated docs
Open **http://localhost:8000/docs** — FastAPI generates a full Swagger UI
where you can test all endpoints interactively.

### How Express calls it (Gap 7 integration)

In `server/services/analyticsCalculationService.js`, you can replace the rule-based
`calcRiskScore(patient)` call with:
```javascript
const axios = require('axios');

async function calcRiskScoreML(patient) {
  try {
    const features = buildFeatureVector(patient);  // extract same features as python
    const { data } = await axios.post('http://localhost:8000/score/risk', features, 
                                       { timeout: 2000 });
    return data.risk_score;
  } catch {
    return calcRiskScore(patient);  // graceful degradation to rule-based
  }
}
```

The FastAPI server handles:
- Loading the Production model from MLflow registry at startup
- Graceful fallback to rule-based formula if model unavailable
- Response includes `source: "ml_model"` or `source: "rule_based_fallback"` for transparency

### Concept: MLflow pyfunc — the universal model interface

```python
model = mlflow.pyfunc.load_model("models:/clinictrust-risk-score/Production")
prediction = model.predict(pd.DataFrame([features]))
```

This same code works whether the underlying model is XGBoost, LightGBM, scikit-learn,
TensorFlow, or PyTorch. MLflow wraps all of them in the same `predict()` interface.
Your serving code never changes when you switch algorithms.

---

## Stage 8 — Monitoring

### Concept: Why models degrade over time

A model trained in January on January patients will be wrong in June
if the patient population changes (more elderly patients, new disease patterns,
changing referral patterns after policy changes).

This is called **data drift** or **concept drift**.

### Two types of drift

| Type | What it means | Example |
|---|---|---|
| Data drift | Input distribution changed | Mean patient age increased from 52 to 61 |
| Concept drift | Input→output relationship changed | High blood pressure is now less predictive of high risk |

Evidently detects data drift. Concept drift requires comparing predictions vs. outcomes.

### Run drift report
```bash
python ml/monitoring/drift_report.py
# Opens ml/data/monitoring/drift_report_YYYY-MM-DD.html
```

### Threshold calibration (Gap 5 fix)
The alert thresholds in `predictiveAlertService.js` are now auto-tunable.

```bash
python ml/monitoring/alert_calibration.py           # check what would change
python ml/monitoring/alert_calibration.py --apply   # write changes to MongoDB AIConfig
```

**How it works:**
1. Reads `predictive_alerts.parquet` (exported from DB)
2. Computes precision per alert type = `wasActionTaken == True` / total
3. If precision < 65%: threshold too low (too many false positives) → raise it
4. If precision > 90% with few alerts: threshold too high → lower it
5. Writes updated thresholds to AIConfig collection in MongoDB
6. `predictiveAlertService.js` reads from AIConfig on next run (Gap 5 fix applied)

---

## Stage 9 — RAG (Retrieval-Augmented Generation)

### Concept: Why RAG instead of "just send all patient data to GPT"?

Sending all patient data to GPT:
- Context window limit: GPT-4 has ~128k tokens (~100k words). 1000 patients = too large.
- Expensive: $0.01/1k tokens × many patients × many queries = high cost
- Slow: loading 1000 patients takes seconds

RAG (Retrieve → Augment → Generate):
- Index all patients as vectors once (cheap, fast)
- Per query: retrieve TOP 5 most relevant patients (milliseconds)
- Send only those 5 to GPT (cheap, fast, within context limit)
- GPT answers grounded in real data

### Vector embeddings explained

An embedding is a list of 1536 numbers that represents the semantic meaning of a text.
Two texts with similar meaning have similar vectors (small cosine distance).

"Patient with diabetes and high blood pressure" → [0.234, -0.567, 0.891, ...]
"Diabetic hypertensive patient" → [0.241, -0.561, 0.886, ...]  ← very similar!

These vectors are stored in Chroma (local vector database).
A query like "show me diabetic patients" gets embedded the same way,
then Chroma finds the most similar patient vectors.

### Build the vectorstore
```bash
python ml/rag/build_vectorstore.py
```
This reads `patients.parquet`, formats each patient as a text document,
embeds all documents, and saves the vectors to `ml/data/vectorstore/`.

**Without Azure OpenAI**: Uses `sentence-transformers/all-MiniLM-L6-v2` (local, free, ~80MB).
**With Azure OpenAI**: Uses `text-embedding-ada-002` (better quality, requires API key).

### Run interactive Q&A
```bash
python ml/rag/clinical_rag.py
```

### Example queries to try
```
Which patients have not been seen in over 90 days?
List patients with both diabetes and heart failure
Who is on warfarin and also taking NSAIDs?
Which patients have the most severe allergy profiles?
```

**With Azure OpenAI**: GPT-4 reads the retrieved documents and answers in natural language.
**Without Azure OpenAI**: Returns the top-5 matching patient records (similarity search only).

---

## Stage 10 — Agents

### Concept: Agent vs. RAG vs. simple LLM call

| Approach | What it does | When to use |
|---|---|---|
| Simple LLM | Answer from training data only | General questions, no live data needed |
| RAG | Answer from retrieved documents | Read-only Q&A over stored records |
| Agent | Multi-step reasoning + tool calls | Complex tasks requiring live data + actions |

### How an agent works

```
User: "Run analytics, then find all critical patients and suggest cardiology referrals"

[Thought]: I need to first run the analytics job to get fresh scores
[Action]:  trigger_analytics_job()
[Observation]: "Analytics complete. 42 patients updated."

[Thought]: Now I need high-risk patients
[Action]:  get_high_risk_patients(risk_threshold=85)
[Observation]: "Found 3 patients: John (92), Mary (87), Bob (85)"

[Thought]: For each, I should find cardiology providers
[Action]:  find_referral_matches(specialty="cardiology", urgency="urgent")
[Observation]: "Top match: Dr. Smith, score=87, accepting=yes"

[Final Answer]: "After refreshing analytics, I found 3 critical-risk patients..."
```

The agent DECIDES the sequence. You do not hardcode "step 1, step 2, step 3."

### Run the agent
```bash
# Demo mode (no Azure OpenAI needed) — tests each tool individually
python ml/agents/clinical_agent.py --demo

# Interactive mode (requires Azure OpenAI)
python ml/agents/clinical_agent.py

# Single query
python ml/agents/clinical_agent.py --query "What is the current platform health?"
```

### Understanding the tool design

Each tool in `ml/agents/tools.py` follows this pattern:
```python
@tool
def get_high_risk_patients(risk_threshold: int = 75) -> str:
    """
    Fetches patients with a risk score above the given threshold.
    ...
    """
    # Makes HTTP call to Express API
    result = _api_get("/api/patients", {"riskScoreMin": risk_threshold})
    # Returns string (agent reads this as "observation")
    return f"Found {len(patients)} patients..."
```

The docstring is critical — the LLM reads it to decide when to use the tool.
A bad docstring = agent picks the wrong tool.

---

## Running the Full Pipeline (End to End)

### First run (setup)
```bash
# Terminal 1: Start MLflow
mlflow server --backend-store-uri sqlite:///ml/data/mlflow.db \
              --default-artifact-root ./ml/data/artifacts --port 5000

# Terminal 2: Run full pipeline
python ml/data/export_mongodb.py
python ml/features/patient_features.py
python ml/features/referral_features.py
python ml/train/train_risk_model.py
python ml/train/train_referral_outcome_model.py
python ml/train/train_alert_classifier.py
python ml/evaluate/promote_if_better.py

# Terminal 3: Start serving
uvicorn ml.serving.app:app --host 0.0.0.0 --port 8000

# Terminal 4: Build RAG vectorstore (one-time)
python ml/rag/build_vectorstore.py

# Test the full system
python ml/rag/clinical_rag.py          # RAG Q&A
python ml/agents/clinical_agent.py    # Agent
```

### Weekly retraining (automated)
After GitHub Actions is configured, this runs automatically.
You can also trigger manually:
```bash
python ml/data/export_mongodb.py && \
python ml/features/patient_features.py && \
python ml/features/referral_features.py && \
python ml/train/train_risk_model.py && \
python ml/evaluate/promote_if_better.py
```

---

## Troubleshooting

### "No module named 'config'"
Run Python from the `VibeCoding/` root:
```bash
cd VibeCoding
python ml/data/export_mongodb.py  # not: cd ml && python data/export_mongodb.py
```

### "Cannot connect to MongoDB"
Check your `MONGODB_URI` in `ml/.env`. Make sure it starts with `mongodb+srv://`
and your IP is whitelisted in MongoDB Atlas Network Access.

### "MLflow tracking server not reachable"
Start the server: `mlflow server --backend-store-uri sqlite:///ml/data/mlflow.db --port 5000`
Or use a local file store: `MLFLOW_TRACKING_URI=file:///ml/data/mlruns`

### "Not enough labelled patients" warning
The analytics job must have run at least once to generate `riskScore` values.
Call `POST /api/admin/analytics/run-job` with an admin token, or from the Admin Dashboard.

### "HuggingFace embeddings download" (first run)
The first run downloads `all-MiniLM-L6-v2` (~80MB). Subsequent runs use the cache.

---

## What Each File Does (Quick Reference)

```
ml/
├── .env.example              # Copy to .env, fill in secrets
├── requirements.txt          # pip install -r requirements.txt
│
├── config/
│   └── settings.py           # Central config, imports env vars, defines paths
│
├── data/
│   ├── export_mongodb.py     # Stage 1: MongoDB → Parquet files
│   └── exports/              # Generated: patients.parquet, etc.
│       features/             # Generated: patient_features.parquet, etc.
│       artifacts/            # Generated: model files, plots
│       vectorstore/          # Generated: Chroma vector DB
│       monitoring/           # Generated: drift reports
│
├── features/
│   ├── patient_features.py   # Stage 2: raw patient JSON → numeric matrix
│   └── referral_features.py  # Stage 2: referral outcome features
│
├── train/
│   ├── train_risk_model.py             # Stage 3: XGBoost risk score regressor
│   ├── train_referral_outcome_model.py # Stage 3: LightGBM outcome predictor
│   └── train_alert_classifier.py      # Stage 3: alert type + action classifiers
│
├── evaluate/
│   └── promote_if_better.py  # Stage 5: champion/challenger promotion
│
├── serving/
│   └── app.py                # Stage 7: FastAPI inference server
│
├── monitoring/
│   ├── drift_report.py       # Stage 8: Evidently data drift detection
│   └── alert_calibration.py  # Stage 8: auto-tune alert thresholds (Gap 5 fix)
│
├── rag/
│   ├── build_vectorstore.py  # Stage 9: embed patient records into Chroma
│   └── clinical_rag.py       # Stage 9: interactive RAG Q&A
│
└── agents/
    ├── tools.py              # Stage 10: LangChain tools wrapping Express API
    └── clinical_agent.py     # Stage 10: multi-step reasoning agent
```

---

## Key Concepts Summary

| Concept | Simple Explanation | Where in Code |
|---|---|---|
| Feature engineering | Convert raw JSON to numbers a model can learn from | `ml/features/patient_features.py` |
| Cross-validation | Average RMSE across 5 different train/test splits | `ml/train/train_risk_model.py:128` |
| MLflow run | A saved snapshot of one training attempt | Every `with mlflow.start_run()` block |
| Model registry | Version control for trained models | `ml/evaluate/promote_if_better.py` |
| pyfunc | MLflow's universal model interface | `ml/serving/app.py:57` |
| Vector embedding | Numbers representing semantic meaning | `ml/rag/build_vectorstore.py:60` |
| Retrieval | Finding documents by similarity to a query | `ml/rag/clinical_rag.py:65` |
| Tool | A function an agent can call to get information | `ml/agents/tools.py` |
| ReAct | Think → Act → Observe loop for agents | `ml/agents/clinical_agent.py:55` |
| Data drift | Input distribution changed since training | `ml/monitoring/drift_report.py` |
| Champion/Challenger | Compare new model vs production before deploying | `ml/evaluate/promote_if_better.py:60` |
