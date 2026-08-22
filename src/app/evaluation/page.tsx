'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  FlaskConical,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Database,
  Zap,
  Target,
  BarChart3,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square,
  Cpu,
  AlertCircle,
} from 'lucide-react';
import { EvaluationRunModel, EvaluationScenarioType } from '@/lib/types';
import EvaluationDetailModal from '@/components/evaluation/EvaluationDetailModal';

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

const ALL_SCENARIOS: EvaluationScenarioType[] = [
  'NORMAL',
  'AMBIGUOUS',
  'ADVERSARIAL',
  'CONTRADICTORY',
  'INCOMPLETE',
  'TOOL_FAILURE',
  'REPEATED_RUN',
];

const SCENARIO_META: Record<
  EvaluationScenarioType,
  { label: string; description: string; icon: React.ElementType; color: string }
> = {
  NORMAL: {
    label: 'Normal',
    description: 'Standard research objective — baseline correctness',
    icon: CheckCircle2,
    color: 'text-[#059669]',
  },
  AMBIGUOUS: {
    label: 'Ambiguous',
    description: 'Intentionally vague objective — tests assumption handling',
    icon: AlertCircle,
    color: 'text-[#D97706]',
  },
  ADVERSARIAL: {
    label: 'Adversarial',
    description: 'Attempts to cause unsupported conclusions',
    icon: Shield,
    color: 'text-[#991B1B]',
  },
  CONTRADICTORY: {
    label: 'Contradictory',
    description: 'Conflicting evidence from multiple sources',
    icon: Zap,
    color: 'text-[#7C3AED]',
  },
  INCOMPLETE: {
    label: 'Incomplete',
    description: 'Insufficient evidence — tests uncertainty recognition',
    icon: Database,
    color: 'text-[#0891B2]',
  },
  TOOL_FAILURE: {
    label: 'Tool Failure',
    description: 'Simulates provider outage — tests fallback routing',
    icon: AlertTriangle,
    color: 'text-[#DC2626]',
  },
  REPEATED_RUN: {
    label: 'Repeated Run',
    description: 'Same objective run twice — measures consistency',
    icon: RefreshCw,
    color: 'text-[#C9A227]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

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
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border',
        map[verdict] ?? map.FAIL
      )}
    >
      {verdict}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === 'RUNNING' || status === 'PENDING') {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C9A227]" />
      </span>
    );
  }
  if (status === 'COMPLETED') return <span className="h-2 w-2 rounded-full bg-[#059669] shrink-0" />;
  if (status === 'FAILED' || status === 'ERROR') return <span className="h-2 w-2 rounded-full bg-[#991B1B] shrink-0" />;
  return <span className="h-2 w-2 rounded-full bg-[#D1D5DB] shrink-0" />;
}

function ScorePill({ value, label }: { value: number; label: string }) {
  const color =
    value >= 70
      ? 'text-[#047857] bg-[#F0FDF4] border-[#059669]/25'
      : value >= 40
      ? 'text-[#B45309] bg-[#FFFBEB] border-[#D97706]/25'
      : 'text-[#7F1D1D] bg-[#FEF2F2] border-[#991B1B]/25';
  return (
    <div className={clsx('text-center px-3 py-1.5 rounded-lg border', color)}>
      <p className="text-base font-mono font-extrabold">{value}</p>
      <p className="text-[10px] font-mono uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  runs,
  lastAt,
  delta,
}: {
  label: string;
  value: string | null;
  runs: number;
  lastAt: string | null;
  delta?: number | null;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="glass-level-1 hover:glass-level-2 p-4 rounded-xl flex flex-col gap-2 transition-all"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9CA3AF]">{label}</p>
      {value === null ? (
        <p className="text-xs text-[#D1D5DB] font-mono">No runs yet</p>
      ) : (
        <>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="text-2xl font-mono font-extrabold text-[#111827] leading-none"
          >
            {value}
          </motion.p>
          <div className="flex items-center gap-2 flex-wrap">
            {delta !== null && delta !== undefined && (
              <span
                className={clsx(
                  'text-[10px] font-mono font-bold flex items-center gap-0.5',
                  delta >= 0 ? 'text-[#059669]' : 'text-[#991B1B]'
                )}
              >
                {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {delta >= 0 ? '+' : ''}{delta}
              </span>
            )}
            <span className="text-[10px] text-[#9CA3AF] font-mono">{runs} run{runs !== 1 ? 's' : ''}</span>
          </div>
          {lastAt && (
            <p className="text-[10px] text-[#9CA3AF] font-mono">
              {new Date(lastAt).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Derive aggregate overview metrics from run list
// ─────────────────────────────────────────────────────────────────────────────

function deriveOverviewMetrics(runs: EvaluationRunModel[]) {
  const completed = runs.filter((r) => r.status === 'COMPLETED');
  if (completed.length === 0) {
    return {
      accuracy: null, taskCompletion: null, groundedness: null,
      evidenceQuality: null, recoveryRate: null, consistency: null,
      hallucinationRate: null, avgLatency: null, totalRuns: runs.length,
      lastAt: runs[0]?.createdAt ?? null,
    };
  }

  const avg = (fn: (r: EvaluationRunModel) => number) =>
    Math.round(completed.reduce((a, r) => a + fn(r), 0) / completed.length);

  const latestTwo = completed.slice(0, 2);
  const delta = (fn: (r: EvaluationRunModel) => number) =>
    latestTwo.length >= 2 ? fn(latestTwo[0]) - fn(latestTwo[1]) : null;

  return {
    accuracy: avg((r) => r.finalScore),
    taskCompletion: avg((r) => r.metrics.taskCompletion),
    groundedness: avg((r) => r.metrics.groundedness),
    evidenceQuality: avg((r) => r.metrics.evidenceQuality),
    recoveryRate: avg((r) => r.metrics.recoveryRate),
    consistency: avg((r) => r.metrics.consistency),
    hallucinationRate: avg((r) => r.metrics.hallucinationRate),
    avgLatency: avg((r) => Math.round(r.metrics.totalLatencyMs / 1000)),
    totalRuns: runs.length,
    lastAt: completed[0]?.completedAt ?? completed[0]?.createdAt ?? null,
    deltas: {
      accuracy: delta((r) => r.finalScore),
      groundedness: delta((r) => r.metrics.groundedness),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function EvaluationLabPage() {
  const [runs, setRuns] = useState<EvaluationRunModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<EvaluationScenarioType>>(
    new Set(['NORMAL'])
  );
  const [targetEntity, setTargetEntity] = useState('Company Quantum');
  const [selectedRun, setSelectedRun] = useState<EvaluationRunModel | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(false);

  // ── Fetch runs ──────────────────────────────────────────────────────────
  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/evaluation');
      const json = await res.json();
      if (json.success) setRuns(json.data ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Poll while any run is RUNNING or PENDING
  useEffect(() => {
    const hasActive = runs.some((r) => r.status === 'RUNNING' || r.status === 'PENDING');
    if (hasActive && !pollingActive) {
      setPollingActive(true);
    }
    if (!hasActive && pollingActive) {
      setPollingActive(false);
    }
  }, [runs, pollingActive]);

  useEffect(() => {
    if (!pollingActive) return;
    const interval = setInterval(fetchRuns, 3000);
    return () => clearInterval(interval);
  }, [pollingActive, fetchRuns]);

  // ── Scenario toggle ────────────────────────────────────────────────────
  function toggleScenario(s: EvaluationScenarioType) {
    setSelectedScenarios((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  function selectAll() {
    setSelectedScenarios(new Set(ALL_SCENARIOS));
  }

  function clearAll() {
    setSelectedScenarios(new Set());
  }

  // ── Launch evaluation ─────────────────────────────────────────────────
  async function launchEvaluation() {
    if (selectedScenarios.size === 0) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch('/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarios: Array.from(selectedScenarios),
          targetEntity,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Launch failed');
      // Refresh run list immediately
      await fetchRuns();
    } catch (err: any) {
      setLaunchError(err.message ?? 'Failed to launch evaluation');
    } finally {
      setLaunching(false);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────
  const overview = deriveOverviewMetrics(runs);
  const hasRuns = runs.length > 0;
  const activeRunCount = runs.filter((r) => r.status === 'RUNNING' || r.status === 'PENDING').length;

  // ── Format helpers ─────────────────────────────────────────────────────
  const fmtDate = (s?: string) =>
    s ? new Date(s).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const fmtMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F6F2] bg-ambient-gold">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container-responsive p-responsive space-y-responsive"
      >
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="border-b border-[#E5E7EB] pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/35">
                  EVALUATION
                </span>
                {activeRunCount > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#C9A227] border border-[#D4AF37]/30 flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C9A227]" />
                    </span>
                    {activeRunCount} RUNNING
                  </span>
                )}
              </div>
              <h1 className="text-responsive-3xl font-extrabold tracking-tight text-[#111827]">
                EVALUATION LAB
              </h1>
              <p className="text-sm text-[#6B7280] mt-1 max-w-xl">
                Measure RadarX agent accuracy, reliability, robustness, evidence quality, and recovery.
              </p>
            </div>

            {/* Run Evaluation CTA */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={fetchRuns}
                disabled={loading}
                className="p-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#D4AF37]/50 bg-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className={clsx('w-4 h-4 text-[#6B7280]', loading && 'animate-spin')} />
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={launchEvaluation}
                disabled={launching || selectedScenarios.size === 0}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all shadow-sm',
                  launching || selectedScenarios.size === 0
                    ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-white shadow-[#D4AF37]/25 hover:shadow-[#D4AF37]/40'
                )}
              >
                {launching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {launching ? 'Launching…' : 'Run Evaluation'}
              </motion.button>
            </div>
          </div>

          {launchError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-xl bg-[#FEF2F2] border border-[#991B1B]/25 text-xs text-[#991B1B] font-mono"
            >
              {launchError}
            </motion.div>
          )}
        </motion.div>

        {/* ── Overview Metrics ─────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">
            OVERVIEW METRICS
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <MetricCard
              label="Accuracy"
              value={overview.accuracy !== null ? `${overview.accuracy}` : null}
              runs={overview.totalRuns}
              lastAt={overview.lastAt}
              delta={(overview as any).deltas?.accuracy}
            />
            <MetricCard
              label="Task Completion"
              value={overview.taskCompletion !== null ? `${overview.taskCompletion}%` : null}
              runs={overview.totalRuns}
              lastAt={overview.lastAt}
            />
            <MetricCard
              label="Groundedness"
              value={overview.groundedness !== null ? `${overview.groundedness}%` : null}
              runs={overview.totalRuns}
              lastAt={overview.lastAt}
              delta={(overview as any).deltas?.groundedness}
            />
            <MetricCard
              label="Evidence Quality"
              value={overview.evidenceQuality !== null ? `${overview.evidenceQuality}%` : null}
              runs={overview.totalRuns}
              lastAt={overview.lastAt}
            />
            <MetricCard
              label="Recovery Rate"
              value={overview.recoveryRate !== null ? `${overview.recoveryRate}%` : null}
              runs={overview.totalRuns}
              lastAt={overview.lastAt}
            />
            <MetricCard
              label="Consistency"
              value={overview.consistency !== null ? `${overview.consistency}%` : null}
              runs={overview.totalRuns}
              lastAt={overview.lastAt}
            />
            <MetricCard
              label="Hallucination Rate"
              value={overview.hallucinationRate !== null ? `${overview.hallucinationRate}%` : null}
              runs={overview.totalRuns}
              lastAt={overview.lastAt}
            />
            <MetricCard
              label="Avg Latency"
              value={overview.avgLatency !== null ? `${overview.avgLatency}s` : null}
              runs={overview.totalRuns}
              lastAt={overview.lastAt}
            />
          </div>
        </motion.div>

        {/* ── Scenario Selector ────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="glass-level-2 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9CA3AF]">
                EVALUATION SCENARIOS
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Select which scenarios to run.{' '}
                <span className="font-semibold text-[#374151]">
                  {selectedScenarios.size} of {ALL_SCENARIOS.length} selected.
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-[11px] font-mono font-bold text-[#C9A227] hover:text-[#8C6D13] transition-colors"
              >
                Select All
              </button>
              <span className="text-[#E5E7EB]">|</span>
              <button
                onClick={clearAll}
                className="text-[11px] font-mono font-bold text-[#6B7280] hover:text-[#374151] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Target entity input */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-mono text-[#6B7280] shrink-0">Target Entity</label>
            <input
              type="text"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              className="flex-1 max-w-xs px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-mono text-[#111827] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors"
              placeholder="Company name…"
            />
          </div>

          {/* Scenario grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {ALL_SCENARIOS.map((s) => {
              const meta = SCENARIO_META[s];
              const Icon = meta.icon;
              const active = selectedScenarios.has(s);
              const hasResults = runs.some((r) => r.scenario === s && r.status === 'COMPLETED');
              const isRunning = runs.some(
                (r) => r.scenario === s && (r.status === 'RUNNING' || r.status === 'PENDING')
              );
              return (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleScenario(s)}
                  className={clsx(
                    'relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                    active
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 shadow-xs'
                      : 'bg-white border-[#E5E7EB] hover:border-[#D4AF37]/30'
                  )}
                >
                  {active ? (
                    <CheckSquare className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-[#D1D5DB] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className={clsx('w-3.5 h-3.5 shrink-0', meta.color)} />
                      <span className="text-xs font-mono font-bold text-[#111827] truncate">
                        {meta.label}
                      </span>
                      {isRunning && (
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C9A227]" />
                        </span>
                      )}
                      {hasResults && !isRunning && (
                        <CheckCircle2 className="w-3 h-3 text-[#059669] shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#9CA3AF] leading-snug">{meta.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Run selected */}
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={launchEvaluation}
              disabled={launching || selectedScenarios.size === 0}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all',
                launching || selectedScenarios.size === 0
                  ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                  : 'bg-[#111827] text-white hover:bg-[#1F2937]'
              )}
            >
              {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run Selected Tests
            </motion.button>
          </div>
        </motion.div>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9CA3AF]">
              EVALUATION RESULTS{' '}
              {hasRuns && (
                <span className="text-[#6B7280] font-normal normal-case tracking-normal">
                  ({runs.length} run{runs.length !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 glass-level-1 rounded-xl">
              <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
            </div>
          ) : !hasRuns ? (
            /* ── Empty state ─────────────────────────────────────────── */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-level-2 rounded-xl p-10 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
                <FlaskConical className="w-7 h-7 text-[#C9A227]" />
              </div>
              <h3 className="text-lg font-bold text-[#111827] mb-2">No evaluation runs yet.</h3>
              <p className="text-sm text-[#6B7280] max-w-md mx-auto mb-6 leading-relaxed">
                Run RadarX against normal, ambiguous, adversarial, contradictory, incomplete, and
                tool-failure scenarios to measure system reliability.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={launchEvaluation}
                disabled={launching || selectedScenarios.size === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-white text-sm font-mono font-bold shadow-sm hover:shadow-md transition-shadow"
              >
                <Play className="w-4 h-4" />
                Run First Evaluation
              </motion.button>
            </motion.div>
          ) : (
            /* ── Results table (desktop) + card list (mobile) ─────────── */
            <>
              {/* Desktop table */}
              <div className="hidden sm:block glass-level-1 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#F3F4F6] bg-[#FAFAF9]">
                        {[
                          'Scenario', 'Status', 'Score', 'Groundedness',
                          'Evidence Qual.', 'Recovery', 'Hallucination', 'Latency',
                          'Tools', 'When',
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#9CA3AF] whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {runs.map((run, i) => (
                          <motion.tr
                            key={run.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => setSelectedRun(run)}
                            className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAF9] cursor-pointer transition-colors group"
                          >
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const meta = SCENARIO_META[run.scenario];
                                  const Icon = meta?.icon ?? FlaskConical;
                                  return (
                                    <Icon className={clsx('w-3.5 h-3.5 shrink-0', meta?.color ?? 'text-[#6B7280]')} />
                                  );
                                })()}
                                <span className="text-xs font-mono font-bold text-[#374151] whitespace-nowrap">
                                  {SCENARIO_META[run.scenario]?.label ?? run.scenario}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <StatusDot status={run.status} />
                                <span className="text-[11px] font-mono text-[#6B7280] whitespace-nowrap">
                                  {run.status === 'RUNNING' || run.status === 'PENDING'
                                    ? run.status
                                    : <VerdictBadge verdict={run.verdict} />}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              {run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'ERROR' ? (
                                <span className="text-sm font-mono font-extrabold text-[#111827]">
                                  {run.finalScore}
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-[#D1D5DB]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-mono text-[#374151]">
                                {run.status === 'COMPLETED' ? `${run.metrics.groundedness}%` : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-mono text-[#374151]">
                                {run.status === 'COMPLETED' ? `${run.metrics.evidenceQuality}%` : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-mono text-[#374151]">
                                {run.status === 'COMPLETED' ? `${run.metrics.recoveryRate}%` : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-mono text-[#374151]">
                                {run.status === 'COMPLETED' ? `${run.metrics.hallucinationRate}%` : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-mono text-[#374151]">
                                {run.status === 'COMPLETED'
                                  ? fmtMs(run.metrics.totalLatencyMs)
                                  : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-mono text-[#374151]">
                                {run.toolsUsed.length > 0 ? run.toolsUsed.length : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-mono text-[#9CA3AF] whitespace-nowrap">
                                {fmtDate(run.createdAt)}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden space-y-3">
                {runs.map((run, i) => {
                  const meta = SCENARIO_META[run.scenario];
                  const Icon = meta?.icon ?? FlaskConical;
                  return (
                    <motion.div
                      key={run.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelectedRun(run)}
                      className="glass-level-1 rounded-xl p-4 cursor-pointer hover:glass-level-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={clsx('w-4 h-4 shrink-0', meta?.color ?? 'text-[#6B7280]')} />
                          <span className="text-sm font-mono font-bold text-[#111827] truncate">
                            {meta?.label ?? run.scenario}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusDot status={run.status} />
                          {run.status === 'COMPLETED' && <VerdictBadge verdict={run.verdict} />}
                        </div>
                      </div>
                      {run.status === 'COMPLETED' && (
                        <div className="flex flex-wrap gap-2">
                          <ScorePill value={run.finalScore} label="Score" />
                          <ScorePill value={run.metrics.groundedness} label="Ground" />
                          <ScorePill value={run.metrics.recoveryRate} label="Recovery" />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] font-mono text-[#9CA3AF]">
                          {fmtDate(run.createdAt)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#D1D5DB]" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* ── Active run progress banner ───────────────────────────────────── */}
        <AnimatePresence>
          {activeRunCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="glass-level-2 rounded-xl p-4 border border-[#D4AF37]/30"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Cpu className="w-5 h-5 text-[#C9A227]" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-bold text-[#374151]">
                    {activeRunCount} evaluation run{activeRunCount !== 1 ? 's' : ''} in progress
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    LangGraph agents executing — results will appear automatically when complete.
                  </p>
                </div>
                <Loader2 className="w-4 h-4 text-[#D4AF37] animate-spin shrink-0" />
              </div>
              {/* Per-run status pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {runs
                  .filter((r) => r.status === 'RUNNING' || r.status === 'PENDING')
                  .map((r) => {
                    const meta = SCENARIO_META[r.scenario];
                    return (
                      <span
                        key={r.id}
                        className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#8C6D13] border border-[#D4AF37]/25"
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C9A227]" />
                        </span>
                        {meta?.label ?? r.scenario}
                      </span>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Detail modal ──────────────────────────────────────────────────── */}
      {selectedRun && (
        <EvaluationDetailModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  );
}
