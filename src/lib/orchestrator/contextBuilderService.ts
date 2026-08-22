import {
  AgentType,
  AgentContextModel,
  AgentResultModel,
  AgentStepMemoryModel,
  EvidenceModel,
  EntityModel,
  InvestigationModel,
  MissionModel,
  TaskModel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

// Tool name mapping for human-readable step records
const AGENT_TOOL_MAP: Record<AgentType, string> = {
  RESEARCH: 'Crossref REST API',
  PATENT: 'USPTO Patent Data Index',
  NEWS: 'Industry News Index',
  COMPETITOR: 'Industry News Index (Competitive)',
  WEB: 'Web Intelligence Index',
  SIGNAL: 'Signal Correlation Engine',
  SYNTHESIS: 'Gemini AI Synthesis Engine',
  ORCHESTRATOR: 'Mission Planner',
};

const AGENT_NAME_MAP: Record<AgentType, string> = {
  RESEARCH: 'Research Agent',
  PATENT: 'Patent Agent',
  NEWS: 'News Agent',
  COMPETITOR: 'Competitor Intelligence Agent',
  WEB: 'Web Intelligence Agent',
  SIGNAL: 'Signal Discovery Agent',
  SYNTHESIS: 'Executive Synthesis Agent',
  ORCHESTRATOR: 'Master Orchestrator',
};

class ContextBuilderService {
  /**
   * Build a compact, agent-relevant AgentContextModel before agent execution.
   * Injects relevant prior findings and open questions — not the full raw evidence list.
   */
  async buildAgentContext(
    investigation: InvestigationModel,
    mission: MissionModel,
    task: TaskModel,
    agentType: AgentType
  ): Promise<AgentContextModel> {
    // Retrieve memory-filtered context for this specific agent type
    const relevantCtx = await dbRepository.getRelevantContext(investigation.id, agentType);

    // Enrich the investigation object with resolved context for agent use
    const enrichedInvestigation: InvestigationModel = {
      ...investigation,
      // Inject remembered prior findings into strategicQuestion so agents can read them
      strategicQuestion: this.buildEnrichedObjective(investigation, relevantCtx),
    };

    // Load only important evidence items (not all raw evidence)
    let contextEvidence: EvidenceModel[] = [];
    if (relevantCtx.importantEvidenceIds.length > 0) {
      const allEvidence = await dbRepository.getEvidenceByInvestigationId(investigation.id);
      // Filter to important items only + cap at 8 items to avoid context bloat
      const importantSet = new Set(relevantCtx.importantEvidenceIds);
      contextEvidence = allEvidence
        .filter((e) => importantSet.has(e.id))
        .slice(0, 8);
    } else {
      // First agent: no important evidence yet — pass the last 5 items if any
      const allEvidence = await dbRepository.getEvidenceByInvestigationId(investigation.id);
      contextEvidence = allEvidence.slice(0, 5);
    }

    // Only pass entities relevant to this agent type
    const allEntities = await dbRepository.getEntitiesByInvestigationId(investigation.id);
    const relevantEntities = this.filterEntitiesForAgent(allEntities, agentType);

    return {
      investigation: enrichedInvestigation,
      mission,
      task,
      previousEvidence: contextEvidence,
      relevantEntities,
      previousResults: [],
      timeHorizon: investigation.timeHorizon,
      priority: investigation.priority,
    };
  }

  /**
   * Evaluate whether an evidence item is important enough for long-term memory.
   * Returns isImportant: true only for high-signal items.
   */
  evaluateEvidenceImportance(
    evidence: EvidenceModel,
    _investigation: InvestigationModel
  ): { isImportant: boolean; reason: string; confidence: number } {
    // Criterion 1: High relevance or confidence score
    if (evidence.relevanceScore >= 0.85 || evidence.confidence >= 90) {
      return {
        isImportant: true,
        reason: `High signal evidence (relevance: ${evidence.relevanceScore}, confidence: ${evidence.confidence})`,
        confidence: evidence.confidence,
      };
    }

    // Criterion 2: Structural source types that are always high-signal
    if (evidence.sourceType === 'PATENT' || evidence.sourceType === 'REGULATORY') {
      return {
        isImportant: true,
        reason: `Primary source type: ${evidence.sourceType}`,
        confidence: evidence.confidence,
      };
    }

    // Criterion 3: Research with DOI is high quality
    if (evidence.sourceType === 'RESEARCH' && evidence.doi && evidence.doi.length > 0) {
      return {
        isImportant: true,
        reason: 'Peer-reviewed research with verified DOI',
        confidence: evidence.confidence,
      };
    }

    // Default: evidence only — store but don't flag as important memory
    return {
      isImportant: false,
      reason: 'Standard evidence item — stored but not elevated to long-term memory',
      confidence: evidence.confidence,
    };
  }

  /**
   * Build a compressed Gemini context string for synthesis — prevents context-window bloat.
   * Includes: objective + entities + key findings (top 5) + open questions — NOT raw evidence.
   */
  buildGeminiContext(memory: {
    objective: string;
    targetEntity: string;
    technology: string;
    keyFindings: string[];
    openQuestions: string[];
    keyEntities: string[];
    totalEvidenceCount: number;
  }): string {
    const findings = memory.keyFindings
      .slice(0, 5)
      .map((f, i) => `  ${i + 1}. ${f}`)
      .join('\n');

    const questions = memory.openQuestions
      .slice(0, 3)
      .map((q, i) => `  ${i + 1}. ${q}`)
      .join('\n');

    const entities = memory.keyEntities.slice(0, 6).join(', ');

    return [
      `=== INVESTIGATION CONTEXT (MEMORY-COMPRESSED) ===`,
      `Objective: ${memory.objective}`,
      `Target Entity: ${memory.targetEntity}`,
      `Technology Domain: ${memory.technology}`,
      `Evidence Collected: ${memory.totalEvidenceCount} items`,
      ``,
      `KEY ENTITIES: ${entities || 'None identified yet'}`,
      ``,
      `KEY FINDINGS (most important):`,
      findings || '  (none yet)',
      ``,
      `OPEN QUESTIONS:`,
      questions || '  (none)',
      `=== END CONTEXT ===`,
    ].join('\n');
  }

  /**
   * Record an agent execution step into persistent memory (MongoDB via repository).
   */
  async recordAgentStep(
    investigationId: string,
    missionId: string,
    task: TaskModel,
    result: AgentResultModel,
    importantEvidenceIds: string[],
    priorFindingsCount: number,
    openQuestionsCount: number,
    targetEntity: string,
    objective: string
  ): Promise<AgentStepMemoryModel> {
    const step: AgentStepMemoryModel = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId,
      missionId,
      taskId: task.id,
      agentType: result.agentType,
      agentName: AGENT_NAME_MAP[result.agentType] || result.agentType,
      phase: this.getPhaseForAgent(result.agentType),
      input: {
        objective,
        targetEntity,
        priorFindingsCount,
        openQuestionsCount,
      },
      action: task.description,
      toolUsed: AGENT_TOOL_MAP[result.agentType] || 'Internal Engine',
      result: result.summary,
      importantFindings: this.extractImportantFindings(result),
      importantEvidenceIds,
      evidenceIds: result.evidenceIds,
      confidence: result.confidence,
      timestamp: result.completedAt,
    };

    await dbRepository.appendAgentStep(step);
    return step;
  }

  /**
   * Update the investigation long-term memory summary after an agent completes.
   * Extracts key findings from evidence items and recalculates open questions.
   */
  async updateInvestigationMemory(
    investigationId: string,
    investigation: InvestigationModel,
    completedAgentType: AgentType,
    newEvidenceItems: EvidenceModel[]
  ): Promise<void> {
    const existingMem = await dbRepository.getInvestigationMemory(investigationId);
    if (!existingMem) return;

    const allEvidence = await dbRepository.getEvidenceByInvestigationId(investigationId);

    // Extract new important evidence IDs from this batch
    const newImportantIds = newEvidenceItems
      .filter((e) => this.evaluateEvidenceImportance(e, investigation).isImportant)
      .map((e) => e.id);

    // Merge with existing important evidence IDs (deduplicated)
    const mergedImportantIds = Array.from(
      new Set([...existingMem.importantEvidenceIds, ...newImportantIds])
    );

    // Build key findings from important evidence titles (top-level summaries)
    const importantEvidence = allEvidence.filter((e) =>
      mergedImportantIds.includes(e.id)
    );
    const newKeyFindings = importantEvidence
      .slice(0, 8)
      .map((e) => `[${e.sourceType}] ${e.title}: ${e.summary.substring(0, 120)}...`);

    // Extract key entities from evidence entity IDs
    const entityIds = new Set<string>();
    importantEvidence.forEach((e) => e.entityIds?.forEach((id) => entityIds.add(id)));

    // Derive open questions from knowledge gaps
    const gaps = await dbRepository.getKnowledgeGapsByInvestigationId(investigationId);
    const openQuestions = gaps
      .filter((g) => g.status === 'OPEN' || g.status === 'INVESTIGATING')
      .map((g) => g.description)
      .slice(0, 5);

    // Determine context status based on how many agents have completed
    const completedCount = existingMem.completedAgents.length;
    let contextStatus: typeof existingMem.contextStatus = 'BUILDING';
    if (completedCount >= 2) contextStatus = 'ACTIVE';
    if (completedCount >= 4) contextStatus = 'OPTIMIZED';
    if (completedAgentType === 'SYNTHESIS') contextStatus = 'COMPLETE';

    await dbRepository.updateMemorySummary(investigationId, {
      keyFindings: newKeyFindings,
      openQuestions,
      importantEvidenceIds: mergedImportantIds,
      keyEntities: Array.from(entityIds).slice(0, 10),
      totalEvidenceCount: allEvidence.length,
      contextStatus,
    });
  }

  // --- Private helpers ---

  private buildEnrichedObjective(
    investigation: InvestigationModel,
    relevantCtx: {
      objective: string;
      targetEntity: string;
      keyFindings: string[];
      openQuestions: string[];
      parentContext?: { keyFindings: string[]; keyEntities: string[] };
    }
  ): string {
    const parts: string[] = [
      investigation.objective || investigation.title,
    ];

    if (relevantCtx.keyFindings.length > 0) {
      parts.push(`\nPRIOR FINDINGS: ${relevantCtx.keyFindings.slice(0, 3).join(' | ')}`);
    }

    if (relevantCtx.openQuestions.length > 0) {
      parts.push(`\nOPEN QUESTIONS: ${relevantCtx.openQuestions.slice(0, 2).join(' | ')}`);
    }

    if (relevantCtx.parentContext?.keyFindings.length) {
      parts.push(`\nPARENT INVESTIGATION CONTEXT: ${relevantCtx.parentContext.keyFindings.slice(0, 2).join(' | ')}`);
    }

    return parts.join('');
  }

  private filterEntitiesForAgent(entities: EntityModel[], agentType: AgentType): EntityModel[] {
    // Patent agents focus on company + patent entities
    if (agentType === 'PATENT') {
      return entities.filter((e) => e.type === 'COMPANY' || e.type === 'PATENT').slice(0, 5);
    }
    // News/Competitor agents focus on company + market entities
    if (agentType === 'NEWS' || agentType === 'COMPETITOR') {
      return entities.filter((e) => e.type === 'COMPANY' || e.type === 'MARKET' || e.type === 'COMPETITOR').slice(0, 5);
    }
    // Research + Web: technology entities
    if (agentType === 'RESEARCH' || agentType === 'WEB') {
      return entities.filter((e) => e.type === 'TECHNOLOGY' || e.type === 'RESEARCH_TOPIC').slice(0, 5);
    }
    // Synthesis: all entities up to 10
    return entities.slice(0, 10);
  }

  private getPhaseForAgent(agentType: AgentType): import('@/lib/types').MissionPhase {
    const phaseMap: Record<AgentType, import('@/lib/types').MissionPhase> = {
      ORCHESTRATOR: 'PLANNING',
      RESEARCH: 'DISCOVERY',
      PATENT: 'INVESTIGATION',
      NEWS: 'INVESTIGATION',
      COMPETITOR: 'INVESTIGATION',
      WEB: 'INVESTIGATION',
      SIGNAL: 'CORRELATION',
      SYNTHESIS: 'SYNTHESIS',
    };
    return phaseMap[agentType] || 'DISCOVERY';
  }

  private extractImportantFindings(result: AgentResultModel): string[] {
    const findings: string[] = [];

    // Top evidence titles become important findings
    const topEvidence = result.evidenceItems
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    for (const ev of topEvidence) {
      findings.push(`${ev.title} (confidence: ${ev.confidence}%)`);
    }

    // Fallback to summary if no evidence
    if (findings.length === 0 && result.summary) {
      findings.push(result.summary);
    }

    return findings;
  }
}

export const defaultContextBuilderService = new ContextBuilderService();
