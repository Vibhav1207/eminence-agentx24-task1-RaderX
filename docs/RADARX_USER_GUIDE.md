# RADARX Autonomous Intelligence Platform

## Complete User Guide

**Version:** 2.14.0  
**Environment:** Production / real-data mode  
**Purpose:** Explain every product page, visible feature, and the end-to-end investigation workflow.

---

## 1. What RadarX does

RadarX accepts one strategic question, collects evidence from connected external providers, runs specialized agents in parallel, correlates the returned evidence, and produces an evidence-backed intelligence report.

The normal flow is:

```text
New Investigation
        ↓
Dynamic mission plan
        ↓
Research / Patent / News / Web / Competitor agents
        ↓
Evidence validation and deduplication
        ↓
Signals, threats, opportunities, and correlations
        ↓
Executive synthesis
        ↓
Recommendations and report
        ↓
Optional watchlist monitoring
```

RadarX does not treat an unavailable provider as successful. If verified evidence is insufficient, the report displays an insufficient-evidence state instead of inventing a conclusion.

---

## 2. Starting the application

Open the deployed Vercel URL or the local application URL. The main dashboard is available at `/` and `/dashboard`.

Before running an investigation, confirm:

1. `/api/health` reports `HEALTHY`.
2. The Supabase provider is `ONLINE`.
3. Gemini is `ONLINE` if AI synthesis is required.
4. `/api/sources` shows connected real providers.

The browser UI uses the same-origin API. Secrets remain server-side and must not be placed in `NEXT_PUBLIC_*` variables.

---

## 3. Dashboard (`/dashboard`)

The Dashboard is the operational overview of the platform.

### What it shows

- Total investigations and their current statuses.
- Agent counts and current activity.
- Active watchlists and monitoring state.
- Alerts and unread alert counts.
- Recent investigations.
- Strategic signal summaries.
- Quick links into active investigations, reports, agents, and monitoring.

### How it works

The page loads investigations, agents, watchlists, alerts, and signals from the production API. It does not use seeded records in production mode. Empty sections mean no corresponding production records exist yet.

### Recommended use

Use the Dashboard to answer: “What is running, what changed, and where should I go next?” Select an investigation to open its live workspace or completed intelligence.

---

## 4. New Investigation (`/investigations/new`)

This is the primary entry point for research.

### Fields

- **Organization:** Main organization or target entity.
- **Technology / Area:** The product, market, technology, or domain being studied.
- **Strategic question:** The exact decision question RadarX must answer.
- **Primary entities:** Organizations or competitors to compare or monitor.
- **Priority:** LOW, MEDIUM, HIGH, or CRITICAL.
- **Time horizon:** The time range for the investigation.

### What happens after Start

1. The request is validated.
2. A durable investigation record is created in Supabase.
3. A mission and task plan are created.
4. The browser navigates to the live investigation workspace.
5. The orchestrator starts provider agents and records trace events.

### Good question example

```text
Compare Spotify and YouTube Music pricing, product strategy, user growth signals, and competitive risks using current verified sources.
```

Avoid vague prompts such as “Tell me about music apps.” A specific question produces more useful evidence and recommendations.

---

## 5. Investigation Workspace (`/investigations/[id]`)

This is the live execution page for one investigation.

### Mission header

Displays the investigation title, status, progress, current phase, current orchestrator action, and checkpoint status.

### Mission controls

- **Pause:** Temporarily stops the mission.
- **Resume:** Restarts a paused or interrupted mission from the latest checkpoint.
- **Cancel:** Stops the active mission.
- **Status indicator:** Shows whether the orchestrator is active, paused, interrupted, or complete.

### Dynamic Mission Plan

Shows the generated task queue and each task state:

- QUEUED
- RUNNING
- COMPLETED
- PARTIAL
- FAILED
- INTERRUPTED

The plan is created from the strategic question. It is not a fixed demo script.

### Agent Network

Shows the specialized agents involved in the investigation, their state, and their assigned work. Typical agents include Planner, Research, Patent, News, Web, Competitor, Validator, and Synthesis.

### Live Execution Trace

Displays the current trace, run ID, timeline events, agent events, tool calls, errors, retries, latency, and token metrics. The trace is persisted in Supabase so it can be read after a serverless request finishes.

### Evidence Stream

Shows evidence as it is collected. Evidence cards can include title, source, source type, URL, verification status, relevance, and summary.

### Knowledge Gaps

Lists questions that could not be answered from the current evidence. A gap is useful: it explains what additional data is needed instead of hiding uncertainty.

### Decision Explanation Stream

Shows why the orchestrator selected a tool, agent, retry, fallback, or next task.

### Self-Evaluation and Hypotheses

Displays the critic/evaluation stage, active hypotheses, confidence changes, contradictions, and conclusion revisions.

### Resource and recovery panels

- Execution budget and limits.
- Active task queue.
- Loop/deadlock notices.
- Checkpoint and recovery state.

### Completion action

When the mission completes, use **View Unified Intelligence** to open the final report.

---

## 6. Unified Intelligence (`/intelligence/[id]`)

This is the main analytical result page.

### Header and provider coverage

Shows completion status, investigation ID, confidence, export controls, and source-provider coverage.

Coverage states include:

- AVAILABLE
- PARTIAL
- UNAVAILABLE
- NO_EVIDENCE

### Executive verdict

Summarizes the answer to the strategic question using verified evidence. The confidence label is derived from evidence count, source diversity, citation coverage, and contradictions.

### Strategic score cards

- Threat score.
- Opportunity score.
- Decision confidence.

These scores are analytical summaries, not guarantees or financial advice.

### Comparison scorecard

For comparison investigations, the page compares entities across evidence-supported dimensions. A dimension can display `INSUFFICIENT EVIDENCE` when the collected sources do not support a fair comparison.

### Key findings

Each finding includes a summary, impact, confidence, and evidence IDs. The evidence IDs provide traceability back to source records.

### Opportunities and threats

Threats and opportunities are extracted from validated signals. They are not created from empty evidence.

### Recommendations card

Recommendations are derived from validated opportunities or threats that contain cited evidence. Each recommendation shows:

- Action.
- Reason.
- Implication.
- Priority.
- Time horizon.
- Supporting evidence IDs.
- Supporting signal IDs.

If no validated opportunity or threat has evidence, the page displays an insufficient-evidence message instead of a fabricated action.

### Watch items

Watch items describe future events worth monitoring, such as new disclosures, publications, patents, or competitor changes.

### Export

The PDF/export control uses report-provided metadata and preserves recommendation evidence links. It does not inject fixed confidence or fake timestamps.

---

## 7. Report (`/report/[id]`)

The report view is a compact presentation layout for sharing.

It contains only the requested report cards:

1. Executive summary.
2. Overall confidence.
3. Evidence-backed opportunities.
4. Evidence cards.
5. Sources.

Threat cards, generic strategic-signal cards, recommendation lists, and emerging-trend cards are intentionally omitted from this compact report layout. The complete analysis remains available on Unified Intelligence.

Each opportunity card shows classification, impact, confidence, explanation, and linked evidence source cards.

---

## 8. Trace Lab (`/trace-lab`)

Trace Lab is the observability workspace for completed and active runs.

### Dashboard view

Shows total runs, success rate, average latency, tool calls, errors, retries, recovery rate, and token totals.

### Runs view

Lists traces loaded from Supabase. Select a trace to inspect its execution.

### Timeline view

Shows every event in order, grouped by agent. Events can display status, duration, tool calls, output metadata, token usage, and errors.

### Graph view

Displays the relationship between tasks, agents, tools, and execution steps.

### Diagnosis view

Analyzes failed or partial traces and identifies root cause, affected component, retry impact, and recovery recommendation.

### Compare view

Compares a baseline trace with an optimized trace using latency, tool calls, errors, retries, success rate, and tokens.

### Trace persistence

Trace records and trace events are stored in Supabase. Trace writes are awaited at important execution points so a Vercel serverless function cannot finish before the database write is scheduled.

---

## 9. Sources (`/sources`)

Displays the connection status of real intelligence providers and the production database.

### Provider cards

Typical cards include:

- Crossref academic REST API.
- Europe PMC patent/search API.
- Wikinews API.
- GitHub REST API.
- Google Gemini.
- Supabase Postgres.

Each card displays configured state, connection status, measured latency, endpoint/model, last checked time, and error details when unavailable.

`CONNECTED` means a real dependency check succeeded. It is not a hardcoded online label.

---

## 10. Agents (`/agents`)

Shows the agent network and operational state.

### Main features

- Agent cards and roles.
- Active/idle/running/completed/failed counts.
- Recent agent activity.
- Current task assignments.
- Agent configuration status.

Agent records are loaded from Supabase in production. Demo seed agents are not used in production mode.

---

## 11. Decision Center (`/decision-center`)

Presents the executive brief and action matrix for a selected investigation.

### Sections

- Executive brief.
- Material intelligence changes.
- Validated threat matrix.
- Strategic opportunity matrix.
- Prioritized action center.

Recommendations can be acknowledged or moved to in-progress. **Investigate Further** creates a follow-up investigation objective from the selected recommendation.

The page can export the brief as Markdown or JSON.

---

## 12. Watchlists (`/watchlists`)

Watchlists convert a finding into continuous monitoring.

### Watchlist features

- Create a watchlist for an entity, technology, or investigation.
- Set sensitivity.
- Pause or resume monitoring.
- Run a scan immediately.
- View monitoring runs.
- Review newly detected signals and alerts.

Watchlist scans use connected providers and save monitoring records in Supabase.

---

## 13. Alerts (`/alerts`)

The Alert Center displays triggered monitoring and intelligence alerts.

### Features

- Filter by category.
- View unread count.
- Open alert details.
- Mark an alert as read.
- Dismiss or update alerts where supported.

Alerts should reference a real investigation, signal, evidence item, watchlist, or monitoring run.

---

## 14. Intelligence Graph (`/intelligence/graph`)

Shows entities and relationships extracted from investigations.

### Features

- Investigation selector.
- Entity nodes.
- Evidence-backed relationship edges.
- Edge details and supporting evidence.
- Launch a follow-up investigation from a relationship.

The graph is useful for finding connections that are not obvious in a list of evidence items.

---

## 15. Entity Profile (`/entities/[id]`)

Displays a focused profile for one extracted entity.

### Features

- Entity name and type.
- Evidence references.
- Relationships.
- Profile attributes.
- Follow-up investigation launch.

Use this page to move from a broad investigation to a targeted entity audit.

---

## 16. Evaluation Lab (`/evaluation`)

Runs controlled evaluation scenarios against the agent system.

### Scenario types

- Controlled agent failure.
- Conflicting evidence.
- Tool timeout.
- Provider failure and recovery.
- Other configured adversarial scenarios.

### What it measures

- Completion status.
- Recovery behavior.
- Retry counts.
- Evidence quality.
- Trace completeness.
- Decision and checkpoint behavior.

This page is for validation and QA, not normal business investigations.

---

## 17. Adversarial Test (`/adversarial-test`)

Provides an interactive fault-injection console for a selected investigation.

Possible tests include forced research failure, patent timeout, conflicting evidence, and low-confidence critic replanning.

Use this page to confirm the orchestrator retries, records the failure, updates the trace, and preserves an honest degraded or insufficient-evidence outcome.

---

## 18. Admin Capabilities (`/admin/capabilities`)

This is an internal audit page for technical reviewers.

It documents and verifies:

- Agentic reasoning loop.
- Dynamic tool selection.
- Multi-agent architecture.
- Agent collaboration.
- Investigation isolation.
- Real-data and source provenance controls.
- Persistent memory and checkpointing.
- Evaluation and tracing capabilities.

It is not a substitute for the production health endpoint or live provider checks.

---

## 19. How To Use (`/how-to-use`)

Provides an in-product walkthrough of the normal workflow:

1. Create one strategic question.
2. Let the orchestrator decompose the work.
3. Review real evidence.
4. Inspect correlations and knowledge gaps.
5. Read the synthesis and recommendations.
6. Start monitoring if the finding needs ongoing observation.

---

## 20. Production health and troubleshooting

### Health endpoint

```text
/api/health
```

Expected production result:

```text
status: HEALTHY
envValid: true
providers.supabase.status: ONLINE
providers.gemini.status: ONLINE
```

### Common statuses

- **HEALTHY:** Environment valid and all checked dependencies responded.
- **DEGRADED:** One or more providers are unavailable or environment validation failed.
- **OFFLINE:** The individual provider/database check failed.
- **PARTIAL:** A provider responded but returned incomplete usable data.
- **INSUFFICIENT EVIDENCE:** The system completed honestly but cannot support a reliable conclusion.

### If an investigation is missing

Confirm that the URL contains the correct investigation ID and that `/api/investigations` lists the record. Production records are stored in Supabase; a new deployment does not recreate in-memory investigations.

### If traces are missing

Check `/api/traces?investigationId=YOUR_ID`, then `/api/traces/events?traceId=YOUR_TRACE_ID`. Create a new investigation after deploying trace changes because older runs may have been created before durable trace persistence was fixed.

### If the report has no opportunities

This means no validated opportunity signal with cited evidence was produced. Review the Evidence and Knowledge Gaps sections before taking action.

---

## 21. Data and security rules

- Production persistence uses Supabase Postgres.
- MongoDB is not selected as a production database.
- Mock data is not a production fallback.
- Provider health is measured by real checks.
- Recommendations require cited evidence.
- API keys and database URLs must remain server-side.
- Rotate any credential that has been pasted into chat, screenshots, commits, or logs.

---

## 22. Suggested demonstration flow

For a Spotify and YouTube Music demonstration:

1. Open **New Investigation**.
2. Enter both services in the technology/entities fields.
3. Ask for a comparison of pricing, product strategy, growth signals, and risks.
4. Start the investigation.
5. Watch the mission plan, agent activity, evidence stream, and live trace.
6. Wait for `COMPLETED`.
7. Open Unified Intelligence.
8. Review opportunities, evidence citations, and recommendations.
9. Open the compact Report page for summary, confidence, opportunities, evidence, and sources.
10. Open Trace Lab to inspect the persisted run.

---

## 23. API quick reference

| Purpose | Endpoint |
|---|---|
| Health | `/api/health` |
| Provider sources | `/api/sources` |
| List investigations | `/api/investigations` |
| One investigation | `/api/investigations/{id}` |
| Start mission | `/api/investigations/{id}/start` |
| Mission state | `/api/investigations/{id}/state` |
| Evidence | `/api/investigations/{id}/evidence` |
| Intelligence | `/api/investigations/{id}/intelligence` |
| Recommendations | `/api/investigations/{id}/recommendations` |
| Traces | `/api/traces?investigationId={id}` |
| Trace events | `/api/traces/events?traceId={traceId}` |
| Watchlists | `/api/watchlists` |
| Alerts | `/api/alerts` |
| Graph | `/api/graph?investigationId={id}` |

---

## 24. Important interpretation rule

RadarX distinguishes between:

1. A provider being reachable.
2. A provider returning usable evidence.
3. Evidence being verified and relevant.
4. A conclusion being strong enough to support action.

A green provider card does not guarantee that every investigation will return evidence. A zero-result agent can be healthy. The final report should be interpreted together with source coverage, evidence count, citation links, contradictions, uncertainties, and confidence.

