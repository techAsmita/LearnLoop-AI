# LearnLoop AI

**Most tutors know the subject. LearnLoop learns the learner.**

Team **RudraCore** · Problem Statement **PS-03** · Build Fast with AI — AI Build Challenge 2026

An explicit **learner-model-driven adaptive AI tutor** for learning AI/ML concepts.

---

## What makes this different

This is **not** a generic ChatGPT-style educational chatbot.

LearnLoop maintains an explicit learner state (concept mastery, active misconceptions, confidence, history) and runs a closed adaptive loop:

```
Diagnose → Detect misconception → Select intervention → Reassess → Update mastery
```

Two learners answering the **same question** can receive **different interventions** because their learner states differ.

| Learner state | Intervention chosen |
|---|---|
| Incorrect + high confidence + misconception | Targeted example / explanation |
| Correct + low confidence | Reinforcement (build confidence) |
| Low mastery, no clear misconception | Foundational explanation |

Every adaptive decision is explained in the UI (“Why this next?”).

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | FastAPI + Python 3.10+ |
| Database | SQLite (local) → PostgreSQL / Supabase (production-ready schema) |
| AI | Gemini API (structured JSON) + fully offline MOCK/DEMO mode |
| Hosting targets | Vercel (frontend) · Render (backend) · Supabase (DB) |

**Intentionally excluded:** LangChain, RAG, vector DBs, multi-agent frameworks.

---

## Project structure

```
LearnLoop_AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── seed.py              # AI concept bank
│   │   ├── routers/api.py       # All endpoints
│   │   └── services/
│   │       ├── learner_model.py # Deterministic mastery & selection
│   │       ├── mock_ai.py       # DEMO mode
│   │       └── gemini_ai.py     # Gemini structured outputs
│   ├── tests/test_api.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   ├── components/
│   │   ├── lib/api.ts
│   │   └── types/
│   ├── package.json
│   └── ...
├── evaluation/
│   ├── test_cases.py
│   └── run_evaluation.py
├── .env.example
├── .gitignore
├── run-local.sh
└── README.md
```

---

## Prerequisites

- **Python** 3.10 or 3.11 (3.12 also works)
- **Node.js** 18+ and npm
- (Optional) A Gemini API key from Google AI Studio

---

## Quick start (MOCK / DEMO mode — no API key needed)

```bash
# 1. Unzip and enter
unzip LearnLoop_AI_RudraCore_MVP.zip
cd LearnLoop_AI

# 2. Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create env file (MOCK_MODE is on by default)
cp ../.env.example .env

# Start backend
uvicorn app.main:app --reload --port 8000
```

In a **second terminal**:

```bash
cd LearnLoop_AI/frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open **http://localhost:3000**

You should see the dashboard. Select a demo scenario (e.g. “High-conf + misconception”) and a concept, then walk through the full adaptive loop.

---

## Running with Gemini (optional)

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Edit `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
MOCK_MODE=false
```

3. Restart the backend. The UI badge will switch from “DEMO / MOCK MODE” to “GEMINI LIVE”.

If the Gemini call fails for any reason, the system **automatically falls back** to mock logic so the demo never crashes.

---

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health + mock-mode flag |
| GET | `/api/concepts` | List AI concepts |
| POST | `/api/session/start` | Start learning session (optional demo_scenario) |
| POST | `/api/diagnose` | Submit answer + reasoning + confidence |
| POST | `/api/intervention` | Get adaptive intervention |
| POST | `/api/reassess` | Submit reassessment, update mastery |
| GET | `/api/learners/{id}` | Full learner state |
| GET | `/api/learners/{id}/progress` | Progress summary |

Interactive docs: **http://localhost:8000/docs**

---

## Demo scenarios

On the dashboard you can pre-seed the learner state:

1. **High-conf + misconception** — demonstrates misconception-targeted example
2. **Correct but low confidence** — demonstrates reinforcement instead of re-teaching
3. **Low mastery** — demonstrates foundational explanation

These prove the core claim: **different learner states → different interventions**.

---

## Tests

```bash
cd backend
source .venv/bin/activate
pytest -v
```

Covers: health, concepts, full adaptive loop, different-state → different-intervention, mastery determinism, state persistence.

---

## Evaluation

```bash
cd backend
source .venv/bin/activate
python ../evaluation/run_evaluation.py
```

Compares **LearnLoop (adaptive)** vs **Baseline (static path)** on controlled cases:

- Misconception detection accuracy
- Intervention relevance
- Pre → post learning gain
- Adaptation success rate

All metrics are computed from running the actual logic — no fabricated numbers.

---

## Switching to PostgreSQL / Supabase

1. Create a Supabase project (or any Postgres).
2. Set in `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres
```

3. The SQLAlchemy models are already compatible. On startup the tables are created automatically (`init_db`).
4. No code changes required.

---

## Environment variables

| Variable | Where | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | backend/.env | (empty) | Gemini API key |
| `MOCK_MODE` | backend/.env | `true` if no key | Force offline mode |
| `DATABASE_URL` | backend/.env | `sqlite:///./learnloop.db` | DB connection |
| `CORS_ORIGINS` | backend/.env | `http://localhost:3000,...` | Allowed origins |
| `NEXT_PUBLIC_API_URL` | frontend/.env.local | `http://localhost:8000` | Backend URL |

Never commit real secrets. `.env` and `.env.local` are git-ignored.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Frontend cannot reach backend | Check `NEXT_PUBLIC_API_URL` and that backend is on port 8000 |
| CORS errors | Ensure `CORS_ORIGINS` includes your frontend origin |
| `ModuleNotFoundError` | Activate the venv and `pip install -r requirements.txt` |
| Empty concepts list | Backend must have started successfully (check terminal for seed logs) |
| Gemini errors | System falls back to MOCK automatically; check key and quota |
| Port already in use | Change `--port` or kill the process using the port |

---

## Design notes (for judges)

- **Learner model is first-class.** Mastery, misconceptions, confidence and history are stored and updated on every interaction.
- **LLM is advisory only.** Gemini (or mock) proposes diagnosis and content; deterministic Python code owns scoring, mastery updates, and intervention selection.
- **Explainability.** Every adaptive decision surfaces a “Why this next?” explanation in the UI.
- **Resilience.** Full offline DEMO mode + automatic fallback so the product is always demonstrable.
- **Evaluation.** Separate evaluation module with controlled cases and real metrics.

---

## Team RudraCore

- **Asmita Roy** — Project Lead & AI/Backend (TIET)
- **Akshita** — Data & Evaluation Lead (TIET)
- **Yogita Rana** — Development & Testing (TIET)

---

Built for the **AI Build Challenge 2026** · Problem Statement PS-03.
