import { getDb } from '@/lib/mongodb';
import { appConfig } from '@/lib/config';
import {
  InvestigationModel,
  AgentModel,
  EvidenceModel,
  EntityModel,
  SignalModel,
  RelationshipModel,
  RecommendationModel,
  TimelineEventModel,
  WatchlistModel,
  AlertModel,
  SourceModel,
  MonitoringRunModel,
  EvidenceFingerprintModel,
  UncertaintyModel,
  KnowledgeGapModel,
  ContradictionModel,
  ClaimModel,
  HypothesisModel,
  SelfEvaluationResult,
  ConclusionVersion,
  VerificationTaskRequest,
  DecisionLogModel,
  GraphNodeModel,
  GraphEdgeModel,
  EntityProfileModel,
  ExecutiveBriefModel,
  ExecutiveRecommendationModel,
  DecisionAuditEventModel,
  InvestigationMemoryModel,
  AgentStepMemoryModel,
  AgentType,
} from '@/lib/types';
import {
  seedInvestigation,
  seedAgents,
  seedEvidence,
  seedEntities,
  seedRelationships,
  seedSignals,
  seedRecommendations,
  seedTimelineEvents,
  seedWatchlists,
  seedAlerts,
  seedSources,
} from './seedData';

// In-Memory Data Store
class MemoryStore {
  investigations: InvestigationModel[] = appConfig.isDemo ? [seedInvestigation] : [];
  agents: AgentModel[] = appConfig.isDemo ? [...seedAgents] : [];
  evidence: EvidenceModel[] = appConfig.isDemo ? [...seedEvidence] : [];
  entities: EntityModel[] = appConfig.isDemo ? [...seedEntities] : [];
  relationships: RelationshipModel[] = appConfig.isDemo ? [...seedRelationships] : [];
  signals: SignalModel[] = appConfig.isDemo ? [...seedSignals] : [];
  recommendations: RecommendationModel[] = appConfig.isDemo ? [...seedRecommendations] : [];
  timelineEvents: TimelineEventModel[] = appConfig.isDemo ? [...seedTimelineEvents] : [];
  watchlists: WatchlistModel[] = appConfig.isDemo ? [...seedWatchlists] : [];
  alerts: AlertModel[] = appConfig.isDemo ? [...seedAlerts] : [];
  sources: SourceModel[] = [...seedSources];
  monitoringRuns: MonitoringRunModel[] = [];
  evidenceFingerprints: EvidenceFingerprintModel[] = [];
  uncertainties: UncertaintyModel[] = [];
  knowledgeGaps: KnowledgeGapModel[] = [];
  contradictions: ContradictionModel[] = [];
  // Stage 5F: Normalized claims extracted from evidence
  claims: ClaimModel[] = [];
  // Stage 5G: Self-Evaluation & Hypothesis stores
  hypotheses: HypothesisModel[] = [];
  selfEvaluations: SelfEvaluationResult[] = [];
  conclusionVersions: ConclusionVersion[] = [];
  verificationRequests: VerificationTaskRequest[] = [];
  decisionLogs: DecisionLogModel[] = [];
  graphNodes: GraphNodeModel[] = [];
  graphEdges: GraphEdgeModel[] = [];
  entityProfiles: EntityProfileModel[] = [];
  executiveBriefs: ExecutiveBriefModel[] = [];
  executiveRecommendations: ExecutiveRecommendationModel[] = [];
  decisionAuditEvents: DecisionAuditEventModel[] = [];
  // Context & Memory Management
  investigationMemory: InvestigationMemoryModel[] = [];
  agentStepMemory: AgentStepMemoryModel[] = [];
}

const memory = new MemoryStore();
let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    await db.collection('investigations').createIndex({ status: 1, createdAt: -1 });
    await db.collection('evidence').createIndex({ investigationId: 1, sourceType: 1, createdAt: -1 });
    await db.collection('signals').createIndex({ investigationId: 1, impact: 1, detectedAt: -1 });
    await db.collection('agents').createIndex({ status: 1, currentInvestigationId: 1 });
    await db.collection('watchlists').createIndex({ status: 1, updatedAt: -1 });
    await db.collection('alerts').createIndex({ watchlistId: 1, read: 1, createdAt: -1 });
    await db.collection('monitoring_runs').createIndex({ watchlistId: 1, status: 1, startedAt: -1 });
    await db.collection('evidence_fingerprints').createIndex({ hash: 1 }, { unique: true });
    await db.collection('graph_nodes').createIndex({ investigationId: 1, type: 1, entityId: 1 });
    await db.collection('graph_edges').createIndex({ investigationId: 1, sourceNodeId: 1, targetNodeId: 1, relationshipType: 1 });
    await db.collection('entity_profiles').createIndex({ name: 1, type: 1 });
    await db.collection('investigation_memory').createIndex({ investigationId: 1 }, { unique: true });
    await db.collection('agent_step_memory').createIndex({ investigationId: 1, timestamp: -1 });
    indexesEnsured = true;
  } catch {
    // MongoDB offline fallback
  }
}

export const dbRepository = {
  // Investigations
  async getInvestigations(): Promise<InvestigationModel[]> {
    try {
      await ensureIndexes();
      const db = await getDb();
      const docs = await db
        .collection<InvestigationModel>('investigations')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.investigations;
  },

  async getAllInvestigations(): Promise<InvestigationModel[]> {
    return this.getInvestigations();
  },

  async getInvestigationById(id: string): Promise<InvestigationModel | undefined> {
    const memFound = memory.investigations.find((i) => i.id === id);
    if (memFound) return memFound;

    try {
      await ensureIndexes();
      const db = await getDb();
      const doc = await db.collection<InvestigationModel>('investigations').findOne({ id });
      if (doc) return doc;
    } catch {}
    return undefined;
  },

  async createInvestigation(data: Partial<InvestigationModel>): Promise<InvestigationModel> {
    const now = new Date().toISOString();
    const newInv: InvestigationModel = {
      id: data.id || `inv-${Date.now()}`,
      title: data.title || 'Untitled Autonomous Investigation',
      objective: data.objective || 'Identify competitive threats and technical breakthroughs.',
      status: 'INVESTIGATING',
      priority: data.priority || 'HIGH',
      timeHorizon: data.timeHorizon || 'Last 30 days',
      primaryEntities: data.primaryEntities || [],
      technology: data.technology,
      organization: data.organization,
      competitors: data.competitors,
      strategicQuestion: data.strategicQuestion || data.objective,
      confidenceScore: 92,
      progress: data.progress ?? 0,
      activeAgents: ['RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'],
      evidenceCount: 0,
      signalCount: 0,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };

    memory.investigations.unshift(newInv);

    try {
      const db = await getDb();
      await db.collection<InvestigationModel>('investigations').insertOne(newInv);
    } catch {}

    return newInv;
  },

  async updateInvestigation(id: string, updates: Partial<InvestigationModel>): Promise<InvestigationModel | undefined> {
    updates.updatedAt = new Date().toISOString();
    try {
      const db = await getDb();
      await db.collection('investigations').updateOne({ id }, { $set: updates });
    } catch {}

    const idx = memory.investigations.findIndex((i) => i.id === id);
    if (idx >= 0) {
      memory.investigations[idx] = { ...memory.investigations[idx], ...updates };
      return memory.investigations[idx];
    }
    return undefined;
  },

  // Agents
  async getAgents(): Promise<AgentModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<AgentModel>('agents').find({}).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.agents;
  },

  async updateAgentStatus(id: string, status: AgentModel['status'], taskDescription?: string): Promise<AgentModel | undefined> {
    const updates: Partial<AgentModel> = {
      status,
      lastActive: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (taskDescription) updates.currentTask = taskDescription;

    try {
      const db = await getDb();
      await db.collection('agents').updateOne({ id }, { $set: updates });
    } catch {}

    const agent = memory.agents.find((a) => a.id === id);
    if (agent) {
      Object.assign(agent, updates);
      return agent;
    }
    return undefined;
  },

  // Evidence
  async getEvidenceByInvestigationId(investigationId: string): Promise<EvidenceModel[]> {
    try {
      const db = await getDb();
      const docs = await db
        .collection<EvidenceModel>('evidence')
        .find({ investigationId })
        .sort({ createdAt: -1 })
        .toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.evidence.filter((e) => e.investigationId === investigationId);
  },

  async saveEvidenceItem(item: EvidenceModel): Promise<EvidenceModel> {
    memory.evidence.unshift(item);
    try {
      const db = await getDb();
      await db.collection<EvidenceModel>('evidence').insertOne(item);
    } catch {}
    return item;
  },

  // Entities & Relationships
  async getEntitiesByInvestigationId(investigationId: string): Promise<EntityModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<EntityModel>('entities').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.entities.filter((e) => e.investigationId === investigationId);
  },

  async saveEntity(entity: EntityModel): Promise<EntityModel> {
    memory.entities.push(entity);
    try {
      const db = await getDb();
      await db.collection<EntityModel>('entities').insertOne(entity);
    } catch {}
    return entity;
  },

  async getRelationshipsByInvestigationId(investigationId: string): Promise<RelationshipModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<RelationshipModel>('relationships').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.relationships.filter((r) => r.investigationId === investigationId);
  },

  async saveRelationship(rel: RelationshipModel): Promise<RelationshipModel> {
    memory.relationships.push(rel);
    try {
      const db = await getDb();
      await db.collection<RelationshipModel>('relationships').insertOne(rel);
    } catch {}
    return rel;
  },

  // Signals
  async getSignalsByInvestigationId(investigationId: string): Promise<SignalModel[]> {
    try {
      const db = await getDb();
      const docs = await db
        .collection<SignalModel>('signals')
        .find({ investigationId })
        .sort({ detectedAt: -1 })
        .toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.signals.filter((s) => s.investigationId === investigationId);
  },

  async saveSignal(signal: SignalModel): Promise<SignalModel> {
    memory.signals.unshift(signal);
    try {
      const db = await getDb();
      await db.collection<SignalModel>('signals').insertOne(signal);
    } catch {}
    return signal;
  },

  async updateSignal(id: string, updates: Partial<SignalModel>): Promise<SignalModel | undefined> {
    updates.lastUpdatedAt = new Date().toISOString();
    try {
      const db = await getDb();
      await db.collection('signals').updateOne({ id }, { $set: updates });
    } catch {}

    const sig = memory.signals.find((s) => s.id === id);
    if (sig) {
      Object.assign(sig, updates);
      return sig;
    }
    return undefined;
  },

  // Watchlists
  async getWatchlists(): Promise<WatchlistModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<WatchlistModel>('watchlists').find({}).sort({ updatedAt: -1 }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.watchlists;
  },

  async getWatchlistById(id: string): Promise<WatchlistModel | undefined> {
    const mem = memory.watchlists.find((w) => w.id === id);
    if (mem) return mem;
    try {
      const db = await getDb();
      const doc = await db.collection<WatchlistModel>('watchlists').findOne({ id });
      if (doc) return doc;
    } catch {}
    return undefined;
  },

  async createWatchlist(data: Partial<WatchlistModel>): Promise<WatchlistModel> {
    const now = new Date().toISOString();
    const newW: WatchlistModel = {
      id: `watch-${Date.now()}`,
      name: data.name || data.title || 'Autonomous Watchlist',
      title: data.title || data.name || 'Autonomous Watchlist',
      organization: data.organization || 'Target Entity',
      technology: data.technology || 'Core Technology',
      objective: data.objective || 'Autonomous background monitoring',
      status: 'ACTIVE',
      entityIds: data.entityIds || [],
      investigationId: data.investigationId,
      monitoringMode: data.monitoringMode || 'AUTO',
      sensitivity: data.sensitivity || 'MEDIUM',
      schedule: data.schedule || 'DAILY',
      currentSignal: 'Continuous background monitoring active',
      confidence: 91,
      lastMeaningfulChange: 'Just now',
      activeAgents: ['RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'],
      frequency: 'Continuous (24/7)',
      alertThreshold: 80,
      createdAt: now,
      updatedAt: now,
      lastCheckedAt: now,
      lastMeaningfulChangeAt: now,
      nextRunAt: now,
    };

    memory.watchlists.unshift(newW);
    try {
      const db = await getDb();
      await db.collection<WatchlistModel>('watchlists').insertOne(newW);
    } catch {}

    return newW;
  },

  async updateWatchlist(id: string, updates: Partial<WatchlistModel>): Promise<WatchlistModel | undefined> {
    updates.updatedAt = new Date().toISOString();
    try {
      const db = await getDb();
      await db.collection('watchlists').updateOne({ id }, { $set: updates });
    } catch {}

    const idx = memory.watchlists.findIndex((w) => w.id === id);
    if (idx >= 0) {
      memory.watchlists[idx] = { ...memory.watchlists[idx], ...updates };
      return memory.watchlists[idx];
    }
    return undefined;
  },

  async deleteWatchlist(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      await db.collection('watchlists').deleteOne({ id });
    } catch {}
    memory.watchlists = memory.watchlists.filter((w) => w.id !== id);
    return true;
  },

  // Alerts
  async getAlerts(): Promise<AlertModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<AlertModel>('alerts').find({}).sort({ createdAt: -1 }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.alerts;
  },

  async createAlert(data: Partial<AlertModel>): Promise<AlertModel> {
    const now = new Date().toISOString();
    const newAlert: AlertModel = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      watchlistId: data.watchlistId,
      monitoringRunId: data.monitoringRunId,
      investigationId: data.investigationId || 'inv-default',
      signalId: data.signalId,
      title: data.title || 'New Strategic Alert Detected',
      summary: data.summary || 'Strategic intelligence alert generated by continuous monitoring run.',
      impact: data.impact || 'HIGH',
      severity: data.severity || 'HIGH',
      status: 'UNREAD',
      category: data.category || 'SIGNAL',
      confidence: data.confidence || 90,
      evidenceCount: data.evidenceCount || 1,
      timeAgo: 'Just now',
      read: false,
      whatChanged: data.whatChanged,
      whyItMatters: data.whyItMatters,
      recommendedAction: data.recommendedAction,
      createdAt: now,
    };

    memory.alerts.unshift(newAlert);
    try {
      const db = await getDb();
      await db.collection<AlertModel>('alerts').insertOne(newAlert);
    } catch {}
    return newAlert;
  },

  async updateAlert(id: string, updates: Partial<AlertModel>): Promise<AlertModel | undefined> {
    try {
      const db = await getDb();
      await db.collection('alerts').updateOne({ id }, { $set: updates });
    } catch {}

    const alert = memory.alerts.find((a) => a.id === id);
    if (alert) {
      Object.assign(alert, updates);
      return alert;
    }
    return undefined;
  },

  // Sources
  async getSources(): Promise<SourceModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<SourceModel>('sources').find({}).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.sources;
  },

  // ==================================================
  // STAGE 2.8 MONITORING RUNS, FINGERPRINTS & UNCERTAINTIES
  // ==================================================

  async createMonitoringRun(data: Partial<MonitoringRunModel>): Promise<MonitoringRunModel> {
    const now = new Date().toISOString();
    const run: MonitoringRunModel = {
      id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      watchlistId: data.watchlistId || 'watch-default',
      startedAt: now,
      status: data.status || 'RUNNING',
      taskIds: data.taskIds || [],
      newEvidenceIds: data.newEvidenceIds || [],
      changedEvidenceIds: data.changedEvidenceIds || [],
      signalIds: data.signalIds || [],
      alertIds: data.alertIds || [],
      sourceCoverage: data.sourceCoverage || {
        RESEARCH: 'AVAILABLE',
        PATENT: 'AVAILABLE',
        NEWS: 'AVAILABLE',
        COMPETITOR: 'AVAILABLE',
        WEB: 'AVAILABLE',
      },
      errors: data.errors || [],
    };

    memory.monitoringRuns.unshift(run);
    try {
      const db = await getDb();
      await db.collection<MonitoringRunModel>('monitoring_runs').insertOne(run);
    } catch {}
    return run;
  },

  async getMonitoringRunById(id: string): Promise<MonitoringRunModel | undefined> {
    const mem = memory.monitoringRuns.find((r) => r.id === id);
    if (mem) return mem;
    try {
      const db = await getDb();
      const doc = await db.collection<MonitoringRunModel>('monitoring_runs').findOne({ id });
      if (doc) return doc;
    } catch {}
    return undefined;
  },

  async getMonitoringRunsByWatchlistId(watchlistId: string): Promise<MonitoringRunModel[]> {
    try {
      const db = await getDb();
      const docs = await db
        .collection<MonitoringRunModel>('monitoring_runs')
        .find({ watchlistId })
        .sort({ startedAt: -1 })
        .toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.monitoringRuns.filter((r) => r.watchlistId === watchlistId);
  },

  async updateMonitoringRun(id: string, updates: Partial<MonitoringRunModel>): Promise<MonitoringRunModel | undefined> {
    try {
      const db = await getDb();
      await db.collection('monitoring_runs').updateOne({ id }, { $set: updates });
    } catch {}

    const run = memory.monitoringRuns.find((r) => r.id === id);
    if (run) {
      Object.assign(run, updates);
      return run;
    }
    return undefined;
  },

  // Evidence Fingerprints
  async getEvidenceFingerprints(): Promise<EvidenceFingerprintModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<EvidenceFingerprintModel>('evidence_fingerprints').find({}).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.evidenceFingerprints;
  },

  async saveEvidenceFingerprint(fp: Partial<EvidenceFingerprintModel>): Promise<EvidenceFingerprintModel> {
    const now = new Date().toISOString();
    const fingerprint: EvidenceFingerprintModel = {
      id: fp.id || `fp-${Date.now()}`,
      hash: fp.hash || '',
      source: fp.source || 'Provider',
      canonicalUrl: fp.canonicalUrl || '',
      title: fp.title || '',
      firstSeenAt: fp.firstSeenAt || now,
      lastSeenAt: now,
    };

    memory.evidenceFingerprints.push(fingerprint);
    try {
      const db = await getDb();
      await db.collection<EvidenceFingerprintModel>('evidence_fingerprints').updateOne(
        { hash: fingerprint.hash },
        { $set: fingerprint },
        { upsert: true }
      );
    } catch {}
    return fingerprint;
  },

  async isEvidenceSeen(hash: string): Promise<boolean> {
    const memFound = memory.evidenceFingerprints.some((fp) => fp.hash === hash);
    if (memFound) return true;

    try {
      const db = await getDb();
      const doc = await db.collection('evidence_fingerprints').findOne({ hash });
      if (doc) return true;
    } catch {}
    return false;
  },

  // Uncertainties
  async createUncertainty(data: Partial<UncertaintyModel>): Promise<UncertaintyModel> {
    const now = new Date().toISOString();
    const unc: UncertaintyModel = {
      id: `unc-${Date.now()}`,
      investigationId: data.investigationId || 'inv-default',
      topic: data.topic || 'Unresolved Intelligence Gap',
      description: data.description || 'Target area requires additional primary source evidence.',
      confidence: data.confidence || 60,
      evidenceNeeded: data.evidenceNeeded || ['Patent filing disclosure', 'Financial 10-Q report'],
      priority: data.priority || 'MEDIUM',
      createdAt: now,
    };

    memory.uncertainties.unshift(unc);
    try {
      const db = await getDb();
      await db.collection<UncertaintyModel>('uncertainties').insertOne(unc);
    } catch {}
    return unc;
  },

  async getUncertaintiesByInvestigationId(investigationId: string): Promise<UncertaintyModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<UncertaintyModel>('uncertainties').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.uncertainties.filter((u) => u.investigationId === investigationId);
  },

  // Missing Helper Methods
  async getAgentById(id: string): Promise<AgentModel | undefined> {
    const mem = memory.agents.find((a) => a.id === id);
    if (mem) return mem;
    try {
      const db = await getDb();
      const doc = await db.collection<AgentModel>('agents').findOne({ id });
      if (doc) return doc;
    } catch {}
    return undefined;
  },

  async getGraphByInvestigationId(investigationId: string): Promise<{ entities: EntityModel[]; relationships: RelationshipModel[] }> {
    const entities = await this.getEntitiesByInvestigationId(investigationId);
    const relationships = await this.getRelationshipsByInvestigationId(investigationId);
    return { entities, relationships };
  },

  async getRecommendationsByInvestigationId(investigationId: string): Promise<RecommendationModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<RecommendationModel>('recommendations').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.recommendations.filter((r) => r.investigationId === investigationId);
  },

  async deleteInvestigation(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      await db.collection('investigations').deleteOne({ id });
    } catch {}
    memory.investigations = memory.investigations.filter((i) => i.id !== id);
    return true;
  },

  async getTimelineByInvestigationId(investigationId: string): Promise<TimelineEventModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<TimelineEventModel>('timeline_events').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.timelineEvents.filter((t) => t.investigationId === investigationId);
  },

  // ==================================================
  // STAGE 2.9 KNOWLEDGE GAPS, CONTRADICTIONS & DECISION LOGS
  // ==================================================

  // Knowledge Gaps
  async createKnowledgeGap(data: Partial<KnowledgeGapModel>): Promise<KnowledgeGapModel> {
    const now = new Date().toISOString();
    const gap: KnowledgeGapModel = {
      id: `gap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      description: data.description || 'Target area requires additional primary source evidence.',
      importance: data.importance || 'HIGH',
      confidence: data.confidence || 50,
      evidenceNeeded: data.evidenceNeeded || [],
      candidateAgents: data.candidateAgents || ['RESEARCH', 'PATENT'],
      status: data.status || 'OPEN',
      createdAt: now,
    };

    memory.knowledgeGaps.unshift(gap);
    try {
      const db = await getDb();
      await db.collection<KnowledgeGapModel>('knowledge_gaps').insertOne(gap);
    } catch {}
    return gap;
  },

  async getKnowledgeGapsByInvestigationId(investigationId: string): Promise<KnowledgeGapModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<KnowledgeGapModel>('knowledge_gaps').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.knowledgeGaps.filter((g) => g.investigationId === investigationId);
  },

  async updateKnowledgeGap(id: string, updates: Partial<KnowledgeGapModel>): Promise<KnowledgeGapModel | undefined> {
    try {
      const db = await getDb();
      await db.collection('knowledge_gaps').updateOne({ id }, { $set: updates });
    } catch {}

    const gap = memory.knowledgeGaps.find((g) => g.id === id);
    if (gap) {
      Object.assign(gap, updates);
      return gap;
    }
    return undefined;
  },

  // Contradictions
  async createContradiction(data: Partial<ContradictionModel>): Promise<ContradictionModel> {
    const now = new Date().toISOString();
    const contradiction: ContradictionModel = {
      id: `contra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      claims: data.claims || [],
      evidenceIds: data.evidenceIds || [],
      // Stage 5F fields
      claimIds: data.claimIds,
      conflictType: data.conflictType,
      resolutionStrategy: data.resolutionStrategy,
      severity: data.severity || 'MEDIUM',
      status: data.status || 'UNRESOLVED',
      resolution: data.resolution,
      unresolvedReason: data.unresolvedReason,
      confidenceDelta: data.confidenceDelta,
      createdAt: now,
      resolvedAt: data.resolvedAt,
    };

    memory.contradictions.unshift(contradiction);
    try {
      const db = await getDb();
      await db.collection<ContradictionModel>('contradictions').insertOne(contradiction);
    } catch {}
    return contradiction;
  },

  async getContradictionsByInvestigationId(investigationId: string): Promise<ContradictionModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<ContradictionModel>('contradictions').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.contradictions.filter((c) => c.investigationId === investigationId);
  },

  async updateContradiction(id: string, updates: Partial<ContradictionModel>): Promise<ContradictionModel | undefined> {
    try {
      const db = await getDb();
      await db.collection('contradictions').updateOne({ id }, { $set: updates });
    } catch {}

    const contradiction = memory.contradictions.find((c) => c.id === id);
    if (contradiction) {
      Object.assign(contradiction, updates);
      return contradiction;
    }
    return undefined;
  },

  // Stage 5F: Claims CRUD
  async createClaim(data: Partial<ClaimModel>): Promise<ClaimModel> {
    const now = new Date().toISOString();
    const claim: ClaimModel = {
      id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      statement: data.statement || '',
      topic: data.topic || '',
      entities: data.entities || [],
      evidenceIds: data.evidenceIds || [],
      supportingEvidenceIds: data.supportingEvidenceIds || [],
      contradictingEvidenceIds: data.contradictingEvidenceIds || [],
      confidence: data.confidence ?? 50,
      status: data.status || 'INSUFFICIENT_EVIDENCE',
      temporalScope: data.temporalScope,
      scopeNote: data.scopeNote,
      contradictionId: data.contradictionId,
      sourceQualityScore: data.sourceQualityScore,
      createdAt: now,
    };
    memory.claims.unshift(claim);
    try {
      const db = await getDb();
      await db.collection<ClaimModel>('claims').insertOne(claim);
    } catch {}
    return claim;
  },

  async getClaimsByInvestigationId(investigationId: string): Promise<ClaimModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<ClaimModel>('claims').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.claims.filter((c) => c.investigationId === investigationId);
  },

  async updateClaim(id: string, updates: Partial<ClaimModel>): Promise<ClaimModel | undefined> {
    try {
      const db = await getDb();
      await db.collection('claims').updateOne({ id }, { $set: { ...updates, updatedAt: new Date().toISOString() } });
    } catch {}
    const claim = memory.claims.find((c) => c.id === id);
    if (claim) {
      Object.assign(claim, updates, { updatedAt: new Date().toISOString() });
      return claim;
    }
    return undefined;
  },

  // Stage 5G: Hypotheses CRUD
  async createHypothesis(data: Partial<HypothesisModel>): Promise<HypothesisModel> {
    const now = new Date().toISOString();
    const hypothesis: HypothesisModel = {
      id: data.id || `hyp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      statement: data.statement || '',
      supportingEvidenceIds: data.supportingEvidenceIds || [],
      contradictingEvidenceIds: data.contradictingEvidenceIds || [],
      confidence: data.confidence ?? 50,
      status: data.status || 'UNRESOLVED',
      verificationTasks: data.verificationTasks || [],
      createdAt: now,
      updatedAt: now,
    };
    memory.hypotheses.unshift(hypothesis);
    try {
      const db = await getDb();
      await db.collection<HypothesisModel>('hypotheses').insertOne(hypothesis);
    } catch {}
    return hypothesis;
  },

  async getHypothesesByInvestigationId(investigationId: string): Promise<HypothesisModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<HypothesisModel>('hypotheses').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.hypotheses.filter((h) => h.investigationId === investigationId);
  },

  async updateHypothesis(id: string, updates: Partial<HypothesisModel>): Promise<HypothesisModel | undefined> {
    const now = new Date().toISOString();
    try {
      const db = await getDb();
      await db.collection('hypotheses').updateOne({ id }, { $set: { ...updates, updatedAt: now } });
    } catch {}
    const hyp = memory.hypotheses.find((h) => h.id === id);
    if (hyp) {
      Object.assign(hyp, updates, { updatedAt: now });
      return hyp;
    }
    return undefined;
  },

  // Stage 5G: Self-Evaluations CRUD
  async createSelfEvaluation(data: Partial<SelfEvaluationResult>): Promise<SelfEvaluationResult> {
    const now = new Date().toISOString();
    const result: SelfEvaluationResult = {
      id: data.id || `eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      iterationNumber: data.iterationNumber ?? 1,
      overallStatus: data.overallStatus || 'NEEDS_VERIFICATION',
      confidence: data.confidence ?? 50,
      evidenceStrength: data.evidenceStrength || 'MEDIUM',
      evidenceCoverage: data.evidenceCoverage ?? 50,
      totalMajorClaims: data.totalMajorClaims ?? 0,
      supportedClaims: data.supportedClaims ?? 0,
      partiallySupportedClaims: data.partiallySupportedClaims ?? 0,
      unsupportedClaims: data.unsupportedClaims || [],
      unverifiedAssumptions: data.unverifiedAssumptions || [],
      conflicts: data.conflicts || [],
      missingEvidence: data.missingEvidence || [],
      recommendedActions: data.recommendedActions || [],
      claimEvaluations: data.claimEvaluations || [],
      reasoning: data.reasoning || '',
      shouldReplan: data.shouldReplan ?? false,
      reasoningLimitReached: data.reasoningLimitReached,
      createdAt: now,
    };
    memory.selfEvaluations.unshift(result);
    try {
      const db = await getDb();
      await db.collection<SelfEvaluationResult>('self_evaluations').insertOne(result);
    } catch {}
    return result;
  },

  async getSelfEvaluationsByInvestigationId(investigationId: string): Promise<SelfEvaluationResult[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<SelfEvaluationResult>('self_evaluations').find({ investigationId }).sort({ createdAt: -1 }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.selfEvaluations.filter((e) => e.investigationId === investigationId);
  },

  async getLatestSelfEvaluation(investigationId: string): Promise<SelfEvaluationResult | undefined> {
    const evals = await this.getSelfEvaluationsByInvestigationId(investigationId);
    return evals[0];
  },

  // Stage 5G: Conclusion Versions CRUD
  async createConclusionVersion(data: Partial<ConclusionVersion>): Promise<ConclusionVersion> {
    const now = new Date().toISOString();
    const existing = await this.getConclusionVersionsByInvestigationId(data.investigationId || 'inv-default');
    const versionNum = data.version ?? (existing.length + 1);

    const version: ConclusionVersion = {
      id: data.id || `conc-v${versionNum}-${Date.now()}`,
      investigationId: data.investigationId || 'inv-default',
      version: versionNum,
      conclusion: data.conclusion || '',
      confidence: data.confidence ?? 50,
      evaluationId: data.evaluationId || '',
      reason: data.reason || 'Initial conclusion formulation',
      createdAt: now,
    };
    memory.conclusionVersions.unshift(version);
    try {
      const db = await getDb();
      await db.collection<ConclusionVersion>('conclusion_versions').insertOne(version);
    } catch {}
    return version;
  },

  async getConclusionVersionsByInvestigationId(investigationId: string): Promise<ConclusionVersion[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<ConclusionVersion>('conclusion_versions').find({ investigationId }).sort({ version: -1 }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.conclusionVersions.filter((v) => v.investigationId === investigationId).sort((a, b) => b.version - a.version);
  },

  // Stage 5G: Verification Task Requests CRUD
  async createVerificationRequest(data: Partial<VerificationTaskRequest>): Promise<VerificationTaskRequest> {
    const now = new Date().toISOString();
    const req: VerificationTaskRequest = {
      id: data.id || `vreq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      hypothesisId: data.hypothesisId || '',
      description: data.description || '',
      missingEvidenceType: data.missingEvidenceType || 'RESEARCH',
      priority: data.priority || 'HIGH',
      reason: data.reason || '',
      informationGain: data.informationGain || 'HIGH',
      createdAt: now,
    };
    memory.verificationRequests.unshift(req);
    try {
      const db = await getDb();
      await db.collection<VerificationTaskRequest>('verification_requests').insertOne(req);
    } catch {}
    return req;
  },

  async getVerificationRequestsByInvestigationId(investigationId: string): Promise<VerificationTaskRequest[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<VerificationTaskRequest>('verification_requests').find({ investigationId }).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.verificationRequests.filter((r) => r.investigationId === investigationId);
  },

  // Decision Logs
  async saveDecisionLog(data: Partial<DecisionLogModel>): Promise<DecisionLogModel> {
    const now = new Date().toISOString();
    const log: DecisionLogModel = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      decision: data.decision || 'CONTINUE',
      reason: data.reason || 'Decision executed by Autonomous Controller',
      trigger: data.trigger || 'EVIDENCE_EVALUATION',
      createdTaskIds: data.createdTaskIds || [],
      resolvedGapIds: data.resolvedGapIds || [],
      timestamp: now,
    };

    memory.decisionLogs.unshift(log);
    try {
      const db = await getDb();
      await db.collection<DecisionLogModel>('decision_logs').insertOne(log);
    } catch {}
    return log;
  },

  async getDecisionLogsByInvestigationId(investigationId: string): Promise<DecisionLogModel[]> {
    try {
      const db = await getDb();
      const docs = await db
        .collection<DecisionLogModel>('decision_logs')
        .find({ investigationId })
        .sort({ timestamp: -1 })
        .toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.decisionLogs.filter((d) => d.investigationId === investigationId);
  },

  // ==================================================
  // STAGE 2.10 INTELLIGENCE GRAPH & ENTITY PROFILES
  // ==================================================

  // Graph Nodes
  async createGraphNode(data: Partial<GraphNodeModel>): Promise<GraphNodeModel> {
    const now = new Date().toISOString();
    const node: GraphNodeModel = {
      id: data.id || `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId,
      entityId: data.entityId,
      type: data.type || 'COMPANY',
      label: data.label || 'Unknown Entity',
      description: data.description || '',
      importance: data.importance || 50,
      confidence: data.confidence || 80,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };

    memory.graphNodes.push(node);
    try {
      const db = await getDb();
      await db.collection<GraphNodeModel>('graph_nodes').insertOne(node);
    } catch {}
    return node;
  },

  async getGraphNodes(investigationId?: string): Promise<GraphNodeModel[]> {
    try {
      const db = await getDb();
      const query = investigationId ? { investigationId } : {};
      const docs = await db.collection<GraphNodeModel>('graph_nodes').find(query).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    if (investigationId) return memory.graphNodes.filter((n) => n.investigationId === investigationId);
    return memory.graphNodes;
  },

  // Graph Edges
  async createGraphEdge(data: Partial<GraphEdgeModel>): Promise<GraphEdgeModel> {
    const now = new Date().toISOString();
    const edge: GraphEdgeModel = {
      id: data.id || `edge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId,
      sourceNodeId: data.sourceNodeId || '',
      targetNodeId: data.targetNodeId || '',
      relationshipType: data.relationshipType || 'RELATED_TO',
      direction: data.direction || 'DIRECTED',
      confidence: data.confidence || 75,
      importance: data.importance || 50,
      evidenceIds: data.evidenceIds || [],
      createdAt: now,
      updatedAt: now,
    };

    memory.graphEdges.push(edge);
    try {
      const db = await getDb();
      await db.collection<GraphEdgeModel>('graph_edges').insertOne(edge);
    } catch {}
    return edge;
  },

  async getGraphEdges(investigationId?: string): Promise<GraphEdgeModel[]> {
    try {
      const db = await getDb();
      const query = investigationId ? { investigationId } : {};
      const docs = await db.collection<GraphEdgeModel>('graph_edges').find(query).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    if (investigationId) return memory.graphEdges.filter((e) => e.investigationId === investigationId);
    return memory.graphEdges;
  },

  // Entity Profiles
  async saveEntityProfile(data: Partial<EntityProfileModel>): Promise<EntityProfileModel> {
    const now = new Date().toISOString();
    const profile: EntityProfileModel = {
      id: data.id || `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name || 'Unnamed Entity',
      type: data.type || 'COMPANY',
      aliases: data.aliases || [],
      description: data.description || '',
      industry: data.industry,
      relatedEntityIds: data.relatedEntityIds || [],
      evidenceCount: data.evidenceCount || 0,
      signalCount: data.signalCount || 0,
      importance: data.importance || 50,
      confidence: data.confidence || 80,
      firstSeen: data.firstSeen || now,
      lastSeen: now,
    };

    const existingIdx = memory.entityProfiles.findIndex((p) => p.id === profile.id || p.name.toLowerCase() === profile.name.toLowerCase());
    if (existingIdx >= 0) {
      memory.entityProfiles[existingIdx] = profile;
    } else {
      memory.entityProfiles.push(profile);
    }

    try {
      const db = await getDb();
      await db.collection<EntityProfileModel>('entity_profiles').updateOne(
        { name: profile.name },
        { $set: profile },
        { upsert: true }
      );
    } catch {}
    return profile;
  },

  async getEntityProfiles(): Promise<EntityProfileModel[]> {
    try {
      const db = await getDb();
      const docs = await db.collection<EntityProfileModel>('entity_profiles').find({}).toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.entityProfiles;
  },

  async getEntityProfileById(id: string): Promise<EntityProfileModel | undefined> {
    const mem = memory.entityProfiles.find((p) => p.id === id);
    if (mem) return mem;

    try {
      const db = await getDb();
      const doc = await db.collection<EntityProfileModel>('entity_profiles').findOne({ id });
      if (doc) return doc;
    } catch {}
    return undefined;
  },

  // ==================================================
  // STAGE 2.11 EXECUTIVE BRIEF, RECOMMENDATIONS & AUDIT
  // ==================================================

  // Executive Briefs
  async saveExecutiveBrief(data: Partial<ExecutiveBriefModel>): Promise<ExecutiveBriefModel> {
    const now = new Date().toISOString();
    const brief: ExecutiveBriefModel = {
      id: data.id || `brief-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      version: data.version || 1,
      title: data.title || 'Executive Intelligence Brief',
      executiveSummary: data.executiveSummary || 'Executive brief generated from real primary evidence.',
      keyChanges: data.keyChanges || [],
      strategicImplications: data.strategicImplications || [],
      threats: data.threats || [],
      opportunities: data.opportunities || [],
      recommendedActions: data.recommendedActions || [],
      watchItems: data.watchItems || [],
      confidence: data.confidence || 85,
      sourceCoverage: data.sourceCoverage || {},
      evidenceIds: data.evidenceIds || [],
      signalIds: data.signalIds || [],
      entityIds: data.entityIds || [],
      generatedAt: now,
    };

    memory.executiveBriefs.unshift(brief);
    try {
      const db = await getDb();
      await db.collection<ExecutiveBriefModel>('executive_briefs').insertOne(brief);
    } catch {}
    return brief;
  },

  async getExecutiveBriefByInvestigationId(investigationId: string): Promise<ExecutiveBriefModel | undefined> {
    const mem = memory.executiveBriefs.find((b) => b.investigationId === investigationId);
    if (mem) return mem;

    try {
      const db = await getDb();
      const doc = await db
        .collection<ExecutiveBriefModel>('executive_briefs')
        .find({ investigationId })
        .sort({ version: -1 })
        .limit(1)
        .toArray();
      if (doc.length > 0) return doc[0];
    } catch {}
    return undefined;
  },

  async getExecutiveBriefVersions(investigationId: string): Promise<ExecutiveBriefModel[]> {
    try {
      const db = await getDb();
      const docs = await db
        .collection<ExecutiveBriefModel>('executive_briefs')
        .find({ investigationId })
        .sort({ version: -1 })
        .toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.executiveBriefs.filter((b) => b.investigationId === investigationId);
  },

  // Executive Recommendations
  async saveExecutiveRecommendation(data: Partial<ExecutiveRecommendationModel>): Promise<ExecutiveRecommendationModel> {
    const now = new Date().toISOString();
    const rec: ExecutiveRecommendationModel = {
      id: data.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      title: data.title || 'Strategic Recommendation',
      action: data.action || 'Execute recommended strategic initiative.',
      reason: data.reason || 'Backed by verified primary evidence.',
      priority: data.priority || 'HIGH',
      impact: data.impact || 'HIGH',
      confidence: data.confidence || 85,
      timeHorizon: data.timeHorizon || 'SHORT_TERM',
      evidenceIds: data.evidenceIds || [],
      signalIds: data.signalIds || [],
      entityIds: data.entityIds || [],
      status: data.status || 'RECOMMENDED',
      owner: data.owner,
      team: data.team,
      dueDate: data.dueDate,
      notes: data.notes,
      createdAt: now,
    };

    memory.executiveRecommendations.unshift(rec);
    try {
      const db = await getDb();
      await db.collection<ExecutiveRecommendationModel>('executive_recommendations').insertOne(rec);
    } catch {}
    return rec;
  },

  async getExecRecommendationsByInvestigationId(investigationId: string): Promise<ExecutiveRecommendationModel[]> {
    try {
      const db = await getDb();
      const docs = await db
        .collection<ExecutiveRecommendationModel>('executive_recommendations')
        .find({ investigationId })
        .toArray();
      if (docs.length > 0) return docs;
    } catch {}
    return memory.executiveRecommendations.filter((r) => r.investigationId === investigationId);
  },

  async updateRecommendationStatus(id: string, status: any, details?: any): Promise<ExecutiveRecommendationModel | undefined> {
    try {
      const db = await getDb();
      await db.collection('executive_recommendations').updateOne({ id }, { $set: { status, ...details } });
    } catch {}

    const rec = memory.executiveRecommendations.find((r) => r.id === id);
    if (rec) {
      rec.status = status;
      if (details) Object.assign(rec, details);
      return rec;
    }
    return undefined;
  },

  // Decision Audit Events
  async saveDecisionAuditEvent(data: Partial<DecisionAuditEventModel>): Promise<DecisionAuditEventModel> {
    const now = new Date().toISOString();
    const evt: DecisionAuditEventModel = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      recommendationId: data.recommendationId,
      action: data.action || 'RECOMMENDATION_STATUS_CHANGED',
      performedBy: data.performedBy || 'Executive User',
      timestamp: now,
      details: data.details,
    };

    memory.decisionAuditEvents.unshift(evt);
    try {
      const db = await getDb();
      await db.collection<DecisionAuditEventModel>('decision_audit_events').insertOne(evt);
    } catch {}
    return evt;
  },

  // ==================================================
  // CONTEXT & MEMORY MANAGEMENT
  // ==================================================

  async getInvestigationMemory(investigationId: string): Promise<InvestigationMemoryModel | undefined> {
    const mem = memory.investigationMemory.find((m) => m.investigationId === investigationId);
    if (mem) return mem;
    try {
      const db = await getDb();
      const doc = await db.collection<InvestigationMemoryModel>('investigation_memory').findOne({ investigationId });
      if (doc) {
        memory.investigationMemory.push(doc);
        return doc;
      }
    } catch (err) {
      console.error('[MEMORY] Failed to load investigation memory:', err);
    }
    return undefined;
  },

  async createInvestigationMemory(data: Partial<InvestigationMemoryModel>): Promise<InvestigationMemoryModel> {
    const now = new Date().toISOString();
    const mem: InvestigationMemoryModel = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId: data.investigationId || 'inv-default',
      version: 1,
      objective: data.objective || '',
      targetEntity: data.targetEntity || '',
      technology: data.technology || '',
      timeHorizon: data.timeHorizon || 'Last 30 days',
      status: data.status || 'RUNNING',
      agentSteps: [],
      keyEntities: data.keyEntities || [],
      keyFindings: [],
      openQuestions: data.openQuestions || [],
      importantEvidenceIds: [],
      totalEvidenceCount: 0,
      totalAgentSteps: 0,
      completedAgents: [],
      activeAgent: undefined,
      contextStatus: 'BUILDING',
      parentInvestigationId: data.parentInvestigationId,
      createdAt: now,
      updatedAt: now,
    };

    memory.investigationMemory.unshift(mem);
    try {
      const db = await getDb();
      await db.collection<InvestigationMemoryModel>('investigation_memory').insertOne(mem);
    } catch (err) {
      console.error('[MEMORY] Failed to persist investigation memory:', err);
    }
    return mem;
  },

  async updateInvestigationMemory(
    investigationId: string,
    updates: Partial<InvestigationMemoryModel>
  ): Promise<InvestigationMemoryModel | undefined> {
    updates.updatedAt = new Date().toISOString();
    if (updates.version === undefined) {
      const existing = memory.investigationMemory.find((m) => m.investigationId === investigationId);
      updates.version = existing ? existing.version + 1 : 1;
    }

    try {
      const db = await getDb();
      await db
        .collection('investigation_memory')
        .updateOne({ investigationId }, { $set: updates }, { upsert: false });
    } catch (err) {
      console.error('[MEMORY] Failed to update investigation memory:', err);
    }

    const idx = memory.investigationMemory.findIndex((m) => m.investigationId === investigationId);
    if (idx >= 0) {
      memory.investigationMemory[idx] = { ...memory.investigationMemory[idx], ...updates };
      return memory.investigationMemory[idx];
    }
    return undefined;
  },

  async appendAgentStep(step: AgentStepMemoryModel): Promise<AgentStepMemoryModel> {
    memory.agentStepMemory.push(step);

    // Update in-memory summary record
    const memRecord = memory.investigationMemory.find((m) => m.investigationId === step.investigationId);
    if (memRecord) {
      memRecord.agentSteps.push(step);
      memRecord.totalAgentSteps = memRecord.agentSteps.length;
      if (!memRecord.completedAgents.includes(step.agentType)) {
        memRecord.completedAgents.push(step.agentType);
      }
      memRecord.updatedAt = new Date().toISOString();
    }

    try {
      const db = await getDb();
      // Persist the step to its own collection
      await db.collection<AgentStepMemoryModel>('agent_step_memory').insertOne(step);
      // Push step into the agentSteps array of the parent memory document
      await db.collection('investigation_memory').updateOne(
        { investigationId: step.investigationId },
        {
          $push: { agentSteps: step } as any,
          $set: {
            totalAgentSteps: (memRecord?.totalAgentSteps ?? 0),
            completedAgents: memRecord?.completedAgents ?? [],
            updatedAt: new Date().toISOString(),
          },
          $inc: { version: 1 } as any,
        }
      );
    } catch (err) {
      console.error('[MEMORY] Failed to persist agent step:', err);
    }
    return step;
  },

  async getAgentStepsByInvestigationId(investigationId: string): Promise<AgentStepMemoryModel[]> {
    const memSteps = memory.agentStepMemory.filter((s) => s.investigationId === investigationId);
    if (memSteps.length > 0) return memSteps;
    try {
      const db = await getDb();
      const docs = await db
        .collection<AgentStepMemoryModel>('agent_step_memory')
        .find({ investigationId })
        .sort({ timestamp: 1 })
        .toArray();
      if (docs.length > 0) return docs;
    } catch (err) {
      console.error('[MEMORY] Failed to load agent steps:', err);
    }
    return [];
  },

  async updateMemorySummary(
    investigationId: string,
    summary: {
      keyFindings: string[];
      openQuestions: string[];
      importantEvidenceIds: string[];
      keyEntities: string[];
      totalEvidenceCount: number;
      contextStatus: InvestigationMemoryModel['contextStatus'];
    }
  ): Promise<void> {
    const updates: Partial<InvestigationMemoryModel> = {
      ...summary,
      summaryGeneratedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const idx = memory.investigationMemory.findIndex((m) => m.investigationId === investigationId);
    if (idx >= 0) {
      memory.investigationMemory[idx] = { ...memory.investigationMemory[idx], ...updates };
    }

    try {
      const db = await getDb();
      await db.collection('investigation_memory').updateOne({ investigationId }, { $set: updates });
    } catch (err) {
      console.error('[MEMORY] Failed to update memory summary:', err);
    }
  },

  async getRelevantContext(
    investigationId: string,
    agentType: AgentType
  ): Promise<{
    objective: string;
    targetEntity: string;
    keyFindings: string[];
    openQuestions: string[];
    importantEvidenceIds: string[];
    keyEntities: string[];
    parentContext?: { keyFindings: string[]; keyEntities: string[] };
  }> {
    const mem = await this.getInvestigationMemory(investigationId);
    const defaultCtx = {
      objective: '',
      targetEntity: '',
      keyFindings: [],
      openQuestions: [],
      importantEvidenceIds: [],
      keyEntities: [],
    };

    if (!mem) return defaultCtx;

    // Agent-type-specific relevance filtering:
    // NEWS agents get competitor entities; PATENT agents get research findings.
    let filteredFindings = mem.keyFindings;
    if (agentType === 'PATENT') {
      filteredFindings = mem.keyFindings.filter(
        (f) => /patent|IP|filing|claim|USPTO|WIPO|assign/i.test(f) || mem.keyFindings.indexOf(f) < 3
      );
    } else if (agentType === 'NEWS') {
      filteredFindings = mem.keyFindings.filter(
        (f) => /news|acqui|partner|SEC|EDGAR|Bloomberg|Reuters|launch/i.test(f) || mem.keyFindings.indexOf(f) < 3
      );
    }

    // If this is a follow-up investigation, pull parent's compressed findings
    let parentContext: { keyFindings: string[]; keyEntities: string[] } | undefined;
    if (mem.parentInvestigationId) {
      const parentMem = await this.getInvestigationMemory(mem.parentInvestigationId);
      if (parentMem) {
        parentContext = {
          keyFindings: parentMem.keyFindings.slice(0, 5),
          keyEntities: parentMem.keyEntities,
        };
      }
    }

    return {
      objective: mem.objective,
      targetEntity: mem.targetEntity,
      keyFindings: filteredFindings,
      openQuestions: mem.openQuestions,
      importantEvidenceIds: mem.importantEvidenceIds,
      keyEntities: mem.keyEntities,
      parentContext,
    };
  },

  async linkFollowupInvestigation(followupId: string, parentId: string): Promise<void> {
    const mem = await this.getInvestigationMemory(followupId);
    if (mem) {
      await this.updateInvestigationMemory(followupId, { parentInvestigationId: parentId });
    } else {
      const inv = await this.getInvestigationById(followupId);
      await this.createInvestigationMemory({
        investigationId: followupId,
        parentInvestigationId: parentId,
        objective: inv?.objective || '',
        targetEntity: inv?.primaryEntities?.[0] || inv?.organization || inv?.title || '',
        technology: inv?.technology || '',
        timeHorizon: inv?.timeHorizon || 'Last 30 days',
        status: 'RUNNING',
      });
    }
  },
};
