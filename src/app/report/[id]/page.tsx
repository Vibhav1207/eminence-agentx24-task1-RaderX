import { notFound } from 'next/navigation';
import ReportClient from './ReportClient';
import { dbRepository } from '@/lib/db/repository';
import { defaultSynthesisEngine } from '@/lib/intelligence/synthesisEngine';
import type { Investigation } from '@/lib/schemas';

function legacyEvidence(evidence: Awaited<ReturnType<typeof dbRepository.getEvidenceByInvestigationId>>) {
  return evidence.map((item) => ({
    id: item.id,
    source: item.source,
    title: item.title,
    url: item.url,
    date: item.publishedAt || item.date || item.discoveredAt,
    summary: item.summary,
    relevance: item.relevanceScore,
    evidenceType: (['RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'].includes(item.sourceType)
      ? item.sourceType.toLowerCase()
      : 'web') as 'research' | 'patent' | 'news' | 'competitor' | 'web',
  }));
}

function legacySignal(signal: { title: string; summary?: string; description?: string; impact?: string; potentialImpact?: string; confidence: number; evidenceIds?: string[] }, evidence: ReturnType<typeof legacyEvidence>, classification: 'threat' | 'opportunity' | 'neutral') {
  const linkedEvidence = evidence.filter((item) => signal.evidenceIds?.includes(item.id));
  return {
    title: signal.title,
    classification,
    impact: (signal.impact || signal.potentialImpact || 'MEDIUM').toLowerCase() as 'high' | 'medium' | 'low',
    confidence: signal.confidence,
    summary: signal.summary || signal.description || 'Validated strategic signal extracted from primary evidence.',
    whyItMatters: signal.summary || signal.description || 'Validated strategic signal extracted from primary evidence.',
    evidence: linkedEvidence,
    recommendedActions: [],
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const investigation = await dbRepository.getInvestigationById(id);
  if (!investigation) notFound();

  const [evidence, signals] = await Promise.all([
    dbRepository.getEvidenceByInvestigationId(id),
    dbRepository.getSignalsByInvestigationId(id),
  ]);
  const intelligence = investigation.intelligence || await defaultSynthesisEngine.synthesizeIntelligence(
    investigation,
    signals,
    evidence,
    await dbRepository.getEntitiesByInvestigationId(id),
    await dbRepository.getRelationshipsByInvestigationId(id)
  );
  const reportEvidence = legacyEvidence(evidence);
  const threats = intelligence.threats.map((item) => ({
    ...legacySignal(item, reportEvidence, 'threat'),
    evidence: reportEvidence.filter((e) => item.evidenceIds.includes(e.id)),
  }));
  const opportunities = intelligence.opportunities.map((item) => ({
    ...legacySignal(item, reportEvidence, 'opportunity'),
    evidence: reportEvidence.filter((e) => item.evidenceIds.includes(e.id)),
  }));
  const legacySignals = signals.map((signal) => ({
    ...legacySignal(signal, reportEvidence, signal.type === 'THREAT' ? 'threat' : signal.type === 'OPPORTUNITY' || signal.type === 'TECHNOLOGY_SHIFT' ? 'opportunity' : 'neutral'),
    evidence: reportEvidence.filter((e) => signal.evidenceIds.includes(e.id)),
  }));

  const report: Investigation = {
    id: investigation.id,
    organization: investigation.organization || investigation.title,
    technology: investigation.technology || 'Intelligence analysis',
    competitors: investigation.competitors || [],
    timeRange: 'last_30_days',
    strategicQuestion: investigation.strategicQuestion || investigation.objective,
    status: investigation.status,
    createdAt: investigation.createdAt,
    updatedAt: investigation.updatedAt,
    report: {
      executiveSummary: intelligence.executiveSummary,
      signals: legacySignals,
      threats,
      opportunities,
      emergingTrends: intelligence.technologyTrends || [],
      recommendations: intelligence.recommendedActions.map((item) => item.action),
      evidence: reportEvidence,
      sources: reportEvidence.map((item) => item.url).filter((url): url is string => Boolean(url)),
      confidence: intelligence.confidence,
    },
  };

  return <ReportClient investigation={report} />;
}
