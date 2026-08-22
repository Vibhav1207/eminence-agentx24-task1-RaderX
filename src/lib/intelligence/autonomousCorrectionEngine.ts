import {
  SelfEvaluationResult,
  ConclusionVersion,
  HypothesisModel,
  TaskModel,
  VerificationTaskRequest,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

export class AutonomousCorrectionEngine {
  /**
   * Evaluates the current conclusion against self-evaluation findings.
   * If overclaiming, underclaiming, or unverified assertions exist, autonomously revises the conclusion
   * and creates a versioned ConclusionVersion record.
   */
  async correctConclusion(
    investigationId: string,
    currentConclusion: string,
    evaluation: SelfEvaluationResult,
    hypotheses: HypothesisModel[]
  ): Promise<{ revised: string; changed: boolean; version?: ConclusionVersion; reason: string }> {
    const existingVersions = await dbRepository.getConclusionVersionsByInvestigationId(investigationId);
    
    // If no versions exist yet, record V1 (initial formulation)
    if (existingVersions.length === 0) {
      await dbRepository.createConclusionVersion({
        investigationId,
        version: 1,
        conclusion: currentConclusion,
        confidence: evaluation.confidence,
        evaluationId: evaluation.id,
        reason: 'Initial baseline conclusion formulation',
      });
    }

    let revised = currentConclusion;
    let changed = false;
    let reason = '';

    const isOverclaiming =
      (currentConclusion.toLowerCase().includes('definitely') ||
        currentConclusion.toLowerCase().includes('dominates') ||
        currentConclusion.toLowerCase().includes('guaranteed')) &&
      (evaluation.overallStatus === 'NEEDS_VERIFICATION' ||
        evaluation.overallStatus === 'REPLAN_REQUIRED' ||
        evaluation.overallStatus === 'INSUFFICIENT_EVIDENCE' ||
        evaluation.evidenceCoverage < 80);

    const hasContradictions = evaluation.conflicts.length > 0 || hypotheses.some((h) => h.status === 'CONTRADICTED');
    const hasUnsupportedAssumptions = evaluation.unverifiedAssumptions.length > 0;

    if (hasContradictions) {
      revised = currentConclusion.replace(
        /is accelerating|is dominating|definitely|leads/gi,
        'shows competitive activity, though active evidence conflicts remain unresolved regarding'
      );
      if (!revised.includes('unresolved')) {
        revised += ' Note: Unresolved evidence contradictions were detected during self-evaluation.';
      }
      changed = true;
      reason = 'Self-evaluation detected active evidence contradictions; conclusion hedged to reflect uncertainty.';
    } else if (isOverclaiming) {
      revised = currentConclusion
        .replace(/definitely /gi, 'available evidence suggests ')
        .replace(/dominates/gi, 'is actively expanding in')
        .replace(/guaranteed/gi, 'indicated by primary filings');
      
      if (evaluation.unsupportedClaims.length > 0) {
        revised += ` Note: Market-share growth remains unverified due to missing direct financial disclosures (${evaluation.unsupportedClaims.length} unsupported claim(s)).`;
      }
      changed = true;
      reason = `Self-evaluation detected overclaiming with evidence coverage at ${evaluation.evidenceCoverage}%. Reworded to align with verified evidence.`;
    } else if (hasUnsupportedAssumptions && evaluation.evidenceCoverage < 70) {
      revised += ` (Self-Evaluation Note: ${evaluation.unverifiedAssumptions.length} assumption(s) labeled as speculative pending further verification).`;
      changed = true;
      reason = 'Inferential assumptions detected without direct evidence support; added qualification.';
    }

    if (changed && revised !== currentConclusion) {
      const updatedVersions = await dbRepository.getConclusionVersionsByInvestigationId(investigationId);
      const nextVersionNum = updatedVersions.length + 1;
      const versionRecord = await dbRepository.createConclusionVersion({
        investigationId,
        version: nextVersionNum,
        conclusion: revised,
        confidence: evaluation.confidence,
        evaluationId: evaluation.id,
        reason,
      });

      return {
        revised,
        changed: true,
        version: versionRecord,
        reason,
      };
    }

    return {
      revised: currentConclusion,
      changed: false,
      reason: 'Conclusion matches self-evaluation evidence confidence bounds.',
    };
  }

  /**
   * Determines whether autonomous replanning should occur based on self-evaluation, budget, and information gain.
   */
  shouldReplan(
    evaluation: SelfEvaluationResult,
    verificationRequests: VerificationTaskRequest[],
    iterationCount: number,
    maxIterations: number
  ): { replan: boolean; reason: string } {
    // Hard loop limit check
    if (iterationCount >= maxIterations) {
      return {
        replan: false,
        reason: `Maximum evaluation/reasoning iterations (${maxIterations}) reached. Halting autonomous replanning to respect resource budget.`,
      };
    }

    // Pass condition
    if (evaluation.overallStatus === 'PASS') {
      return {
        replan: false,
        reason: 'Self-evaluation passed all evidence coverage and confidence thresholds.',
      };
    }

    // Check if there are actionable verification requests with HIGH or MEDIUM info gain
    const actionableRequests = verificationRequests.filter((r) => r.informationGain !== 'LOW');
    if (actionableRequests.length === 0) {
      return {
        replan: false,
        reason: 'Remaining uncertainties have LOW information gain. Additional research is not worth the resource cost.',
      };
    }

    return {
      replan: true,
      reason: `Self-evaluation status "${evaluation.overallStatus}" with ${actionableRequests.length} actionable high-value verification request(s).`,
    };
  }

  /**
   * Converts verification task requests into concrete executable TaskModel objects for the LangGraph planner.
   */
  createVerificationTasks(
    investigationId: string,
    missionId: string,
    requests: VerificationTaskRequest[],
    existingTaskCount: number
  ): TaskModel[] {
    const now = new Date().toISOString();
    return requests.map((req, idx) => ({
      id: `task-verify-${Date.now()}-${idx + 1}`,
      missionId,
      investigationId,
      agentType: req.missingEvidenceType,
      title: `AUTONOMOUS VERIFICATION: ${req.description}`,
      description: `${req.reason} Target: resolve hypothesis gap.`,
      status: 'QUEUED',
      priority: req.priority,
      dependencies: [],
      input: {
        hypothesisId: req.hypothesisId,
        purpose: 'hypothesis_verification',
        whyThisTask: req.reason,
        infoGain: req.informationGain,
      },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 2,
      whyThisTask: req.reason,
      infoGain: req.informationGain,
      verificationRequired: true,
    }));
  }
}

export const defaultAutonomousCorrectionEngine = new AutonomousCorrectionEngine();
