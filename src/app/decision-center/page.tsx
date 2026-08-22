'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  ArrowRight,
  Clock,
  Layers,
  Search,
  Check,
  X
} from 'lucide-react';
import { ConfidenceIndicator } from '@/components/ui/Indicators';
import { decisionCenterApi, recommendationsApi, investigationsApi } from '@/lib/api';
import { InvestigationModel, ExecutiveBriefModel, ExecutiveRecommendationModel, ChangeItemModel } from '@/lib/types';

export default function DecisionCenterPage() {
  const router = useRouter();
  const [investigations, setInvestigations] = useState<InvestigationModel[]>([]);
  const [activeInvId, setActiveInvId] = useState<string>('');
  const [brief, setBrief] = useState<ExecutiveBriefModel | null>(null);
  const [recommendations, setRecommendations] = useState<ExecutiveRecommendationModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitial() {
      try {
        const invs = await investigationsApi.getAll();
        setInvestigations(invs);
        const invId = invs[0]?.id;
        if (invId) {
          setActiveInvId(invId);
          const data = await decisionCenterApi.getBrief(invId);
          setBrief(data.brief);
          setRecommendations(data.recommendations || []);
        }
      } catch (e) {
        console.warn('Failed to load decision center:', e);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const handleSelectInvestigation = async (invId: string) => {
    setActiveInvId(invId);
    setLoading(true);
    try {
      const data = await decisionCenterApi.getBrief(invId);
      setBrief(data.brief);
      setRecommendations(data.recommendations || []);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (recId: string, newStatus: string) => {
    try {
      const updated = await recommendationsApi.updateStatus(recId, newStatus);
      setRecommendations((prev) => prev.map((r) => (r.id === recId ? { ...r, status: newStatus as any } : r)));
    } catch (e) {
      console.warn('Failed to update recommendation status:', e);
    }
  };

  const handleInvestigateFurther = async (rec: ExecutiveRecommendationModel) => {
    try {
      const obj = encodeURIComponent(`Investigate strategic action: ${rec.title}`);
      router.push(`/investigations/new?objective=${obj}`);
    } catch (e) {
      console.warn('Failed to bridge investigation:', e);
    }
  };

  const exportBrief = (format: 'md' | 'json') => {
    if (!brief) return;
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(brief, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RADARX_Brief_v${brief.version}_${brief.investigationId}.json`;
      a.click();
    } else {
      const content = `# ${brief.title}\n\n## Executive Summary\n${brief.executiveSummary}\n\n## Key Changes\n${brief.keyChanges.map((c) => `- ${c.title}: ${c.description}`).join('\n')}\n\nGenerated At: ${brief.generatedAt}`;
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RADARX_Brief_v${brief.version}_${brief.investigationId}.md`;
      a.click();
    }
  };

  if (loading) {
    return (
      <div className="container-responsive p-responsive text-center text-responsive-xs font-mono text-[#6B7280]">
        Synthesizing Executive Brief and Strategic Decision Matrix...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="container-responsive p-responsive space-y-responsive"
    >
      {/* Header & Controls */}
      <div className="glass-level-2 p-responsive flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="badge-responsive bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/35 uppercase tracking-widest">
              STAGE 2.11 EXECUTIVE DECISION CENTER
            </span>
            {brief && (
              <span className="badge-responsive bg-[#059669]/15 text-[#047857] border border-[#059669]/30">
                BRIEF v{brief.version}
              </span>
            )}
          </div>
          <h1 className="text-responsive-2xl font-extrabold text-[#111827] font-sans">
            EXECUTIVE DECISION & ACTION CENTER
          </h1>
          <p className="text-responsive-xs text-[#6B7280] font-sans">
            Evidence-backed strategic implications, threat matrices, and actionable recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            value={activeInvId}
            onChange={(e) => handleSelectInvestigation(e.target.value)}
            className="bg-white border border-[#E5E7EB] text-responsive-xs font-mono px-responsive py-2 rounded-xl text-[#111827] shrink-0 w-full sm:w-auto input-responsive"
          >
            {investigations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => exportBrief('md')}
            className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] text-responsive-xs font-mono font-bold px-responsive py-2 rounded-xl text-[#111827] hover:bg-[#FAF9F6] transition-all cursor-pointer shadow-2xs touch-target shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EXPORT BRIEF (.MD)</span>
            <span className="sm:hidden">EXPORT</span>
          </button>
        </div>
      </div>

      {brief ? (
        <>
          {/* Executive Brief Card */}
          <div className="glass-level-2 p-responsive space-y-responsive shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-responsive-sm">
              <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4AF37]" />
                RADARX INTELLIGENCE SUMMARY
              </h2>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-responsive-xs font-mono text-[#6B7280] hidden sm:inline">
                  INTELLIGENCE CONFIDENCE
                </span>
                <ConfidenceIndicator value={brief.confidence} size="md" />
              </div>
            </div>

            <p className="text-responsive-sm text-[#374151] font-sans leading-relaxed font-medium">
              {brief.executiveSummary}
            </p>
          </div>

          {/* Material Changes Grid */}
          <div className="glass-level-2 p-responsive space-y-responsive">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-responsive-sm">
              <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D97706]" />
                MATERIAL INTELLIGENCE CHANGES ({brief.keyChanges.length})
              </h2>
              <span className="text-responsive-xs font-mono text-[#047857] font-bold">
                RANKED BY IMPACT & NOVELTY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-responsive">
              {brief.keyChanges.map((c) => (
                <div
                  key={c.id}
                  className="p-responsive rounded-2xl border border-[#E5E7EB] bg-[#FAF9F6] space-y-2 text-responsive-xs font-mono shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-[#D97706] text-responsive-xs uppercase">
                      {c.changeType}
                    </span>
                    <span className="badge-responsive bg-[#D4AF37]/20 text-[#7A5E0A] font-bold">
                      {c.magnitude} MAGNITUDE
                    </span>
                  </div>
                  <h4 className="font-bold text-[#111827] text-responsive-sm leading-tight">{c.title}</h4>
                  <p className="text-responsive-xs text-[#4B5563] font-sans line-clamp-3">{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Threat & Opportunity Matrices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-responsive">
            {/* Threats Panel */}
            <div className="glass-level-2 p-responsive space-y-responsive">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-responsive-sm">
                <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#991B1B] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                  VALIDATED THREAT MATRIX ({brief.threats.length})
                </h2>
              </div>

              <div className="space-y-3">
                {brief.threats.length > 0 ? (
                  brief.threats.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-responsive rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 space-y-2 text-responsive-xs font-mono"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-[#991B1B]">{t.title}</span>
                        <span className="badge-responsive bg-[#DC2626]/20 text-[#991B1B] font-bold">
                          {t.impact} SEVERITY
                        </span>
                      </div>
                      <p className="text-[#374151] font-sans text-responsive-xs">{t.description}</p>
                      <div className="text-responsive-xs font-bold text-[#7F1D1D] pt-1">
                        Recommended Response: {t.recommendedResponse}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-responsive text-center text-responsive-xs font-mono text-[#6B7280]">
                    No active strategic threats detected in primary evidence.
                  </div>
                )}
              </div>
            </div>

            {/* Opportunities Panel */}
            <div className="glass-level-2 p-responsive space-y-responsive">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-responsive-sm">
                <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#047857] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#059669]" />
                  STRATEGIC OPPORTUNITY MATRIX ({brief.opportunities.length})
                </h2>
              </div>

              <div className="space-y-3">
                {brief.opportunities.length > 0 ? (
                  brief.opportunities.map((o, idx) => (
                    <div
                      key={idx}
                      className="p-responsive rounded-xl border border-[#059669]/30 bg-[#059669]/5 space-y-2 text-responsive-xs font-mono"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-[#047857]">{o.title}</span>
                        <span className="badge-responsive bg-[#059669]/20 text-[#047857] font-bold">
                          {o.potentialImpact} IMPACT
                        </span>
                      </div>
                      <p className="text-[#374151] font-sans text-responsive-xs">{o.description}</p>
                      <div className="text-responsive-xs font-bold text-[#064E3B] pt-1">
                        Recommended Action: {o.recommendedAction}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-responsive text-center text-responsive-xs font-mono text-[#6B7280]">
                    No immediate opportunities identified in evidence set.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Center & Recommendations */}
          <div className="glass-level-2 p-responsive space-y-responsive">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-responsive-sm">
              <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D4AF37]" />
                PRIORITIZED ACTION CENTER ({recommendations.length})
              </h2>
            </div>

            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-responsive rounded-2xl border border-[#E5E7EB] bg-white space-y-3 text-responsive-xs font-mono shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F3F4F6] pb-2 flex-wrap">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`badge-responsive font-extrabold ${
                          rec.priority === 'CRITICAL'
                            ? 'bg-[#DC2626]/20 text-[#991B1B]'
                            : 'bg-[#D4AF37]/25 text-[#7A5E0A]'
                        }`}
                      >
                        {rec.priority} PRIORITY
                      </span>
                      <h3 className="font-extrabold text-[#111827] text-responsive-sm font-sans">{rec.title}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className="text-responsive-xs text-[#6B7280] hidden sm:inline">Status: {rec.status}</span>
                      <button
                        onClick={() => handleStatusChange(rec.id, 'ACKNOWLEDGED')}
                        className="px-responsive py-1 rounded bg-[#F3F4F6] text-[#374151] font-bold text-responsive-xs hover:bg-[#E5E7EB] cursor-pointer touch-target"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleStatusChange(rec.id, 'IN_PROGRESS')}
                        className="px-responsive py-1 rounded bg-[#D4AF37]/20 text-[#7A5E0A] font-bold text-responsive-xs hover:bg-[#D4AF37]/35 cursor-pointer touch-target"
                      >
                        In Progress
                      </button>
                    </div>
                  </div>

                  <p className="text-[#374151] font-sans text-responsive-xs leading-relaxed">{rec.action}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 flex-wrap">
                    <span className="text-responsive-xs text-[#6B7280]">
                      Reason: <strong className="text-[#111827]">{rec.reason}</strong>
                    </span>

                    <button
                      onClick={() => handleInvestigateFurther(rec)}
                      className="inline-flex items-center gap-1.5 bg-[#111827] text-white px-responsive py-2 rounded-xl text-responsive-xs font-bold hover:bg-black transition-all cursor-pointer shrink-0 touch-target"
                    >
                      <span className="hidden sm:inline">INVESTIGATE FURTHER</span>
                      <span className="sm:hidden">INVESTIGATE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="container-responsive p-responsive text-center text-responsive-xs font-mono text-[#6B7280]">
          Select an investigation to render the Executive Decision Brief.
        </div>
      )}
    </motion.div>
  );
}
