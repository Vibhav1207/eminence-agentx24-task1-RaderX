import {
  EvidenceModel,
  ClaimModel,
  ContradictionModel,
  HypothesisModel,
  ClaimEvaluation,
  SelfEvaluationResult,
  SelfEvaluationStatus,
  EvidenceStrength,
  AssumptionLabel,
  SourceType,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

export class SelfEvaluationEngine {
  /**
   * Evaluates the investigation evidence base, claims, and contradictions.
   * Produces a structured SelfEvaluationResult with deterministic metrics.
   */
  async evaluateInvestigation(
    investigationId: string,
    evidence: EvidenceModel[],
    claims: ClaimModel[],
    contradictions: ContradictionModel[],
    hypotheses: HypothesisModel[],
    iterationNumber: number = 1
  ): Promise<SelfEvaluationResult> {
    const now = new Date().toISOString();

    // 1. Evaluate each individual claim
    const claimEvaluations: ClaimEvaluation[] = claims.map((claim) =>
      this.evaluateSingleClaim(claim, evidence, contradictions)
    );

    const totalMajorClaims = claims.length;
    const supportedClaimsCount = claimEvaluations.filter(
      (c) => c.status === 'SUPPORTED'
    ).length;
    const partiallySupportedCount = claimEvaluations.filter(
      (c) => c.status === 'PARTIALLY_SUPPORTED'
    ).length;

    // 2. Compute evidence coverage percentage deterministically
    // Formula: (supported + 0.5 * partiallySupported) / total * 100
    const evidenceCoverage =
      totalMajorClaims > 0
        ? Math.round(
            ((supportedClaimsCount + 0.5 * partiallySupportedCount) /
              totalMajorClaims) *
              100
          )
        : evidence.length > 0
        ? 60
        : 0;

    // 3. Extract unsupported claims & unverified assumptions
    const unsupportedClaims = claimEvaluations
      .filter((c) => c.status === 'INSUFFICIENT_EVIDENCE' || c.status === 'UNRESOLVED')
      .map((c) => c.statement);

    const unverifiedAssumptions = claimEvaluations
      .filter((c) => c.isAssumption && (c.assumptionLabel === 'SPECULATIVE' || c.assumptionLabel === 'UNSUPPORTED'))
      .map((c) => c.statement);

    // 4. Identify active unresolved conflicts
    const unresolvedConflicts = contradictions
      .filter((c) => c.status === 'UNRESOLVED')
      .map((c) => c.id);

    // 5. Determine Missing Evidence Descriptions & Required Actions
    const missingEvidence: string[] = [];
    const recommendedActions: string[] = [];

    const presentSourceTypes = new Set(evidence.map((e) => e.sourceType));
    if (!presentSourceTypes.has('PATENT')) {
      missingEvidence.push('Primary USPTO patent filings and IP claims');
      recommendedActions.push('Execute PATENT research to verify IP claim velocity');
    }
    if (!presentSourceTypes.has('COMPETITOR') && !presentSourceTypes.has('PUBLIC_DATA')) {
      missingEvidence.push('Official SEC filings and competitor capex disclosures');
      recommendedActions.push('Execute COMPETITOR filing review to confirm financial capex');
    }
    if (!presentSourceTypes.has('NEWS')) {
      missingEvidence.push('Secondary news disclosures and press reports');
    }

    if (unsupportedClaims.length > 0) {
      missingEvidence.push(
        `Direct primary evidence for ${unsupportedClaims.length} major claim(s)`
      );
      recommendedActions.push(
        `Generate verification tasks for unsupported claims: "${unsupportedClaims[0].slice(0, 50)}..."`
      );
    }

    // 6. Calculate Overall Evidence Strength
    const evidenceStrength = this.calculateEvidenceStrength(evidence);

    // 7. Compute Overall Confidence (derived from claims & source diversity)
    const baseConfidence =
      claims.length > 0
        ? Math.round(
            claims.reduce((acc, c) => acc + (c.confidence || 50), 0) /
              claims.length
          )
        : evidence.length > 0
        ? Math.min(85, 50 + evidence.length * 5)
        : 30;

    // Apply penalties for unresolved conflicts and unsupported claims
    const conflictPenalty = unresolvedConflicts.length * 10;
    const unsupportedPenalty = unsupportedClaims.length * 8;
    const overallConfidence = Math.max(
      10,
      Math.min(98, baseConfidence - conflictPenalty - unsupportedPenalty)
    );

    // 8. Determine Overall SelfEvaluationStatus
    const hasSevereConflict = contradictions.some(
      (c) => c.status === 'UNRESOLVED' && (c.severity === 'HIGH' || c.severity === 'CRITICAL')
    );
    const hasContradictedHypothesis = hypotheses.some(
      (h) => h.status === 'CONTRADICTED'
    );

    let overallStatus: SelfEvaluationStatus = 'NEEDS_VERIFICATION';

    if (hasContradictedHypothesis || hasSevereConflict) {
      overallStatus = 'CONTRADICTED';
    } else if (evidence.length < 3 || evidenceCoverage < 40) {
      overallStatus = 'INSUFFICIENT_EVIDENCE';
    } else if (unsupportedClaims.length >= 2 || (presentSourceTypes.size < 2 && claims.length > 3)) {
      overallStatus = 'REPLAN_REQUIRED';
    } else if (
      evidenceCoverage >= 80 &&
      overallConfidence >= 70 &&
      unsupportedClaims.length === 0 &&
      unresolvedConflicts.length === 0
    ) {
      overallStatus = 'PASS';
    } else {
      overallStatus = 'NEEDS_VERIFICATION';
    }

    // 9. Generate Concise Reasoning
    let reasoning = '';
    switch (overallStatus) {
      case 'PASS':
        reasoning = `All ${totalMajorClaims} major claims have independent supporting evidence with ${evidenceCoverage}% coverage and no unresolved high-impact conflicts.`;
        break;
      case 'NEEDS_VERIFICATION':
        reasoning = `Evidence coverage is ${evidenceCoverage}% with ${unsupportedClaims.length} claim(s) requiring stronger primary evidence.`;
        break;
      case 'INSUFFICIENT_EVIDENCE':
        reasoning = `Only ${evidence.length} evidence item(s) collected across ${presentSourceTypes.size} source stream(s). Minimum threshold not met.`;
        break;
      case 'CONTRADICTED':
        reasoning = `Unresolved evidence conflicts or contradicted hypotheses detected. Strategic conclusions require revision.`;
        break;
      case 'REPLAN_REQUIRED':
        reasoning = `Multiple major claims lack evidence support (${unsupportedClaims.length} unsupported). Autonomous replanning required.`;
        break;
      default:
        reasoning = `Self-evaluation completed with status ${overallStatus}.`;
    }

    const shouldReplan =
      overallStatus === 'REPLAN_REQUIRED' ||
      overallStatus === 'NEEDS_VERIFICATION' ||
      overallStatus === 'INSUFFICIENT_EVIDENCE';

    const result: SelfEvaluationResult = {
      id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId,
      iterationNumber,
      overallStatus,
      confidence: overallConfidence,
      evidenceStrength,
      evidenceCoverage,
      totalMajorClaims,
      supportedClaims: supportedClaimsCount,
      partiallySupportedClaims: partiallySupportedCount,
      unsupportedClaims,
      unverifiedAssumptions,
      conflicts: unresolvedConflicts,
      missingEvidence,
      recommendedActions,
      claimEvaluations,
      reasoning,
      shouldReplan,
      createdAt: now,
    };

    // Save to DB repository
    await dbRepository.createSelfEvaluation(result);
    return result;
  }

  /**
   * Evaluates a single claim against evidence items and contradictions.
   */

  private evaluateSingleClaim(
    claim: ClaimModel,
    evidence: EvidenceModel[],
    contradictions: ContradictionModel[]
  ): ClaimEvaluation {
    const linkedEvidence = evidence.filter(
      (e) =>
        claim.evidenceIds.includes(e.id) ||
        claim.supportingEvidenceIds.includes(e.id)
    );

    const evidenceCount = linkedEvidence.length;

    // Count independent providers/domains
    const providers = new Set(
      linkedEvidence.map(
        (e) => e.provenance?.provider || e.source || e.sourceType
      )
    );
    const independentSourceCount = providers.size;

    // Count primary sources
    const primarySourceCount = linkedEvidence.filter(
      (e) =>
        e.sourceType === 'PATENT' ||
        e.provenance?.primaryOrSecondary === 'PRIMARY' ||
        e.provenance?.peerReviewed ||
        e.provenance?.officialAnnouncement
    ).length;

    // Count conflicts involving this claim
    const conflictCount = contradictions.filter(
      (c) =>
        c.claimIds?.includes(claim.id) ||
        c.claims.some((st) => st.includes(claim.statement.slice(0, 20)))
    ).length;

    // Assumption Detection (heuristics for inferential/predictive wording)
    const assumptionKeywords = [
      'therefore',
      'likely',
      'will result',
      'indicates that',
      'expected to',
      'suggests that',
      'will dominate',
      'poised to',
      'projected to',
    ];
    const isAssumption = assumptionKeywords.some((kw) =>
      claim.statement.toLowerCase().includes(kw)
    );

    let assumptionLabel: AssumptionLabel | undefined;
    if (isAssumption) {
      if (conflictCount > 0) {
        assumptionLabel = 'UNSUPPORTED';
      } else if (evidenceCount >= 2 && primarySourceCount >= 1) {
        assumptionLabel = 'SUPPORTED';
      } else if (evidenceCount >= 1) {
        assumptionLabel = 'PLAUSIBLE';
      } else {
        assumptionLabel = 'SPECULATIVE';
      }
    }

    // Determine absent source types for this claim
    const claimSources = new Set(linkedEvidence.map((e) => e.sourceType));
    const allSources: SourceType[] = ['RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'];
    const missingEvidenceTypes = allSources.filter((s) => !claimSources.has(s));

    // Information Gain Assessment
    let informationGain: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (evidenceCount === 0 || claim.status === 'INSUFFICIENT_EVIDENCE') {
      informationGain = 'HIGH';
    } else if (evidenceCount === 1 || primarySourceCount === 0) {
      informationGain = 'MEDIUM';
    }

    return {
      claimId: claim.id,
      statement: claim.statement,
      evidenceCount,
      independentSourceCount,
      primarySourceCount,
      conflictCount,
      status: claim.status,
      confidence: claim.confidence,
      isAssumption,
      assumptionLabel,
      missingEvidenceTypes,
      informationGain,
    };
  }

  /**
   * Calculates overall evidence strength based on counts, independence, and primary sources.
   */
  private calculateEvidenceStrength(evidence: EvidenceModel[]): EvidenceStrength {
    if (evidence.length === 0) return 'NONE';

    const providers = new Set(evidence.map((e) => e.provenance?.provider || e.source));
    const primaryCount = evidence.filter(
      (e) =>
        e.sourceType === 'PATENT' ||
        e.provenance?.primaryOrSecondary === 'PRIMARY' ||
        e.provenance?.peerReviewed
    ).length;

    if (evidence.length >= 4 && providers.size >= 3 && primaryCount >= 1) {
      return 'STRONG';
    }
    if (evidence.length >= 2 && providers.size >= 2) {
      return 'MEDIUM';
    }
    return 'WEAK';
  }
}

export const defaultSelfEvaluationEngine = new SelfEvaluationEngine();
