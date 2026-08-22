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
  | 'PAUSED'
  | 'INTERRUPTED';

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
export type EvidenceStatus = 'ACTIVE' | 'SUPERSEDED' | 'RETRACTED' | 'DISPUTED' | 'CORROBORATED';

export interface EvidenceProvenance {
  provider: string;          // e.g. 'Crossref REST API', 'USPTO Patent Index'
  organization?: string;     // Publishing org or assignee
  doi?: string;              // Digital Object Identifier if academic
  retrievalUrl?: string;     // Exact URL retrieved from
  retrievedAt: string;       // ISO timestamp of retrieval
  primaryOrSecondary: 'PRIMARY' | 'SECONDARY' | 'AGGREGATED' | 'UNKNOWN';
  peerReviewed?: boolean;    // True if academic peer-reviewed source
  officialAnnouncement?: boolean; // True if direct company announcement
}

export interface EvidenceModel {
  id: string;
  investigationId: string;
  taskId?: string;
  agentId?: string;
  title: string;
  summary: string;
  // Stage 5F: Normalized claim extracted from this evidence
  claim?: string;
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
  // Stage 5F: Provenance tracking
  provenance?: EvidenceProvenance;
  // Stage 5F: Content hash for deduplication
  contentHash?: string;
  // Stage 5F: Linked claim IDs
  supportingClaimIds?: string[];
  contradictingClaimIds?: string[];
  // Stage 5F: Lifecycle status
  status?: EvidenceStatus;
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

// Stage 5F: Contradiction conflict classification
export type ConflictType =
  | 'DIRECT'         // Claims flatly contradict each other
  | 'NUMERIC'        // Different numbers for the same metric
  | 'TEMPORAL'       // Same claim at different time scopes
  | 'SCOPE'          // Different scope/geography/segment
  | 'ENTITY'         // Confusion between different entities
  | 'DEFINITION'     // Different definitions of the same term
  | 'APPARENT';      // Looks like contradiction but is not

export type ConflictResolutionStrategy =
  | 'SOURCE_QUALITY_WINS'   // Higher quality source preferred
  | 'TEMPORAL_WINS'         // Newer evidence preferred for dynamic facts
  | 'SCOPE_CLARIFIED'       // Apparent conflict resolved by scope difference
  | 'CORROBORATION'         // Third-party evidence confirmed one side
  | 'PRESERVED_UNCERTAINTY' // Could not resolve — uncertainty preserved
  | 'REFUTED';              // One claim definitively disproven

export interface ContradictionModel {
  id: string;
  investigationId: string;
  claims: string[];          // The two conflicting claim statements
  evidenceIds: string[];     // Evidence items supporting each claim
  claimIds?: string[];       // Linked ClaimModel IDs
  severity: ImpactLevel;
  conflictType?: ConflictType;
  status: 'UNRESOLVED' | 'INVESTIGATING' | 'RESOLVED';
  resolutionStrategy?: ConflictResolutionStrategy;
  resolution?: string;       // Human-readable resolution explanation
  unresolvedReason?: string; // Why it could not be resolved (if applicable)
  confidenceDelta?: number;  // How much this affected overall confidence
  createdAt: string;
  resolvedAt?: string;
}

// ==================================================
// STAGE 5F: CLAIM MODEL — Normalized semantic claim representation
// ==================================================
export type ClaimStatus =
  | 'SUPPORTED'            // Evidence from multiple sources confirms this
  | 'PARTIALLY_SUPPORTED'  // Some evidence supports, but incomplete
  | 'CONTRADICTED'         // Another source directly contradicts this
  | 'UNRESOLVED'           // Conflict detected but resolution inconclusive
  | 'INSUFFICIENT_EVIDENCE'// Not enough evidence to assess
  | 'REFUTED';             // Evidence conclusively disproves this

export interface ClaimModel {
  id: string;
  investigationId: string;
  // The normalized, human-readable claim statement
  statement: string;
  // Topic/entity this claim is about (e.g. "NVIDIA AI infrastructure spending")
  topic: string;
  // Entities referenced in the claim
  entities: string[];
  // Evidence that mentions this claim
  evidenceIds: string[];
  // Evidence specifically supporting this claim
  supportingEvidenceIds: string[];
  // Evidence specifically contradicting this claim
  contradictingEvidenceIds: string[];
  // Claim confidence 0-100 based on source quality + corroboration
  confidence: number;
  status: ClaimStatus;
  // Temporal context: the period the claim applies to (e.g. "2026-Q1")
  temporalScope?: string;
  // Geographic/segment scope (e.g. "US market", "enterprise segment")
  scopeNote?: string;
  // Which contradiction ID this is linked to (if any)
  contradictionId?: string;
  // Source quality score 0-100 (weighted average of contributing evidence)
  sourceQualityScore?: number;
  createdAt: string;
  updatedAt?: string;
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

export type AutonomousStopReason =
  | 'SUFFICIENT_EVIDENCE'
  | 'OBJECTIVE_SATISFIED'
  | 'RESOURCE_LIMIT'
  | 'INSUFFICIENT_EVIDENCE'
  | 'UNRESOLVED_CRITICAL_CONFLICT'
  | 'MAX_ITERATIONS'
  | 'UNRECOVERABLE_FAILURE';

export interface DecisionLogModel {
  id: string;
  investigationId: string;
  decision: DecisionType;
  reason: string;
  trigger: string;
  agentType?: AgentType;
  relatedTaskId?: string;
  decisionExplanation?: string;
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
  | 'CANCELLED'
  | 'INTERRUPTED'
  | 'RETRYING'
  | 'PARTIAL'
  | 'VERIFYING'
  | 'REPLANNED';

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
  whyThisTask?: string;
  infoGain?: string;
  verificationRequired?: boolean;
  skipReason?: string;
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
  | 'MISSION_CANCELLED'
  | 'LOOP_DETECTED'
  | 'TOOL_FAILURE'
  | 'FALLBACK_UNAVAILABLE'
  | 'RECOVERED'
  | 'REPLANNING'
  | 'CONTRADICTION_DETECTED'
  | 'CORRELATING'
  | 'CRITIC'
  | 'ROUTER_DECISION'
  // Stage 5G: Self-Evaluation events
  | 'SELF_EVALUATION_STARTED'
  | 'SELF_EVALUATION_COMPLETE'
  | 'HYPOTHESIS_FORMED'
  | 'CLAIM_GAP_DETECTED'
  | 'VERIFICATION_REQUESTED'
  | 'CONCLUSION_UPDATED'
  | 'REASONING_LIMIT_REACHED';

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

// ==================================================
// STAGE 5G: SELF-EVALUATION + HYPOTHESIS MODELS
// ==================================================

export type HypothesisStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'UNSUPPORTED'
  | 'CONTRADICTED'
  | 'UNRESOLVED';

export interface HypothesisModel {
  id: string;
  investigationId: string;
  /** The explicit, falsifiable hypothesis statement */
  statement: string;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  /** 0–100 confidence computed from source quality + corroboration */
  confidence: number;
  status: HypothesisStatus;
  /** Task IDs generated to verify this hypothesis */
  verificationTasks: string[];
  createdAt: string;
  updatedAt: string;
}

export type EvidenceStrength = 'STRONG' | 'MEDIUM' | 'WEAK' | 'NONE';

export type AssumptionLabel = 'SUPPORTED' | 'PLAUSIBLE' | 'SPECULATIVE' | 'UNSUPPORTED';

export interface ClaimEvaluation {
  claimId: string;
  statement: string;
  /** Total evidence items referencing this claim */
  evidenceCount: number;
  /** Unique providers/domains (independent source count) */
  independentSourceCount: number;
  /** Primary source count (patent, peer-reviewed, official announcement) */
  primarySourceCount: number;
  /** Contradiction count touching this claim */
  conflictCount: number;
  status: ClaimStatus;
  confidence: number;
  /** True if statement uses inferential/predictive language */
  isAssumption: boolean;
  assumptionLabel?: AssumptionLabel;
  /** Source types absent for this claim */
  missingEvidenceTypes: SourceType[];
  /** Would more investigation materially improve this claim? */
  informationGain: 'HIGH' | 'MEDIUM' | 'LOW';
}

export type SelfEvaluationStatus =
  | 'PASS'
  | 'NEEDS_VERIFICATION'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONTRADICTED'
  | 'REPLAN_REQUIRED'
  | 'FAILED';

export interface SelfEvaluationResult {
  id: string;
  investigationId: string;
  iterationNumber: number;
  overallStatus: SelfEvaluationStatus;
  confidence: number;
  evidenceStrength: EvidenceStrength;
  /** 0–100 percentage: (supported + 0.5×partial) / totalMajorClaims */
  evidenceCoverage: number;
  totalMajorClaims: number;
  supportedClaims: number;
  partiallySupportedClaims: number;
  /** Statements of claims that have no supporting evidence */
  unsupportedClaims: string[];
  /** Inferential claims that lack direct evidence support */
  unverifiedAssumptions: string[];
  /** Contradiction IDs that are still unresolved */
  conflicts: string[];
  /** Human-readable descriptions of what evidence is missing */
  missingEvidence: string[];
  /** Structured actions recommended as next steps */
  recommendedActions: string[];
  /** Per-claim breakdown */
  claimEvaluations: ClaimEvaluation[];
  /** Concise explanation of the overall evaluation decision */
  reasoning: string;
  shouldReplan: boolean;
  /** True when MAX_EVALUATION_ROUNDS was reached */
  reasoningLimitReached?: boolean;
  createdAt: string;
}

export interface ConclusionVersion {
  id: string;
  investigationId: string;
  /** Monotonically increasing — 1 = original, 2+ = revised */
  version: number;
  conclusion: string;
  confidence: number;
  /** Which SelfEvaluationResult triggered this version */
  evaluationId: string;
  /** Why the conclusion was revised */
  reason: string;
  createdAt: string;
}

export interface VerificationTaskRequest {
  id: string;
  investigationId: string;
  hypothesisId: string;
  description: string;
  /** Which agent type is needed to close this verification gap */
  missingEvidenceType: AgentType;
  priority: PriorityLevel;
  reason: string;
  informationGain: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}
