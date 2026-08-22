# RADARX Skills Documentation

**Generated:** 2025-08-23  
**Project Path:** `D:/eminence-agentx24-task1`  
**Companion:** `docs/RADARX_ARCHITECTURE.md`

---

## Skill Catalog Overview

This document provides detailed specifications for each identified skill in the RadarX architecture. Skills are conceptual groupings of existing code modules — **no new directories or files have been created**. Each skill maps to implemented functionality in `src/lib/`.

---

## 1. investigation/objective-understanding

**Purpose:** Parse user strategic question into structured objective, constraints, and target entities.

**Module:** `src/lib/orchestrator/missionPlanner.ts` → `MissionPlanner.parseObjective()`

**Inputs:**
- `strategicQuestion: string` — User's natural language question
- `primaryEntities: string[]` — Pre-identified entities from UI
- `context?: InvestigationContext` — Optional prior investigation context

**Outputs:**
- `objective: StructuredObjective` — `{ primaryGoal, targetEntity, technology, constraints[], timeHorizon, priority }`
- `derivedEntities: string[]` — Entities extracted from question

**Tools Used:** None (LLM prompt in `missionPlanner`)

**State Dependencies:** Reads `userObjective`, `targetEntity`, `topic` from state

**Agents Involved:** Orchestrator (planning phase)

**Failure Behavior:** Falls back to raw question as objective; logs warning

**Fallback:** Heuristic extraction (first entity = target, capitalized phrases = entities)

**Can Run in Parallel:** No (first step)

**Can Trigger Replanning:** Yes — if objective changes mid-investigation

**Can Create New Tasks:** Yes — outputs initial task DAG

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** No

---

## 2. investigation/planning

**Purpose:** Decompose structured objective into executable task DAG with dependencies, priorities, and agent assignments.

**Module:** `src/lib/orchestrator/missionPlanner.ts` → `MissionPlanner.planInitialTasks()`, `replan()`

**Inputs:**
- `mission: MissionModel` — Mission metadata (objective, priority, maxIterations)
- `investigation: InvestigationModel` — Full investigation record
- `currentState?: InvestigationState` — For replanning

**Outputs:**
- `TaskModel[]` — Array of tasks with: `id, title, description, agentType, dependencies[], priority, status, maxRetries, retryCount`

**Tools Used:** `plan_tasks` (internal LLM prompt)

**State Dependencies:** Reads `plan`, `completedTasks`, `pendingTasks`, `resourceBudget`

**Agents Involved:** Orchestrator

**Failure Behavior:** Returns minimal task set (discovery → synthesis); logs error

**Fallback:** Hardcoded 7-task template (discover, research, patent, news, correlate, synthesize, validate)

**Can Run in Parallel:** No (sequential dependency resolution)

**Can Trigger Replanning:** Yes — `replan()` called from `routerNode` after task completions

**Can Create New Tasks:** Yes — adds tasks for new hypotheses, gaps, verification needs

**Can Modify Hypotheses:** Indirectly — creates verification tasks for hypotheses

**Can Modify Final Conclusions:** No

---

## 3. investigation/task-decomposition

**Purpose:** Break complex tasks into sub-tasks when evidence gaps or complexity thresholds exceeded.

**Module:** `src/lib/orchestrator/missionPlanner.ts` → `MissionPlanner.decomposeTask()`

**Inputs:**
- `parentTask: TaskModel` — Task to decompose
- `evidence: EvidenceModel[]` — Current evidence
- `hypotheses: Hypothesis[]` — Active hypotheses

**Outputs:**
- `TaskModel[]` — Sub-tasks with `parentTaskId` reference

**Tools Used:** `delegate_task` (internal)

**State Dependencies:** Reads `evidence`, `hypotheses`, `resourceBudget.toolCallCount`

**Agents Involved:** Orchestrator (delegation)

**Failure Behavior:** Returns empty array; parent task continues

**Fallback:** No decomposition — parent task executes as-is

**Can Run in Parallel:** Yes — sub-tasks can run in parallel

**Can Trigger Replanning:** Yes — adds sub-tasks to pending queue

**Can Create New Tasks:** Yes (primary purpose)

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** No

---

## 4. investigation/routing

**Purpose:** Select next executable task from pending queue based on dependencies, priority, resource budget, and agent availability.

**Module:** `src/lib/orchestrator/langGraphOrchestrator.ts` → `routerNode`

**Inputs:**
- `pendingTasks: TaskModel[]`
- `completedTasks: string[]`
- `resourceBudget: ResourceBudget`
- `activeAgents: string[]`

**Outputs:**
- `selectedTask: TaskModel | null` — Next task to execute, or null if none ready
- `routingDecision: RoutingDecision` — `{ reason, skippedTasks[], budgetOk }`

**Tools Used:** None (algorithmic)

**State Dependencies:** Reads `plan`, `completedTasks`, `pendingTasks`, `resourceBudget`, `activeAgents`

**Agents Involved:** Orchestrator (router node)

**Failure Behavior:** Returns null → graph ends or waits

**Fallback:** Priority-only selection (ignores dependencies if deadlocked)

**Can Run in Parallel:** No (single decision point)

**Can Trigger Replanning:** Yes — if no tasks ready but budget remains, triggers `replan()`

**Can Create New Tasks:** No

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** No

---

## 5. intelligence/research

**Purpose:** Retrieve scholarly/technical literature from Crossref with web search fallback.

**Module:** `src/lib/providers/crossrefProvider.ts` + `src/lib/orchestrator/agentRegistry.ts` (research_analyst)

**Inputs:**
- `query: string` — Search query
- `rows?: number` — Max results (default 10)
- `filter?: CrossrefFilter` — Year, type, author filters

**Outputs:**
- `EvidenceModel[]` — Normalized evidence with: `source='crossref', title, url, doi, summary, date, relevance, evidenceType='research'`

**Tools Used:** `search_crossref`, `fetch_paper`, `search_web` (fallback)

**API Endpoint:** `https://api.crossref.org/works` (mailto in header)

**Authentication:** `CROSSREF_API_KEY` (mailto email) — REQUIRED

**Failure Modes:** Network timeout, rate limit (50 req/s), invalid response, circuit breaker open

**Retry Behavior:** 2 retries with exponential backoff (in `agentNode` retryCount)

**Fallback:** `search_web` with same query → returns `EvidenceModel[]` with `source='web'`

**Rate Limits:** Crossref: 50 req/s polite pool; Web: depends on provider

**Currently Configured:** YES (if `CROSSREF_API_KEY` set)

**Actually Used:** YES — Research Analyst agent in every investigation

---

## 6. intelligence/patents

**Purpose:** Retrieve patent data from USPTO PatentsView API with web search fallback.

**Module:** `src/lib/providers/patentProvider.ts` + `agentRegistry.ts` (patent_analyst)

**Inputs:**
- `query: string` — Keyword search
- `assignee?: string` — Company/organization name
- `cpc_class?: string` — Cooperative Patent Classification
- `date_range?: [string, string]` — Filing date range

**Outputs:**
- `EvidenceModel[]` — `{ source='patent', title, url, patent_number, assignee, abstract, claims[], date, relevance, evidenceType='patent' }`

**Tools Used:** `search_patents`, `fetch_patent`, `search_web` (fallback)

**API Endpoint:** `https://api.patentsview.org/patents/query`

**Authentication:** `PATENTS_API_KEY` — REQUIRED

**Failure Modes:** API key invalid, query timeout, malformed response, circuit breaker

**Retry Behavior:** 2 retries (agent-level)

**Fallback:** `search_web` with patent-specific query

**Rate Limits:** PatentsView: 10 req/s (unauthenticated higher with key)

**Currently Configured:** YES (if `PATENTS_API_KEY` set)

**Actually Used:** YES — Patent Analyst agent

---

## 7. intelligence/news

**Purpose:** Retrieve current news articles from NewsAPI/GNews with web search fallback.

**Module:** `src/lib/providers/newsProvider.ts` + `agentRegistry.ts` (news_monitor)

**Inputs:**
- `query: string` — Search terms
- `language?: string` — Default 'en'
- `page_size?: number` — Default 10
- `from_date?: string` — ISO date

**Outputs:**
- `EvidenceModel[]` — `{ source='news', title, url, source_name, published_at, summary, relevance, evidenceType='news' }`

**Tools Used:** `search_news`, `fetch_article`, `search_web` (fallback)

**API Endpoint:** `https://newsapi.org/v2/everything` or `https://gnews.io/api/v4/search`

**Authentication:** `NEWS_API_KEY` — REQUIRED

**Failure Modes:** Rate limit (NewsAPI: 100/day free), key expiry, source blocked, circuit breaker

**Retry Behavior:** 2 retries

**Fallback:** `search_web` with news-focused query

**Rate Limits:** NewsAPI free: 100 req/day; GNews: 100 req/day

**Currently Configured:** YES (if `NEWS_API_KEY` set)

**Actually Used:** YES — News Monitor agent + Watchlist cron jobs

---

## 8. intelligence/competitors

**Purpose:** Multi-source competitor profiling (web, news, patents, research).

**Module:** `src/lib/orchestrator/agentRegistry.ts` → `competitive_intelligence` agent

**Inputs:**
- `competitor_names: string[]`
- `focus_areas: string[]` — e.g., ['product', 'funding', 'hiring', 'patents']
- `time_horizon: string`

**Outputs:**
- `EvidenceModel[]` — Mixed sources with `entity` field set to competitor name
- `SignalModel[]` — Competitive threat/opportunity signals

**Tools Used:** `search_web`, `search_news`, `search_patents`, `search_crossref`

**State Dependencies:** Reads `targetEntity`, `primaryEntities`

**Agents Involved:** Competitive Intelligence agent

**Failure Behavior:** Partial results from available sources

**Fallback:** Web search only if all APIs fail

**Can Run in Parallel:** Yes — with research, patent, news agents

**Can Trigger Replanning:** Yes — new competitors discovered → new tasks

**Can Modify Hypotheses:** Yes — generates competitive threat hypotheses

**Can Modify Final Conclusions:** Indirect — feeds into synthesis

---

## 9. intelligence/evidence-analysis

**Purpose:** Score evidence quality (relevance, credibility, recency, source authority) and detect conflicts.

**Module:** `src/lib/orchestrator/evidenceEvaluator.ts` + `langGraphOrchestrator.ts` (evidenceEvaluatorNode)

**Inputs:**
- `evidence: EvidenceModel[]`
- `context: { objective, targetEntity, topic }`

**Outputs:**
- `ScoredEvidence[]` — Each with `qualityScore (0-100)`, `credibilityTier`, `relevanceScore`, `flags[]`
- `ConflictEvidence[]` — Pairs of contradictory claims with `conflictType`, `severity`

**Tools Used:** `evaluate_evidence` (LLM prompt with rubric)

**State Dependencies:** Reads `evidence`, `userObjective`, `targetEntity`; Writes `conflictingEvidence`

**Agents Involved:** Evidence Evaluator (internal node, not separate agent)

**Failure Behavior:** Assigns default score 50; logs warning

**Fallback:** Heuristic scoring (recency + source domain authority)

**Can Run in Parallel:** Yes — per-evidence scoring independent

**Can Trigger Replanning:** Yes — conflicts trigger verification tasks

**Can Modify Hypotheses:** Yes — low-quality evidence reduces hypothesis confidence

**Can Modify Final Conclusions:** Indirect — low scores reduce synthesis confidence

---

## 10. intelligence/signal-detection

**Purpose:** Cross-source correlation to detect strategic signals (threats, opportunities, trends).

**Module:** `src/lib/intelligence/signalEngine.ts` → `SignalEngine.correlate()`

**Inputs:**
- `evidence: EvidenceModel[]` — All collected evidence
- `entities: EntityModel[]` — Extracted entities
- `relationships: RelationshipModel[]` — Entity relationships

**Outputs:**
- `SignalModel[]` — `{ id, title, classification ('threat'|'opportunity'|'neutral'), impact ('high'|'medium'|'low'), confidence (0-100), summary, whyItMatters, evidenceIds[], recommendedActions[] }`

**Tools Used:** `correlate_sources`, `detect_anomalies` (LLM prompts)

**State Dependencies:** Reads `evidence`, `entities`, `relationships`; Writes `signals`

**Agents Involved:** Signal Detector agent

**Failure Behavior:** Returns empty signals array; investigation continues

**Fallback:** Heuristic — high-relevance evidence from multiple sources = signal

**Can Run in Parallel:** Yes — after evidence collection complete

**Can Trigger Replanning:** Yes — new signals → new investigation angles

**Can Modify Hypotheses:** Yes — signals generate/support hypotheses

**Can Modify Final Conclusions:** Direct — signals become key findings

---

## 11. reasoning/hypotheses

**Purpose:** Generate testable hypotheses from evidence gaps and signals.

**Module:** `src/lib/orchestrator/langGraphOrchestrator.ts` → `hypothesisNode` (LLM prompt)

**Inputs:**
- `evidence: EvidenceModel[]`
- `signals: SignalModel[]`
- `gaps: string[]` — Identified knowledge gaps
- `objective: string`

**Outputs:**
- `Hypothesis[]` — `{ id, statement, type ('causal'|'correlational'|'predictive'), confidence (0-100), supportingEvidenceIds[], refutingEvidenceIds[], status ('proposed'|'testing'|'verified'|'refuted') }`

**Tools Used:** LLM prompt (via `llmProvider`)

**State Dependencies:** Reads `evidence`, `signals`, `hypotheses`; Writes `hypotheses`

**Agents Involved:** Hypothesis Node (internal)

**Failure Behavior:** Returns empty array; continues

**Fallback:** Template hypotheses from signal types

**Can Run in Parallel:** No (depends on evidence/signals)

**Can Trigger Replanning:** Yes — creates verification tasks

**Can Create New Tasks:** Yes — verification tasks for each hypothesis

**Can Modify Hypotheses:** Yes (primary purpose)

**Can Modify Final Conclusions:** Indirect — verified hypotheses become findings

---

## 12. reasoning/conflict-resolution

**Purpose:** Resolve contradictory evidence using source quality weighting and corroboration.

**Module:** `src/lib/orchestrator/langGraphOrchestrator.ts` → `conflictResolverNode`

**Inputs:**
- `conflictingEvidence: ConflictEvidence[]` — From evidenceEvaluatorNode
- `evidence: EvidenceModel[]` — Full evidence set for context

**Outputs:**
- `ResolvedConflict[]` — `{ conflictId, resolution ('source_a'|'source_b'|'uncertain'), reasoning, confidence, corroboratingEvidenceIds[] }`
- Updated `verifiedHypotheses` map

**Tools Used:** Source quality scoring (domain authority, recency, citation count, peer review status)

**State Dependencies:** Reads `conflictingEvidence`, `evidence`; Writes `verifiedHypotheses`, `conflictingEvidence`

**Agents Involved:** Conflict Resolver (internal node)

**Failure Behavior:** Marks all conflicts as 'uncertain'; preserves both sides

**Fallback:** Majority vote by source count

**Can Run in Parallel:** No (depends on conflict detection)

**Can Trigger Replanning:** Yes — unresolved conflicts → additional research tasks

**Can Modify Hypotheses:** Yes — updates `verifiedHypotheses`

**Can Modify Final Conclusions:** Yes — resolution directly affects findings

---

## 13. reasoning/uncertainty

**Purpose:** Track and propagate uncertainty levels through the investigation.

**Module:** `src/lib/types/index.ts` → `InvestigationState.uncertainty` field + `langGraphOrchestrator.ts` propagation

**Inputs:**
- `conflictingEvidence.length`
- `hypothesis.confidence` distribution
- `evidence.qualityScore` distribution
- `toolFailures.count`

**Outputs:**
- `uncertainty: 'Low'|'Medium'|'High'|'Critical'` — Updated in state
- `confidence: number` — Aggregate 0-100

**Tools Used:** Algorithmic calculation (weighted average)

**State Dependencies:** Reads all evidence/hypothesis fields; Writes `uncertainty`, `confidence`

**Agents Involved:** Self-Evaluation Node (updates), Critic Node (gates)

**Failure Behavior:** Defaults to 'Medium'

**Fallback:** Conservative — assumes higher uncertainty

**Can Run in Parallel:** No (aggregation)

**Can Trigger Replanning:** Yes — High/Critical uncertainty → additional verification tasks

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** Yes — low confidence findings flagged in synthesis

---

## 14. reasoning/self-evaluation

**Purpose:** Critic evaluation of draft findings for overclaiming, hallucination risk, coherence, and citation coverage.

**Module:** `src/lib/orchestrator/langGraphOrchestrator.ts` → `selfEvaluationNode` + `criticNode`

**Inputs:**
- `draftFindings: Finding[]`
- `evidence: EvidenceModel[]`
- `recommendations: Recommendation[]`

**Outputs:**
- `SelfEvaluationResult` — `{ overclaimingScore, hallucinationRisk, coherenceScore, citationCoverage, issues[], overallPass: boolean }`
- `criticDecision: 'continue'|'synthesize'|'recover'`

**Tools Used:** LLM critic prompt (structured output)

**State Dependencies:** Reads `finalFindings`, `recommendations`, `evidence`; Writes `executionStatus` (via criticNode)

**Agents Involved:** Self-Evaluator / Critic (internal nodes)

**Failure Behavior:** Passes with warning; logs issues

**Fallback:** Heuristic checks (citation count, claim specificity)

**Can Run in Parallel:** No (final gate)

**Can Trigger Replanning:** Yes — 'continue' loops back to router

**Can Create New Tasks:** Yes — critic creates correction tasks

**Can Modify Hypotheses:** Yes — can refute hypotheses

**Can Modify Final Conclusions:** Yes — can block synthesis until issues fixed

---

## 15. orchestration/parallel-execution

**Purpose:** Execute up to N agents concurrently while respecting dependencies.

**Module:** `src/lib/orchestrator/langGraphOrchestrator.ts` → LangGraph `Send` API + `maxConcurrentAgents=3`

**Inputs:**
- `readyTasks: TaskModel[]` — From routerNode
- `maxConcurrent: number` — From resourceBudget

**Outputs:**
- Parallel `AgentResult[]` — Each with `taskId, agentType, output, evidence[], confidence, durationMs`

**Tools Used:** All agent tools (via `agentRegistry.executeAgent()`)

**State Dependencies:** Reads `plan`, `resourceBudget.maxConcurrentAgents`; Writes `activeAgents`, `agentResults`, `resourceBudget.toolCallCount`

**Agents Involved:** All 7 agent types (dispatched by type)

**Failure Behavior:** Individual agent failures caught; task marked FAILED; others continue

**Fallback:** Sequential execution if parallel fails

**Can Run in Parallel:** Yes (primary purpose)

**Can Trigger Replanning:** No

**Can Create New Tasks:** No

**Can Modify Hypotheses:** Via agent results

**Can Modify Final Conclusions:** Via agent results

---

## 16. orchestration/replanning

**Purpose:** Dynamically adjust task plan based on new evidence, hypothesis results, and resource consumption.

**Module:** `src/lib/orchestrator/missionPlanner.ts` → `MissionPlanner.replan()`

**Inputs:**
- `currentPlan: TaskModel[]`
- `completedTasks: TaskModel[]`
- `newEvidence: EvidenceModel[]`
- `newHypotheses: Hypothesis[]`
- `resourceBudget: ResourceBudget`

**Outputs:**
- `UpdatedPlan: TaskModel[]` — Modified pending tasks, new tasks added, obsolete removed

**Tools Used:** `plan_tasks` (LLM prompt with delta context)

**State Dependencies:** Reads full state; Writes `plan`, `pendingTasks`

**Agents Involved:** Orchestrator

**Failure Behavior:** Returns current plan unchanged

**Fallback:** No replanning — continue with existing plan

**Can Run in Parallel:** No

**Can Trigger Replanning:** Yes (primary purpose)

**Can Create New Tasks:** Yes

**Can Modify Hypotheses:** Indirect — creates tasks that modify hypotheses

**Can Modify Final Conclusions:** No

---

## 17. orchestration/resource-management

**Purpose:** Enforce resource budgets (iterations, tool calls, concurrency, time) and gracefully degrade.

**Module:** `src/lib/orchestrator/autonomousController.ts` → `AutonomousController`

**Inputs:**
- `resourceBudget: ResourceBudget` — Current consumption
- `action: 'tool_call'|'iteration'|'agent_spawn'|'check'`

**Outputs:**
- `Decision: { allowed: boolean, reason, degradationMode?: 'skip_low_priority'|'reduce_concurrency'|'early_terminate' }`

**Tools Used:** None (algorithmic)

**State Dependencies:** Reads/writes `resourceBudget` in state

**Agents Involved:** Autonomous Controller (internal)

**Failure Behavior:** Allows action (fail-open) but logs

**Fallback:** Hard limits — hard stop at maxIterations/maxToolCalls

**Can Run in Parallel:** Yes (check per action)

**Can Trigger Replanning:** Yes — degradation mode triggers replan

**Can Create New Tasks:** No

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** Yes — early termination forces synthesis with current state

---

## 18. orchestration/loop-detection

**Purpose:** Detect stagnation (no confidence progress over N iterations) and trigger strategy change.

**Module:** `src/lib/orchestrator/autonomousController.ts` → `detectStagnation()`

**Inputs:**
- `confidenceHistory: number[]` — Last N confidence values
- `iterationCount: number`
- `maxStagnantIterations: number` (default 3)

**Outputs:**
- `StagnationResult: { detected: boolean, strategyChange: 'broaden_search'|'change_agents'|'early_synthesize'|'stop' }`

**Tools Used:** None (algorithmic)

**State Dependencies:** Reads `confidence`, `iterationCount`, `resourceBudget`

**Agents Involved:** Autonomous Controller

**Failure Behavior:** Returns `detected: false`

**Fallback:** Hard stop at `maxIterations`

**Can Run in Parallel:** No

**Can Trigger Replanning:** Yes — strategy change = replan

**Can Create New Tasks:** Yes — new search strategy tasks

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** Yes — early synthesis

---

## 19. orchestration/deadlock-recovery

**Purpose:** Detect and resolve cyclic task dependencies.

**Module:** `src/lib/orchestrator/langGraphOrchestrator.ts` → `recoveryNode` + `DEADLOCK_AND_RECOVERY` scenario

**Inputs:**
- `plan: TaskModel[]` — Task graph
- `dependencyGraph: Map<taskId, taskId[]>`

**Outputs:**
- `ResolvedPlan: TaskModel[]` — With broken cycle (lowest priority edge removed)
- `DeadlockEvent: { cycle: taskId[], brokenEdge: [from, to], resolution: 'priority_based' }`

**Tools Used:** Tarjan's algorithm (cycle detection) + priority-based edge removal

**State Dependencies:** Reads `plan`; Writes `plan`, emits `DEADLOCK_DETECTED` event

**Agents Involved:** Recovery Node

**Failure Behavior:** Logs error; marks involved tasks FAILED

**Fallback:** Remove all dependencies for stuck tasks

**Can Run in Parallel:** No

**Can Trigger Replanning:** Yes — modified plan triggers re-route

**Can Create New Tasks:** No

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** No

---

## 20. reliability/retries

**Purpose:** Automatic retry of failed tasks/tools with exponential backoff and max retry limits.

**Module:** `src/lib/orchestrator/langGraphOrchestrator.ts` (agentNode) + `TaskModel.retryCount/maxRetries`

**Inputs:**
- `task: TaskModel` — With `retryCount`, `maxRetries` (default 2)
- `error: Error` — From tool or agent execution

**Outputs:**
- `RetryDecision: { retry: boolean, delayMs, updatedTask }`

**Tools Used:** None (orchestrator logic)

**State Dependencies:** Reads/writes `task.retryCount`, `state.retryCounts`, `state.toolFailures`

**Agents Involved:** All agents (via orchestrator)

**Failure Behavior:** After maxRetries → task status = FAILED; recovery node handles

**Fallback:** No retry — immediate failure

**Can Run in Parallel:** Yes (per-task)

**Can Trigger Replanning:** Yes — failed tasks may trigger alternative approaches

**Can Create New Tasks:** No

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** No

---

## 21. reliability/fallback

**Purpose:** Provider-level circuit breaker with automatic fallback to web search.

**Module:** `src/lib/providers/*.ts` → Each provider has `circuitOpen` state + `search_web` fallback

**Inputs:**
- `providerName: 'crossref'|'patent'|'news'`
- `consecutiveFailures: number`
- `lastFailure: Error`

**Outputs:**
- `FallbackDecision: { useFallback: boolean, fallbackTool: 'search_web', reason }`

**Tools Used:** `search_web` (internal)

**State Dependencies:** Provider-level circuit breaker state (in-memory per process)

**Agents Involved:** Research Analyst, Patent Analyst, News Monitor

**Failure Behavior:** Circuit opens after 3 consecutive failures; 60s half-open test

**Fallback:** Always `search_web` with same query

**Can Run in Parallel:** Yes (per-provider)

**Can Trigger Replanning:** No

**Can Create New Tasks:** No

**Can Modify Hypotheses:** Indirect — fallback evidence may differ in quality

**Can Modify Final Conclusions:** Indirect

---

## 22. reliability/checkpointing

**Purpose:** Persist full investigation state at every node for crash recovery.

**Module:** `src/lib/orchestrator/checkpointManager.ts`

**Inputs:**
- `investigationId: string`
- `currentNode: string`
- `state: InvestigationState`

**Outputs:**
- `InvestigationCheckpoint` — Persisted to MongoDB + in-memory Map

**Tools Used:** MongoDB `insertOne` + `updateOne` (heartbeat)

**State Dependencies:** Reads full `InvestigationState`; Writes checkpoint doc

**Agents Involved:** Checkpoint Node (every graph transition)

**Failure Behavior:** In-memory fallback; logs error; continues

**Fallback:** In-memory Map (survives process restart only if same process)

**Can Run in Parallel:** No (serialized per investigation)

**Can Trigger Replanning:** No

**Can Create New Tasks:** No

**Can Modify Hypotheses:** No (snapshots current state)

**Can Modify Final Conclusions:** No

**Retention Policy:** Latest 10 + milestones (planner, critic, synthesis, validator nodes)

---

## 23. reliability/recovery

**Purpose:** Resume investigation from latest valid checkpoint after interruption/crash.

**Module:** `src/lib/orchestrator/checkpointManager.ts` → `resumeInvestigation()`, `detectStaleInvestigations()`

**Inputs:**
- `investigationId: string`
- `staleThresholdMs: number` (default 120000 = 2 min)

**Outputs:**
- `RestoredState: InvestigationState` — With interrupted tasks re-queued, retryCount incremented
- `RecoveryEvent` — Logged to `mission_events`

**Tools Used:** MongoDB `findOne` (checkpoints), `updateMany` (tasks), `updateOne` (investigation)

**State Dependencies:** Reads `investigation_checkpoints`, `investigations`; Writes `investigations.metadata.langGraph`, `plan` task statuses

**Agents Involved:** Recovery Node + Stale Detection Cron (60s interval)

**Failure Behavior:** Throws `CHECKPOINT_NOT_FOUND` or `INVESTIGATION_NOT_FOUND`; manual intervention

**Fallback:** None — requires valid checkpoint

**Can Run in Parallel:** No (single investigation)

**Can Trigger Replanning:** Yes — restored plan goes to routerNode

**Can Create New Tasks:** No (re-queues existing)

**Can Modify Hypotheses:** No (restores previous)

**Can Modify Final Conclusions:** No

---

## 24. memory/investigation-memory

**Purpose:** Maintain per-investigation long-term context (key findings, entities, hypotheses) for context building.

**Module:** `src/lib/db/repository.ts` → `InvestigationMemoryModel` + `src/lib/orchestrator/contextBuilderService.ts`

**Inputs:**
- `investigationId: string`
- `updates: Partial<InvestigationMemoryModel>` — Key findings, entities, hypotheses, decisions

**Outputs:**
- `InvestigationMemoryModel` — `{ investigationId, objective, targetEntity, technology, timeHorizon, status, keyEntities[], keyFindings[], activeHypotheses[], resolvedConflicts[], decisionLog[], contextSummary, updatedAt }`

**Tools Used:** MongoDB CRUD

**State Dependencies:** Synced from `InvestigationState` at checkpoints

**Agents Involved:** Context Builder Service (assembles LLM context)

**Failure Behavior:** Logs error; context built from current state only

**Fallback:** Current state only (no historical memory)

**Can Run in Parallel:** Yes (read-heavy)

**Can Trigger Replanning:** No

**Can Create New Tasks:** No

**Can Modify Hypotheses:** Stores hypothesis history

**Can Modify Final Conclusions:** Stores conclusion versions

---

## 25. memory/long-term-memory

**Status:** **NOT IMPLEMENTED**

**Purpose:** Cross-investigation learning — entity profiles, competitor tracking, pattern recognition across investigations.

**Required Module:** New — `src/lib/memory/longTermMemory.ts`

**Inputs:** Aggregated `InvestigationMemoryModel[]` across investigations

**Outputs:** `EntityProfile`, `CompetitorProfile`, `PatternLibrary`

**Tools:** Vector similarity search, entity resolution

**State:** New collection `long_term_memory`

**Agents:** New — Memory Synthesis Agent

**Gap:** Currently each investigation is isolated. No learning transfer.

---

## 26. reporting/synthesis

**Purpose:** Generate executive intelligence brief from all evidence, signals, hypotheses, and verified findings.

**Module:** `src/lib/intelligence/synthesisEngine.ts` → `SynthesisEngine.synthesizeIntelligence()`

**Inputs:**
- `investigation: InvestigationModel`
- `signals: SignalModel[]`
- `evidence: EvidenceModel[]`
- `entities: EntityModel[]`
- `relationships: RelationshipModel[]`

**Outputs:**
- `ExecutiveIntelligence` — `{ executiveSummary, keyFindings[], recommendedActions[], watchItems[], threats[], opportunities{}, confidence, sourceCoverage, evidenceIds[], signalIds[], entityIds[] }`

**Tools Used:** `synthesize_brief`, `generate_recommendations` (LLM prompts with full context)

**State Dependencies:** Reads all investigation collections; Writes `investigation.intelligence`

**Agents Involved:** Synthesis Specialist agent + Synthesis Node

**Failure Behavior:** Returns minimal brief with "synthesis failed" notice

**Fallback:** Template brief from top signals

**Can Run in Parallel:** No (final step)

**Can Trigger Replanning:** No

**Can Create New Tasks:** No

**Can Modify Hypotheses:** No (consumes verified)

**Can Modify Final Conclusions:** Yes (primary output)

---

## 27. reporting/citations

**Purpose:** Ensure all findings link to traceable evidence citations.

**Module:** `src/lib/intelligence/synthesisEngine.ts` (citation tracking) + UI `EvidenceCard` + citation pills

**Inputs:** `keyFindings[].evidenceIds[]`, `evidence: EvidenceModel[]`

**Outputs:** Citation-linked findings in UI and PDF

**Tools Used:** None (data structure enforcement)

**State Dependencies:** `ExecutiveIntelligence.keyFindings[].evidenceIds`

**Agents:** Synthesis Specialist (enforces citations)

**Failure Behavior:** Findings without citations flagged in self-evaluation

**Fallback:** "Unverified" badge on findings

**Can Run in Parallel:** No

**Can Trigger Replanning:** Yes — low citation coverage → more evidence tasks

**Can Create New Tasks:** Indirect

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** Yes — uncited claims downgraded

---

## 28. reporting/recommendations

**Purpose:** Generate prioritized, time-horizoned, evidence-backed actionable recommendations.

**Module:** `src/lib/intelligence/synthesisEngine.ts` → `generateRecommendations()`

**Inputs:**
- `brief: ExecutiveIntelligence`
- `evidence: EvidenceModel[]`
- `signals: SignalModel[]`

**Outputs:**
- `Recommendation[]` — `{ id, action, reason, impact, confidence, priority, timeHorizon, evidenceIds[], status }`

**Tools Used:** `generate_recommendations` (LLM prompt)

**State Dependencies:** Reads `brief`, `evidence`, `signals`

**Agents:** Synthesis Specialist

**Failure Behavior:** Generic recommendations from signal types

**Fallback:** Template: "Monitor X", "Investigate Y"

**Can Run in Parallel:** No

**Can Trigger Replanning:** No

**Can Create New Tasks:** Yes — "investigate further" action creates new investigation

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** Direct output

---

## 29. reporting/pdf-export

**Purpose:** Client-side PDF generation of executive brief with evidence appendix.

**Module:** `src/components/report/PdfExportButton.tsx` → jsPDF + autoTable

**Inputs:**
- `brief: ExecutiveBriefVersion` (versioned brief)
- `evidence: EvidenceModel[]`

**Outputs:** `blob: application/pdf` → browser download

**Tools Used:** `jspdf`, `jspdf-autotable` (via CDN or bundled)

**State Dependencies:** Reads from UI props (passed from `intelligence/[id]/page.tsx`)

**Agents:** None (UI component)

**Failure Behavior:** Toast error; console log

**Fallback:** Print to PDF via browser

**Can Run in Parallel:** Yes (client-side)

**Can Trigger Replanning:** No

**Can Create New Tasks:** No

**Can Modify Hypotheses:** No

**Can Modify Final Conclusions:** No

---

## 30. ui/dashboard

**Purpose:** Command Center — real-time overview of investigations, signals, agents, alerts.

**Module:** `src/app/dashboard/page.tsx`

**Components:** `MetricCard`, `SignalCard`, `InvestigationCard`, `AgentStatus`, `ActivityFeed`

**Data Sources:** `investigationsApi`, `agentsApi`, `watchlistsApi`, `alertsApi`, `signalsApi`

**State:** Local React state + 1.5s polling (adversarial test) / manual refresh

**Animations:** Framer Motion entrance + stagger

---

## 31. ui/investigation

**Purpose:** Unified Intelligence Report — executive brief, findings, recommendations, evidence, watchlist creation.

**Module:** `src/app/intelligence/[id]/page.tsx`

**Components:** `ConfidenceIndicator`, `ThreatIndicator`, `OpportunityIndicator`, `EvidenceCard`, `PdfExportButton`, `RightDrawer`

**Data Sources:** `investigationsApi.getById`, `getIntelligence`, `getEvidence`, `regenerateIntelligence`

**Features:** Regenerate intelligence, PDF export, start watchlist

---

## 32. ui/evidence

**Purpose:** Evidence exploration cards with provider metadata, relevance, citations.

**Module:** `src/components/ui/Cards.tsx` → `EvidenceCard`

**Fields Displayed:** Source badge, title, date, relevance bar, summary, link, provider metadata

---

## 33. ui/agent-activity

**Purpose:** Agent network status grid + real-time activity feed.

**Module:** `src/app/agents/page.tsx` + `src/components/investigation/AgentNetworkPanel.tsx`

**Components:** `AgentCard`, `ActivityFeed`, `InvestigationFlowGraph`

**Data Sources:** `agentsApi.getAll`, `getActivity`, `investigationsApi.getTasks`

---

## 34. ui/reports

**Purpose:** Historical reports listing + versioned brief comparison.

**Module:** `src/app/reports/` (not fully inspected) + `src/components/investigation/ConclusionRevisionPanel.tsx`

**Features:** Version diff, decision stream, hypothesis tracking

---

## Skill Discovery & Selection Protocol

**Future Planner Integration:** When objective received, planner should:

1. **Keyword Extraction** — Identify domains: "patent" → patent_research, "competitor" → competitor_analysis, "news" → news_analysis
2. **Skill Resolution** — Map keywords → SkillRegistry entries
3. **Dependency Ordering** — research/patents/news → evidence-analysis → signal-detection → hypotheses → conflict-resolution → verification → self-evaluation → synthesis
4. **Resource Allocation** — Assign budget per skill based on priority
5. **Execution Graph** — Build LangGraph subgraph for required skills only

**Example Objective:** "Analyze NVIDIA's position in Generative AI and identify emerging competitive threats"

**Required Skills:**
1. `objective-understanding` → parse
2. `planning` → decompose
3. `research` (Crossref) → technical papers
4. `patents` → IP landscape
5. `news` → market signals
6. `competitors` → AMD, Intel, Cerebras, Groq profiling
7. `evidence-analysis` → score all
8. `signal-detection` → correlate
9. `hypotheses` → generate threat hypotheses
10. `conflict-resolution` → resolve market share disputes
11. `hypothesis-verification` → verify
12. `self-evaluation` → critic
13. `synthesis` → executive brief
14. `citations` → verify traceability
15. `recommendations` → actions
16. `pdf-export` → deliverable

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-08-23 | Initial skill documentation from codebase analysis |

---

*This document is a living reference. Update when new skills are added or existing skills modified.*