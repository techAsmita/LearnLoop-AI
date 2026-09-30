# LearnLoop AI

> **Most tutors know the subject. LearnLoop learns the learner.**

**Team RudraCore** · **Problem Statement PS-03** · **Build Fast with AI — AI Build Challenge 2026**

LearnLoop AI is a **learner-model-driven adaptive AI tutor** for learning AI/ML concepts.

Instead of following the same learning path for every student, LearnLoop maintains an explicit learner state containing concept mastery, confidence, active misconceptions, attempt history, and intervention history. It uses this state to decide **what the learner should receive next and why**.

---

## 🚀 Live Project

| Resource | Link |
|---|---|
| **Live Demo** | `YOUR_VERCEL_URL` |
| **GitHub Repository** | https://github.com/techAsmita/LearnLoop-AI |
| **Backend API** | `YOUR_RENDER_URL` |
| **API Documentation** | `YOUR_RENDER_URL/docs` |
| **Demo Video** | `YOUR_DEMO_VIDEO_URL` |
| **Project Presentation** | `YOUR_PPT_OR_PDF_URL` |

> The live links above will be updated after final deployment.

### Recommended demo path

**High-confidence misconception → Targeted intervention → Reassessment → Learner-state update**

This demonstrates the complete adaptive loop rather than only showing generated AI content.

---

# 🎯 Problem Statement

### PS-03 — Personalised AI Tutor for Learning AI

Traditional online learning systems often provide the same explanations, examples, and practice sequence to every learner.

However, two students can answer the same question incorrectly for completely different reasons.

For example:

- One learner may lack the basic concept.
- Another may have a specific misconception.
- Another may understand the concept but lack confidence.
- A strong learner may need a harder challenge rather than another explanation.

A useful AI tutor therefore needs to understand **the learner**, not just the subject.

---

# 💡 Our Solution

LearnLoop maintains an explicit **learner model** and continuously adapts the learning path based on evidence from the learner.

The core loop is:

```text
Diagnose
   ↓
Detect misconception
   ↓
Select intervention
   ↓
Reassess
   ↓
Update learner state
   ↓
Adapt next step
```

The central design principle is:

```text
Learner State(t) + New Evidence
            ↓
       Policy Decision
            ↓
      Intervention
            ↓
       Reassessment
            ↓
Learner State(t + 1)
```

This means that two learners answering the same question can receive different interventions because their learner states are different.

---

# 🧠 What Makes LearnLoop Different?

LearnLoop is not intended to be a generic ChatGPT-style educational chatbot.

The system maintains an explicit learner state containing:

- Concept mastery
- Confidence
- Active misconceptions
- Attempt count
- Interaction history
- Previous intervention history

The learner state influences the next action.

| Learner state | Adaptive response |
|---|---|
| Incorrect + high confidence + strong misconception | Targeted misconception intervention |
| Incorrect + persistent misconception | Guided example |
| Correct + low confidence | Reinforcement |
| Low mastery without a clear misconception | Foundational explanation |
| Strong mastery + high confidence | Practice challenge |

Every adaptive decision is also surfaced in the interface through **"Why this next?"**

This makes the adaptation observable rather than hidden behind an LLM.

---

# 🔄 Core Adaptive Loop

### 1. Diagnose

The learner submits:

- Answer
- Reasoning
- Confidence

The system evaluates the response and builds a diagnosis.

### 2. Detect

The system identifies whether the learner has a potential misconception.

Example:

```text
Learner:
"Training accuracy is high, so the model should generalize well."

Detected misconception:
High training performance implies strong generalization.
```

### 3. Select Intervention

The deterministic learner-model policy selects an intervention based on:

- Current mastery
- Confidence
- Correctness
- Misconception presence
- Misconception confidence
- Previous intervention
- Reassessment history

### 4. Intervene

The system can provide:

- Foundational explanation
- Targeted misconception explanation
- Guided example
- Reinforcement
- Practice challenge

Gemini can generate the explanation/content, while the application policy controls the adaptive decision.

### 5. Reassess

The learner receives a follow-up question designed to check whether the underlying misconception has been addressed.

### 6. Update

The learner model is updated with the new evidence.

```text
Before:
Mastery = 0.24
Active misconception = Yes

        ↓

Targeted intervention

        ↓

Reassessment

        ↓

After:
Mastery = Updated
Active misconception = Resolved / Persistent
```

### 7. Adapt

The next intervention is selected using the updated learner state.

---

# 🏗️ System Architecture

```text
┌─────────────────────────────────────────────┐
│                Learner / UI                 │
│          Next.js + TypeScript               │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                  FastAPI                    │
│                 API Layer                   │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Gemini     │ │ Learner      │ │ PostgreSQL / │
│ Diagnosis &  │ │ Model +      │ │   Supabase   │
│ Content      │ │ Policy       │ │              │
└──────────────┘ └──────┬───────┘ └──────────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │ Adaptive Learning   │
             │      Loop           │
             │                     │
             │ Diagnose            │
             │ Detect              │
             │ Intervene           │
             │ Reassess            │
             │ Adapt               │
             └─────────────────────┘
```

---

# 🧩 Technical Design

One of the core architectural decisions is that **the LLM does not own the learner state or the final adaptive policy.**

### LLM responsibilities

Gemini is used for:

- Diagnosing learner responses
- Identifying potential misconceptions
- Estimating diagnosis-related signals
- Generating intervention content

### Deterministic application responsibilities

Python application logic controls:

- Intervention selection
- Mastery updates
- Misconception persistence
- Reassessment evaluation
- State transitions
- Evaluation scenarios
- Decision explanations

This separation makes the system more:

- Explainable
- Testable
- Reproducible
- Resilient to LLM failures

---

# 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 |
| Frontend Language | TypeScript |
| UI | React + Tailwind CSS |
| Backend | FastAPI |
| Backend Language | Python |
| API Validation | Pydantic |
| ORM / Database Layer | SQLAlchemy |
| Database | PostgreSQL / Supabase |
| Local Database | SQLite |
| Generative AI | Gemini API |
| AI SDK | google-generativeai |
| Evaluation | Python |
| Testing | pytest |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| Database Hosting | Supabase |
| Version Control | Git + GitHub |

### Intentionally excluded

LearnLoop does not require:

- LangChain
- RAG
- Vector databases
- Multi-agent frameworks
- Unnecessary orchestration layers

The architecture intentionally keeps the adaptive policy explicit and understandable.

---

# 🤖 AI Architecture

LearnLoop uses AI where generative reasoning is useful while keeping critical application behavior deterministic.

```text
Learner Response
       │
       ▼
   Gemini Diagnosis
       │
       ▼
Structured Diagnosis
       │
       ▼
Deterministic Learner Policy
       │
       ├── Foundational explanation
       ├── Targeted misconception
       ├── Guided example
       ├── Reinforcement
       └── Practice challenge
       │
       ▼
Gemini-generated intervention content
       │
       ▼
Reassessment
       │
       ▼
Deterministic state update
```

This design avoids making the entire application dependent on an unconstrained LLM response.

---

# 🧠 Learner Model

Each learner-concept state contains information such as:

```text
LearnerConceptState
├── mastery
├── confidence
├── active_misconceptions
├── attempt_count
├── last_intervention_type
├── history
└── updated_at
```

The state is updated after learner interactions.

Conceptually:

```text
State(t) + Evidence → State(t+1)
```

The system therefore has a persistent learner model rather than treating every question as an isolated conversation.

---

# 🎯 Adaptive Intervention Policy

The current deterministic policy considers learner state when selecting the next intervention.

### Example

```text
Incorrect
   +
High misconception confidence
   +
Active misconception
        ↓
Targeted Misconception Intervention
```

Whereas:

```text
Correct
   +
Low confidence
        ↓
Reinforcement
```

And:

```text
Low mastery
   +
Incorrect
   +
No clear misconception
        ↓
Foundational Explanation
```

The policy can also detect when a misconception persists after intervention and change strategy.

```text
Targeted misconception
        ↓
Misconception persists
        ↓
Guided example
        ↓
Reassessment
```

---

# 📊 Evaluation

LearnLoop includes a separate evaluation harness for testing the adaptive policy against a fixed baseline across controlled learner scenarios.

Run:

```bash
cd backend
source .venv/bin/activate
python ../evaluation/run_evaluation.py
```

The evaluation covers:

- Misconception-aware intervention selection
- Adaptive strategy changes
- Mastery transitions
- Misconception adaptation
- Controlled learning-gain simulation

### Evaluation philosophy

The evaluation is designed to answer:

> Does the system actually change its behavior when learner state changes?

Rather than only measuring whether an LLM can generate a good explanation.

### Controlled Evaluation Snapshot

The current deterministic evaluation suite produced the following snapshot:

| Metric | Result |
|---|---|
| Adaptive policy accuracy | 100% |
| Strategy change rate | 66.7% |
| Misconception adaptation rate | 100% |
| Controlled simulated learning-gain difference | +0.017 |

### Important interpretation

The learning-gain benchmark is a **controlled simulation** using predefined learner scenarios and the implemented mastery-update logic.

It is **not** a real-user learning study and is not presented as evidence of real-world educational improvement.

The evaluation is primarily intended to demonstrate that the adaptive policy:

1. Recognizes different learner states.
2. Selects different interventions when appropriate.
3. Changes strategy when misconceptions persist.
4. Produces deterministic and testable state transitions.

No real-user learning outcomes are claimed from the simulated benchmark.

---

# 🧪 Test Coverage

Backend tests can be run with:

```bash
cd backend
source .venv/bin/activate
pytest -v
```

The test suite covers functionality including:

- Health endpoint
- Concept retrieval
- Session creation
- Diagnostic flow
- Adaptive intervention selection
- Full adaptive learning loop
- Different learner states producing different interventions
- Mastery update determinism
- State persistence

---

# 🖥️ Demo Scenarios

The dashboard supports controlled learner-state scenarios to demonstrate adaptation.

### 1. High-confidence misconception

```text
Incorrect
→ High confidence
→ Misconception detected
→ Targeted intervention
```

### 2. Correct but low confidence

```text
Correct
→ Low confidence
→ Reinforcement
```

Instead of unnecessarily reteaching the concept.

### 3. Low mastery

```text
Low mastery
→ No clear misconception
→ Foundational explanation
```

These scenarios demonstrate the core product claim:

**Different learner states → different interventions.**

---

# 🔌 API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health and runtime status |
| GET | `/api/concepts` | List available AI concepts |
| POST | `/api/session/start` | Start a learning session |
| POST | `/api/diagnose` | Submit answer, reasoning and confidence |
| POST | `/api/intervention` | Generate the adaptive intervention |
| POST | `/api/reassess` | Submit reassessment and update mastery |
| GET | `/api/learners/{id}` | Retrieve learner state |
| GET | `/api/learners/{id}/progress` | Retrieve progress summary |
| GET | `/api/evaluation/policy` | Run policy and adaptation evaluation |
| GET | `/api/evaluation/learning-gain` | Run controlled learning-gain benchmark |

Interactive API documentation is available through FastAPI:

```text
YOUR_RENDER_URL/docs
```

---

# 🗂️ Project Structure

```text
LearnLoop_AI/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── seed.py
│   │   │
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   └── api.py
│   │   │
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── learner_model.py
│   │       ├── gemini_ai.py
│   │       ├── mock_ai.py
│   │       └── evaluation.py
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── evaluation/
│   ├── __init__.py
│   ├── test_cases.py
│   └── run_evaluation.py
│
├── .env.example
├── .gitignore
├── run-local.sh
└── README.md
```

---

# ⚙️ Local Setup

### Prerequisites

Recommended:

- Python 3.10 or 3.11
- Node.js 18+
- npm
- PostgreSQL / Supabase for production deployment
- Gemini API key for live AI mode

A Gemini API key is **not required** to run the application in MOCK/DEMO mode.

## ▶️ Quick Start — MOCK / DEMO Mode

MOCK mode allows the entire adaptive workflow to run without an external AI API.

### 1. Clone the repository

```bash
git clone https://github.com/techAsmita/LearnLoop-AI.git
cd LearnLoop-AI
```

### 2. Backend setup

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate
```

On Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the environment file:

```bash
cp ../.env.example .env
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at:

```text
http://localhost:8000
```

### 3. Frontend setup

Open a second terminal:

```bash
cd LearnLoop-AI/frontend
```

Install dependencies:

```bash
npm install
```

Create the frontend environment file:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# ✨ Running with Gemini

To enable live Gemini-powered diagnosis and intervention generation:

1. Create a Gemini API key through Google AI Studio.
2. Add the key to `backend/.env`.
3. Disable MOCK mode.

Example:

```env
GEMINI_API_KEY=your_key_here
MOCK_MODE=false
```

The application then uses Gemini for AI-assisted diagnosis and intervention content.

The deterministic learner-model policy continues to control critical state updates and intervention selection.

### Resilience

If a Gemini request fails, the application has a fallback path so that the learning workflow can continue in demo mode rather than crashing.

This provides a reliable demonstration even when an external AI service is unavailable.

---

# 🗄️ Database

LearnLoop supports:

- **Local development:** SQLite
- **Production:** PostgreSQL / Supabase

The SQLAlchemy models are designed to support both environments.

For production, configure:

```env
DATABASE_URL=postgresql://...
```

The application initializes the required database tables on startup.

---

# 🔐 Environment Variables

### Backend

```env
GEMINI_API_KEY=
MOCK_MODE=true
DATABASE_URL=sqlite:///./learnloop.db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Security

Never commit real credentials.

The following files are intentionally ignored by Git:

```text
.env
.env.local
*.db
node_modules/
.next/
.venv/
```

A sanitized `.env.example` file is included for reproducible setup.

---

# 🛡️ Reliability and Failure Handling

LearnLoop is designed so that the product does not depend entirely on successful LLM calls.

The architecture separates:

- AI-generated reasoning/content

from:

- Deterministic learner-state management

This allows the system to:

- Continue operating in MOCK/DEMO mode
- Fall back when Gemini is unavailable
- Test adaptive decisions deterministically
- Reproduce learner-state transitions
- Evaluate policy behavior independently of an LLM

This is particularly important for a learning product where an external model failure should not destroy the entire learning session.

---

# 🎨 Product Design Principles

The interface is designed around the learner's current state rather than presenting a generic chatbot window.

The dashboard surfaces:

- Current mastery
- Learning progress
- Active learner state
- Current lesson/intervention
- Adaptive next step
- "Why this next?"

The objective is to make the system's adaptation visible to the learner and to the evaluator.

---

# 🤖 AI Tools Disclosure

AI tools were used during development and are disclosed here as required by the Build Fast with AI challenge.

### 1. Gemini API

Used **in the product itself**.

Gemini is integrated into LearnLoop for:

- Learner-response diagnosis
- Misconception detection assistance
- Structured diagnostic output
- Intervention content generation

The application does not delegate the entire learner model to Gemini. Deterministic Python logic controls learner-state updates and intervention policy.

### 2. Grok

Used as a **development assistance tool**.

Grok was used during implementation to assist with:

- Frontend development
- Code generation
- UI implementation
- Development iteration

Generated code was integrated, tested, modified, and validated as part of the project development process.

### 3. ChatGPT

Used as a **development and engineering assistance tool**.

ChatGPT was used for:

- Architecture discussion
- Debugging assistance
- Code review and refinement
- API and backend reasoning
- Evaluation design
- Documentation
- Testing strategy
- Deployment preparation

All generated suggestions were reviewed and adapted to the project's actual implementation.

AI assistance was used as a development tool; the final architecture, integration, testing, evaluation design, and project decisions were made and validated by the team.

---

# 📋 Challenge Submission Deliverables

The project is prepared around the Build Fast with AI final submission requirements.

Each participant/team submission includes:

- ✅ A runnable project with a deployed link
- ✅ GitHub repository with setup instructions
- ✅ 3-minute demo video
- ✅ PPT presentation explaining the project — maximum 10 slides
- ✅ Disclosure of AI tools used

### Final project resources

| Deliverable | Status |
|---|---|
| Runnable project | ✅ |
| GitHub repository | ✅ |
| Deployment | 🔄 Final deployment |
| 3-minute demo video | 🔄 Final recording |
| Project PPT | ✅ |
| AI tools disclosure | ✅ |

---

# 🎥 Demo Strategy

The 3-minute demonstration focuses on the system's adaptive behavior, not simply the interface.

### Suggested flow

```text
0:00 – 0:20
Problem + learner-model idea

0:20 – 0:50
Introduce learner state

0:50 – 1:30
Learner answers incorrectly with high confidence
→ misconception detected

1:30 – 1:55
LearnLoop selects targeted intervention
→ "Why this next?"

1:55 – 2:20
Learner reassesses
→ mastery and misconception state update

2:20 – 2:45
Show a different learner state
→ different intervention

2:45 – 3:00
Evaluation + architecture + closing
```

The key moment is:

> **Same concept. Different learner state. Different next action.**

---

# 📈 What We Measure

LearnLoop focuses on measurable adaptive behavior rather than only text generation.

The evaluation framework currently measures:

### 1. Adaptive policy accuracy

Whether the implemented policy selects the intended intervention for controlled learner states.

### 2. Strategy change rate

How often the adaptive policy changes strategy relative to the fixed baseline under different learner states.

### 3. Misconception adaptation

Whether the system changes intervention strategy when a misconception persists.

### 4. Mastery transition

How learner mastery changes under controlled deterministic scenarios.

### 5. Controlled learning-gain simulation

A simulation comparing mastery transitions under the adaptive and fixed policies.

This metric is explicitly treated as a simulation, not as evidence from real learners.

---

# 🧪 Reproducibility

The project is designed so that the core adaptive behavior can be reproduced locally without requiring a paid AI service.

A developer can run:

```bash
cd backend
source .venv/bin/activate
pytest -v
```

and:

```bash
python ../evaluation/run_evaluation.py
```

The MOCK/DEMO mode allows the adaptive policy and learner-state transitions to be tested without consuming Gemini API quota.

---

# 🧭 Design Decisions

### Why not make Gemini responsible for everything?

Because learner-state transitions and intervention policy need to be testable and explainable.

### Why not use a vector database?

The current problem does not require semantic retrieval over a large document corpus. The MVP focuses on learner adaptation, not knowledge retrieval.

### Why not use LangChain?

The current architecture does not require an orchestration framework. Direct model integration keeps the system simpler and easier to inspect.

### Why not use multiple agents?

The core challenge is learner adaptation. Additional agents would add complexity without directly improving the central adaptive loop.

### Why use an explicit learner model?

Because the central product claim is not:

> "The AI can explain AI."

It is:

> "The AI changes what it teaches based on what it learns about the learner."

---

# 👥 Team RudraCore

| Member | Responsibility |
|---|---|
| Asmita Roy | Project Lead · AI / Backend |
| Akshita | Data & Evaluation |
| Yogita Rana | Development & Testing |

---

# 🏆 Built For

**Build Fast with AI — AI Build Challenge 2026**

**Problem Statement:** PS-03 — Personalised AI Tutor for Learning AI

**Team:** RudraCore

---

# 📌 Project Summary

LearnLoop AI is an adaptive AI tutor built around an explicit learner model.

Instead of treating every learner interaction independently, it maintains:

```text
Mastery
+ Confidence
+ Misconceptions
+ History
+ Intervention History
```

and continuously updates that state:

```text
Diagnose
→ Detect
→ Intervene
→ Reassess
→ Adapt
```

The result is a learning system where the next action is determined by the learner's current state, rather than a fixed learning path.

**Most tutors know the subject. LearnLoop learns the learner.**