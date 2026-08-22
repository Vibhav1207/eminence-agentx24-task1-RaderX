# 🛡️ RadarX — Autonomous Multi-Agent Intelligence Platform

> **AUTONOMOUS AGENTIC INVESTIGATION ENGINE POWERED BY LANGGRAPH**

---

## 📌 Project Name
**RadarX — Autonomous Multi-Agent Intelligence Platform**

---

## 👥 Team Members
- **Vibhav 1207** (Lead AI & Systems Architect)
- **Eminence AgentX Team**

---

## 🎯 Problem Statement
In fast-moving technology, market, and enterprise domains, decision-makers are overwhelmed by fragmented, contradictory, and unverified data from diverse sources (academic publications, patent gazettes, SEC corporate filings, and global news feeds). Existing AI tools rely on static single-pass prompts that invent certainty, swallow errors, choke on API failures, or get trapped in repetitive loops. 

Organizations need an **autonomous agentic system** capable of:
1. Decomposing complex strategic questions dynamically.
2. Executing concurrent multi-agent investigations across real data providers.
3. Persisting graph execution state and recovering from process crashes.
4. Handling tool timeouts and rate limits autonomously.
5. Detecting and resolving contradictory evidence using source quality and temporal priority.
6. Evaluating its own hypotheses and self-correcting overclaiming statements.
7. Operating safely under resource constraints (tool & LLM call budgets) while preventing reasoning loops and dependency deadlocks.

---

## 📝 Project Description
**RadarX** is an enterprise-grade autonomous intelligence platform built on **LangGraph**. Given a single high-level strategic question (e.g., *"Assess whether Company X is becoming a serious AI inference competitor"*), RadarX dynamically plans, decomposes objectives, discovers available provider streams, and launches a concurrent multi-agent network (Research, Patent, News, Competitor, Web).

During execution, RadarX monitors state checkpoints, applies circuit breakers for failing tools, resolves conflicting claims, calculates evidence coverage %, and derives falsifiable hypothesis models. If self-evaluation reveals unverified claims, RadarX autonomously creates targeted corroboration tasks, hedges conclusion text to reflect uncertainty, or safe-stops under budget constraints—delivering an executive intelligence brief with **100% source traceability** and zero fake data.

---

## 🛠️ Technologies Used

- **Agentic Framework**: `@langchain/langgraph` (Stateful Directed Graph, Pregel Checkpointer Saver, Conditional Edges, Parallel Subgraphs)
- **Core Web Framework**: Next.js 16 (App Router, Turbopack, Serverless API Routes)
- **Frontend UI & Styling**: React 19, Vanilla CSS Glassmorphism, TailwindCSS v4, Framer Motion, Lucide Icons
- **AI & Reasoning Models**: Google Gemini AI Engine (`@google/generative-ai`, REST API)
- **Data Infrastructure**: MongoDB Atlas & RadarX Persistent Repository System
- **External Data Providers**:
  - Academic REST Index (Crossref & arXiv Open Access API)
  - USPTO Open Data & Gazette Index
  - SEC EDGAR & Global News Syndicate Stream
  - Technical Web & Open-Source Repository Crawler
- **Language & Tooling**: TypeScript (Strict Type Safety), Node.js, `npx tsc`

---

## ✨ Key Features (Stages 5A – 5I Complete)

### 1. 🤖 Master LangGraph Orchestrator (Stage 5A & 5I)
- Stateful directed graph execution model.
- Dynamic node routing across Planner, Parallel Agents, Validator, Conflict Resolver, Evaluator, and Synthesis.
- Memory-based reasoning lookup (`getInvestigationMemory`) prior to planning.

### 2. ⚡ Dynamic Planning & Parallel Multi-Agent Execution (Stage 5B & 5C)
- Objective-driven task decomposition.
- Concurrent multi-agent network execution (Research, Patent, News, Competitor, Web) synchronized via dependency graph IDs.

### 3. 💾 Checkpointing & Crash Recovery (Stage 5D)
- Persists investigation state at every graph node transition (`PregelCheckpointSaver`).
- Recovers state seamlessly upon process crash or server restart without restarting from scratch.

### 4. 🛡️ Autonomous Failure Recovery & Tool Fallback (Stage 5E)
- Circuit breaker detection for API timeouts, rate limits, and network errors.
- Automatic routing to secondary provider streams or query reformulation.

### 5. ⚔️ Conflicting Evidence Resolution & Uncertainty Reasoning (Stage 5F)
- 3-Phase conflict detection engine (Direct Contradiction, Apparent Conflict, Temporal Progression).
- Resolves conflicts using source quality rating (`PRIMARY` vs `SECONDARY`) and temporal priority.
- Preserves explicit uncertainty when evidence weight is equal.

### 6. 🔍 Self-Evaluation & Hypothesis Verification (Stage 5G)
- Deterministic claim evaluation and evidence coverage % math (`(supported + 0.5×partial)/total * 100`).
- Derives explicit falsifiable hypothesis models (`SUPPORTED`, `CONTRADICTED`, `UNSUPPORTED`).
- Versioned conclusion self-correction ($V1 \rightarrow V2 \rightarrow V3$) to hedge overclaiming statements.

### 7. 📊 Resource-Aware Execution, Loop & Deadlock Prevention (Stage 5H)
- Real-time tool call, LLM call, retry, and verification budget tracking.
- Task prioritization based on `Information Value / Resource Cost` scores.
- Graph-level loop detection (`LOOP_DETECTED`), stagnation detection (`STAGNATION_DETECTED`), and dependency cycle relaxation (`DEADLOCK_DETECTED`).
- Graceful degradation mode under constrained resources.

### 8. 💻 User-Facing Command Center UI & Decision Stream (Stage 5I)
- **Master LangGraph Visual Workflow**: Displays live node transitions.
- **RADARX DECISION STREAM**: User-facing cards explaining *"WHY DID RADARX DO THIS?"*.
- **Execution Budget & Active Task Queue**: Real-time resource meters and priority-sorted scheduler.
- **Fact / Inference / Recommendation Categorization**: Clear category tags in final reports with 100% source citations.

---

## ⚡ Installation & Setup Steps

### 1. Prerequisites
- Node.js (v20+ recommended)
- npm or yarn
- Git

### 2. Clone the Repository
```bash
git clone https://github.com/Vibhav1207/eminence-agentx24-task1-RaderX.git
cd eminence-agentx24-task1-RaderX
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` or `.env.local` file in the root directory:

```env
# Application Mode
APP_MODE=production

# Database Configuration (Optional: RadarX in-memory fallback active if absent)
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=radarx

# Contact Header for Academic REST Queries
CROSSREF_MAILTO=research@radarx.ai

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🚀 How to Run the Project

### Development Server
```bash
npm run dev
```
Open [**http://localhost:3000**](http://localhost:3000) in your browser.

### Type-Check Verification
```bash
npx tsc --noEmit
```
Verifies strict TypeScript compilation across all application routes and modules.

### Production Build
```bash
npm run build
npm start
```

---

## 🧪 Live Demo & Screenshots

| Page | URL | Description |
|:---|:---|:---|
| ⚡ **Adversarial Live Test Bench** | [**`http://localhost:3000/adversarial-test`**](http://localhost:3000/adversarial-test) | **Primary Hackathon Live Test Bench**: Trigger 6 live adversarial test scenarios (tool outage, evidence conflict, resource budget limit, deadlock, stagnant loop, crash recovery). |
| 📊 **Live Investigation Workspace** | [**`http://localhost:3000/investigations/[id]`**](http://localhost:3000/investigations) | Live investigation command center with visual graph workflow, budget meters, task queues, and decision feed. |
| 🟢 **Data Sources Registry** | [**`http://localhost:3000/sources`**](http://localhost:3000/sources) | Audited backend health check registry displaying active pings across intelligence streams. |
| 🤖 **Agent Network Center** | [**`http://localhost:3000/agents`**](http://localhost:3000/agents) | View status across all specialized autonomous agents. |

---

## 📜 License
This project is licensed under the MIT License.
