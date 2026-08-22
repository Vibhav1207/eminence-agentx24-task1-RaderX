import { CreateInvestigationInput, CreateWatchlistInput } from '../schemas';

// Re-export Schema types
export type { CreateInvestigationInput, CreateWatchlistInput };

// API Response Wrappers
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
  error?: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
  timestamp: string;
}

// Priority Levels
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Investigation Status
export type InvestigationStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'RUNNING'
  | 'INVESTIGATING'
  | 'ANALYZING'
  | 'CORRELATING'
  | 'SYNTHESIZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED';

// Agent Types
export type AgentType =
  | 'RESEARCH'
  | 'PATENT'
  | 'NEWS'
  | 'COMPETITOR'
  | 'WEB'
  | 'SIGNAL'
  | 'ORCHESTRATOR'
  | 'SYNTHESIS';

// Agent Execution Status
export type AgentStatus =
  | 'IDLE'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETE'
  | 'PARTIAL'
  | 'FAILED'
  | 'RETRYING'
  | 'ERROR';

// Source Types
export type SourceType =
  | 'RESEARCH'
  | 'PATENT'
  | 'NEWS'
  | 'COMPETITOR'
  | 'WEB'
  | 'PUBLIC_DATA'
  | 'REGULATORY'
  | 'COMPANY';

// Source Quality Rating
export type SourceQuality = 'PRIMARY' | 'SECONDARY' | 'AGGREGATED' | 'UNVERIFIED';

// 1. Investigation Model
export interface InvestigationModel {
  id: string;
  title: string;
  objective: string;
  status: InvestigationStatus;
  priority: PriorityLevel;
  timeHorizon: string;
  primaryEntities: string[];
  technology?: string;
  organization?: string;
  competitors?: string[];
  strategicQuestion?: string;
  confidenceScore?: number;
  confidence?: number;
  progress: number;
  activeAgents?: AgentType[];
  evidenceCount?: number;
  signalCount?: number;
  signalsCount?: number;
  sourcesCount?: number;
  activeAgentsCount?: number;
  threatScore?: number;
  opportunityScore?: number;
  signalVelocity?: number;
  startedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  intelligence?: ExecutiveIntelligence;
  evidence?: EvidenceModel[];
  signals?: SignalModel[];
  whyThisMatters?: string;
  executiveSummary?: string;
  orchestratorStatus?: string;
  orchestratorAction?: string;
  metadata?: Record<string, unknown>;
}

// 2. Agent Model
export interface AgentModel {
  id: string;
  name: string;
  type: AgentType;
  role: string;
  status: AgentStatus;
  currentTask: string;
  currentInvestigationId?: string;
  evidenceProcessed: number;
  confidence: number;
  color: string;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
}

// 3. Evidence Item Model
export interface EvidenceModel {
  id: string;
  investigationId: string;
  taskId?: string;
  agentId?: string;
  title: string;
  summary: string;
  content?: string;
  url?: string;
  publishedAt?: string;
  date?: string;
  discoveredAt: string;
  retrievedAt?: string;
  source: string;
  sourceType: SourceType;
  sourceQuality?: SourceQuality;
  confidence: number;
  relevanceScore: number;
  entityIds: string[];
  authors?: string[];
  doi?: string[];
  patentNumber?: string[];
  journal?: string[];
  metrics?: Array<{ label: string; value: string }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// 4. Entity Model
export type EntityType =
  | 'COMPANY'
  | 'COMPETITOR'
  | 'TECHNOLOGY'
  | 'PERSON'
  | 'PRODUCT'
  | 'PATENT'
  | 'MARKET'
  | 'REGULATION'
  | 'RESEARCH_TOPIC';

export interface EntityModel {
  id: string;
  investigationId?: string;
  name: string;
  type: EntityType;
  description: string;
  confidence: number;
  summary?: string;
  logo?: string;
  website?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ==================================================
// STAGE 2.11 EXECUTIVE DECISION CENTER MODELS
// ==================================================

export type ChangeType =
  | 'NEW'
  | 'INCREASE'
  | 'DECREASE'
  | 'EMERGING'
  | 'DISAPPEARING'
  | 'ACCELERATING'
  | 'DECELERATING'
  | 'STRATEGIC_SHIFT'
  | 'COMPETITIVE_MOVE'
  | 'TECHNOLOGY_SHIFT';

export interface ChangeItemModel {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  changeType: ChangeType;
  magnitude: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  evidenceIds: string[];
  entityIds: string[];
  detectedAt: string;
}

export type RecommendationStatus =
  | 'RECOMMENDED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DISMISSED';

export interface ExecutiveRecommendationModel {
  id: string;
  investigationId: string;
  title: string;
  action: string;
  reason: string;
  priority: PriorityLevel;
  impact: ImpactLevel;
  confidence: number;
  timeHorizon: RecommendationTimeHorizon;
  evidenceIds: string[];
  signalIds: string[];
  entityIds: string[];
  status: RecommendationStatus;
  owner?: string;
  team?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface ExecutiveBriefModel {
  id: string;
  investigationId: string;
  version: number;
  title: string;
  executiveSummary: string;
  keyChanges: ChangeItemModel[];
  strategicImplications: Array<{ topic: string; implication: string; evidenceIds: string[] }>;
  threats: ExecutiveThreat[];
  opportunities: ExecutiveOpportunity[];
  recommendedActions: ExecutiveRecommendationModel[];
  watchItems: WatchItem[];
  confidence: number;
  sourceCoverage: Record<string, string>;
  evidenceIds: string[];
  signalIds: string[];
  entityIds: string[];
  generatedAt: string;
}

export interface DecisionAuditEventModel {
  id: string;
  investigationId: string;
  recommendationId?: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// ==================================================
// STAGE 2.10 INTELLIGENCE GRAPH MODELS
// ==================================================

export type GraphNodeType =
  | 'COMPANY'
  | 'PERSON'
  | 'PRODUCT'
  | 'TECHNOLOGY'
  | 'RESEARCH'
  | 'PATENT'
  | 'NEWS'
  | 'EVENT'
  | 'MARKET'
  | 'COMPETITOR'
  | 'SIGNAL'
  | 'INVESTIGATION';

export type GraphRelationshipType =
  | 'COMPETES_WITH'
  | 'OWNS'
  | 'DEVELOPS'
  | 'USES'
  | 'MENTIONS'
  | 'RELATED_TO'
  | 'AUTHORED_BY'
  | 'ASSIGNED_TO'
  | 'CITES'
  | 'BUILDS_ON'
  | 'PARTNERS_WITH'
  | 'ACQUIRED'
  | 'INVESTED_IN'
  | 'LAUNCHED'
  | 'ANNOUNCED'
  | 'WORKS_ON'
  | 'FUNDED_BY'
  | 'SIMILAR_TO'
  | 'THREATENS'
  | 'OPPORTUNITY_FOR'
  | 'DERIVED_FROM';

export interface GraphNodeModel {
  id: string;
  investigationId?: string;
  entityId?: string;
  type: GraphNodeType;
  label: string;
  description: string;
  metadata?: Record<string, unknown>;
  importance: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdgeModel {
  id: string;
  investigationId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: GraphRelationshipType;
  direction: 'DIRECTED' | 'UNDIRECTED';
  confidence: number;
  importance: number;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EntityProfileModel {
  id: string;
  name: string;
  type: EntityType;
  aliases: string[];
  description: string;
  industry?: string;
  relatedEntityIds: string[];
  evidenceCount: number;
  signalCount: number;
  importance: number;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
}

export interface CrossSourceSignalModel {
  id: string;
  title: string;
  summary: string;
  sourceTypes: SourceType[];
  evidenceIds: string[];
  entityIds: string[];
  impact: ImpactLevel;
  confidence: number;
  novelty: number;
  momentum: number;
  detectedAt: string;
}

// 5. Signal Model & Extended Stage 2.5 Fields
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH' | 'CRITICAL';

export type SignalStatus =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'VALIDATED'
  | 'DISMISSED'
  | 'CANDIDATE'
  | 'VALIDATING'
  | 'WEAK'
  | 'REJECTED'
  | 'CONFLICTING_EVIDENCE';

export type SignalType =
  | 'TREND'
  | 'THREAT'
  | 'OPPORTUNITY'
  | 'COMPETITIVE_MOVE'
  | 'TECHNOLOGY_SHIFT'
  | 'RESEARCH_MOMENTUM'
  | 'PATENT_MOMENTUM'
  | 'MARKET_SHIFT'
  | 'EMERGING_RISK'
  | 'STRATEGIC_CHANGE';

export interface SignalExplanationMatrix {
  what: string;
  why: string;
  evidence: string;
  impact: string;
  confidence: string;
  momentum: string;
  entities: string[];
  timeframe: string;
}

export interface SignalModel {
  id: string;
  investigationId: string;
  title: string;
  summary: string;
  type?: SignalType;
  impact: ImpactLevel;
  confidence: number;
  momentum: number;
  novelty?: number;
  sourceDiversityScore?: number;
  evidenceStrength?: number;
  relevanceScore?: number;
  status: SignalStatus;
  reason?: string;
  evidenceIds: string[];
  entityIds: string[];
  sourceTypes: SourceType[];
  detectedAt: string;
  validatedAt?: string;
  firstDetectedAt?: string;
  lastUpdatedAt?: string;
  contradictionNote?: string;
  explanationMatrix?: SignalExplanationMatrix;
  traceability?: Array<{ evidenceId: string; title: string; sourceType: SourceType; url?: string }>;
  createdAt: string;
}

// 6. Relationship Model
export type RelationshipType =
  | 'DEVELOPS'
  | 'COMPETES_WITH'
  | 'FILED_PATENT'
  | 'RELATED_TO'
  | 'INVESTING_IN'
  | 'PARTNERED_WITH'
  | 'RESEARCHING'
  | 'INDICATES'
  | 'SUPPORTS'
  | 'CONTRADICTS';

export interface RelationshipModel {
  id: string;
  investigationId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: RelationshipType;
  confidence: number;
  evidenceIds: string[];
  whyConnected: string;
  createdAt: string;
}

// 7. Recommendation Model
export interface RecommendationModel {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  action: string;
  priority: PriorityLevel;
  reason: string;
  signalIds: string[];
  createdAt: string;
}

// 8. Timeline Event Model
export interface TimelineEventModel {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  eventType: string;
  date: string;
  entityIds: string[];
  evidenceIds: string[];
  createdAt: string;
}

// 9. Watchlist Model & Stage 2.8 Extensions
export type WatchlistStatus = 'ACTIVE' | 'PAUSED' | 'QUIET' | 'INVESTIGATING' | 'RUNNING';

export type MonitoringMode = 'AUTO' | 'QUIET' | 'BALANCED' | 'HIGH_SENSITIVITY';

export type WatchlistSensitivity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MonitoringSchedule = 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY' | 'WEEKLY';

export interface WatchlistModel {
  id: string;
  name: string;
  title: string;
  organization: string;
  technology: string;
  objective: string;
  status: WatchlistStatus;
  entityIds: string[];
  investigationId?: string;
  monitoringMode: MonitoringMode;
  sensitivity?: WatchlistSensitivity;
  schedule?: MonitoringSchedule;
  currentSignal?: string;
  confidence: number;
  lastMeaningfulChange: string;
  activeAgents: string[];
  frequency: string;
  alertThreshold: number;
  nextRunAt?: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string;
  lastMeaningfulChangeAt: string;
}

// 10. Alert Model & Stage 2.8 Extensions
export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatusState = 'UNREAD' | 'READ' | 'DISMISSED' | 'ACKNOWLEDGED';

export interface AlertModel {
  id: string;
  watchlistId?: string;
  monitoringRunId?: string;
  investigationId: string;
  signalId?: string;
  title: string;
  summary: string;
  impact: ImpactLevel;
  severity?: AlertSeverity;
  status?: AlertStatusState;
  category: 'HIGH IMPACT' | 'THREAT' | 'OPPORTUNITY' | 'SIGNAL';
  confidence: number;
  evidenceCount: number;
  timeAgo: string;
  read: boolean;
  whatChanged?: string;
  whyItMatters?: string;
  recommendedAction?: string;
  createdAt: string;
}

// 11. Data Source Model
export type ProviderCategory = 'INTELLIGENCE_SOURCE' | 'AI_MODEL' | 'DATABASE';
export type ProviderConfigStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'DEGRADED' | 'ERROR';

export interface VerifiedProviderModel {
  id: string;
  name: string;
  category: ProviderCategory;
  typeLabel: string;
  status: ProviderConfigStatus;
  isConfigured: boolean;
  description: string;
  latencyMs?: number;
  lastCheckedAt: string;
  endpointOrModel?: string;
  notes?: string;
}

export interface SourceModel {
  id: string;
  name: string;
  category: 'RESEARCH' | 'PATENTS' | 'NEWS' | 'WEB' | 'COMPANIES' | 'PUBLIC DATA';
  status: 'active' | 'syncing' | 'paused' | 'offline';
  coverage: string;
  lastSync: string;
  availability?: number;
  reliability?: number;
  latencyMs?: number;
  isConfigured?: boolean;
}

// ==================================================
// STAGE 2.9 AUTONOMOUS AGENTIC REASONING MODELS
// ==================================================

export type KnowledgeGapStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ABANDONED';

export interface KnowledgeGapModel {
  id: string;
  investigationId: string;
  description: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  evidenceNeeded: string[];
  candidateAgents: AgentType[];
  status: KnowledgeGapStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface ContradictionModel {
  id: string;
  investigationId: string;
  claims: string[];
  evidenceIds: string[];
  severity: ImpactLevel;
  status: 'UNRESOLVED' | 'INVESTIGATING' | 'RESOLVED';
  resolution?: string;
  createdAt: string;
}

export type DecisionType =
  | 'CONTINUE'
  | 'FOLLOW_UP'
  | 'VALIDATE'
  | 'RESEARCH'
  | 'CORRELATE'
  | 'SYNTHESIZE'
  | 'STOP'
  | 'ABORT';

export interface DecisionLogModel {
  id: string;
  investigationId: string;
  decision: DecisionType;
  reason: string;
  trigger: string;
  createdTaskIds: string[];
  resolvedGapIds: string[];
  timestamp: string;
}

export interface AgentCapabilityModel {
  agentType: AgentType;
  capabilities: string[];
  inputTypes: string[];
  outputTypes: string[];
  costRating: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ==================================================
// STAGE 2.8 CONTINUOUS AUTONOMOUS MONITORING MODELS
// ==================================================

export type MonitoringRunStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'PAUSED';

export interface MonitoringRunModel {
  id: string;
  watchlistId: string;
  startedAt: string;
  completedAt?: string;
  status: MonitoringRunStatus;
  taskIds: string[];
  newEvidenceIds: string[];
  changedEvidenceIds: string[];
  signalIds: string[];
  alertIds: string[];
  sourceCoverage: {
    RESEARCH: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
    PATENT: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
    NEWS: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
    COMPETITOR: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
    WEB: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  };
  errors?: string[];
}

export interface EvidenceFingerprintModel {
  id: string;
  hash: string;
  source: string;
  canonicalUrl: string;
  title: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface UncertaintyModel {
  id: string;
  investigationId: string;
  topic: string;
  description: string;
  confidence: number;
  evidenceNeeded: string[];
  priority: PriorityLevel;
  createdAt: string;
}

export interface ChangeSetModel {
  newEvidence: EvidenceModel[];
  changedEvidence: EvidenceModel[];
  acceleratedThemes: string[];
  deltaMomentum: number;
}

// ==================================================
// STAGE 2.6 AI SYNTHESIS & ACTIONABLE INTELLIGENCE TYPES
// ==================================================

export interface ExecutiveFinding {
  title: string;
  summary: string;
  impact: ImpactLevel;
  confidence: number;
  signalId?: string;
  evidenceIds: string[];
  entities: string[];
}

export interface ExecutiveThreat {
  title: string;
  description: string;
  impact: ImpactLevel;
  confidence: number;
  evidenceIds: string[];
  competitorEntities: string[];
  recommendedResponse: string;
}

export interface ExecutiveOpportunity {
  title: string;
  description: string;
  potentialImpact: ImpactLevel;
  confidence: number;
  evidenceIds: string[];
  entities: string[];
  recommendedAction: string;
  timeHorizon?: RecommendationTimeHorizon;
}

export type RecommendationTimeHorizon = 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

export interface ExecutiveRecommendation {
  action: string;
  reason: string;
  priority: PriorityLevel;
  supportingSignalIds: string[];
  supportingEvidenceIds: string[];
  timeHorizon: RecommendationTimeHorizon;
}

export interface WatchItem {
  topic: string;
  reason: string;
  trigger: string;
  priority: PriorityLevel;
  relatedEntityIds: string[];
  relatedSignalIds: string[];
}

export interface ExecutiveIntelligence {
  id: string;
  investigationId: string;
  executiveSummary: string;
  keyFindings: ExecutiveFinding[];
  threats: ExecutiveThreat[];
  opportunities: ExecutiveOpportunity[];
  technologyTrends: string[];
  competitorMoves: string[];
  researchTrends: string[];
  patentTrends: string[];
  recommendedActions: ExecutiveRecommendation[];
  watchItems: WatchItem[];
  confidence: number;
  evidenceReferences: Array<{ id: string; title: string; url?: string; sourceType: SourceType; provider: string }>;
  sourceCoverage: {
    RESEARCH: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
    PATENT: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
    NEWS: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
    COMPETITOR: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
    WEB: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  };
  generatedAt: string;
}

export interface SynthesisVersion {
  id: string;
  investigationId: string;
  version: number;
  provider: string;
  model: string;
  intelligence: ExecutiveIntelligence;
  createdAt: string;
  basedOnSignalIds: string[];
  basedOnEvidenceIds: string[];
}

export interface EventClusterModel {
  id: string;
  title: string;
  eventType: 'PRODUCT_LAUNCH' | 'PARTNERSHIP' | 'PATENT_ACTIVITY' | 'FUNDING' | 'RESEARCH_BREAKTHROUGH' | 'COMPETITOR_MOVE' | 'MARKET_SHIFT';
  dateRange: string;
  entityIds: string[];
  evidenceIds: string[];
  sourceCount: number;
  sourceDiversity: number;
  confidence: number;
}

export interface CorrelationResultModel {
  id: string;
  investigationId: string;
  evidenceIds: string[];
  entityIds: string[];
  relationshipIds: string[];
  themes: Array<{ theme: string; summary: string; evidenceCount: number; confidence: number }>;
  patterns: Array<{ pattern: string; significance: string }>;
  supportingSources: SourceType[];
  contradictingSources: SourceType[];
  sourceDiversityScore: number;
  confidence: number;
  createdAt: string;
}

// Orchestrator & Mission Types
export type MissionStatus =
  | 'PLANNING'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'SYNTHESIZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'
  | 'CANCELLED';

export type MissionPhase =
  | 'OBJECTIVE_ANALYSIS'
  | 'PLANNING'
  | 'DISCOVERY'
  | 'INVESTIGATION'
  | 'CORRELATION'
  | 'VALIDATION'
  | 'SYNTHESIS'
  | 'RECOMMENDATION'
  | 'COMPLETED';

export interface MissionModel {
  id: string;
  investigationId: string;
  objective: string;
  status: MissionStatus;
  currentPhase: MissionPhase;
  progress: number;
  maxIterations: number;
  iterationCount: number;
  priority: PriorityLevel;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
}

export type TaskStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'CANCELLED';

export interface TaskModel {
  id: string;
  missionId: string;
  investigationId: string;
  agentType: AgentType;
  title: string;
  description: string;
  status: TaskStatus;
  priority: PriorityLevel;
  dependencies: string[];
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  evidenceIds: string[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  parentTaskId?: string;
}

export interface AgentResultModel {
  taskId: string;
  agentType: AgentType;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  summary: string;
  evidenceItems: EvidenceModel[];
  evidenceIds: string[];
  entityIds: string[];
  signalCandidates: Partial<SignalModel>[];
  relationships: Partial<RelationshipModel>[];
  confidence: number;
  metadata?: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
}

export interface AgentContextModel {
  investigation: InvestigationModel;
  mission: MissionModel;
  task: TaskModel;
  previousEvidence: EvidenceModel[];
  relevantEntities: EntityModel[];
  previousResults: AgentResultModel[];
  timeHorizon: string;
  priority: PriorityLevel;
}

export type MissionEventType =
  | 'MISSION_CREATED'
  | 'PLAN_CREATED'
  | 'TASK_CREATED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'EVIDENCE_FOUND'
  | 'SIGNAL_DETECTED'
  | 'FOLLOWUP_CREATED'
  | 'CONFLICT_DETECTED'
  | 'VALIDATION_STARTED'
  | 'SYNTHESIS_STARTED'
  | 'MISSION_COMPLETED'
  | 'MISSION_PAUSED'
  | 'MISSION_RESUMED'
  | 'MISSION_CANCELLED';

export interface MissionEventModel {
  id: string;
  missionId: string;
  investigationId: string;
  type: MissionEventType;
  agentType?: AgentType;
  taskId?: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ==================================================
// CONTEXT & MEMORY MANAGEMENT MODELS
// ==================================================

/** Structured record of a single agent execution step, persisted to MongoDB */
export interface AgentStepMemoryModel {
  id: string;
  investigationId: string;
  missionId: string;
  taskId: string;
  agentType: AgentType;
  agentName: string;
  phase: MissionPhase;
  /** Compact snapshot of what the agent received before running */
  input: {
    objective: string;
    targetEntity: string;
    priorFindingsCount: number;
    openQuestionsCount: number;
  };
  /** Human-readable description of what the agent did */
  action: string;
  /** Name of the external tool/provider called */
  toolUsed: string;
  /** One-sentence outcome summary */
  result: string;
  /** Top 1-3 important findings extracted from agent result */
  importantFindings: string[];
  /** IDs of evidence items flagged as important (relevanceScore >= 0.85 or confidence >= 90) */
  importantEvidenceIds: string[];
  /** All evidence IDs produced by this agent step */
  evidenceIds: string[];
  confidence: number;
  timestamp: string;
}

/** Living compressed memory of the full investigation — persisted to MongoDB */
export interface InvestigationMemoryModel {
  id: string;
  investigationId: string;
  /** Monotonically increasing version counter, incremented on every update */
  version: number;
  // --- Working identity context ---
  objective: string;
  targetEntity: string;
  technology: string;
  timeHorizon: string;
  status: InvestigationStatus;
  // --- Short-term: ordered record of agent executions this session ---
  agentSteps: AgentStepMemoryModel[];
  // --- Long-term: compressed important facts ---
  keyEntities: string[];
  keyFindings: string[];
  openQuestions: string[];
  importantEvidenceIds: string[];
  // --- Aggregate counters (derived, not duplicated raw data) ---
  totalEvidenceCount: number;
  totalAgentSteps: number;
  completedAgents: AgentType[];
  activeAgent?: AgentType;
  /** Status of context compression */
  contextStatus: 'BUILDING' | 'ACTIVE' | 'OPTIMIZED' | 'COMPLETE';
  summaryGeneratedAt?: string;
  /** Link to parent investigation if this is a follow-up — enables context inheritance */
  parentInvestigationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageAssessmentModel {
  topicCoverage: 'STRONG' | 'GOOD' | 'PARTIAL' | 'WEAK' | 'MISSING';
  sourceCoverage: 'STRONG' | 'GOOD' | 'PARTIAL' | 'WEAK' | 'MISSING';
  entityCoverage: 'STRONG' | 'GOOD' | 'PARTIAL' | 'WEAK' | 'MISSING';
  temporalCoverage: 'STRONG' | 'GOOD' | 'PARTIAL' | 'WEAK' | 'MISSING';
  evidenceQuality: number;
  overallConfidence: number;
  missingAreas: string[];
  detectedConflicts: Array<{ topic: string; claimA: string; claimB: string }>;
}
