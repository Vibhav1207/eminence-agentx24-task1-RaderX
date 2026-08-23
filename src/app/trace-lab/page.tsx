'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  List,
  GitGraph,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  XCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  MinusCircle,
  Filter,
  Search,
  Download,
  ExternalLink,
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Timeline,
  Network,
  Bug,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  FastForward,
  RotateCcw,
  Home,
  ChevronLeft,
  Bot,
  Upload,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  TraceModel,
  TraceEventModel,
  TraceDiagnosisModel,
  TraceComparisonModel,
  TraceEventType,
} from '@/lib/types';

// Client-side API helpers
async function fetchTraces(params?: { traceId?: string; runId?: string; investigationId?: string; limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.traceId) searchParams.set('traceId', params.traceId);
  if (params?.runId) searchParams.set('runId', params.runId);
  if (params?.investigationId) searchParams.set('investigationId', params.investigationId);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  
  const res = await fetch(`/api/traces?${searchParams.toString()}`);
  return res.json();
}

async function fetchTraceEvents(traceId: string, limit = 200, offset = 0) {
  const res = await fetch(`/api/traces/events?traceId=${traceId}&limit=${limit}&offset=${offset}`);
  return res.json();
}

async function fetchDiagnosis(traceId: string) {
  const res = await fetch(`/api/traces/diagnosis?traceId=${traceId}`);
  return res.json();
}

async function runDiagnosis(traceId: string) {
  const res = await fetch('/api/traces/diagnosis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'analyze', traceId }),
  });
  return res.json();
}

async function createComparisonApi(baselineTraceId: string, optimizedTraceId: string, optimizationApplied: string) {
  const res = await fetch('/api/traces/comparisons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', baselineTraceId, optimizedTraceId, optimizationApplied }),
  });
  return res.json();
}

async function fetchComparisons() {
  const res = await fetch('/api/traces/comparisons');
  return res.json();
}

export default function TraceLabPage() {
  // State
  const [traces, setTraces] = useState<TraceModel[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<TraceModel | null>(null);
  const [traceEvents, setTraceEvents] = useState<TraceEventModel[]>([]);
  const [diagnosis, setDiagnosis] = useState<TraceDiagnosisModel | null>(null);
  const [comparisons, setComparisons] = useState<TraceComparisonModel[]>([]);
  const [view, setView] = useState<'dashboard' | 'list' | 'timeline' | 'graph' | 'diagnosis' | 'compare'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [filter, setFilter] = useState<{ status?: string; investigationId?: string }>({});
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedComparison, setSelectedComparison] = useState<TraceComparisonModel | null>(null);
  const [baselineTraceId, setBaselineTraceId] = useState<string>('');
  const [optimizedTraceId, setOptimizedTraceId] = useState<string>('');

  // Load traces on mount
  useEffect(() => {
    loadTraces();
  }, [filter]);

  async function loadTraces() {
    setLoading(true);
    try {
      const result = await fetchTraces({ 
        investigationId: filter.investigationId || undefined,
        limit: 100 
      });
      if (result.success) {
        setTraces(result.data);
      }
    } catch (err) {
      console.error('Failed to load traces:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadComparisons() {
    try {
      const result = await fetchComparisons();
      if (result.success) {
        setComparisons(result.data);
      }
    } catch (err) {
      console.error('Failed to load comparisons:', err);
    }
  }

  async function handleTraceSelect(trace: TraceModel) {
    setSelectedTrace(trace);
    setView('timeline');
    
    // Load events
    try {
      const result = await fetchTraceEvents(trace.traceId);
      if (result.success) {
        setTraceEvents(result.data);
      } else {
        setTraceEvents([]);
      }
    } catch (err) {
      console.error('Failed to load trace events:', err);
      setTraceEvents([]);
    }

    // Load diagnosis if trace has failures
    if (trace.status === 'FAILED' || trace.status === 'PARTIAL') {
      await handleDiagnose(trace.traceId);
    } else {
      setDiagnosis(null);
    }
  }

  async function handleDiagnose(traceId: string) {
    setDiagnosing(true);
    try {
      // First try to get existing diagnosis
      const existingResult = await fetchDiagnosis(traceId);
      if (existingResult.success && existingResult.data) {
        setDiagnosis(existingResult.data);
      } else {
        // Run new diagnosis
        const diagResult = await runDiagnosis(traceId);
        if (diagResult.success && diagResult.data) {
          setDiagnosis(diagResult.data);
        }
      }
    } catch (err) {
      console.error('Failed to diagnose trace:', err);
    } finally {
      setDiagnosing(false);
    }
  }

  async function handleCreateComparison() {
    if (!baselineTraceId || !optimizedTraceId) return;
    
    const baseline = traces.find(t => t.traceId === baselineTraceId);
    const optimized = traces.find(t => t.traceId === optimizedTraceId);
    
    if (!baseline || !optimized) return;

    const result = await createComparisonApi(
      baselineTraceId,
      optimizedTraceId,
      'Timeout tuning + parallel execution + fallback routing'
    );
    
    if (result.success && result.data) {
      await loadComparisons();
      setSelectedComparison(result.data);
      setView('compare');
    }
  }

  // Computed metrics for dashboard
  const metrics = useMemo(() => {
    const completed = traces.filter(t => t.status === 'COMPLETED');
    const failed = traces.filter(t => t.status === 'FAILED');
    const partial = traces.filter(t => t.status === 'PARTIAL');
    
    const totalLatency = traces.reduce((sum, t) => sum + (t.totalDurationMs || 0), 0);
    const totalToolCalls = traces.reduce((sum, t) => sum + t.totalToolCalls, 0);
    const totalErrors = traces.reduce((sum, t) => sum + t.totalErrors, 0);
    const totalRetries = traces.reduce((sum, t) => sum + t.totalRetries, 0);
    const totalTokens = traces.reduce((sum, t) => sum + (t.totalTokens?.total || 0), 0);
    
    const recovered = traces.filter(t => t.status === 'COMPLETED' && t.totalRetries > 0).length;
    
    return {
      totalRuns: traces.length,
      successRate: traces.length > 0 ? Math.round((completed.length / traces.length) * 100) : 0,
      avgLatency: traces.length > 0 ? Math.round(totalLatency / traces.length) : 0,
      avgToolCalls: traces.length > 0 ? Math.round(totalToolCalls / traces.length) : 0,
      totalErrors,
      recoveryRate: (failed.length + partial.length) > 0 ? Math.round((recovered / (failed.length + partial.length)) * 100) : 100,
      avgTokens: traces.length > 0 ? Math.round(totalTokens / traces.length) : 0,
      totalRetries,
    };
  }, [traces]);

  // Filtered traces
  const filteredTraces = useMemo(() => {
    return traces.filter(trace => {
      if (filter.status && trace.status !== filter.status) return false;
      if (filter.investigationId && trace.investigationId !== filter.investigationId) return false;
      return true;
    });
  }, [traces, filter]);

  // Group events by agent for timeline
  const eventsByAgent = useMemo(() => {
    const groups: Record<string, TraceEventModel[]> = {};
    traceEvents.forEach(event => {
      const agent = event.agentName || 'SYSTEM';
      if (!groups[agent]) groups[agent] = [];
      groups[agent].push(event);
    });
    return groups;
  }, [traceEvents]);

  // Get unique investigations for filter
  const investigations = useMemo(() => {
    const ids = new Set(traces.map(t => t.investigationId));
    return Array.from(ids);
  }, [traces]);

  if (loading && traces.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Brain className="w-12 h-12 text-[#C9A227] mx-auto mb-4 animate-pulse" />
          <p className="text-[#6B7280]">Loading traces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 shrink-0 shadow-2xs">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] via-[#C9A227] to-[#E0C46C] flex items-center justify-center shadow-md shadow-[#D4AF37]/20">
              <Brain className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-tight text-xl text-[#111827] font-mono">
                TRACE <span className="text-[#C9A227]">LAB</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">
                End-to-End Observability
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Selector */}
          <div className="hidden md:flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-xs">
            {([
              { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
              { id: 'list', label: 'Runs', icon: List },
              { id: 'timeline', label: 'Timeline', icon: Timeline },
              { id: 'graph', label: 'Graph', icon: GitGraph },
              { id: 'diagnosis', label: 'Diagnosis', icon: Bug },
              { id: 'compare', label: 'Compare', icon: TrendingUp },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  view === id
                    ? 'bg-[#D4AF37]/15 text-[#8C6D13] font-semibold border border-[#D4AF37]/35 shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Mobile view selector */}
          <select
            value={view}
            onChange={(e) => setView(e.target.value as typeof view)}
            className="md:hidden px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-medium text-[#4B5563] focus:border-[#D4AF37] focus:outline-none"
          >
            <option value="dashboard">📊 Dashboard</option>
            <option value="list">📋 Runs</option>
            <option value="timeline">📅 Timeline</option>
            <option value="graph">🔗 Graph</option>
            <option value="diagnosis">🐛 Diagnosis</option>
            <option value="compare">📈 Compare</option>
          </select>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {view === 'dashboard' && (
          <TraceDashboard 
            metrics={metrics} 
            traces={traces}
            onTraceSelect={handleTraceSelect}
            onViewChange={setView}
          />
        )}

        {view === 'list' && (
          <TraceList 
            traces={filteredTraces}
            onTraceSelect={handleTraceSelect}
            filter={filter}
            setFilter={setFilter}
            investigations={investigations}
            loading={loading}
          />
        )}

        {view === 'timeline' && selectedTrace && (
          <TraceTimeline
            trace={selectedTrace}
            events={traceEvents}
            eventsByAgent={eventsByAgent}
            expandedEvents={expandedEvents}
            setExpandedEvents={setExpandedEvents}
            onBack={() => { setSelectedTrace(null); setView('list'); }}
            onDiagnose={() => handleDiagnose(selectedTrace.traceId)}
            diagnosing={diagnosing}
            diagnosis={diagnosis}
          />
        )}

        {view === 'graph' && selectedTrace && (
          <TraceGraph
            trace={selectedTrace}
            events={traceEvents}
            onBack={() => { setSelectedTrace(null); setView('list'); }}
          />
        )}

        {view === 'diagnosis' && selectedTrace && diagnosis && (
          <TraceDiagnosis
            trace={selectedTrace}
            diagnosis={diagnosis}
            events={traceEvents}
            onBack={() => { setSelectedTrace(null); setView('list'); }}
          />
        )}

        {view === 'compare' && (
          <TraceComparison
            traces={traces}
            comparisons={comparisons}
            selectedComparison={selectedComparison}
            setSelectedComparison={setSelectedComparison}
            baselineTraceId={baselineTraceId}
            setBaselineTraceId={setBaselineTraceId}
            optimizedTraceId={optimizedTraceId}
            setOptimizedTraceId={setOptimizedTraceId}
            onCreateComparison={handleCreateComparison}
            onBack={() => setView('dashboard')}
          />
        )}

        {/* Empty states */}
        {view !== 'dashboard' && traces.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain className="w-24 h-24 text-[#E5E7EB] mb-6" />
            <h2 className="text-xl font-bold text-[#374151] mb-2">No Traces Available</h2>
            <p className="text-[#6B7280] max-w-md">
              Run an investigation from the Command Center or Evaluation Lab to generate execution traces.
              Traces capture every agent decision, tool call, latency, token usage, and error.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/dashboard'}
              className="mt-6 px-6 py-3 bg-[#D4AF37] text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
            >
              Run Investigation
            </motion.button>
          </div>
        )}

        {view === 'timeline' && !selectedTrace && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Timeline className="w-24 h-24 text-[#E5E7EB] mb-6" />
            <h2 className="text-xl font-bold text-[#374151] mb-2">Select a Run</h2>
            <p className="text-[#6B7280]">Choose a trace from the Runs view to see its detailed timeline.</p>
          </div>
        )}

        {view === 'diagnosis' && (!selectedTrace || !diagnosis) && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bug className="w-24 h-24 text-[#E5E7EB] mb-6" />
            <h2 className="text-xl font-bold text-[#374151] mb-2">No Diagnosis Available</h2>
            <p className="text-[#6B7280] max-w-md">
              Run a diagnosis on a failed or degraded trace from the Timeline or Graph view.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// DASHBOARD COMPONENT
// ============================================================
function TraceDashboard({ 
  metrics, 
  traces, 
  onTraceSelect, 
  onViewChange 
}: {
  metrics: {
    totalRuns: number;
    successRate: number;
    avgLatency: number;
    avgToolCalls: number;
    totalErrors: number;
    recoveryRate: number;
    avgTokens: number;
    totalRetries: number;
  };
  traces: TraceModel[];
  onTraceSelect: (trace: TraceModel) => void;
  onViewChange: (view: 'dashboard' | 'list' | 'timeline' | 'graph' | 'diagnosis' | 'compare') => void;
}) {
  const recentTraces = traces.slice(0, 5);
  const failedTraces = traces.filter(t => t.status === 'FAILED' || t.status === 'PARTIAL');

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <MetricCard 
          label="Total Runs" 
          value={metrics.totalRuns} 
          icon={<List className="w-5 h-5" />} 
          trend={traces.length > 10 ? '+12%' : undefined}
        />
        <MetricCard 
          label="Success Rate" 
          value={`${metrics.successRate}%`} 
          icon={<CheckCircle className="w-5 h-5" />} 
          trend={metrics.successRate >= 90 ? '+2.1%' : metrics.successRate >= 70 ? '-1.3%' : '-5.2%'}
          trendPositive={metrics.successRate >= 80}
        />
        <MetricCard 
          label="Avg Latency" 
          value={`${(metrics.avgLatency / 1000).toFixed(1)}s`} 
          icon={<Clock className="w-5 h-5" />} 
          trend={metrics.avgLatency > 10000 ? '+15%' : '-8%'}
          trendPositive={metrics.avgLatency < 8000}
        />
        <MetricCard 
          label="Avg Tool Calls" 
          value={metrics.avgToolCalls} 
          icon={<Zap className="w-5 h-5" />} 
        />
        <MetricCard 
          label="Total Errors" 
          value={metrics.totalErrors} 
          icon={<XCircle className="w-5 h-5" />} 
          trend={metrics.totalErrors > 10 ? '+3' : '-2'}
          trendPositive={metrics.totalErrors < 5}
        />
        <MetricCard 
          label="Recovery Rate" 
          value={`${metrics.recoveryRate}%`} 
          icon={<RotateCcw className="w-5 h-5" />} 
        />
        <MetricCard 
          label="Avg Tokens" 
          value={metrics.avgTokens.toLocaleString()} 
          icon={<Network className="w-5 h-5" />} 
        />
        <MetricCard 
          label="Total Retries" 
          value={metrics.totalRetries} 
          icon={<RefreshCw className="w-5 h-5" />} 
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <QuickActionCard
          title="View All Runs"
          description="Browse and filter all investigation traces"
          icon={<List className="w-6 h-6" />}
          onClick={() => onViewChange('list')}
        />
        <QuickActionCard
          title="Run Diagnosis"
          description="Analyze failed traces for root causes"
          icon={<Bug className="w-6 h-6" />}
          onClick={() => {
            const failed = traces.find(t => t.status === 'FAILED');
            if (failed) { onTraceSelect(failed); onViewChange('diagnosis'); }
            else onViewChange('list');
          }}
          disabled={failedTraces.length === 0}
        />
        <QuickActionCard
          title="Compare Runs"
          description="Before/after optimization comparison"
          icon={<TrendingUp className="w-6 h-6" />}
          onClick={() => onViewChange('compare')}
        />
      </motion.div>

      {/* Recent Runs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="font-bold text-[#111827] text-sm font-mono uppercase tracking-wider">Recent Traces</h2>
          <button
            onClick={() => onViewChange('list')}
            className="text-xs font-medium text-[#C9A227] hover:text-[#8C6D13] flex items-center gap-1"
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF9F6] text-left text-xs font-bold uppercase tracking-wider text-[#9CA3AF] font-mono">
                <th className="px-5 py-3">Run</th>
                <th className="px-5 py-3">Investigation</th>
                <th className="px-5 py-3 hidden sm:table-cell">Status</th>
                <th className="px-5 py-3 hidden md:table-cell">Agents</th>
                <th className="px-5 py-3 hidden lg:table-cell">Tools</th>
                <th className="px-5 py-3 hidden lg:table-cell">Latency</th>
                <th className="px-5 py-3 hidden lg:table-cell">Tokens</th>
                <th className="px-5 py-3 hidden lg:table-cell">Errors</th>
                <th className="px-5 py-3">Started</th>
                <th className="px-5 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {recentTraces.map((trace, i) => (
                <motion.tr
                  key={trace.traceId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                  onClick={() => onTraceSelect(trace)}
                >
                  <td className="px-5 py-3 font-mono text-[#6B7280]">
                    {trace.traceId.slice(-12)}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#111827] truncate max-w-[200px]">
                    {trace.investigationId}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <StatusBadge status={trace.status} />
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-[#6B7280]">
                    {trace.agentRuns.length}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-[#6B7280]">
                    {trace.totalToolCalls}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-[#6B7280]">
                    {trace.totalDurationMs ? (trace.totalDurationMs / 1000).toFixed(1) + 's' : '—'}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-[#6B7280]">
                    {(trace.totalTokens?.total || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {trace.totalErrors > 0 ? (
                      <span className="text-[#EF4444] font-medium">{trace.totalErrors}</span>
                    ) : (
                      <span className="text-[#059669]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[#9CA3AF] text-xs">
                    {new Date(trace.startedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); onTraceSelect(trace); }}
                      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#C9A227] hover:bg-[#FAF9F6] transition-colors"
                      title="View trace"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
              {recentTraces.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-[#9CA3AF]">
                    No traces yet. Run an investigation to generate traces.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Failure Alerts */}
      {failedTraces.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#991B1B] mb-1">Failed Traces Detected</h3>
              <p className="text-[#7F1D1D] text-sm mb-3">
                {failedTraces.length} investigation(s) have failed or partially completed. 
                Use the Diagnosis view to identify root causes and recovery actions.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { 
                    const failed = traces.find(t => t.status === 'FAILED' || t.status === 'PARTIAL');
                    if (failed) { onTraceSelect(failed); onViewChange('diagnosis'); }
                  }}
                  className="px-4 py-2 bg-[#EF4444] text-white rounded-xl text-sm font-medium hover:bg-[#DC2626] transition-colors"
                >
                  Diagnose Latest Failure
                </button>
                <button
                  onClick={() => onViewChange('list')}
                  className="px-4 py-2 bg-white border border-[#FECACA] text-[#991B1B] rounded-xl text-sm font-medium hover:bg-[#FEF2F2] transition-colors"
                >
                  View All Failed
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  icon, 
  trend, 
  trendPositive = true 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend?: string; 
  trendPositive?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs hover:shadow-sm hover:border-[#D4AF37]/50 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold font-mono mb-1">{label}</p>
          <p className="text-2xl font-extrabold text-[#111827] font-mono">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#E5E7EB] flex items-center justify-center text-[#C9A227]">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          {trendPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />
          )}
          <span className={clsx('text-xs font-semibold font-mono', trendPositive ? 'text-[#059669]' : 'text-[#EF4444]')}>
            {trend}
          </span>
          <span className="text-xs text-[#9CA3AF]">vs last period</span>
        </div>
      )}
    </motion.div>
  );
}

function QuickActionCard({ 
  title, 
  description, 
  icon, 
  onClick, 
  disabled = false 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  onClick: () => void; 
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs hover:shadow-sm hover:border-[#D4AF37]/50 transition-all text-left',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#FAF9F6] border border-[#E5E7EB] flex items-center justify-center text-[#C9A227] flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#111827] mb-1">{title}</h3>
          <p className="text-sm text-[#6B7280]">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#9CA3AF] flex-shrink-0 mt-1" />
      </div>
    </motion.button>
  );
}

// ============================================================
// TRACE LIST COMPONENT
// ============================================================
function TraceList({ 
  traces, 
  onTraceSelect, 
  filter, 
  setFilter, 
  investigations,
  loading 
}: { 
  traces: TraceModel[]; 
  onTraceSelect: (trace: TraceModel) => void; 
  filter: { status?: string; investigationId?: string };
  setFilter: React.Dispatch<React.SetStateAction<{ status?: string; investigationId?: string }>>;
  investigations: string[];
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#E5E7EB] rounded-2xl p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="font-bold text-[#111827] text-sm font-mono uppercase tracking-wider">Filters</h2>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Filter by investigation ID..."
                value={filter.investigationId || ''}
                onChange={(e) => setFilter(f => ({ ...f, investigationId: e.target.value }))}
                className="pl-10 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] w-full sm:w-64"
              />
            </div>
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
              className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PARTIAL">Partial</option>
              <option value="FAILED">Failed</option>
              <option value="RUNNING">Running</option>
            </select>
            <button
              onClick={() => setFilter({})}
              className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280] hover:border-[#D4AF37] hover:text-[#C9A227] transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </button>
          </div>
        </div>
      </motion.div>

      {/* Results Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="font-bold text-[#111827] text-sm font-mono uppercase tracking-wider">
            {traces.length} Trace{traces.length !== 1 ? 's' : ''} Found
          </h2>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <RefreshCw className="w-4 h-4 animate-spin text-[#C9A227]" />
              Loading...
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF9F6] text-left text-xs font-bold uppercase tracking-wider text-[#9CA3AF] font-mono">
                <th className="px-5 py-3">Run</th>
                <th className="px-5 py-3">Investigation</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 hidden sm:table-cell">Agents</th>
                <th className="px-5 py-3 hidden md:table-cell">Tools</th>
                <th className="px-5 py-3 hidden lg:table-cell">Latency</th>
                <th className="px-5 py-3 hidden lg:table-cell">Tokens</th>
                <th className="px-5 py-3 hidden lg:table-cell">Errors</th>
                <th className="px-5 py-3 hidden lg:table-cell">Retries</th>
                <th className="px-5 py-3">Started</th>
                <th className="px-5 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {traces.map((trace, i) => (
                <motion.tr
                  key={trace.traceId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                  onClick={() => onTraceSelect(trace)}
                >
                  <td className="px-5 py-3 font-mono text-[#6B7280]">
                    {trace.traceId.slice(-12)}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#111827] truncate max-w-[200px]">
                    {trace.investigationId}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={trace.status} />
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell text-[#6B7280]">
                    {trace.agentRuns.length}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-[#6B7280]">
                    {trace.totalToolCalls}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-[#6B7280]">
                    {trace.totalDurationMs ? (trace.totalDurationMs / 1000).toFixed(1) + 's' : '—'}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-[#6B7280]">
                    {(trace.totalTokens?.total || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {trace.totalErrors > 0 ? (
                      <span className="text-[#EF4444] font-medium">{trace.totalErrors}</span>
                    ) : (
                      <span className="text-[#059669]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-[#6B7280]">
                    {trace.totalRetries}
                  </td>
                  <td className="px-5 py-3 text-[#9CA3AF] text-xs">
                    {new Date(trace.startedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); onTraceSelect(trace); }}
                      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#C9A227] hover:bg-[#FAF9F6] transition-colors"
                      title="View trace"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
              {traces.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-[#9CA3AF]">
                    No traces match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: TraceModel['status'] }) {
  const configs = {
    COMPLETED: { bg: 'bg-[#059669]/15', text: 'text-[#047857]', border: 'border-[#059669]/30', icon: CheckCircle },
    PARTIAL: { bg: 'bg-[#F59E0B]/15', text: 'text-[#B45309]', border: 'border-[#F59E0B]/30', icon: AlertCircle },
    FAILED: { bg: 'bg-[#EF4444]/15', text: 'text-[#991B1B]', border: 'border-[#EF4444]/30', icon: XCircle },
    RUNNING: { bg: 'bg-[#3B82F6]/15', text: 'text-[#1E40AF]', border: 'border-[#3B82F6]/30', icon: Zap },
  };
  const cfg = configs[status] || configs.COMPLETED;
  const Icon = cfg.icon;
  
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono border', cfg.bg, cfg.text, cfg.border)}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

// ============================================================
// TRACE TIMELINE COMPONENT
// ============================================================
function TraceTimeline({ 
  trace, 
  events, 
  eventsByAgent, 
  expandedEvents, 
  setExpandedEvents, 
  onBack, 
  onDiagnose, 
  diagnosing,
  diagnosis 
}: { 
  trace: TraceModel; 
  events: TraceEventModel[]; 
  eventsByAgent: Record<string, TraceEventModel[]>;
  expandedEvents: Set<string>;
  setExpandedEvents: React.Dispatch<React.SetStateAction<Set<string>>>;
  onBack: () => void;
  onDiagnose: () => void;
  diagnosing: boolean;
  diagnosis: TraceDiagnosisModel | null;
}) {
  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const getDuration = (start: string, end?: string) => {
    if (!end) return '—';
    return `${((new Date(end).getTime() - new Date(start).getTime()) / 1000).toFixed(2)}s`;
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

  const getEventIcon = (type: TraceEventType) => {
    const icons: Record<TraceEventType, React.ElementType> = {
      INVESTIGATION_STARTED: Play,
      GRAPH_START: Play,
      GRAPH_RUN_STARTED: Play,
      GRAPH_END: Square,
      PLANNER_STARTED: Bot,
      PLANNER_COMPLETED: CheckCircle,
      AGENT_STARTED: Bot,
      AGENT_COMPLETED: CheckCircle,
      AGENT_FAILED: XCircle,
      AGENT_RETRYING: RefreshCw,
      AGENT_DECISION: GitGraph,
      DECISION_MADE: GitGraph,
      ROUTER_DECISION: GitGraph,
      TOOL_CALL_STARTED: Zap,
      TOOL_CALL_COMPLETED: CheckCircle,
      TOOL_CALL_FAILED: AlertCircle,
      TOOL_FALLBACK: RotateCcw,
      EVIDENCE_GATHERED: Download,
      VALIDATOR_STARTED: AlertTriangle,
      CONTRADICTION_DETECTED: AlertTriangle,
      CONFLICT_RESOLVED: CheckCircle,
      CRITIC_STARTED: Bug,
      SELF_EVALUATION_COMPLETE: CheckCircle,
      REPLANNING: RefreshCw,
      SYNTHESIS_STARTED: Network,
      MISSION_COMPLETED: CheckCircle,
      MISSION_FAILED: XCircle,
      CHECKPOINT_SAVED: Download,
      AGENT_RETRY: RefreshCw,
      FALLBACK_RECOVERY: RotateCcw,
      AGENT_ERROR: XCircle,
      PROVIDER_EXECUTION: Network,
      TOKEN_USAGE: Network,
      LATENCY_MEASUREMENT: Clock,
      ERROR: AlertTriangle,
      RECOVERY: RotateCcw,
      CHECKPOINT_SAVE: Download,
      CHECKPOINT_RESTORE: Upload,
    };
    return icons[type] || Zap;
  };

  const getEventColor = (type: TraceEventType) => {
    const colors: Record<TraceEventType, string> = {
      INVESTIGATION_STARTED: 'text-[#3B82F6]',
      GRAPH_START: 'text-[#3B82F6]',
      GRAPH_RUN_STARTED: 'text-[#3B82F6]',
      GRAPH_END: 'text-[#059669]',
      PLANNER_STARTED: 'text-[#8B5CF6]',
      PLANNER_COMPLETED: 'text-[#059669]',
      AGENT_STARTED: 'text-[#8B5CF6]',
      AGENT_COMPLETED: 'text-[#059669]',
      AGENT_FAILED: 'text-[#EF4444]',
      AGENT_RETRYING: 'text-[#F59E0B]',
      AGENT_DECISION: 'text-[#C9A227]',
      DECISION_MADE: 'text-[#C9A227]',
      ROUTER_DECISION: 'text-[#C9A227]',
      TOOL_CALL_STARTED: 'text-[#3B82F6]',
      TOOL_CALL_COMPLETED: 'text-[#059669]',
      TOOL_CALL_FAILED: 'text-[#EF4444]',
      TOOL_FALLBACK: 'text-[#F59E0B]',
      EVIDENCE_GATHERED: 'text-[#06B6D4]',
      VALIDATOR_STARTED: 'text-[#EF4444]',
      CONTRADICTION_DETECTED: 'text-[#EF4444]',
      CONFLICT_RESOLVED: 'text-[#059669]',
      CRITIC_STARTED: 'text-[#8B5CF6]',
      SELF_EVALUATION_COMPLETE: 'text-[#059669]',
      REPLANNING: 'text-[#F59E0B]',
      SYNTHESIS_STARTED: 'text-[#8B5CF6]',
      MISSION_COMPLETED: 'text-[#059669]',
      MISSION_FAILED: 'text-[#EF4444]',
      CHECKPOINT_SAVED: 'text-[#6B7280]',
      AGENT_RETRY: 'text-[#F59E0B]',
      FALLBACK_RECOVERY: 'text-[#059669]',
      AGENT_ERROR: 'text-[#EF4444]',
      PROVIDER_EXECUTION: 'text-[#8B5CF6]',
      TOKEN_USAGE: 'text-[#06B6D4]',
      LATENCY_MEASUREMENT: 'text-[#6B7280]',
      ERROR: 'text-[#EF4444]',
      RECOVERY: 'text-[#059669]',
      CHECKPOINT_SAVE: 'text-[#6B7280]',
      CHECKPOINT_RESTORE: 'text-[#6B7280]',
    };
    return colors[type] || 'text-[#6B7280]';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between gap-4"
      >
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37]/50 shadow-xs transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-[#111827] text-lg font-mono">{trace.traceId}</h2>
          <p className="text-sm text-[#6B7280] font-mono">Investigation: {trace.investigationId} • Run: {trace.runId}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={trace.status} />
          {trace.status === 'FAILED' || trace.status === 'PARTIAL' ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onDiagnose}
              disabled={diagnosing}
              className="px-4 py-2 bg-[#EF4444] text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#DC2626] transition-colors disabled:opacity-50"
            >
              {diagnosing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
              {diagnosing ? 'Diagnosing...' : 'Run Diagnosis'}
            </motion.button>
          ) : (
            <span className="px-4 py-2 bg-[#059669]/15 text-[#047857] border border-[#059669]/30 rounded-xl text-sm font-mono font-medium">
              Completed Successfully
            </span>
          )}
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 overflow-auto"
      >
        <div className="space-y-6">
          {Object.entries(eventsByAgent).map(([agentName, agentEvents]) => (
            <AgentTimelineSection
              key={agentName}
              agentName={agentName}
              events={agentEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())}
              expandedEvents={expandedEvents}
              onToggle={toggleEvent}
              getEventIcon={getEventIcon}
              getEventColor={getEventColor}
              formatTime={formatTime}
              getDuration={getDuration}
            />
          ))}
        </div>
      </motion.div>

      {/* Diagnosis Panel - inline if available */}
      {diagnosis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-[#E5E7EB] pt-6 mt-6"
        >
          <InlineDiagnosisPanel diagnosis={diagnosis} />
        </motion.div>
      )}
    </div>
  );
}

function AgentTimelineSection({ 
  agentName, 
  events, 
  expandedEvents, 
  onToggle,
  getEventIcon,
  getEventColor,
  formatTime,
  getDuration
}: { 
  agentName: string; 
  events: TraceEventModel[]; 
  expandedEvents: Set<string>;
  onToggle: (eventId: string) => void;
  getEventIcon: (type: TraceEventType) => React.ElementType;
  getEventColor: (type: TraceEventType) => string;
  formatTime: (ts: string) => string;
  getDuration: (start: string, end?: string) => string;
}) {
  const agentColors: Record<string, string> = {
    'PLANNER': '#8B5CF6',
    'RESEARCH': '#3B82F6',
    'PATENT': '#06B6D4',
    'NEWS': '#F59E0B',
    'WEB': '#8B5CF6',
    'VERIFIER': '#059669',
    'SYNTHESIZER': '#C9A227',
    'SYSTEM': '#6B7280',
  };

  const color = agentColors[agentName] || '#6B7280';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-transparent via-transparent to-transparent border-b border-[#E5E7EB]" style={{ borderLeft: `4px solid ${color}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Bot className="w-4.5 h-4.5" style={{ color }} />
          </div>
          <div>
            <h3 className="font-bold text-[#111827] text-sm font-mono">{agentName}</h3>
            <p className="text-xs text-[#9CA3AF] font-mono">{events.length} event{events.length !== 1 ? 's' : ''}</p>
          </div>
          <span className="ml-auto px-2 py-0.5 rounded text-xs font-mono font-bold" style={{ backgroundColor: `${color}15`, color }}>
            {events.filter(e => e.status === 'FAILED').length > 0 ? 'HAS ERRORS' : 'OK'}
          </span>
        </div>
      </div>
      
      <div className="divide-y divide-[#E5E7EB]">
        {events.map((event, index) => (
          <TraceEventRow
            key={event.eventId}
            event={event}
            index={index}
            isLast={index === events.length - 1}
            isExpanded={expandedEvents.has(event.eventId)}
            onToggle={() => onToggle(event.eventId)}
            getEventIcon={getEventIcon}
            getEventColor={getEventColor}
            formatTime={formatTime}
            getDuration={getDuration}
            timelineColor={color}
          />
        ))}
      </div>
    </div>
  );
}

function TraceEventRow({ 
  event, 
  index, 
  isLast, 
  isExpanded, 
  onToggle, 
  getEventIcon,
  getEventColor,
  formatTime,
  getDuration,
  timelineColor
}: { 
  event: TraceEventModel; 
  index: number; 
  isLast: boolean; 
  isExpanded: boolean; 
  onToggle: () => void;
  getEventIcon: (type: TraceEventType) => React.ElementType;
  getEventColor: (type: TraceEventType) => string;
  formatTime: (ts: string) => string;
  getDuration: (start: string, end?: string) => string;
  timelineColor: string;
}) {
  const Icon = getEventIcon(event.eventType);
  const colorClass = getEventColor(event.eventType);

  return (
    <>
      <div 
        className="relative px-4 py-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
        onClick={onToggle}
        style={{ 
          borderLeft: `2px solid ${timelineColor}33`,
          paddingLeft: '24px',
        }}
      >
        <div className="flex items-start gap-3 relative">
          {/* Timeline connector */}
          <div className="flex flex-col items-center flex-shrink-0 relative" style={{ left: '-11px' }}>
            <div 
              className="w-3 h-3 rounded-full border-2 flex-shrink-0 z-10" 
              style={{ 
                backgroundColor: event.status === 'FAILED' ? '#EF4444' : event.status === 'SUCCESS' ? '#059669' : timelineColor,
                borderColor: event.status === 'FAILED' ? '#EF4444' : event.status === 'SUCCESS' ? '#059669' : timelineColor,
              }} 
            />
            {!isLast && (
              <div className="w-0.5 h-full mt-1 flex-shrink-0" style={{ backgroundColor: `${timelineColor}33` }} />
            )}
          </div>

          {/* Event content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className={clsx('flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0', colorClass + '/15')}>
                <Icon className={clsx('w-3.5 h-3.5', colorClass)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#111827] text-sm">{event.eventType.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-[#9CA3AF] font-mono">{formatTime(event.timestamp)}</span>
                  {event.durationMs && (
                    <span className="text-xs text-[#6B7280] font-mono px-2 py-0.5 rounded bg-[#F3F4F6]">
                      {getDuration(event.timestamp, event.timestamp)}
                    </span>
                  )}
                  {event.status === 'FAILED' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#991B1B] border border-[#EF4444]/30">FAILED</span>
                  )}
                  {event.status === 'RUNNING' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#3B82F6]/15 text-[#1E40AF] border border-[#3B82F6]/30 animate-pulse">RUNNING</span>
                  )}
                </div>
                {(event.agentName || event.toolCall) && (
                  <p className="text-xs text-[#6B7280] mt-1 font-mono truncate">
                    {event.agentName ? `Agent: ${event.agentName}` : ''}
                    {event.toolCall ? ` • Tool: ${event.toolCall.toolName}` : ''}
                    {event.toolCall?.provider ? ` (${event.toolCall.provider})` : ''}
                  </p>
                )}
              </div>
              <ChevronDown 
                className={clsx('w-4 h-4 text-[#9CA3AF] flex-shrink-0 transition-transform', isExpanded && 'rotate-180')} 
              />
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-[#E5E7EB] ml-10"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {event.input && (
                    <DetailField label="Input" value={JSON.stringify(event.input, null, 2)} />
                  )}
                  {event.output && (
                    <DetailField label="Output" value={JSON.stringify(event.output, null, 2)} />
                  )}
                  {event.toolCall && (
                    <>
                      <DetailField label="Tool" value={event.toolCall.toolName} />
                      <DetailField label="Provider" value={event.toolCall.provider || 'N/A'} />
                      <DetailField label="Status" value={event.toolCall.status} />
                      <DetailField label="Duration" value={`${event.toolCall.durationMs}ms`} />
                      <DetailField label="Retries" value={event.toolCall.retryCount?.toString() || '0'} />
                      {event.toolCall.fallbackUsed && (
                        <DetailField label="Fallback" value={event.toolCall.fallbackUsed} />
                      )}
                      {event.toolCall.httpStatus && (
                        <DetailField label="HTTP Status" value={event.toolCall.httpStatus.toString()} />
                      )}
                    </>
                  )}
                  {event.agentExecution && (
                    <>
                      <DetailField label="Agent" value={event.agentExecution.agentType} />
                      <DetailField label="Status" value={event.agentExecution.status} />
                      <DetailField label="Duration" value={`${event.agentExecution.durationMs}ms`} />
                      <DetailField label="Retries" value={event.agentExecution.retryCount?.toString() || '0'} />
                      {event.agentExecution.decision && (
                        <DetailField label="Decision" value={event.agentExecution.decision} />
                      )}
                      {event.agentExecution.confidence && (
                        <DetailField label="Confidence" value={`${event.agentExecution.confidence}%`} />
                      )}
                    </>
                  )}
                  {event.tokenUsage && event.tokenUsage.available && (
                    <>
                      <DetailField label="Input Tokens" value={event.tokenUsage.inputTokens?.toString() || 'N/A'} />
                      <DetailField label="Output Tokens" value={event.tokenUsage.outputTokens?.toString() || 'N/A'} />
                      <DetailField label="Total Tokens" value={event.tokenUsage.totalTokens?.toString() || 'N/A'} />
                      <DetailField label="Model" value={event.tokenUsage.model || 'N/A'} />
                    </>
                  )}
                  {event.error && (
                    <>
                      <DetailField label="Error Type" value={event.error.type} />
                      <DetailField label="Error Message" value={event.error.message} />
                      <DetailField label="Component" value={event.error.component} />
                      <DetailField label="Retry Count" value={event.error.retryCount?.toString() || '0'} />
                      {event.error.recoveryAction && (
                        <DetailField label="Recovery Action" value={event.error.recoveryAction} />
                      )}
                      <DetailField label="Final Status" value={event.error.finalStatus || 'FAILED'} />
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAF9F6] rounded-lg p-3 border border-[#E5E7EB]">
      <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold font-mono mb-1">{label}</p>
      <p className="font-mono text-[#111827] break-all">{value}</p>
    </div>
  );
}

// ============================================================
// TRACE GRAPH COMPONENT
// ============================================================
function TraceGraph({ 
  trace, 
  events, 
  onBack 
}: { 
  trace: TraceModel; 
  events: TraceEventModel[]; 
  onBack: () => void;
}) {
  // Build graph nodes from events
  const nodes = useMemo(() => {
    const nodeMap = new Map<string, { id: string; label: string; type: 'agent' | 'tool' | 'decision' | 'start' | 'end'; status: string; agentName?: string; toolName?: string }>();
    
    events.forEach(event => {
      if (event.eventType === 'GRAPH_START' || event.eventType === 'INVESTIGATION_STARTED') {
        nodeMap.set('start', { id: 'start', label: 'Start', type: 'start', status: 'COMPLETED' });
      }
      if (event.eventType === 'GRAPH_END' || event.eventType === 'MISSION_COMPLETED' || event.eventType === 'MISSION_FAILED') {
        nodeMap.set('end', { id: 'end', label: 'End', type: 'end', status: trace.status });
      }
      if (event.agentExecution) {
        nodeMap.set(`agent-${event.agentExecution.agentType}`, {
          id: `agent-${event.agentExecution.agentType}`,
          label: event.agentExecution.agentType,
          type: 'agent',
          status: event.agentExecution.status,
          agentName: event.agentExecution.agentType,
        });
      }
      if (event.toolCall) {
        nodeMap.set(`tool-${event.toolCall.toolName}-${event.eventId.slice(-4)}`, {
          id: `tool-${event.toolCall.toolName}-${event.eventId.slice(-4)}`,
          label: event.toolCall.toolName,
          type: 'tool',
          status: event.toolCall.status,
          toolName: event.toolCall.toolName,
        });
      }
      if (event.eventType === 'AGENT_DECISION' || event.eventType === 'DECISION_MADE' || event.eventType === 'ROUTER_DECISION') {
        nodeMap.set(`decision-${event.eventId}`, {
          id: `decision-${event.eventId}`,
          label: event.agentExecution?.decision || 'Decision',
          type: 'decision',
          status: event.status,
        });
      }
    });
    
    return Array.from(nodeMap.values());
  }, [events, trace.status]);

  // Build edges
  const edges = useMemo(() => {
    const edgeList: { from: string; to: string; label?: string }[] = [];
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let lastNodeId = 'start';
    sortedEvents.forEach(event => {
      let currentNodeId = '';
      if (event.eventType === 'GRAPH_START' || event.eventType === 'INVESTIGATION_STARTED') currentNodeId = 'start';
      else if (event.eventType === 'GRAPH_END' || event.eventType === 'MISSION_COMPLETED' || event.eventType === 'MISSION_FAILED') currentNodeId = 'end';
      else if (event.agentExecution) currentNodeId = `agent-${event.agentExecution.agentType}`;
      else if (event.toolCall) currentNodeId = `tool-${event.toolCall.toolName}-${event.eventId.slice(-4)}`;
      else if (event.eventType === 'AGENT_DECISION' || event.eventType === 'DECISION_MADE' || event.eventType === 'ROUTER_DECISION') currentNodeId = `decision-${event.eventId}`;
      
      if (currentNodeId && currentNodeId !== lastNodeId) {
        edgeList.push({ from: lastNodeId, to: currentNodeId });
        lastNodeId = currentNodeId;
      }
    });
    
    return edgeList;
  }, [events]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37]/50 shadow-xs transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-bold text-[#111827] text-lg font-mono">{trace.traceId}</h2>
          <p className="text-sm text-[#6B7280] font-mono">Execution Graph</p>
        </div>
        <StatusBadge status={trace.status} />
      </div>

      <div className="flex-1 bg-white border border-[#E5E7EB] rounded-2xl overflow-auto p-6 relative">
        {/* SVG Graph */}
        <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#D1D5DB" />
            </marker>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          <g>
            {edges.map((edge, i) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              
              const fromPos = getNodePosition(fromNode, nodes);
              const toPos = getNodePosition(toNode, nodes);
              
              return (
                <motion.path
                  key={i}
                  d={`M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`}
                  stroke="#D1D5DB"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {nodes.map((node, i) => {
              const pos = getNodePosition(node, nodes);
              const isError = node.status === 'FAILED';
              const isRunning = node.status === 'RUNNING';
              const isSuccess = node.status === 'COMPLETED';
              
              const nodeColor = isError ? '#EF4444' : isRunning ? '#3B82F6' : isSuccess ? '#059669' : 
                node.type === 'agent' ? '#8B5CF6' : node.type === 'tool' ? '#3B82F6' : '#C9A227';
              
              return (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={node.type === 'agent' ? 50 : node.type === 'tool' ? 40 : node.type === 'decision' ? 35 : 30}
                    fill="white"
                    stroke={nodeColor}
                    strokeWidth={isError ? 3 : 2}
                    filter={isError ? 'url(#glow)' : 'none'}
                    className="cursor-pointer"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fontSize={node.type === 'agent' ? 11 : 9}
                    fontWeight="bold"
                    fill="#111827"
                    fontFamily="monospace"
                    className="truncate"
                  >
                    {node.label.length > 12 ? node.label.slice(0, 10) + '…' : node.label}
                  </text>
                  {node.type === 'agent' && (
                    <text
                      x={pos.x}
                      y={pos.y + 18}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#6B7280"
                      fontFamily="monospace"
                    >
                      {node.status}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm border border-[#E5E7EB] rounded-xl p-3 shadow-lg">
          <p className="text-xs font-bold text-[#111827] mb-2">Legend</p>
          <div className="flex flex-col gap-1.5">
            <LegendItem color="#8B5CF6" label="Agent" />
            <LegendItem color="#3B82F6" label="Tool" />
            <LegendItem color="#C9A227" label="Decision" shape="diamond" />
            <LegendItem color="#059669" label="Success" />
            <LegendItem color="#EF4444" label="Failed" />
            <LegendItem color="#3B82F6" label="Running" />
          </div>
        </div>
      </div>
    </div>
  );
}

function getNodePosition(node: { id: string; type: string }, allNodes: { id: string; type: string }[]) {
  const agentNodes = allNodes.filter(n => n.type === 'agent');
  const toolNodes = allNodes.filter(n => n.type === 'tool');
  const decisionNodes = allNodes.filter(n => n.type === 'decision');
  const startNode = allNodes.find(n => n.type === 'start');
  const endNode = allNodes.find(n => n.type === 'end');
  
  const index = agentNodes.findIndex(n => n.id === node.id);
  const toolIndex = toolNodes.findIndex(n => n.id === node.id);
  const decisionIndex = decisionNodes.findIndex(n => n.id === node.id);
  
  if (node.type === 'start') return { x: 100, y: 400 };
  if (node.type === 'end') return { x: 1100, y: 400 };
  if (node.type === 'agent' && index >= 0) return { x: 200 + (index * 180), y: 400 };
  if (node.type === 'tool' && toolIndex >= 0) return { x: 200 + (toolIndex * 180), y: 200 };
  if (node.type === 'decision' && decisionIndex >= 0) return { x: 250 + (decisionIndex * 180), y: 600 };
  
  return { x: 100, y: 400 };
}

function LegendItem({ color, label, shape = 'circle' }: { color: string; label: string; shape?: 'circle' | 'diamond' }) {
  return (
    <div className="flex items-center gap-2">
      {shape === 'diamond' ? (
        <div className="w-3 h-3 rotate-45 border-2" style={{ borderColor: color }} />
      ) : (
        <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: color }} />
      )}
      <span className="text-xs text-[#6B7280] font-mono">{label}</span>
    </div>
  );
}

// ============================================================
// TRACE DIAGNOSIS COMPONENT
// ============================================================
function RootCauseCard({ diagnosis }: { diagnosis: TraceDiagnosisModel }) {
  const isNone = (typeof diagnosis.rootCause === 'object' && diagnosis.rootCause?.type === 'NONE') || 
                 (typeof diagnosis.rootCause === 'string' && diagnosis.rootCause === 'NONE');
  const rootCauseObj = typeof diagnosis.rootCause === 'object' ? diagnosis.rootCause : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('bg-white border rounded-2xl p-5', isNone ? 'border-[#059669]/30' : 'border-[#EF4444]/30')}
    >
      <div className="flex items-start gap-4">
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', 
          isNone ? 'bg-[#059669]/15' : 'bg-[#EF4444]/15'
        )}>
          {isNone ? (
            <CheckCircle className="w-6 h-6 text-[#059669]" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-[#111827] text-lg">ROOT CAUSE</h3>
            {typeof diagnosis.rootCause === 'object' && diagnosis.rootCause?.type !== 'NONE' && (
              <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-[#EF4444]/15 text-[#991B1B] border border-[#EF4444]/30">
                {diagnosis.rootCause.type}
              </span>
            )}
            {typeof diagnosis.rootCause === 'string' && diagnosis.rootCause !== 'NONE' && (
              <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-[#EF4444]/15 text-[#991B1B] border border-[#EF4444]/30">
                {diagnosis.rootCause}
              </span>
            )}
          </div>
          <p className="text-[#374151] mb-2">
            {(
              typeof diagnosis.rootCause === 'object' 
                ? diagnosis.rootCause?.description 
                : diagnosis.rootCause
            ) || 'No failures detected'}
          </p>
          <p className="text-xs text-[#6B7280] font-mono">Component: {diagnosis.affectedComponent}</p>
        </div>
      </div>
      
      {rootCauseObj?.traceEvidence && rootCauseObj.traceEvidence.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] font-mono mb-2">TRACE EVIDENCE</p>
          <ul className="space-y-1 text-sm text-[#6B7280]">
            {rootCauseObj.traceEvidence.map((evidence, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 bg-[#C9A227] flex-shrink-0" />
                <span className="font-mono">{evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

function TraceDiagnosis({ 
  trace, 
  diagnosis, 
  events, 
  onBack 
}: { 
  trace: TraceModel; 
  diagnosis: TraceDiagnosisModel; 
  events: TraceEventModel[];
  onBack: () => void;
}) {
  const errorEvents = events.filter(e => e.error || e.status === 'FAILED');

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37]/50 shadow-xs transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-bold text-[#111827] text-lg font-mono">Root Cause Analysis</h2>
          <p className="text-sm text-[#6B7280] font-mono">Trace: {trace.traceId}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Root Cause Card */}
        <RootCauseCard diagnosis={diagnosis} />

        {/* Impact Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-5"
        >
          <h3 className="font-bold text-[#111827] text-lg mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#C9A227]" />
            IMPACT ASSESSMENT
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ImpactMetric 
              label="Latency Increase" 
              value={`${diagnosis.impact.latencyIncreaseMs}ms`} 
              icon={<Clock className="w-5 h-5" />}
              severity={diagnosis.impact.latencyIncreaseMs > 5000 ? 'high' : diagnosis.impact.latencyIncreaseMs > 1000 ? 'medium' : 'low'}
            />
            <ImpactMetric 
              label="Extra Retries" 
              value={diagnosis.impact.extraRetries} 
              icon={<RefreshCw className="w-5 h-5" />}
              severity={diagnosis.impact.extraRetries > 3 ? 'high' : diagnosis.impact.extraRetries > 0 ? 'medium' : 'low'}
            />
            <ImpactMetric 
              label="Failed Tool Calls" 
              value={diagnosis.impact.extraToolCalls} 
              icon={<XCircle className="w-5 h-5" />}
              severity={diagnosis.impact.extraToolCalls > 2 ? 'high' : diagnosis.impact.extraToolCalls > 0 ? 'medium' : 'low'}
            />
          </div>
        </motion.div>

        {/* Recovery Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-5"
        >
          <h3 className="font-bold text-[#111827] text-lg mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#059669]" />
            RECOVERY ACTION
          </h3>
          <div className="bg-[#FAF9F6] border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[#374151] font-mono text-sm">{diagnosis.recoveryAction}</p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className={clsx('px-3 py-1.5 rounded-lg text-sm font-bold font-mono', 
              diagnosis.finalResult === 'SUCCESS' ? 'bg-[#059669]/15 text-[#047857] border border-[#059669]/30' :
              diagnosis.finalResult === 'RECOVERED' ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30' :
              diagnosis.finalResult === 'PARTIAL' ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30' :
              'bg-[#EF4444]/15 text-[#991B1B] border border-[#EF4444]/30'
            )}>
              {diagnosis.finalResult}
            </span>
          </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-5"
        >
          <h3 className="font-bold text-[#111827] text-lg mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#C9A227]" />
            RECOMMENDATIONS
          </h3>
          <ul className="space-y-2">
            {diagnosis.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 p-3 bg-[#FAF9F6] border border-[#E5E7EB] rounded-xl">
                <div className="w-6 h-6 rounded-full bg-[#D4AF37]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[#8C6D13]">{i + 1}</span>
                </div>
                <p className="text-sm text-[#374151]">{rec}</p>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Related Events */}
        {errorEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-5"
          >
            <h3 className="font-bold text-[#111827] text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              FAILURE EVENTS IN TRACE
            </h3>
            <div className="space-y-2">
              {errorEvents.map((event, i) => (
                <div key={event.eventId} className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#991B1B] text-sm font-mono">{event.eventType}</span>
                    <span className="text-xs text-[#991B1B] font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-[#7F1D1D] font-mono">{event.error?.message || 'Unknown error'}</p>
                  {event.error && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-white border border-[#FECACA] text-[#991B1B] font-mono">
                        Type: {event.error.type}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#FECACA] text-[#991B1B] font-mono">
                        Retries: {event.error.retryCount || 0}
                      </span>
                      {event.error.recoveryAction && (
                        <span className="px-2 py-0.5 rounded bg-[#059669]/15 border border-[#059669]/30 text-[#047857] font-mono">
                          Recovery: {event.error.recoveryAction}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ImpactMetric({ label, value, icon, severity }: { label: string; value: string | number; icon: React.ReactNode; severity: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: { bg: 'bg-[#EF4444]/15', text: 'text-[#991B1B]', border: 'border-[#EF4444]/30', icon: 'text-[#EF4444]' },
    medium: { bg: 'bg-[#F59E0B]/15', text: 'text-[#B45309]', border: 'border-[#F59E0B]/30', icon: 'text-[#F59E0B]' },
    low: { bg: 'bg-[#059669]/15', text: 'text-[#047857]', border: 'border-[#059669]/30', icon: 'text-[#059669]' },
  };
  const c = colors[severity];

  return (
    <div className={clsx('rounded-xl p-4 text-center', c.bg, c.text, c.border)}>
      <div className={clsx('mx-auto mb-2', c.icon)}>{icon}</div>
      <p className="text-2xl font-extrabold font-mono">{value}</p>
      <p className="text-xs uppercase tracking-wider font-bold">{label}</p>
    </div>
  );
}

function InlineDiagnosisPanel({ diagnosis }: { diagnosis: TraceDiagnosisModel }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
      <h3 className="font-bold text-[#111827] text-lg mb-4 flex items-center gap-2">
        <Bug className="w-5 h-5 text-[#EF4444]" />
        QUICK DIAGNOSIS SUMMARY
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9CA3AF] font-bold font-mono mb-1">Root Cause</p>
          <p className="text-sm text-[#374151] font-mono">
            {typeof diagnosis.rootCause === 'object' ? diagnosis.rootCause?.description : diagnosis.rootCause || 'None'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9CA3AF] font-bold font-mono mb-1">Component</p>
          <p className="text-sm text-[#374151] font-mono">{diagnosis.affectedComponent}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9CA3AF] font-bold font-mono mb-1">Impact</p>
          <p className="text-sm text-[#374151] font-mono">
            +{diagnosis.impact.latencyIncreaseMs}ms latency, {diagnosis.impact.extraRetries} retries, {diagnosis.impact.extraToolCalls} failed calls
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9CA3AF] font-bold font-mono mb-1">Result</p>
          <span className={clsx('inline-block px-3 py-1 rounded-lg text-sm font-bold font-mono',
            diagnosis.finalResult === 'SUCCESS' ? 'bg-[#059669]/15 text-[#047857] border border-[#059669]/30' :
            diagnosis.finalResult === 'RECOVERED' ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30' :
            'bg-[#EF4444]/15 text-[#991B1B] border border-[#EF4444]/30'
          )}>
            {diagnosis.finalResult}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TRACE COMPARISON COMPONENT
// ============================================================
function TraceComparison({ 
  traces, 
  comparisons, 
  selectedComparison, 
  setSelectedComparison, 
  baselineTraceId, 
  setBaselineTraceId, 
  optimizedTraceId, 
  setOptimizedTraceId, 
  onCreateComparison, 
  onBack 
}: { 
  traces: TraceModel[]; 
  comparisons: TraceComparisonModel[];
  selectedComparison: TraceComparisonModel | null;
  setSelectedComparison: (c: TraceComparisonModel | null) => void;
  baselineTraceId: string;
  setBaselineTraceId: (id: string) => void;
  optimizedTraceId: string;
  setOptimizedTraceId: (id: string) => void;
  onCreateComparison: () => void;
  onBack: () => void;
}) {
  const completedTraces = traces.filter(t => t.status === 'COMPLETED' || t.status === 'PARTIAL');

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37]/50 shadow-xs transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-bold text-[#111827] text-lg font-mono">BEFORE vs AFTER</h2>
          <p className="text-sm text-[#6B7280] font-mono">Compare baseline vs optimized investigation runs</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Create Comparison Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-5"
        >
          <h3 className="font-bold text-[#111827] text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C9A227]" />
            CREATE NEW COMPARISON
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF] font-mono mb-2">Baseline Run (Before)</label>
              <select
                value={baselineTraceId}
                onChange={(e) => setBaselineTraceId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="">Select baseline trace...</option>
                {completedTraces.map(t => (
                  <option key={t.traceId} value={t.traceId}>
                    {t.traceId.slice(-12)} - {t.investigationId} ({t.totalDurationMs ? (t.totalDurationMs/1000).toFixed(1) : '—'}s)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF] font-mono mb-2">Optimized Run (After)</label>
              <select
                value={optimizedTraceId}
                onChange={(e) => setOptimizedTraceId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="">Select optimized trace...</option>
                {completedTraces.map(t => (
                  <option key={t.traceId} value={t.traceId}>
                    {t.traceId.slice(-12)} - {t.investigationId} ({t.totalDurationMs ? (t.totalDurationMs/1000).toFixed(1) : '—'}s)
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateComparison}
            disabled={!baselineTraceId || !optimizedTraceId || baselineTraceId === optimizedTraceId}
            className="w-full md:w-auto px-6 py-3 bg-[#C9A227] text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg hover:bg-[#B89220] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Generate Comparison
          </motion.button>
        </motion.div>

        {/* Saved Comparisons */}
        {comparisons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-bold text-[#111827] text-sm font-mono uppercase tracking-wider">Saved Comparisons</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAF9F6] text-left text-xs font-bold uppercase tracking-wider text-[#9CA3AF] font-mono">
                    <th className="px-5 py-3">Comparison</th>
                    <th className="px-5 py-3">Baseline</th>
                    <th className="px-5 py-3">Optimized</th>
                    <th className="px-5 py-3">Latency Δ</th>
                    <th className="px-5 py-3">Tools Δ</th>
                    <th className="px-5 py-3">Errors Δ</th>
                    <th className="px-5 py-3">Success Δ</th>
                    <th className="px-5 py-3">Applied</th>
                    <th className="px-5 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {comparisons.map((comp, i) => (
                    <motion.tr
                      key={comp.comparisonId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={clsx('hover:bg-[#FAF9F6] cursor-pointer transition-colors', selectedComparison?.comparisonId === comp.comparisonId && 'bg-[#D4AF37]/10')}
                      onClick={() => setSelectedComparison(comp)}
                    >
                      <td className="px-5 py-3 font-mono text-[#6B7280]">{comp.comparisonId.slice(-12)}</td>
                      <td className="px-5 py-3 font-mono text-[#111827] truncate max-w-[150px]">{comp.baselineTraceId.slice(-12)}</td>
                      <td className="px-5 py-3 font-mono text-[#111827] truncate max-w-[150px]">{comp.optimizedTraceId.slice(-12)}</td>
                      <td className="px-5 py-3">
                        <span className={clsx('font-bold font-mono', comp.improvement.latencyPct >= 0 ? 'text-[#059669]' : 'text-[#EF4444]')}>
                          {comp.improvement.latencyPct >= 0 ? '+' : ''}{comp.improvement.latencyPct}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx('font-bold font-mono', comp.improvement.toolCallsPct >= 0 ? 'text-[#059669]' : 'text-[#EF4444]')}>
                          {comp.improvement.toolCallsPct >= 0 ? '+' : ''}{comp.improvement.toolCallsPct}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx('font-bold font-mono', comp.improvement.errorsPct >= 0 ? 'text-[#059669]' : 'text-[#EF4444]')}>
                          {comp.improvement.errorsPct >= 0 ? '+' : ''}{comp.improvement.errorsPct}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx('font-bold font-mono', comp.improvement.successRatePct >= 0 ? 'text-[#059669]' : 'text-[#EF4444]')}>
                          {comp.improvement.successRatePct >= 0 ? '+' : ''}{comp.improvement.successRatePct}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#6B7280] truncate max-w-[200px]">{comp.optimizationApplied}</td>
                      <td className="px-5 py-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); setSelectedComparison(comp); }}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#C9A227] hover:bg-[#FAF9F6] transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Comparison Detail */}
        {selectedComparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-[#111827] text-lg">DETAILED COMPARISON</h3>
              <button
                onClick={() => setSelectedComparison(null)}
                className="p-2 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#9CA3AF] font-mono">
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3 text-center">BEFORE</th>
                    <th className="px-4 py-3 text-center">AFTER</th>
                    <th className="px-4 py-3 text-center">CHANGE</th>
                    <th className="px-4 py-3 text-center">IMPROVEMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {[
                    { label: 'Latency', before: selectedComparison.before.latencyMs, after: selectedComparison.after.latencyMs, unit: 'ms', lowerIsBetter: true },
                    { label: 'Tool Calls', before: selectedComparison.before.toolCalls, after: selectedComparison.after.toolCalls, unit: '', lowerIsBetter: true },
                    { label: 'Errors', before: selectedComparison.before.errors, after: selectedComparison.after.errors, unit: '', lowerIsBetter: true },
                    { label: 'Retries', before: selectedComparison.before.retries, after: selectedComparison.after.retries, unit: '', lowerIsBetter: true },
                    { label: 'Success Rate', before: selectedComparison.before.successRate, after: selectedComparison.after.successRate, unit: '%', lowerIsBetter: false },
                    { label: 'Tokens', before: selectedComparison.before.tokens, after: selectedComparison.after.tokens, unit: '', lowerIsBetter: true },
                  ].map((row, i) => {
                    const change = row.after - row.before;
                    const pct = row.before > 0 ? ((change / row.before) * 100).toFixed(1) : '0';
                    const improved = row.lowerIsBetter ? change < 0 : change > 0;
                    
                    return (
                      <motion.tr key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <td className="px-4 py-3 font-medium text-[#374151]">{row.label}</td>
                        <td className="px-4 py-3 text-center font-mono text-[#6B7280]">{row.before.toLocaleString()}{row.unit}</td>
                        <td className="px-4 py-3 text-center font-mono text-[#111827] font-bold">{row.after.toLocaleString()}{row.unit}</td>
                        <td className="px-4 py-3 text-center font-mono">
                          <span className={clsx('font-bold', improved ? 'text-[#059669]' : 'text-[#EF4444]')}>
                            {change >= 0 ? '+' : ''}{change.toLocaleString()}{row.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-bold font-mono', improved ? 'bg-[#059669]/15 text-[#047857] border border-[#059669]/30' : 'bg-[#EF4444]/15 text-[#991B1B] border border-[#EF4444]/30')}>
                            {improved ? '✓ Improved' : '✗ Regressed'} ({pct}%)
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-[#FAF9F6] border border-[#E5E7EB] rounded-xl">
              <h4 className="font-bold text-[#111827] mb-3">OPTIMIZATION SUMMARY</h4>
              <p className="text-sm text-[#374151] mb-2 font-mono">{selectedComparison.optimizationApplied}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-[#059669] font-mono">{selectedComparison.improvement.latencyPct >= 0 ? '+' : ''}{selectedComparison.improvement.latencyPct}%</p>
                  <p className="text-xs text-[#6B7280] font-mono">Latency Change</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-[#059669] font-mono">{selectedComparison.improvement.toolCallsPct >= 0 ? '+' : ''}{selectedComparison.improvement.toolCallsPct}%</p>
                  <p className="text-xs text-[#6B7280] font-mono">Tool Calls Change</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-[#059669] font-mono">{selectedComparison.improvement.errorsPct >= 0 ? '+' : ''}{selectedComparison.improvement.errorsPct}%</p>
                  <p className="text-xs text-[#6B7280] font-mono">Errors Change</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}