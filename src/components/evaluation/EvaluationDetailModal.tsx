'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  X,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Shield,
  Activity,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Cpu,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { EvaluationRunModel, MissionEventModel } from '@/lib/types';

interface Props {
  run: EvaluationRunModel;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    PASS: 'bg-[#059669]/15 text-[#047857] border-[#059669]/30',
    PARTIAL: 'bg-[#D97706]/15 text-[#B45309] border-[#D97706]/30',
    FAIL: 'bg-[#991B1B]/15 text-[#7F1D1D] border-[#991B1B]/30',
    ERROR: 'bg-[#4B5563]/15 text-[#374151] border-[#9CA3AF]/30',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border',
        map[verdict] ?? map.FAIL
      )}
    >
      {verdict}
    </span>
  );
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color =
    pct >= 70
      ? 'bg-[#059669]'
      : pct >= 40
      ? 'bg-[#D97706]'
      : 'bg-[#991B1B]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <motion.div
          className={clsx('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[11px] font-mono font-bold text-[#374151] w-8 text-right">{value}</span>
    </div>
  );
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#FAFAF9] hover:bg-[#F7F6F2] transition-colors text-left"
      >
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#374151]">
          {title}
        </span>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3 border-t border-[#E5E7EB] bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventTypeColor(type: string): string {
  if (type.includes('FAIL') || type.includes('ERROR')) return 'text-[#991B1B] bg-[#FEF2F2]';
  if (type.includes('COMPLETE') || type.includes('RECOVERED')) return 'text-[#059669] bg-[#F0FDF4]';
  if (type.includes('REPLAN') || type.includes('LOOP') || type.includes('CONFLICT'))
    return 'text-[#D97706] bg-[#FFFBEB]';
  return 'text-[#374151] bg-[#F9FAFB]';
}

function AgentColor(agent?: string): string {
  const map: Record<string, string> = {
    RESEARCH: 'text-[#2563EB]',
    PATENT: 'text-[#7C3AED]',
    NEWS: 'text-[#D97706]',
    COMPETITOR: 'text-[#DC2626]',
    WEB: 'text-[#059669]',
    ORCHESTRATOR: 'text-[#C9A227]',
    SYNTHESIS: 'text-[#0891B2]',
  };
  return map[agent ?? ''] ?? 'text-[#6B7280]';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

export default function EvaluationDetailModal({ run, onClose }: Props) {
  const fmt = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const fmtDate = (s?: string) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' }) : '—';

  const metricRows: { label: string; value: number; invert?: boolean }[] = [
    { label: 'Groundedness', value: run.metrics.groundedness },
    { label: 'Task Completion', value: run.metrics.taskCompletion },
    { label: 'Evidence Quality', value: run.metrics.evidenceQuality },
    { label: 'Recovery Rate', value: run.metrics.recoveryRate },
    { label: 'Consistency', value: run.metrics.consistency },
    { label: 'Hallucination Rate', value: run.metrics.hallucinationRate, invert: true },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-3xl glass-level-3 rounded-2xl overflow-hidden shadow-2xl my-4"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-[#E5E7EB]">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                <FlaskConical className="w-4.5 h-4.5 text-[#C9A227]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#9CA3AF]">
                    {run.scenario}
                  </span>
                  <VerdictBadge verdict={run.verdict} />
                  <span className="text-[10px] font-mono text-[#6B7280]">
                    Score: <strong className="text-[#111827]">{run.finalScore}</strong>/100
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-[#374151] mt-0.5 truncate max-w-xs sm:max-w-md">
                  {run.id}
                </p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{fmtDate(run.createdAt)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[#F3F4F6] transition-colors shrink-0 ml-2"
            >
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh] custom-scroll">

            {/* Objective / Expected / Actual */}
            <Section title="Objective & Result" defaultOpen>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">
                    Objective
                  </p>
                  <p className="text-xs text-[#374151] leading-relaxed">{run.objective}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">
                    Expected Behavior
                  </p>
                  <p className="text-xs text-[#374151] leading-relaxed">{run.expectedBehavior}</p>
                </div>
                {run.finalConclusion && (
                  <div>
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">
                      Final Conclusion
                    </p>
                    <p className="text-xs text-[#374151] leading-relaxed line-clamp-6">
                      {run.finalConclusion}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-4 pt-1">
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Confidence</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">{run.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Latency</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">
                      {fmt(run.metrics.totalLatencyMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Evidence</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">{run.metrics.evidenceCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Agent Steps</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">{run.metrics.agentSteps}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Tool Calls</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">{run.metrics.toolCallCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Retries</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">{run.metrics.retryCount}</p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Metrics breakdown */}
            <Section title="Metric Scores" defaultOpen>
              <div className="space-y-3">
                {metricRows.map((m) => (
                  <div key={m.label} className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <span className="text-[11px] font-mono text-[#6B7280] truncate">{m.label}</span>
                    <ScoreBar
                      value={m.invert ? 100 - m.value : m.value}
                    />
                  </div>
                ))}
                <div className="pt-2 border-t border-[#F3F4F6]">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <span className="text-[11px] font-mono font-bold text-[#374151]">Final Score</span>
                    <ScoreBar value={run.finalScore} />
                  </div>
                </div>
              </div>
            </Section>

            {/* Groundedness detail */}
            <Section title="Groundedness & Hallucination">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Total Claims</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">
                      {run.groundednessDetail.totalClaims}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Grounded</p>
                    <p className="text-sm font-mono font-bold text-[#059669]">
                      {run.groundednessDetail.groundedClaims}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Unsupported</p>
                    <p className="text-sm font-mono font-bold text-[#991B1B]">
                      {run.groundednessDetail.unsupportedClaims.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Contradicted</p>
                    <p className="text-sm font-mono font-bold text-[#D97706]">
                      {run.groundednessDetail.contradictedClaims.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Uncertain</p>
                    <p className="text-sm font-mono font-bold text-[#6B7280]">
                      {run.groundednessDetail.uncertainClaims.length}
                    </p>
                  </div>
                </div>
                {run.groundednessDetail.unsupportedClaims.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider mb-1">
                      Unsupported Claims
                    </p>
                    <ul className="space-y-1">
                      {run.groundednessDetail.unsupportedClaims.map((c, i) => (
                        <li key={i} className="text-xs text-[#991B1B] bg-[#FEF2F2] rounded-lg px-3 py-1.5">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>

            {/* Uncertainty handling */}
            <Section title="Uncertainty Handling">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <VerdictBadge verdict={run.uncertaintyDetail.verdict} />
                  <p className="text-xs text-[#374151] leading-relaxed flex-1">
                    {run.uncertaintyDetail.evaluationNote}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Uncertainty Recognized', value: run.uncertaintyDetail.uncertaintyRecognized },
                    { label: 'Gaps Identified', value: run.uncertaintyDetail.insufficientEvidenceIdentified },
                    { label: 'Conflicts Identified', value: run.uncertaintyDetail.conflictingEvidenceIdentified },
                    { label: 'Uncertainty Communicated', value: run.uncertaintyDetail.uncertaintyCommunicated },
                    { label: 'Unsupported Conclusion Avoided', value: run.uncertaintyDetail.unsupportedConclusionAvoided },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={clsx(
                        'p-2.5 rounded-xl border text-center',
                        item.value
                          ? 'bg-[#F0FDF4] border-[#059669]/25 text-[#047857]'
                          : 'bg-[#FEF2F2] border-[#991B1B]/25 text-[#991B1B]'
                      )}
                    >
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                        {item.value ? '✓' : '✗'}
                      </p>
                      <p className="text-[10px] font-mono text-current">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* Tool failures & recovery */}
            <Section title="Recovery & Tool Failures">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Failures</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">
                      {run.recoveryDetail.recoverableFailures}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Recoveries</p>
                    <p className="text-sm font-mono font-bold text-[#059669]">
                      {run.recoveryDetail.successfulRecoveries}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Recovery Rate</p>
                    <p className="text-sm font-mono font-bold text-[#111827]">
                      {run.recoveryDetail.recoveryRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Fallback</p>
                    <p
                      className={clsx(
                        'text-sm font-mono font-bold',
                        run.toolFailureDetail.fallbackActivated ? 'text-[#059669]' : 'text-[#9CA3AF]'
                      )}
                    >
                      {run.toolFailureDetail.fallbackActivated ? 'ACTIVATED' : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">Replanning</p>
                    <p
                      className={clsx(
                        'text-sm font-mono font-bold',
                        run.toolFailureDetail.replanningActivated ? 'text-[#D97706]' : 'text-[#9CA3AF]'
                      )}
                    >
                      {run.toolFailureDetail.replanningActivated ? 'ACTIVATED' : 'N/A'}
                    </p>
                  </div>
                </div>
                {run.recoveryDetail.recoveryEvents.length > 0 && (
                  <div className="space-y-1.5">
                    {run.recoveryDetail.recoveryEvents.map((ev, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'p-2.5 rounded-xl border text-xs',
                          ev.success
                            ? 'bg-[#F0FDF4] border-[#059669]/25'
                            : 'bg-[#FEF2F2] border-[#991B1B]/25'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-[#374151]">{ev.agentType}</span>
                          <VerdictBadge verdict={ev.success ? 'PASS' : 'FAIL'} />
                        </div>
                        <p className="text-[#6B7280] text-[11px]">{ev.failure}</p>
                        <p className="text-[#374151] text-[11px] mt-0.5">→ {ev.recovery}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* Tool latency breakdown */}
            {Object.keys(run.metrics.toolLatencyBreakdown).length > 0 && (
              <Section title="Agent Latency Breakdown">
                <div className="space-y-2">
                  {Object.entries(run.metrics.toolLatencyBreakdown).map(([agent, ms]) => (
                    <div key={agent} className="grid grid-cols-[120px_1fr_60px] items-center gap-2">
                      <span className={clsx('text-[11px] font-mono font-bold', AgentColor(agent))}>
                        {agent}
                      </span>
                      <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[#D4AF37] rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (ms / run.metrics.totalLatencyMs) * 100)}%`,
                          }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#6B7280] text-right">{fmt(ms)}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-[120px_1fr_60px] items-center gap-2 pt-2 border-t border-[#F3F4F6]">
                    <span className="text-[11px] font-mono font-bold text-[#374151]">Total</span>
                    <div />
                    <span className="text-[11px] font-mono font-bold text-[#111827] text-right">
                      {fmt(run.metrics.totalLatencyMs)}
                    </span>
                  </div>
                </div>
              </Section>
            )}

            {/* Agent trace */}
            {run.agentTrace.length > 0 && (
              <Section title={`Agent Trace (${run.agentTrace.length} events)`}>
                <div className="space-y-1 max-h-72 overflow-y-auto custom-scroll pr-1">
                  {run.agentTrace.map((ev, i) => (
                    <div
                      key={ev.id ?? i}
                      className={clsx(
                        'flex items-start gap-2 px-3 py-2 rounded-lg text-[11px]',
                        EventTypeColor(ev.type)
                      )}
                    >
                      <span className="font-mono font-bold shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-mono font-bold text-[10px] uppercase tracking-wider">
                            {ev.type}
                          </span>
                          {ev.agentType && (
                            <span
                              className={clsx('font-mono text-[10px] font-bold', AgentColor(ev.agentType))}
                            >
                              [{ev.agentType}]
                            </span>
                          )}
                        </div>
                        <p className="text-current opacity-80 break-words">{ev.message}</p>
                        <p className="text-[10px] opacity-50 mt-0.5">
                          {new Date(ev.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Baseline comparison */}
            <Section title="Baseline Comparison">
              {run.baselineComparison.available ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">
                        Baseline Score
                      </p>
                      <p className="text-sm font-mono font-bold text-[#111827]">
                        {run.baselineComparison.baselineScore}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">
                        Score Δ
                      </p>
                      <p
                        className={clsx(
                          'text-sm font-mono font-bold',
                          (run.baselineComparison.scoreDelta ?? 0) >= 0
                            ? 'text-[#059669]'
                            : 'text-[#991B1B]'
                        )}
                      >
                        {(run.baselineComparison.scoreDelta ?? 0) >= 0 ? '+' : ''}
                        {run.baselineComparison.scoreDelta}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">
                        Groundedness Δ
                      </p>
                      <p
                        className={clsx(
                          'text-sm font-mono font-bold',
                          (run.baselineComparison.groundednessDelta ?? 0) >= 0
                            ? 'text-[#059669]'
                            : 'text-[#991B1B]'
                        )}
                      >
                        {(run.baselineComparison.groundednessDelta ?? 0) >= 0 ? '+' : ''}
                        {run.baselineComparison.groundednessDelta}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">
                        Latency Δ
                      </p>
                      <p className="text-sm font-mono font-bold text-[#111827]">
                        {fmt(Math.abs(run.baselineComparison.latencyDelta ?? 0))}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">{run.baselineComparison.note}</p>
                </div>
              ) : (
                <p className="text-xs text-[#9CA3AF] font-mono">{run.baselineComparison.note}</p>
              )}
            </Section>

            {/* Tools used */}
            {run.toolsUsed.length > 0 && (
              <Section title="Agents & Tools Used">
                <div className="flex flex-wrap gap-2">
                  {run.toolsUsed.map((t) => (
                    <span
                      key={t}
                      className={clsx(
                        'text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border',
                        'bg-[#F9FAFB] border-[#E5E7EB]',
                        AgentColor(t)
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Error (if any) */}
            {run.error && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#991B1B]/25">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#991B1B] mb-1">
                  Error
                </p>
                <p className="text-xs text-[#991B1B]">{run.error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E7EB] bg-[#FAFAF9]">
            <div className="text-[11px] font-mono text-[#9CA3AF]">
              Investigation:{' '}
              <span className="text-[#374151] font-bold">{run.investigationId}</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-mono font-bold text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors border border-[#E5E7EB]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
