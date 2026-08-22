# RadarX System Architecture & Workflow

## High-Level Architecture Overview

RadarX is built as a Next.js full-stack application (using the App Router) deployed on Vercel. It features a robust frontend for submitting strategic intelligence queries, a detailed live-logs admin dashboard, and an advanced **Multi-Agent Orchestration Backend** powered by the `@google/genai` SDK (Gemini 1.5 Flash).

### Core Components

1. **Frontend (UI/UX)**
   - `InvestigateClient.tsx`: The primary interface where users define their strategic investigation parameters (Organization, Tech, Competitors, Time Range).
   - `ReportClient.tsx`: Renders the final structured Intelligence Report (Threats, Opportunities, Signals).
   - `LogsClient.tsx`: A live Admin Dashboard that streams backend agent telemetry in real-time.

2. **Backend (API Layer)**
   - `api/investigate/route.ts`: The Vercel Serverless Function entry point. It receives the user payload, initializes the database records, and triggers the `runInvestigationAgent` pipeline.
   - `events.ts`: A telemetry system that logs specific execution events directly to a MongoDB `agent_events` collection, which fuels the live Admin UI.

3. **Multi-Agent Pipeline (`agent.ts`)**
   - The heart of Task 3. A single monolithic script was decoupled into a highly specialized Manager-Worker architecture with three distinct AI roles.
   - **Tools (`tools.ts`)**: External API integrations (Exa Web Search, Patent APIs, Academic APIs) used exclusively by the Research Agent.

---

## Multi-Agent Workflow Execution

When a user submits an investigation request, the backend follows this exact orchestration loop:

### 1. The Orchestrator (Manager)
- **Role:** Coordinates the lifecycle of the investigation.
- **Workflow:**
  1. Receives the raw strategic objective and context.
  2. Spawns the **Research Agent**, passing down a specific "Focus Area" (e.g., *Initial comprehensive research*).
  3. Awaits the `Evidence Package` from the Research Agent.
  4. Spawns the **Strategic Analysis Agent**, passing both the user's objective and the compiled `Evidence Package`.
  5. Evaluates the Analysis Agent's response.
     - If the response is `needs_more_evidence`, the Orchestrator loops back to Step 2, spinning up a new Research Agent with a highly specific follow-up focus.
     - If the response is `complete`, it finalizes the JSON structure and returns it to the frontend.
  *(Note: The Orchestrator is hard-capped at a maximum of 2 cycles to ensure execution stays beneath Vercel's 60-second limit).*

### 2. The Research Intelligence Agent (Worker)
- **Role:** Gather and normalize data.
- **Capabilities:** This is the only agent with access to external `tools`.
- **Workflow:**
  1. Receives the assigned focus area from the Orchestrator.
  2. Dynamically decides which external APIs (Web, Patents, Research) to query.
  3. Executes the API queries and parses the raw text.
  4. Synthesizes the raw data into a strictly structured `Evidence Package` JSON, ensuring all evidence is concisely summarized and properly cited.
  5. Returns the package to the Orchestrator.

### 3. The Strategic Analysis Agent (Evaluator)
- **Role:** Understand what the evidence means.
- **Capabilities:** Completely cut off from external search tools; forces pure reasoning over the provided dataset.
- **Workflow:**
  1. Receives the `Evidence Package` from the Orchestrator.
  2. Cross-references the data against the user's strategic question.
  3. **Decision Fork:**
     - **Insufficient:** If a major claim lacks independent corroboration, it outputs a strict JSON error: `{"status": "needs_more_evidence", "requested_focus": "..."}`.
     - **Sufficient:** If the evidence is solid, it correlates the data to extract strategic signals, classifies them (Threat/Opportunity), assigns an impact/confidence score, and outputs the final `Strategic Assessment` JSON.

---

## Data Flow Diagram

```mermaid
graph TD
    User([User Request]) --> API[POST /api/investigate]
    API --> ORCH[Intelligence Orchestrator]
    
    subgraph Iteration Loop (Max 2 Cycles)
        ORCH -- "Delegates Collection" --> RES[Research Agent]
        RES -- "Dynamic Tool Calls" --> T_WEB[Web Search API]
        RES -- "Dynamic Tool Calls" --> T_PAT[Patent API]
        RES -- "Dynamic Tool Calls" --> T_SCI[Research API]
        T_WEB --> RES
        T_PAT --> RES
        T_SCI --> RES
        RES -- "Returns JSON" --> EP[Evidence Package]
        
        EP --> ORCH
        
        ORCH -- "Delegates Analysis" --> STRAT[Strategic Analysis Agent]
        STRAT -- "Reads" --> EP
    end
    
    STRAT -- "INSUFFICIENT" --> ORCH
    STRAT -- "SUFFICIENT" --> REPORT[Final Strategic Report JSON]
    
    REPORT --> API
    API --> DB[(MongoDB / Frontend UI)]
```

---

## Key Benefits of this Architecture
- **Separation of Concerns:** The Research Agent focuses purely on data extraction and tool syntax, while the Strategy Agent dedicates its entire token context window to deep reasoning and correlation.
- **Autonomous Feedback:** The system doesn't just blindly summarize the first page of Google. It can identify its own blind spots and trigger follow-up investigations.
- **Live Observability:** Because every agent logs its exact state to MongoDB via `events.ts`, the Admin Dashboard provides total transparency into the AI's autonomous decision-making process.
