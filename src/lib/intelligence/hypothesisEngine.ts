import {
  InvestigationModel,
  EvidenceModel,
  ClaimModel,
  ContradictionModel,
  HypothesisModel,
  HypothesisStatus,
  VerificationTaskRequest,
  AgentType,
  PriorityLevel,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { defaultLLMProvider } from '@/lib/orchestrator/llmProvider';

export class HypothesisEngine {
  /**
   * Derives hypotheses from the investigation objective and collected claims/evidence.
   */
  async deriveHypotheses(
    investigation: InvestigationModel,
    evidence: EvidenceModel[],
    claims: ClaimModel[]
  ): Promise<HypothesisModel[]> {
    const existing = await dbRepository.getHypothesesByInvestigationId(investigation.id);
    if (existing.length > 0) {
      return existing;
    }

    const hypothesesToCreate: Array<{ statement: string; candidateAgent: AgentType }> = [];
    const obj = investigation.objective;
    const entity = investigation.primaryEntities[0] || investigation.title;
    const tech = investigation.technology || 'core technology';

    // Rule-based derivation of primary hypotheses
    hypothesesToCreate.push({
      statement: `${entity} is accelerating R&D investment and patent filings in ${tech}.`,
      candidateAgent: 'PATENT',
    });

    hypothesesToCreate.push({
      statement: `${entity} faces direct competitive threats from custom ASIC/silicon shifts in enterprise markets.`,
      candidateAgent: 'COMPETITOR',
    });

    if (obj.toLowerCase().includes('market') || obj.toLowerCase().includes('inference') || obj.toLowerCase().includes('share')) {
      hypothesesToCreate.push({
        statement: `${entity} maintains market dominance in AI inference workloads despite emerging alternative architectures.`,
        candidateAgent: 'RESEARCH',
      });
    }

    const created: HypothesisModel[] = [];
    for (const item of hypothesesToCreate) {
      // Find initial supporting/contradicting evidence
      const supporting = evidence
        .filter((e) =>
          e.summary.toLowerCase().includes(entity.toLowerCase()) ||
          e.title.toLowerCase().includes(tech.toLowerCase())
        )
        .map((e) => e.id);

      const hyp = await dbRepository.createHypothesis({
        investigationId: investigation.id,
        statement: item.statement,
        supportingEvidenceIds: supporting,
        contradictingEvidenceIds: [],
        confidence: supporting.length > 0 ? Math.min(85, 45 + supporting.length * 10) : 40,
        status: supporting.length >= 2 ? 'PARTIALLY_SUPPORTED' : 'UNRESOLVED',
        verificationTasks: [],
      });
      created.push(hyp);
    }

    return created;
  }

  /**
   * Evaluates all hypotheses against the evidence base and contradiction set.
   */
  async evaluateHypotheses(
    investigationId: string,
    evidence: EvidenceModel[],
    claims: ClaimModel[],
    contradictions: ContradictionModel[]
  ): Promise<HypothesisModel[]> {
    const hypotheses = await dbRepository.getHypothesesByInvestigationId(investigationId);
    const updatedHypotheses: HypothesisModel[] = [];

    for (const hyp of hypotheses) {
      const updated = await this.evaluateSingleHypothesis(hyp, evidence, claims, contradictions);
      updatedHypotheses.push(updated);
    }

    return updatedHypotheses;
  }

  /**
   * Evaluates a single hypothesis and updates its status + confidence.
   */
  private async evaluateSingleHypothesis(
    hypothesis: HypothesisModel,
    evidence: EvidenceModel[],
    claims: ClaimModel[],
    contradictions: ContradictionModel[]
  ): Promise<HypothesisModel> {
    const stmtLower = hypothesis.statement.toLowerCase();

    // Match supporting evidence
    const supportingEvidence = evidence.filter((e) => {
      const titleMatch = e.title.toLowerCase().split(' ').some((w) => w.length > 4 && stmtLower.includes(w));
      const summaryMatch = e.summary.toLowerCase().split(' ').some((w) => w.length > 5 && stmtLower.includes(w));
      return titleMatch || summaryMatch;
    });

    // Match contradicting evidence or unresolved contradictions
    const contradictingEvidence = evidence.filter((e) => {
      const claimMatch = claims.find(
        (c) => c.supportingEvidenceIds.includes(e.id) && c.status === 'CONTRADICTED'
      );
      return !!claimMatch;
    });

    const suppIds = [...new Set(supportingEvidence.map((e) => e.id))];
    const contraIds = [...new Set(contradictingEvidence.map((e) => e.id))];

    // Source quality & diversity checks
    const providers = new Set(supportingEvidence.map((e) => e.provenance?.provider || e.source));
    const hasPrimarySource = supportingEvidence.some(
      (e) => e.sourceType === 'PATENT' || e.provenance?.peerReviewed || e.provenance?.officialAnnouncement
    );

    let status: HypothesisStatus = 'UNRESOLVED';
    let confidence = 50;

    if (contraIds.length > 0 && contraIds.length >= suppIds.length) {
      status = 'CONTRADICTED';
      confidence = Math.max(15, 60 - contraIds.length * 15);
    } else if (suppIds.length >= 3 && providers.size >= 2 && hasPrimarySource) {
      status = 'SUPPORTED';
      confidence = Math.min(95, 75 + suppIds.length * 5);
    } else if (suppIds.length >= 1) {
      status = 'PARTIALLY_SUPPORTED';
      confidence = Math.min(75, 45 + suppIds.length * 10);
    } else {
      status = 'UNSUPPORTED';
      confidence = 30;
    }

    const updated = await dbRepository.updateHypothesis(hypothesis.id, {
      supportingEvidenceIds: suppIds,
      contradictingEvidenceIds: contraIds,
      status,
      confidence,
    });

    return updated || hypothesis;
  }

  /**
   * Generates structured verification task requests for hypotheses requiring additional evidence.
   */
  async generateVerificationRequests(
    investigationId: string,
    hypotheses: HypothesisModel[],
    evidence: EvidenceModel[],
    resourceIteration: number,
    maxIterations: number
  ): Promise<VerificationTaskRequest[]> {
    const requests: VerificationTaskRequest[] = [];
    const presentSources = new Set(evidence.map((e) => e.sourceType));

    for (const hyp of hypotheses) {
      if (hyp.status === 'SUPPORTED' && hyp.confidence >= 80) {
        continue; // No verification required
      }

      // Determine missing evidence stream for this hypothesis
      let missingType: AgentType = 'RESEARCH';
      let reason = '';
      let infoGain: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

      if (hyp.statement.toLowerCase().includes('patent') && !presentSources.has('PATENT')) {
        missingType = 'PATENT';
        reason = `Hypothesis relies on patent activity but primary USPTO evidence is missing.`;
        infoGain = 'HIGH';
      } else if (
        (hyp.statement.toLowerCase().includes('competitor') || hyp.statement.toLowerCase().includes('asic')) &&
        !presentSources.has('COMPETITOR')
      ) {
        missingType = 'COMPETITOR';
        reason = `Hypothesis involves competitive silicon shifts without direct corporate disclosures.`;
        infoGain = 'HIGH';
      } else if (hyp.status === 'CONTRADICTED') {
        missingType = 'WEB';
        reason = `Hypothesis is contradicted; third-party web corroboration required to resolve.`;
        infoGain = 'HIGH';
      } else if (hyp.status === 'UNSUPPORTED' || hyp.status === 'UNRESOLVED') {
        missingType = presentSources.has('RESEARCH') ? 'NEWS' : 'RESEARCH';
        reason = `Hypothesis lacks sufficient evidence to evaluate (${hyp.supportingEvidenceIds.length} supporting items).`;
        infoGain = resourceIteration < maxIterations - 1 ? 'MEDIUM' : 'LOW';
      }

      // Information-gain gate: only create request if info gain is HIGH or MEDIUM
      if (infoGain !== 'LOW') {
        const priority: PriorityLevel = infoGain === 'HIGH' ? 'HIGH' : 'MEDIUM';

        const req = await dbRepository.createVerificationRequest({
          investigationId,
          hypothesisId: hyp.id,
          description: `VERIFY: ${hyp.statement.slice(0, 60)}...`,
          missingEvidenceType: missingType,
          priority,
          reason,
          informationGain: infoGain,
        });

        // Link request to hypothesis
        await dbRepository.updateHypothesis(hyp.id, {
          verificationTasks: [...hyp.verificationTasks, req.id],
        });

        requests.push(req);
      }
    }

    return requests;
  }
}

export const defaultHypothesisEngine = new HypothesisEngine();
