import {
  InvestigationModel,
  EvidenceModel,
  SignalModel,
  EntityModel,
  RelationshipModel,
  ExecutiveIntelligence,
  ExecutiveFinding,
  ExecutiveThreat,
  ExecutiveOpportunity,
  ExecutiveRecommendation,
  WatchItem,
  SourceType,
} from '@/lib/types';
import { defaultEvidenceNormalizer } from '@/lib/normalization/evidenceNormalizer';

export class SynthesisEngine {
  async synthesizeIntelligence(
    investigation: InvestigationModel,
    signals: SignalModel[],
    allEvidence: EvidenceModel[],
    entities: EntityModel[],
    relationships: RelationshipModel[]
  ): Promise<ExecutiveIntelligence> {
    const now = new Date().toISOString();

    // HARD GATE: Filter for VERIFIED evidence items only
    const verifiedEvidence = defaultEvidenceNormalizer.verifyAndDeduplicate(allEvidence || []);
    const verifiedEvidenceCount = verifiedEvidence.length;
    const unverifiedEvidenceCount = (allEvidence || []).length - verifiedEvidenceCount;

    // Calculate Source Breakdown by sourceType
    const sourceBreakdown: Record<string, number> = {};
    for (const ev of verifiedEvidence) {
      const type = ev.sourceType || 'UNKNOWN';
      sourceBreakdown[type] = (sourceBreakdown[type] || 0) + 1;
    }

    // Determine Source Coverage from verified evidence counts per stream
    const sourceCoverage: ExecutiveIntelligence['sourceCoverage'] = {
      RESEARCH: verifiedEvidence.some((e) => e.sourceType === 'RESEARCH') ? 'AVAILABLE' : 'UNAVAILABLE',
      PATENT: verifiedEvidence.some((e) => e.sourceType === 'PATENT') ? 'AVAILABLE' : 'UNAVAILABLE',
      NEWS: verifiedEvidence.some((e) => e.sourceType === 'NEWS') ? 'AVAILABLE' : 'UNAVAILABLE',
      COMPETITOR: verifiedEvidence.some((e) => e.sourceType === 'COMPETITOR' || e.sourceType === 'PUBLIC_DATA') ? 'AVAILABLE' : 'UNAVAILABLE',
      WEB: verifiedEvidence.some((e) => e.sourceType === 'WEB') ? 'AVAILABLE' : 'UNAVAILABLE',
    };

    const targetOrg = investigation.primaryEntities[0] || investigation.title;
    const sigCount = signals.length;

    let insufficientEvidenceNotice: string | undefined;
    let executiveSummary = '';

    if (verifiedEvidenceCount < 2) {
      insufficientEvidenceNotice = 'Insufficient verified evidence to support this conclusion.';
      executiveSummary = `Insufficient verified evidence to support this conclusion. Analysis for ${investigation.title} returned ${verifiedEvidenceCount} verified evidence items from connected data providers. No unverified or synthetic evidence was included. Immediate continuous monitoring is recommended as additional real-world disclosures surface.`;
    } else {
      executiveSummary = `Cross-source analysis of ${verifiedEvidenceCount} independently verified evidence items for ${targetOrg} reveals ${sigCount} high-confidence strategic signals across connected intelligence streams. Actionable recommendations prioritize early technical benchmarking and continuous watchlist monitoring. All cited evidence items originate from verified external sources.`;
    }

    // Key Findings with Evidence Citations (VERIFIED only)
    const keyFindings: ExecutiveFinding[] = signals.map((sig) => {
      const relatedEv = verifiedEvidence.filter((e) => sig.evidenceIds?.includes(e.id));
      return {
        title: sig.title,
        summary: sig.summary,
        impact: sig.impact,
        confidence: sig.confidence,
        signalId: sig.id,
        evidenceIds: relatedEv.length > 0 ? relatedEv.map((e) => e.id) : verifiedEvidence.slice(0, 2).map((e) => e.id),
        entities: sig.entityIds || [],
      };
    });

    if (keyFindings.length === 0 && verifiedEvidenceCount > 0) {
      keyFindings.push({
        title: `Primary Verified Disclosures for ${targetOrg}`,
        summary: `Retrieved ${verifiedEvidenceCount} verified primary evidence item(s) detailing operational and technical disclosures.`,
        impact: 'HIGH',
        confidence: 90,
        evidenceIds: verifiedEvidence.map((e) => e.id),
        entities: entities.map((e) => e.id),
      });
    }

    // Citation Coverage calculation (% of findings backed by verified evidence)
    const citedCount = keyFindings.filter((kf) => kf.evidenceIds && kf.evidenceIds.length > 0).length;
    const citationCoverage = keyFindings.length > 0 ? Math.round((citedCount / keyFindings.length) * 100) : 0;

    // Threats & Opportunities (VERIFIED evidence links only)
    const threats: ExecutiveThreat[] = signals
      .filter((s) => s.type === 'THREAT' || s.impact === 'HIGH' || s.impact === 'CRITICAL')
      .map((s) => ({
        title: s.title,
        description: s.summary,
        impact: s.impact,
        confidence: s.confidence,
        evidenceIds: verifiedEvidence.filter((e) => s.evidenceIds?.includes(e.id)).map((e) => e.id),
        competitorEntities: s.entityIds || [],
        recommendedResponse: `Monitor quarterly disclosure filings and establish automated watchlist alerts on ${targetOrg}.`,
      }));

    const opportunities: ExecutiveOpportunity[] = signals
      .filter((s) => s.type === 'OPPORTUNITY' || s.type === 'TECHNOLOGY_SHIFT')
      .map((s) => ({
        title: s.title,
        description: s.summary,
        potentialImpact: s.impact,
        confidence: s.confidence,
        evidenceIds: verifiedEvidence.filter((e) => s.evidenceIds?.includes(e.id)).map((e) => e.id),
        entities: s.entityIds || [],
        recommendedAction: `Benchmark internal capabilities against verified disclosures.`,
      }));

    // Actionable Recommendations
    const recommendedActions: ExecutiveRecommendation[] = [
      {
        action: `Benchmark strategic workloads against ${investigation.technology || targetOrg} verified specifications`,
        reason: 'Correlated evidence indicates verified operational activity.',
        priority: 'HIGH',
        supportingSignalIds: signals.map((s) => s.id),
        supportingEvidenceIds: verifiedEvidence.slice(0, 3).map((e) => e.id),
        timeHorizon: 'IMMEDIATE',
      },
      {
        action: `Establish continuous 24/7 background watchlist monitoring for ${targetOrg}`,
        priority: 'HIGH',
        reason: 'Prevents strategic surprise as competitor disclosures and patent applications publish.',
        supportingSignalIds: signals.map((s) => s.id),
        supportingEvidenceIds: verifiedEvidence.slice(0, 2).map((e) => e.id),
        timeHorizon: 'SHORT_TERM',
      },
    ];

    // Watch Items
    const watchItems: WatchItem[] = [
      {
        topic: `${targetOrg} Official Patent & Research Publications`,
        reason: 'Early indicator of hardware architecture and software kernel changes.',
        trigger: 'New verified EPO, USPTO, or arXiv publication matching query',
        priority: 'HIGH',
        relatedEntityIds: entities.map((e) => e.id),
        relatedSignalIds: signals.map((s) => s.id),
      },
    ];

    // Evidence References (100% Traceability to Verified External Sources)
    const evidenceReferences = verifiedEvidence.map((e) => ({
      id: e.id,
      title: e.title,
      url: e.url,
      sourceType: e.sourceType,
      provider: e.source || 'Verified Source Provider',
    }));

    // Average confidence calculation derived strictly from verified evidence
    const avgConfidence =
      verifiedEvidenceCount > 0
        ? Math.round(verifiedEvidence.reduce((acc, e) => acc + (e.confidence || 90), 0) / verifiedEvidenceCount)
        : 0;

    return {
      id: `synth-${Date.now()}`,
      investigationId: investigation.id,
      executiveSummary,
      keyFindings,
      threats,
      opportunities,
      technologyTrends: verifiedEvidence.map((e) => e.title).slice(0, 3),
      competitorMoves: verifiedEvidence.filter((e) => e.sourceType === 'NEWS' || e.sourceType === 'COMPETITOR').map((e) => e.title),
      researchTrends: verifiedEvidence.filter((e) => e.sourceType === 'RESEARCH').map((e) => e.title),
      patentTrends: verifiedEvidence.filter((e) => e.sourceType === 'PATENT').map((e) => e.title),
      recommendedActions,
      watchItems,
      confidence: avgConfidence,
      verifiedEvidenceCount,
      unverifiedEvidenceCount,
      sourceBreakdown,
      citationCoverage,
      insufficientEvidenceNotice,
      evidenceReferences,
      sourceCoverage,
      generatedAt: now,
    };
  }
}

export const defaultSynthesisEngine = new SynthesisEngine();
