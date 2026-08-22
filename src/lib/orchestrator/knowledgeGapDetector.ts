import { EvidenceModel, KnowledgeGapModel, InvestigationModel, TaskModel, AgentType } from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

export class KnowledgeGapDetector {
  async detectAndSyncGaps(
    investigation: InvestigationModel,
    evidence: EvidenceModel[]
  ): Promise<KnowledgeGapModel[]> {
    const existingGaps = await dbRepository.getKnowledgeGapsByInvestigationId(investigation.id);
    const newGaps: KnowledgeGapModel[] = [];

    // Analyze evidence by source types
    const sourcesPresent = new Set(evidence.map((e) => e.sourceType));
    const objLower = (investigation.objective + ' ' + (investigation.technology || '')).toLowerCase();

    // 1. Check for Patent Gap if objective touches patents, hardware, chips, code models, or enterprise tech
    const needsPatents = objLower.includes('patent') || objLower.includes('ip') || objLower.includes('chip') || objLower.includes('model') || objLower.includes('ai') || objLower.includes('assistant');
    if (needsPatents && !sourcesPresent.has('PATENT')) {
      const gapExist = existingGaps.find((g) => g.description.toLowerCase().includes('patent'));
      if (!gapExist) {
        const gap = await dbRepository.createKnowledgeGap({
          investigationId: investigation.id,
          description: `Patent disclosures and USPTO filings for ${investigation.technology || 'target technology'} are unverified.`,
          importance: 'HIGH',
          confidence: 45,
          evidenceNeeded: ['USPTO patent abstract', 'Patent filing date', 'Assignee entity'],
          candidateAgents: ['PATENT'],
          status: 'OPEN',
        });
        newGaps.push(gap);
      }
    }

    // 2. Check for Competitor / Financial Gap
    const needsCompetitor = objLower.includes('competitor') || objLower.includes('landscape') || objLower.includes('market') || objLower.includes('disrupt');
    if (needsCompetitor && !sourcesPresent.has('COMPETITOR')) {
      const gapExist = existingGaps.find((g) => g.description.toLowerCase().includes('competitor') || g.description.toLowerCase().includes('sec'));
      if (!gapExist) {
        const gap = await dbRepository.createKnowledgeGap({
          investigationId: investigation.id,
          description: `Strategic SEC filings and official corporate roadmap announcements remain unconfirmed.`,
          importance: 'HIGH',
          confidence: 50,
          evidenceNeeded: ['SEC 10-Q filing extract', 'Executive leadership statement'],
          candidateAgents: ['COMPETITOR'],
          status: 'OPEN',
        });
        newGaps.push(gap);
      }
    }

    // 3. Check for Web Validation Gap if evidence count is low
    if (evidence.length < 5 && !sourcesPresent.has('WEB')) {
      const gapExist = existingGaps.find((g) => g.description.toLowerCase().includes('web') || g.description.toLowerCase().includes('open-source'));
      if (!gapExist) {
        const gap = await dbRepository.createKnowledgeGap({
          investigationId: investigation.id,
          description: `Open-source codebase velocity and live web documentation have not been validated.`,
          importance: 'MEDIUM',
          confidence: 60,
          evidenceNeeded: ['GitHub repository star/commit velocity', 'Official web docs URL'],
          candidateAgents: ['WEB'],
          status: 'OPEN',
        });
        newGaps.push(gap);
      }
    }

    // Resolve gaps if evidence now exists
    for (const gap of existingGaps) {
      if (gap.status === 'OPEN' || gap.status === 'INVESTIGATING') {
        const candidateSatisfied = gap.candidateAgents.some((agent) => {
          const typeMap: Record<AgentType, string> = {
            RESEARCH: 'RESEARCH',
            PATENT: 'PATENT',
            NEWS: 'NEWS',
            COMPETITOR: 'COMPETITOR',
            WEB: 'WEB',
            SIGNAL: 'PUBLIC_DATA',
            ORCHESTRATOR: 'PUBLIC_DATA',
            SYNTHESIS: 'PUBLIC_DATA',
          };
          return sourcesPresent.has(typeMap[agent] as any);
        });

        if (candidateSatisfied) {
          await dbRepository.updateKnowledgeGap(gap.id, {
            status: 'RESOLVED',
            resolvedAt: new Date().toISOString(),
            confidence: 90,
          });
        }
      }
    }

    return dbRepository.getKnowledgeGapsByInvestigationId(investigation.id);
  }

  generateFollowupTaskForGap(gap: KnowledgeGapModel, missionId: string, investigationId: string, currentTaskCount: number): TaskModel | null {
    if (gap.status !== 'OPEN') return null;

    const agentType = gap.candidateAgents[0] || 'RESEARCH';
    const taskId = `${agentType}-GAP-${currentTaskCount + 1}`;

    return {
      id: taskId,
      missionId,
      investigationId,
      agentType,
      title: `Autonomous Resolve Gap: ${gap.description.substring(0, 50)}...`,
      description: `Targeted investigation to resolve open knowledge gap: ${gap.description}`,
      status: 'QUEUED',
      priority: gap.importance === 'HIGH' ? 'HIGH' : 'MEDIUM',
      dependencies: [],
      input: { gapId: gap.id, evidenceNeeded: gap.evidenceNeeded },
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 2,
    };
  }
}

export const defaultKnowledgeGapDetector = new KnowledgeGapDetector();
