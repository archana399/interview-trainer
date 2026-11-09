# AI-Powered Interview Trainer

A full-stack, locally runnable application that helps you prepare for job interviews
using your resume, IBM Granite AI (via watsonx.ai), and a RAG pipeline backed by ChromaDB.
# live : https://interview-trainer-roan.vercel.app/

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Python | 3.11 | `python --version` |
| Node.js | 18 | `node --version` |
| npm | 9 | `npm --version` |
| IBM Cloud account | — | [cloud.ibm.com](https://cloud.ibm.com) |

---

## IBM Cloud Setup (one-time)

1. Log in to [cloud.ibm.com](https://cloud.ibm.com).
2. Create a **watsonx.ai Runtime** service instance — choose the **Lite** plan and the **Dallas (us-south)** region.
3. Open [dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com), create a **Project**, and copy its **Project ID** from *Settings → General → Project ID*.
4. Generate an **IBM Cloud API key**: *Manage → Access (IAM) → API keys → Create*.

---

## Installation

### 1 — Clone / download the project

```bash
git clone <your-repo-url>
cd interview-trainer
```

### 2 — Backend dependencies

```powershell
# Create and activate the virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1          # Windows PowerShell
# source venv/bin/activate            # macOS / Linux

# Install Python packages
pip install -r backend/requirements.txt
```

### 3 — Backend credentials

```powershell
Copy-Item backend\.env.example backend\.env
```

Open `backend/.env` and fill in your values:

```env
WATSONX_API_KEY=<your-ibm-cloud-api-key>
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=<your-project-guid>
```

Leave `WATSONX_LLM_MODEL_ID` and `WATSONX_EMBED_MODEL_ID` unchanged.

### 4 — Frontend dependencies

```powershell
cd frontend
npm install
cd ..
```

---

## Running the Application

You need **two terminals open simultaneously**.

### Terminal 1 — Backend

```powershell
cd backend
uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

On first start this will:
- Create `backend/interview_history.db` (SQLite)
- Bootstrap the ChromaDB knowledge base in `backend/chroma_db/` (embeds once, persists)

### Terminal 2 — Frontend

```powershell
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x  ready in Xms
➜  Local:   http://localhost:5173/
```

### Open the application

**http://localhost:5173**

---

## Verify IBM credentials (run once after setup)

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/admin/test-connection" `
  -Method POST -UseBasicParsing | Select-Object -ExpandProperty Content
```

Expected: `{"llm":"ok","embeddings":"ok"}`

If you see a 401 or credential error, re-check `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` in `backend/.env` and restart the backend.

### Health check

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/health" `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

Expected: `{"status":"ok","chromadb":"ok","env_vars":"ok"}`

---

## User Flow

| Step | Page | What happens |
|---|---|---|
| 1 | `/` | Upload resume PDF (drag-and-drop or file picker) |
| 2 | `/profile` | Review extracted skills; enter target role; choose interview type |
| 3 | `/interview` | Answer 5 AI-generated questions; inline score + feedback after each |
| 4 | `/feedback` | Overall score (0–10) and per-question improvement tips |
| 5 | `/dashboard` | History, score chart, session details |

The feedback page persists across browser refreshes — your results are always recoverable from the history API.

---

## API Reference

Interactive docs: **http://localhost:8000/docs**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Lightweight health check |
| `POST` | `/api/admin/test-connection` | Verify IBM credentials (run once) |
| `POST` | `/api/resume/upload` | Upload PDF, extract and embed resume |
| `DELETE` | `/api/resume/{session_id}` | Delete session and all data |
| `POST` | `/api/profile/analyze` | Set target role and interview type |
| `POST` | `/api/interview/start` | Generate 5 questions, return first |
| `POST` | `/api/interview/answer` | Submit answer; auto-completes session on 5th answer |
| `POST` | `/api/interview/end` | Explicit completion (idempotent) |
| `GET` | `/api/history` | Paginated session list |
| `GET` | `/api/history/{session_id}` | Full session detail |

---

## Token Budget — watsonx.ai Runtime Lite (300,000 tokens/month)

| Operation | ~Tokens |
|---|---|
| Resume embedding (~20 chunks) | ~4,000 |
| Profile analysis | ~1,500 |
| Question generation (5 questions) | ~2,000 |
| Answer evaluation × 5 | ~5,000 |
| **Total per session** | **~12,500** |
| **Monthly budget** | **~24 full sessions** |

Monitor real usage: IBM Cloud → watsonx.ai Runtime → Resource usage.

---

## Project Structure

```
interview-trainer/
├── backend/
│   ├── .env.example          # Credential template
│   ├── requirements.txt
│   ├── main.py               # FastAPI entry point
│   ├── config.py             # Env var loading
│   ├── database.py           # SQLAlchemy + SQLite
│   ├── models/               # ORM models + Pydantic schemas
│   ├── routers/              # resume, profile, interview, history
│   ├── services/             # pdf, rag, llm, profile, question, evaluation
│   ├── knowledge_base/       # interview_kb.txt (bootstrapped into ChromaDB)
│   └── chroma_db/            # Auto-created ChromaDB storage
├── frontend/
│   ├── src/
│   │   ├── pages/            # HomePage, ProfilePage, InterviewPage, FeedbackPage, DashboardPage
│   │   ├── components/       # ResumeUpload, ProfileCard, QuestionCard, AnswerInput, ScoreCard, ProgressChart, LoadingSpinner
│   │   ├── api/client.ts     # Axios instance + typed API helpers
│   │   ├── context/          # SessionContext (React state)
│   │   └── types/index.ts    # TypeScript interfaces
│   └── package.json
└── README.md
```

---

## Preparing for GitHub

```powershell
# Initialise git (if not already done)
git init

# Stage everything except ignored files
git add .

# Verify .env is NOT staged
git status | Select-String "\.env"   # should show nothing

# Commit
git commit -m "Initial commit: AI Interview Trainer MVP"

# Add remote and push
git remote add origin <your-repo-url>
git push -u origin main
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `env_vars: missing` in `/api/health` | Fill in `backend/.env` and restart the backend |
| `test-connection` returns 401 | Check `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` |
| PDF upload fails with `RESUME_PARSE_FAILED` | Use a text-based PDF (not a scanned image) |
| Frontend shows blank page after refresh on `/feedback` | Normal — the page fetches results from the history API automatically |
| ChromaDB error on startup | Ensure `backend/chroma_db/` is writable; delete the folder to force re-bootstrap |
| `npm run dev` port already in use | Run `npx kill-port 5173` then retry |
