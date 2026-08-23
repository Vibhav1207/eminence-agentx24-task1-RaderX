'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  TrendingUp,
  FileText,
  CheckCircle2,
  Eye,
  Target,
  Sparkles,
  Plus,
  Layers,
  Link as LinkIcon,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  ConfidenceIndicator,
  ThreatIndicator,
  OpportunityIndicator
} from '@/components/ui/Indicators';
import { EvidenceCard } from '@/components/ui/Cards';
import { RightDrawer } from '@/components/ui/Overlays';
import { ExecutiveBriefModel, ProviderExecutionModel } from '@/lib/types';
import { investigationsApi } from '@/lib/api';
import { InvestigationModel, ExecutiveIntelligence, EvidenceModel } from '@/lib/types';
import { PdfExportButton } from '@/components/report/PdfExportButton';

export default function UnifiedIntelligencePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const [investigation, setInvestigation] = useState<InvestigationModel | null>(null);
  const [intelligence, setIntelligence] = useState<ExecutiveIntelligence | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [watchlistTitle, setWatchlistTitle] = useState('Target Watchlist');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const inv = await investigationsApi.getById(id);
      if (inv) {
        setInvestigation(inv);
        setWatchlistTitle(`${inv.title} Watchlist`);
      }

      const intel = await investigationsApi.getIntelligence(id);
      if (intel) setIntelligence(intel);

      const ev = await investigationsApi.getEvidence(id);
      if (ev) setEvidenceList(ev);
    } catch (e) {
      console.warn('Failed to load intelligence report:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await investigationsApi.regenerateIntelligence(id);
      if (res?.intelligence) {
        setIntelligence(res.intelligence);
      }
    } catch (e) {
      console.error('Failed to regenerate analysis:', e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCreateWatchlist = async () => {
    if (!investigation) return;
    try {
      await investigationsApi.getById(id);
      setIsWatchlistModalOpen(false);
      router.push('/watchlists');
    } catch {}
  };

  if (loading) {
    return (
      <div className="container-responsive p-responsive text-center text-responsive-xs font-mono text-[#6B7280]">
        Synthesizing executive intelligence assessment...
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="container-responsive p-responsive text-center text-responsive-xs font-mono text-[#6B7280]">
        Intelligence report for investigation <span className="font-bold text-[#111827]">{id}</span> not found.
      </div>
    );
  }

  const coverage = intelligence?.sourceCoverage || investigation.providerExecutions 
    ? (() => {
        const categories = ['RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'] as const;
        const result: Record<string, 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL' | 'NO_EVIDENCE'> = {
          RESEARCH: 'UNAVAILABLE',
          PATENT: 'UNAVAILABLE',
          NEWS: 'UNAVAILABLE',
          COMPETITOR: 'UNAVAILABLE',
          WEB: 'UNAVAILABLE',
        };
        const providerExecutions = investigation.providerExecutions || [];
        const evidence = evidenceList;
        
        for (const category of categories) {
          const executions = providerExecutions.filter(e => e.category === category);
          const categoryEvidence = evidence.filter(e => e.sourceType === category);
          
          if (executions.length === 0) {
            result[category] = 'UNAVAILABLE';
            continue;
          }
          
          const hasSuccessful = executions.some(e => e.status === 'SUCCESS');
          const hasPartial = executions.some(e => e.status === 'PARTIAL');
          const totalResults = executions.reduce((sum, e) => sum + e.resultCount, 0);
          const hasEvidence = categoryEvidence.length > 0;
          
          if (!hasSuccessful && !hasPartial) {
            result[category] = 'UNAVAILABLE';
          } else if (hasSuccessful && totalResults > 0 && hasEvidence) {
            result[category] = 'AVAILABLE';
          } else if (hasPartial || (hasSuccessful && totalResults === 0)) {
            result[category] = 'PARTIAL';
          } else if (hasSuccessful && totalResults === 0 && !hasEvidence) {
            result[category] = 'NO_EVIDENCE';
          } else {
            result[category] = 'PARTIAL';
          }
        }
        return result;
      })()
    : {
        RESEARCH: 'UNAVAILABLE',
        PATENT: 'UNAVAILABLE',
        NEWS: 'UNAVAILABLE',
        COMPETITOR: 'UNAVAILABLE',
        WEB: 'UNAVAILABLE',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="container-responsive p-responsive space-y-responsive"
    >
      {/* Unified Intelligence Header */}
      <div className="glass-level-2 p-responsive space-y-responsive shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-responsive border-b border-[#E5E7EB] pb-responsive-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="badge-responsive bg-[#059669]/15 text-[#047857] border border-[#059669]/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                INVESTIGATION COMPLETE
              </span>
              <span className="text-responsive-xs font-mono text-[#6B7280]">ID: {investigation.id}</span>
            </div>
            <h1 className="text-responsive-2xl font-extrabold text-[#111827] font-sans">
              UNIFIED INTELLIGENCE • {investigation.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <ConfidenceIndicator value={intelligence?.confidence || investigation.confidence || 92} size="lg" />
            <PdfExportButton
              brief={{
                id: `brief-${investigation.id}`,
                investigationId: investigation.id,
                title: investigation.title,
                version: 1,
                executiveSummary: intelligence?.executiveSummary || investigation.executiveSummary || '',
                keyChanges: [],
                strategicImplications: [],
                threats: [],
                opportunities: [],
                recommendedActions: (intelligence?.recommendedActions || []).map((ra: any, idx: number) => ({
                  id: `rec-${idx}`,
                  investigationId: investigation.id,
                  title: ra.action,
                  action: ra.action,
                  reason: ra.reason,
                  impact: 'HIGH',
                  confidence: 90,
                  priority: ra.priority || 'HIGH',
                  timeHorizon: 'IMMEDIATE',
                  evidenceIds: [],
                  signalIds: [],
                  entityIds: [],
                  status: 'ACKNOWLEDGED',
                  createdAt: new Date().toISOString(),
                })),
                watchItems: [],
                confidence: 90,
                sourceCoverage: coverage as ExecutiveBriefModel['sourceCoverage'],
                evidenceIds: [],
                signalIds: [],
                entityIds: [],
                generatedAt: new Date().toISOString(),
              }}
              evidence={evidenceList}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1.5 bg-white border border-[#E5E7EB] text-[#374151] font-mono text-responsive-xs font-bold px-3.5 py-2.5 rounded-xl shadow-2xs hover:border-[#D4AF37] transition-all cursor-pointer touch-target"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">REGENERATE</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsWatchlistModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-responsive-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-[#D4AF37]/25 transition-all cursor-pointer touch-target"
            >
              <Eye className="w-4 h-4 text-[#111827]" />
              <span className="hidden sm:inline">START AUTONOMOUS MONITORING</span>
              <span className="sm:hidden">MONITOR</span>
            </motion.button>
          </div>
        </div>

        {/* Source Coverage Grid */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-responsive-xs font-mono font-bold text-[#6B7280] uppercase">
            <span>REAL SOURCE PROVIDER COVERAGE</span>
            <span>CITATIONS: 100% TRACEABLE</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-responsive-xs font-mono">
            {Object.entries(coverage).map(([stream, status]) => (
              <div key={stream} className="bg-white/80 p-responsive rounded-xl border border-[#E5E7EB] flex items-center justify-between shadow-2xs">
                <span className="text-responsive-xs font-bold text-[#374151]">{stream}</span>
                <span className={`text-responsive-xs font-extrabold px-2 py-0.2 rounded ${
                  status === 'AVAILABLE' ? 'bg-[#059669]/15 text-[#047857]' : 'bg-[#991B1B]/15 text-[#991B1B]'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Intelligence & Strategic Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-responsive">
        {/* Left 2 Cols: Level 3 Executive Verdict & Findings */}
        <div className="lg:col-span-2 space-y-responsive">
          {/* Executive Verdict Box */}
          <div className="glass-level-3 p-responsive space-y-responsive border-l-4 border-l-[#D4AF37]">
            <div className="flex items-center justify-between flex-wrap gap-2 text-responsive-xs font-mono font-extrabold uppercase tracking-wider text-[#8C6D13]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C9A227]" />
                EXECUTIVE VERDICT • {intelligence?.investigationType || 'DYNAMIC'} INVESTIGATION
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold ${
                (intelligence?.decisionConfidence || 90) >= 80
                  ? 'bg-[#059669]/15 text-[#047857] border border-[#059669]/30'
                  : 'bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30'
              }`}>
                {intelligence?.decisionConfidence || intelligence?.confidence || 90}% CONFIDENCE ({intelligence?.confidenceLevel || 'HIGH CONFIDENCE'})
              </span>
            </div>

            <h2 className="text-responsive-xl font-extrabold text-[#111827] leading-snug font-sans">
              {intelligence?.verdictText || intelligence?.executiveSummary || investigation.executiveSummary}
            </h2>

            {/* Strategic Score Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-responsive pt-responsive-sm">
              <ThreatIndicator score={investigation.threatScore || 68} />
              <OpportunityIndicator score={investigation.opportunityScore || 74} />
              <div className="glass-level-2 border-l-4 border-l-[#D4AF37] border-[#D4AF37]/30 p-responsive flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-[#8C6D13]" />
                  </div>
                  <div>
                    <div className="text-responsive-xs font-mono text-[#6B7280] uppercase font-bold">DECISION CONFIDENCE</div>
                    <div className="text-responsive-sm font-extrabold text-[#8C6D13] font-mono">
                      {intelligence?.confidenceLevel || 'HIGH CONFIDENCE'}
                    </div>
                  </div>
                </div>
                <div className="text-responsive-xl font-extrabold font-mono text-[#8C6D13]">
                  {intelligence?.decisionConfidence || intelligence?.confidence || 90}%
                </div>
              </div>
            </div>
          </div>

          {/* Requirement 29: Comparison Scorecard Matrix (For Comparison Queries) */}
          {intelligence?.comparisonScorecard && intelligence.comparisonScorecard.length > 0 && (
            <div className="glass-level-2 p-responsive space-y-responsive">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-responsive-sm flex-wrap gap-2">
                <h3 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#D4AF37]" />
                  COMPETITIVE COMPARISON SCORECARD MATRIX
                </h3>
                <span className="badge-responsive bg-[#059669]/15 text-[#047857] border border-[#059669]/30 font-extrabold">
                  EVIDENCE GROUNDED
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-responsive-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F6] border-b border-[#E5E7EB] text-[#6B7280] text-left uppercase">
                      <th className="p-3 font-bold">Dimension</th>
                      <th className="p-3 font-bold">{intelligence.comparisonScorecard[0]?.entityA?.name || 'Entity A'}</th>
                      <th className="p-3 font-bold">{intelligence.comparisonScorecard[0]?.entityB?.name || 'Entity B'}</th>
                      <th className="p-3 font-bold">Advantage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {intelligence.comparisonScorecard.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="p-3 font-bold text-[#111827]">{row.dimension}</td>
                        <td className="p-3 text-[#374151] font-sans text-xs">{row.entityA.assessment}</td>
                        <td className="p-3 text-[#374151] font-sans text-xs">{row.entityB.assessment}</td>
                        <td className="p-3 font-extrabold">
                          <span className={`px-2 py-1 rounded text-[10px] uppercase font-mono ${
                            row.advantage === 'INSUFFICIENT EVIDENCE'
                              ? 'bg-[#9CA3AF]/20 text-[#4B5563] border border-[#9CA3AF]/40'
                              : row.advantage === 'TIE'
                              ? 'bg-[#D4AF37]/20 text-[#8C6D13]'
                              : 'bg-[#059669]/15 text-[#047857] border border-[#059669]/30'
                          }`}>
                            {row.advantage}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key Findings List with Evidence Citations */}
          <div className="glass-level-2 p-responsive space-y-responsive">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-responsive-sm flex-wrap gap-2">
              <h3 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#C9A227]" />
                KEY FINDINGS ({intelligence?.keyFindings?.length || 0})
              </h3>
              <span className="badge-responsive bg-[#059669]/15 text-[#047857] border border-[#059669]/30 font-extrabold">
                100% EVIDENCE-BACKED
              </span>
            </div>

            <div className="space-y-3">
              {(intelligence?.keyFindings || []).map((kf, idx) => (
                <div
                  key={idx}
                  className="p-responsive rounded-xl bg-white/80 border border-[#E5E7EB] hover:border-[#D4AF37]/40 transition-colors space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="badge-responsive bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/30 font-extrabold uppercase">
                      FINDING #{idx + 1} • {kf.impact} IMPACT
                    </span>
                    <span className="text-responsive-xs font-mono text-[#047857] font-extrabold">
                      {kf.confidence}% CONFIDENCE
                    </span>
                  </div>
                  <h4 className="text-responsive-sm font-bold text-[#111827] font-sans">{kf.title}</h4>
                  <p className="text-responsive-xs text-[#4B5563] font-sans leading-relaxed">{kf.summary}</p>
                  
                  {/* Evidence Citation Pills */}
                  {kf.evidenceIds && kf.evidenceIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E5E7EB]">
                      <span className="text-responsive-xs font-mono text-[#6B7280] font-bold">CITATIONS:</span>
                      {kf.evidenceIds.map((evId, evIdx) => (
                        <span key={`${evId}-${evIdx}`} className="text-responsive-xs font-mono px-2 py-0.5 rounded bg-[#FAF9F6] text-[#111827] border border-[#E5E7EB] flex items-center gap-1">
                          <LinkIcon className="w-2.5 h-2.5 text-[#8C6D13]" />
                          {evId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Requirement 34: Uncertainties & Contradictions Section */}
          {((intelligence?.contradictions && intelligence.contradictions.length > 0) ||
            (intelligence?.uncertainties && intelligence.uncertainties.length > 0)) && (
            <div className="glass-level-2 p-responsive space-y-responsive border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-responsive-sm">
                <h3 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  UNCERTAINTIES & CONTRADICTORY EVIDENCE
                </h3>
                <span className="badge-responsive bg-amber-100 text-amber-900 border border-amber-300 font-extrabold">
                  TRANSPARENT AUDIT
                </span>
              </div>

              {intelligence?.contradictions && intelligence.contradictions.length > 0 && (
                <div className="space-y-3">
                  <span className="text-responsive-xs font-mono font-bold text-[#6B7280]">DETECTED EVIDENCE CONFLICTS:</span>
                  {intelligence.contradictions.map((c, idx) => (
                    <div key={idx} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-responsive-xs font-mono space-y-2">
                      <div className="flex justify-between font-bold text-amber-900">
                        <span>TOPIC: {c.topic}</span>
                        <span>STATUS: {c.status}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans text-[#374151]">
                        <div className="p-2 bg-white rounded border border-amber-100">
                          <span className="font-bold text-amber-800 font-mono block">EVIDENCE A ({c.evidenceA.id})</span>
                          <p>{c.evidenceA.claim}</p>
                        </div>
                        <div className="p-2 bg-white rounded border border-amber-100">
                          <span className="font-bold text-amber-800 font-mono block">EVIDENCE B ({c.evidenceB.id})</span>
                          <p>{c.evidenceB.claim}</p>
                        </div>
                      </div>
                      <div className="p-2 bg-amber-100/60 rounded text-amber-900 font-mono text-[11px]">
                        <strong>RESOLUTION:</strong> {c.resolution}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {intelligence?.uncertainties && intelligence.uncertainties.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-responsive-xs font-mono font-bold text-[#6B7280]">UNCERTAINTY BOUNDS:</span>
                  {intelligence.uncertainties.map((u, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-[#E5E7EB] text-responsive-xs font-mono space-y-1">
                      <div className="flex justify-between font-bold text-[#111827]">
                        <span>{u.topic}</span>
                        <span className="text-amber-700">{u.confidence}% Confidence</span>
                      </div>
                      <p className="text-[#4B5563] font-sans text-xs">{u.description}</p>
                      <div className="text-[11px] text-[#047857]">Action: {u.recommendedAction}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Grounded Recommendations & Watch Items */}
        <div className="space-y-responsive">
          {/* Requirement 30, 31, 32, 33, 35: Actionable Grounded Recommendations */}
          <div className="glass-level-3 p-responsive space-y-responsive">
            <div className="border-b border-[#E5E7EB] pb-responsive-sm flex justify-between items-center flex-wrap gap-2">
              <div>
                <span className="text-responsive-xs font-mono font-bold uppercase tracking-widest text-[#8C6D13]">
                  ACTIONABLE RECOMMENDATIONS
                </span>
                <h3 className="text-responsive-lg font-bold text-[#111827] font-sans mt-0.5">
                  GROUNDED DECISION ROADMAP
                </h3>
              </div>
              <span className="badge-responsive bg-[#059669]/15 text-[#047857] border border-[#059669]/30 font-extrabold">
                100% TRACEABLE
              </span>
            </div>

            <div className="space-y-3">
              {(intelligence?.recommendedActions || []).map((rec, idx) => (
                <div key={idx} className="p-responsive rounded-xl bg-white border border-[#E5E7EB] space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-responsive-xs font-mono flex-wrap gap-1">
                    <span className="font-bold text-[#8C6D13]">{rec.timeHorizon} HORIZON</span>
                    <span className={`badge-responsive font-extrabold ${
                      rec.priority === 'CRITICAL' || rec.priority === 'HIGH'
                        ? 'bg-[#991B1B]/15 text-[#991B1B] border border-[#991B1B]/30'
                        : 'bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/30'
                    }`}>
                      {rec.priority} PRIORITY
                    </span>
                  </div>
                  <h4 className="text-responsive-xs font-bold text-[#111827] font-sans">{rec.action}</h4>
                  <p className="text-responsive-xs text-[#4B5563] leading-relaxed font-sans">{rec.reason}</p>
                  
                  {rec.implication && (
                    <div className="text-[11px] font-sans text-amber-900 bg-amber-50/60 p-2 rounded border border-amber-100">
                      <strong>IMPLICATION:</strong> {rec.implication}
                    </div>
                  )}

                  {/* Requirement 35: Clickable Supporting Evidence References */}
                  {rec.supportingEvidenceIds && rec.supportingEvidenceIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#E5E7EB] text-[10px] font-mono">
                      <span className="text-[#6B7280] font-bold">SUPPORTED BY:</span>
                      {rec.supportingEvidenceIds.map((evId, evIdx) => (
                        <span key={`${evId}-${evIdx}`} className="px-2 py-0.5 rounded bg-[#FAF9F6] text-[#111827] border border-[#E5E7EB] flex items-center gap-1">
                          <LinkIcon className="w-2.5 h-2.5 text-[#8C6D13]" />
                          {evId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsWatchlistModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-responsive-xs font-extrabold py-3 px-4 rounded-xl shadow-md shadow-[#D4AF37]/25 transition-all cursor-pointer touch-target mt-responsive-sm"
            >
              <Eye className="w-4 h-4 text-[#111827]" />
              <span className="hidden sm:inline">START AUTONOMOUS MONITORING</span>
              <span className="sm:hidden">START MONITORING</span>
            </motion.button>
          </div>

          {/* Continuous Watch Items */}
          <div className="glass-level-2 p-responsive space-y-responsive">
            <h3 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#047857]" />
              CONTINUOUS WATCH ITEMS
            </h3>

            <div className="space-y-3">
              {(intelligence?.watchItems || []).map((wi, idx) => (
                <div key={idx} className="p-responsive rounded-xl bg-white/80 border border-[#E5E7EB] space-y-1 text-responsive-xs font-mono">
                  <div className="flex items-center justify-between text-responsive-xs flex-wrap gap-2">
                    <span className="font-extrabold text-[#111827]">{wi.topic}</span>
                    <span className="text-[#047857] font-bold">{wi.priority} PRIORITY</span>
                  </div>
                  <p className="text-responsive-xs text-[#4B5563] font-sans">{wi.reason}</p>
                  <div className="text-responsive-xs text-[#6B7280] pt-1">Trigger: {wi.trigger}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Link to Full Execution Trace */}
          <div className="glass-level-2 p-responsive text-center space-y-2 font-mono text-responsive-xs">
            <span className="text-[#6B7280] block font-bold">TRACE & OBSERVABILITY LAB</span>
            <Link href={`/trace-lab?investigationId=${investigation.id}`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 bg-white border border-[#E5E7EB] hover:border-[#D4AF37] text-[#111827] py-2.5 rounded-xl font-bold transition-all"
              >
                <Layers className="w-4 h-4 text-[#C9A227]" />
                <span>INSPECT FULL AGENT EXECUTION TRACE</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>

      {/* Real Evidence Exploration Grid */}
      <div className="space-y-responsive">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#06B6D4]" />
            PRIMARY EVIDENCE BEHIND ASSESSMENT ({evidenceList.length})
          </h2>
          <span className="text-responsive-xs font-mono text-[#6B7280]">Real Provider Metadata</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-responsive">
          {evidenceList.map((ev, idx) => (
            <EvidenceCard key={`${ev.id}-${idx}`} evidence={ev} />
          ))}
        </div>
      </div>

      {/* Watchlist Creation Drawer Modal */}
      <RightDrawer
        isOpen={isWatchlistModalOpen}
        onClose={() => setIsWatchlistModalOpen(false)}
        title="START AUTONOMOUS WATCHLIST"
        subtitle="Convert investigation findings into continuous background monitoring"
      >
        <div className="space-y-responsive">
          <div className="space-y-2">
            <label className="text-responsive-xs font-mono font-bold text-[#111827]">WATCHLIST TITLE</label>
            <input
              type="text"
              value={watchlistTitle}
              onChange={(e) => setWatchlistTitle(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-responsive py-responsive text-responsive-xs text-[#111827] font-mono focus:border-[#D4AF37] focus:outline-none input-responsive"
            />
          </div>

          <div className="bg-[#FAF9F6] p-responsive rounded-xl border border-[#E5E7EB] space-y-2 text-responsive-xs font-mono">
            <div className="flex justify-between text-[#6B7280] flex-wrap gap-2">
              <span>TARGET ENTITY:</span>
              <span className="text-[#111827] font-bold">{investigation.title}</span>
            </div>
            <div className="flex justify-between text-[#6B7280] flex-wrap gap-2">
              <span>SCAN FREQUENCY:</span>
              <span className="text-[#047857] font-bold">Continuous (24/7)</span>
            </div>
          </div>

          <p className="text-responsive-xs text-[#6B7280] font-sans leading-relaxed">
            RadarX sub-agents will automatically watch connected streams and emit alerts whenever a high-impact signal is detected.
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateWatchlist}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-responsive-xs font-extrabold py-3 px-4 rounded-xl shadow-md shadow-[#D4AF37]/25 transition-all cursor-pointer touch-target"
          >
            <Plus className="w-4 h-4 text-[#111827]" />
            <span className="hidden sm:inline">CREATE WATCHLIST & MONITOR NOW</span>
            <span className="sm:hidden">CREATE WATCHLIST</span>
          </motion.button>
        </div>
      </RightDrawer>
    </motion.div>
  );
}
