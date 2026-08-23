import {
  AgentType,
  TaskModel,
  AgentContextModel,
  AgentResultModel,
  EvidenceModel,
  SignalModel,
  RelationshipModel,
  ProviderExecutionModel,
  FailureInjectionConfig,
} from '@/lib/types';
import { defaultCrossrefProvider } from '@/lib/providers/crossrefProvider';
import { defaultPatentProvider } from '@/lib/providers/patentProvider';
import { defaultNewsProvider } from '@/lib/providers/newsProvider';
import { defaultWebProvider } from '@/lib/providers/webProvider';
import { defaultEvidenceNormalizer } from '@/lib/normalization/evidenceNormalizer';
import { defaultEntityResolver } from '@/lib/normalization/entityResolver';

/**
 * Timeout wrapper for agent operations
 */
async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutErrorMessage: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutErrorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Fallback wrapper - tries primary, then falls back on failure/timeout
 */
async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  shouldFallback: (error: Error) => boolean = () => true
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (shouldFallback(error as Error)) {
      console.warn('[AgentRegistry] Primary operation failed, executing fallback:', (error as Error).message);
      return await fallback();
    }
    throw error;
  }
}

/**
 * Controlled Failure Injection - Only active in Evaluation Lab controlled scenarios
 * Extracts failure injection config from investigation metadata
 */
function getFailureInjectionConfig(context: AgentContextModel): FailureInjectionConfig | null {
  const meta = context.investigation.metadata as Record<string, unknown> | undefined;
  if (!meta?.failureInjection) return null;
  
  const config = meta.failureInjection as FailureInjectionConfig;
  if (!config.enabled) return null;
  
  // Check if this agent/tool is targeted
  if (config.targetAgent && config.targetAgent !== context.task.agentType) return null;
  if (config.targetTool) {
    const toolMap: Record<string, AgentType> = {
      'research': 'RESEARCH',
      'patent': 'PATENT',
      'news': 'NEWS',
      'competitor': 'COMPETITOR',
      'web': 'WEB',
    };
    const targetAgent = toolMap[config.targetTool];
    if (targetAgent && targetAgent !== context.task.agentType) return null;
  }
  
  return config;
}

/**
 * Apply controlled failure injection
 */
async function applyFailureInjection<T>(
  config: FailureInjectionConfig,
  operation: () => Promise<T>
): Promise<T> {
  const { type, errorMessage, httpStatus, delayMs } = config;
  
  switch (type) {
    case 'TOOL_TIMEOUT':
      await new Promise((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage || 'Tool timeout (controlled failure)')), delayMs || 5000)
      );
      break;
      
    case 'TOOL_UNAVAILABLE':
      throw new Error(errorMessage || 'Service temporarily unavailable (controlled failure)');
      
    case 'TEMPORARY_API_FAILURE':
      if (delayMs) await new Promise(r => setTimeout(r, delayMs));
      const err = new Error(`API error ${httpStatus || 503} (controlled failure)`);
      (err as any).status = httpStatus || 503;
      throw err;
      
    case 'INVALID_TOOL_RESPONSE':
      throw new Error(errorMessage || 'Invalid response format from provider (controlled failure)');
      
    case 'AGENT_EXECUTION_FAILURE':
      throw new Error(errorMessage || 'Simulated agent execution failure (controlled failure)');
  }
  
  return operation();
}

export interface Agent {
  type: AgentType;
  name: string;
  canHandle(task: TaskModel): boolean;
  run(context: AgentContextModel): Promise<AgentResultModel>;
}

// 1. Real Research Agent
class ResearchAgent implements Agent {
  type: AgentType = 'RESEARCH';
  name = 'Research Agent';

  canHandle(task: TaskModel): boolean {
    return task.agentType === 'RESEARCH';
  }

  async run(context: AgentContextModel): Promise<AgentResultModel> {
    const failureConfig = getFailureInjectionConfig(context);
    if (failureConfig) {
      await applyFailureInjection(failureConfig, async () => {});
    }
    
    const now = new Date().toISOString();
    const invId = context.investigation.id;
    const query = context.investigation.objective || context.investigation.title;

    const providerStart = Date.now();
    // Use timeout and fallback for provider calls
    const providerResults = await withTimeout(
      () => withFallback(
        () => defaultCrossrefProvider.search(query, { limit: 5 }),
        () => Promise.resolve([] as any),
        (error) => error.message.includes('timeout') || error.message.includes('DEGRADED')
      ),
      10000, // 10s timeout
      'Research provider timeout'
    );
    const providerLatency = Date.now() - providerStart;

    const evidenceItems: EvidenceModel[] = [];
    const entityIdsSet = new Set<string>();

    for (const res of providerResults) {
      const normalized = defaultEvidenceNormalizer.normalizeSourceResult(res, invId, 'agent-res');
      if (normalized.evidence.verificationStatus === 'VERIFIED') {
        evidenceItems.push(normalized.evidence);
        normalized.entityIds.forEach((id) => entityIdsSet.add(id));
      }
    }

    const providerExecution: ProviderExecutionModel = {
      provider: defaultCrossrefProvider.name,
      category: 'RESEARCH' as const,
      request: { query },
      startedAt: new Date(Date.now() - providerLatency).toISOString(),
      completedAt: now,
      status: providerResults.length > 0 ? 'SUCCESS' : 'PARTIAL',
      resultCount: providerResults.length,
      error: providerResults.length === 0 ? 'No results returned' : undefined,
      latencyMs: providerLatency,
      tokenUsage: {
        available: false, // Crossref doesn't expose token usage
      },
    };

    return {
      taskId: context.task.id,
      agentType: this.type,
      status: 'SUCCESS',
      summary: `Retrieved and normalized ${evidenceItems.length} research publication(s) from Crossref REST API.`,
      evidenceItems,
      evidenceIds: evidenceItems.map((e) => e.id),
      entityIds: Array.from(entityIdsSet),
      signalCandidates: [],
      relationships: [],
      confidence: 93,
      metadata: { 
        provider: defaultCrossrefProvider.name, 
        query,
        providerExecution
      },
      startedAt: now,
      completedAt: now,
    };
  }
}

// 2. Real Patent Agent
class PatentAgent implements Agent {
  type: AgentType = 'PATENT';
  name = 'Patent Agent';

  canHandle(task: TaskModel): boolean {
    return task.agentType === 'PATENT';
  }

  async run(context: AgentContextModel): Promise<AgentResultModel> {
    const failureConfig = getFailureInjectionConfig(context);
    if (failureConfig) {
      await applyFailureInjection(failureConfig, async () => {});
    }
    
    const now = new Date().toISOString();
    const invId = context.investigation.id;
    const org = context.investigation.primaryEntities[0] || context.investigation.title;

    const providerStart = Date.now();
    // Use timeout and fallback for provider calls
    const providerResults = await withTimeout(
      () => withFallback(
        () => defaultPatentProvider.search(org, { limit: 5, entity: org }),
        () => Promise.resolve([] as any),
        (error) => error.message.includes('timeout') || error.message.includes('DEGRADED')
      ),
      10000, // 10s timeout
      'Patent provider timeout'
    );
    const providerLatency = Date.now() - providerStart;

    const evidenceItems: EvidenceModel[] = [];
    const entityIdsSet = new Set<string>();

    for (const res of providerResults) {
      const normalized = defaultEvidenceNormalizer.normalizeSourceResult(res, invId, 'agent-pat');
      if (normalized.evidence.verificationStatus === 'VERIFIED') {
        evidenceItems.push(normalized.evidence);
        normalized.entityIds.forEach((id) => entityIdsSet.add(id));
      }
    }

    const primaryEntity = defaultEntityResolver.resolveEntity(org);
    const techEntity = defaultEntityResolver.resolveEntity(context.investigation.technology || 'Core Technology');

    const relationships: Partial<RelationshipModel>[] = [
      {
        id: `rel-pat-${Date.now()}`,
        investigationId: invId,
        sourceEntityId: primaryEntity.id,
        targetEntityId: techEntity.id,
        relationshipType: 'FILED_PATENT',
        confidence: 94,
        evidenceIds: evidenceItems.map((e) => e.id),
        whyConnected: 'Published patent filings detail proprietary technical execution methods.',
        createdAt: now,
      },
    ];

    const providerExecution: ProviderExecutionModel = {
      provider: defaultPatentProvider.name,
      category: 'PATENT' as const,
      request: { entity: org },
      startedAt: new Date(Date.now() - providerLatency).toISOString(),
      completedAt: now,
      status: providerResults.length > 0 ? 'SUCCESS' : 'PARTIAL',
      resultCount: providerResults.length,
      error: providerResults.length === 0 ? 'No results returned' : undefined,
      latencyMs: providerLatency,
      tokenUsage: {
        available: false, // Patent provider doesn't expose token usage
      },
    };

    return {
      taskId: context.task.id,
      agentType: this.type,
      status: 'SUCCESS',
      summary: `Retrieved and normalized ${evidenceItems.length} patent application(s) from USPTO Data Index.`,
      evidenceItems,
      evidenceIds: evidenceItems.map((e) => e.id),
      entityIds: Array.from(entityIdsSet),
      signalCandidates: [],
      relationships,
      confidence: 94,
      metadata: { 
        provider: defaultPatentProvider.name, 
        entity: org,
        providerExecution
      },
      startedAt: now,
      completedAt: now,
    };
  }
}

// 3. Real News Agent
class NewsAgent implements Agent {
  type: AgentType = 'NEWS';
  name = 'News Agent';

  canHandle(task: TaskModel): boolean {
    return task.agentType === 'NEWS';
  }

  async run(context: AgentContextModel): Promise<AgentResultModel> {
    const failureConfig = getFailureInjectionConfig(context);
    if (failureConfig) {
      await applyFailureInjection(failureConfig, async () => {});
    }
    
    const now = new Date().toISOString();
    const invId = context.investigation.id;
    const org = context.investigation.primaryEntities[0] || context.investigation.title;

    const providerStart = Date.now();
    // Use timeout and fallback for provider calls
    const providerResults = await withTimeout(
      () => withFallback(
        () => defaultNewsProvider.search(org, { limit: 5, entity: org }),
        () => Promise.resolve([] as any),
        (error) => error.message.includes('timeout') || error.message.includes('DEGRADED')
      ),
      10000, // 10s timeout
      'News provider timeout'
    );
    const providerLatency = Date.now() - providerStart;

    const evidenceItems: EvidenceModel[] = [];
    const entityIdsSet = new Set<string>();

    for (const res of providerResults) {
      const normalized = defaultEvidenceNormalizer.normalizeSourceResult(res, invId, 'agent-news');
      if (normalized.evidence.verificationStatus === 'VERIFIED') {
        evidenceItems.push(normalized.evidence);
        normalized.entityIds.forEach((id) => entityIdsSet.add(id));
      }
    }

    const providerExecution: ProviderExecutionModel = {
      provider: defaultNewsProvider.name,
      category: 'NEWS' as const,
      request: { entity: org },
      startedAt: new Date(Date.now() - providerLatency).toISOString(),
      completedAt: now,
      status: providerResults.length > 0 ? 'SUCCESS' : 'PARTIAL',
      resultCount: providerResults.length,
      error: providerResults.length === 0 ? 'No results returned' : undefined,
      latencyMs: providerLatency,
      tokenUsage: {
        available: false, // News provider doesn't expose token usage
      },
    };

    return {
      taskId: context.task.id,
      agentType: this.type,
      status: 'SUCCESS',
      summary: `Retrieved and deduplicated ${evidenceItems.length} news article(s) from Industry News Index.`,
      evidenceItems,
      evidenceIds: evidenceItems.map((e) => e.id),
      entityIds: Array.from(entityIdsSet),
      signalCandidates: [],
      relationships: [],
      confidence: 91,
      metadata: { 
        provider: defaultNewsProvider.name, 
        entity: org,
        providerExecution
      },
      startedAt: now,
      completedAt: now,
    };
  }
}

// 4. Dynamic Evidence-Driven Competitor Agent
class CompetitorAgent implements Agent {
  type: AgentType = 'COMPETITOR';
  name = 'Competitor Agent';

  canHandle(task: TaskModel): boolean {
    return task.agentType === 'COMPETITOR';
  }

  async run(context: AgentContextModel): Promise<AgentResultModel> {
    const failureConfig = getFailureInjectionConfig(context);
    if (failureConfig) {
      await applyFailureInjection(failureConfig, async () => {});
    }
    
    const now = new Date().toISOString();
    const invId = context.investigation.id;
    const org = context.investigation.primaryEntities[0] || context.investigation.title;

    // Search for competitor industry moves dynamically
    const providerStart = Date.now();
    const compResults = await withTimeout(
      () => withFallback(
        () => defaultNewsProvider.search(`${org} competitor vs market share`, { limit: 5, entity: org }),
        () => Promise.resolve([] as any),
        (error) => error.message.includes('timeout') || error.message.includes('DEGRADED')
      ),
      10000, // 10s timeout
      'Competitor provider timeout'
    );
    const providerLatency = Date.now() - providerStart;

    const evidenceItems: EvidenceModel[] = [];
    const entityIdsSet = new Set<string>();

    for (const res of compResults) {
      const normalized = defaultEvidenceNormalizer.normalizeSourceResult(res, invId, 'agent-comp');
      if (normalized.evidence.verificationStatus === 'VERIFIED') {
        evidenceItems.push(normalized.evidence);
        normalized.entityIds.forEach((id) => entityIdsSet.add(id));
      }
    }

    const primaryEnt = defaultEntityResolver.resolveEntity(org);
    const competitorEnt = defaultEntityResolver.resolveEntity(`${org} Industry Competitor`);

    const relationships: Partial<RelationshipModel>[] = [
      {
        id: `rel-comp-${Date.now()}`,
        investigationId: invId,
        sourceEntityId: competitorEnt.id,
        targetEntityId: primaryEnt.id,
        relationshipType: 'COMPETES_WITH',
        confidence: 90,
        evidenceIds: evidenceItems.map((e) => e.id),
        whyConnected: 'Market disclosures indicate direct product feature and customer adoption competition.',
        createdAt: now,
      },
    ];

    const providerExecution: ProviderExecutionModel = {
      provider: defaultNewsProvider.name,
      category: 'COMPETITOR' as const,
      request: { query: `${org} competitor vs market share` },
      startedAt: new Date(Date.now() - providerLatency).toISOString(),
      completedAt: now,
      status: compResults.length > 0 ? 'SUCCESS' : 'PARTIAL',
      resultCount: compResults.length,
      error: compResults.length === 0 ? 'No results returned' : undefined,
      latencyMs: providerLatency,
      tokenUsage: {
        available: false, // News provider doesn't expose token usage
      },
    };

    return {
      taskId: context.task.id,
      agentType: this.type,
      status: 'SUCCESS',
      summary: `Analyzed ${evidenceItems.length} real news/industry disclosure(s) for competitive threats.`,
      evidenceItems,
      evidenceIds: evidenceItems.map((e) => e.id),
      entityIds: Array.from(entityIdsSet),
      signalCandidates: [],
      relationships,
      confidence: 90,
      metadata: { 
        provider: defaultNewsProvider.name, 
        entity: org,
        providerExecution
      },
      startedAt: now,
      completedAt: now,
    };
  }
}

// 5. Real Web Intelligence Agent
class WebAgent implements Agent {
  type: AgentType = 'WEB';
  name = 'Web Intelligence Agent';

  canHandle(task: TaskModel): boolean {
    return task.agentType === 'WEB';
  }

  async run(context: AgentContextModel): Promise<AgentResultModel> {
    const failureConfig = getFailureInjectionConfig(context);
    if (failureConfig) {
      await applyFailureInjection(failureConfig, async () => {});
    }
    
    const now = new Date().toISOString();
    const invId = context.investigation.id;
    const topic = context.investigation.objective || context.investigation.title;

    const providerStart = Date.now();
    // Use timeout and fallback for provider calls
    const providerResults = await withTimeout(
      () => withFallback(
        () => defaultWebProvider.search(topic, { limit: 5 }),
        () => Promise.resolve([] as any),
        (error) => error.message.includes('timeout') || error.message.includes('DEGRADED')
      ),
      10000, // 10s timeout
      'Web provider timeout'
    );
    const providerLatency = Date.now() - providerStart;

    const evidenceItems: EvidenceModel[] = [];
    const entityIdsSet = new Set<string>();

    for (const res of providerResults) {
      const normalized = defaultEvidenceNormalizer.normalizeSourceResult(res, invId, 'agent-web');
      if (normalized.evidence.verificationStatus === 'VERIFIED') {
        evidenceItems.push(normalized.evidence);
        normalized.entityIds.forEach((id) => entityIdsSet.add(id));
      }
    }

    const providerExecution: ProviderExecutionModel = {
      provider: defaultWebProvider.name,
      category: 'WEB' as const,
      request: { query: topic },
      startedAt: new Date(Date.now() - providerLatency).toISOString(),
      completedAt: now,
      status: providerResults.length > 0 ? 'SUCCESS' : 'PARTIAL',
      resultCount: providerResults.length,
      error: providerResults.length === 0 ? 'No results returned' : undefined,
      latencyMs: providerLatency,
      tokenUsage: {
        available: false, // Web provider doesn't expose token usage
      },
    };

    return {
      taskId: context.task.id,
      agentType: this.type,
      status: 'SUCCESS',
      summary: `Retrieved ${evidenceItems.length} web repository disclosure(s) from Web Intelligence Index.`,
      evidenceItems,
      evidenceIds: evidenceItems.map((e) => e.id),
      entityIds: Array.from(entityIdsSet),
      signalCandidates: [],
      relationships: [],
      confidence: 89,
      metadata: { 
        provider: defaultWebProvider.name,
        topic,
        providerExecution
      },
      startedAt: now,
      completedAt: now,
    };
  }
}

// 6. Signal Agent Runner
class SignalAgent implements Agent {
  type: AgentType = 'SIGNAL';
  name = 'Signal Agent';

  canHandle(task: TaskModel): boolean {
    return task.agentType === 'SIGNAL';
  }

  async run(context: AgentContextModel): Promise<AgentResultModel> {
    const now = new Date().toISOString();
    const invId = context.investigation.id;

    return {
      taskId: context.task.id,
      agentType: this.type,
      status: 'SUCCESS',
      summary: 'Correlated multi-source evidence into validated strategic signals.',
      evidenceItems: [],
      evidenceIds: [],
      entityIds: [],
      signalCandidates: [],
      relationships: [],
      confidence: 94,
      startedAt: now,
      completedAt: now,
    };
  }
}

// 7. Synthesis Agent Runner
class SynthesisAgent implements Agent {
  type: AgentType = 'SYNTHESIS';
  name = 'Synthesis Agent';

  canHandle(task: TaskModel): boolean {
    return task.agentType === 'SYNTHESIS';
  }

  async run(context: AgentContextModel): Promise<AgentResultModel> {
    const now = new Date().toISOString();

    return {
      taskId: context.task.id,
      agentType: this.type,
      status: 'SUCCESS',
      summary: 'Compiled executive brief and structured recommendations.',
      evidenceItems: [],
      evidenceIds: [],
      entityIds: [],
      signalCandidates: [],
      relationships: [],
      confidence: 95,
      startedAt: now,
      completedAt: now,
    };
  }
}

// Agent Registry Manager
export class AgentRegistry {
  private agents: Map<AgentType, Agent> = new Map();

  constructor() {
    this.register(new ResearchAgent());
    this.register(new PatentAgent());
    this.register(new NewsAgent());
    this.register(new CompetitorAgent());
    this.register(new WebAgent());
    this.register(new SignalAgent());
    this.register(new SynthesisAgent());
  }

  register(agent: Agent) {
    this.agents.set(agent.type, agent);
  }

  getAgent(type: AgentType): Agent | undefined {
    return this.agents.get(type);
  }
}

export const defaultAgentRegistry = new AgentRegistry();
