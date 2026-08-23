'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Bot, 
  Wrench,
  Zap,
  Database,
  Globe,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { TraceModel, TraceEventModel } from '@/lib/types';
import { clsx } from 'clsx';

interface LiveTracePanelProps {
  trace: TraceModel | null;
  traceEvents: TraceEventModel[];
  traceLoading: boolean;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  'SUCCESS': { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-[#047857]', label: 'COMPLETED' },
  'FAILED': { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-[#991B1B]', label: 'FAILED' },
  'RUNNING': { icon: <PlayCircle className="w-3.5 h-3.5 animate-pulse" />, color: 'text-[#047857]', label: 'RUNNING' },
  'PENDING': { icon: <PauseCircle className="w-3.5 h-3.5" />, color: 'text-[#8C6D13]', label: 'PENDING' },
  'PARTIAL': { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-[#D97706]', label: 'PARTIAL' },
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  'RESEARCH': <Search className="w-3.5 h-3.5" />,
  'PATENT': <Database className="w-3.5 h-3.5" />,
  'NEWS': <Globe className="w-3.5 h-3.5" />,
  'WEB': <Zap className="w-3.5 h-3.5" />,
  'COMPETITOR': <Bot className="w-3.5 h-3.5" />,
  'VALIDATOR': <CheckCircle className="w-3.5 h-3.5" />,
  'SYNTHESIZER': <Cpu className="w-3.5 h-3.5" />,
  'PLANNER': <Activity className="w-3.5 h-3.5" />,
  'CRITIC': <AlertTriangle className="w-3.5 h-3.5" />,
  'SYSTEM': <Activity className="w-3.5 h-3.5" />,
};

function getAgentIcon(agentName: string): React.ReactNode {
  return AGENT_ICONS[agentName] || <Activity className="w-3.5 h-3.5" />;
}

export function LiveTracePanel({ trace, traceEvents, traceLoading }: LiveTracePanelProps) {
  if (!trace && !traceLoading) {
    return (
      <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D4AF37]" />
            LIVE EXECUTION TRACE
          </h3>
          <span className="text-[10px] bg-[#D4AF37]/15 text-[#8C6D13] font-bold px-2 py-0.5 rounded border border-[#D4AF37]/30">
            WAITING FOR TRACE DATA
          </span>
        </div>
        <p className="text-[#6B7280] italic">Trace data will appear here once the investigation starts executing.</p>
      </div>
    );
  }

  if (traceLoading && !trace) {
    return (
      <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D4AF37] animate-spin" />
            LIVE EXECUTION TRACE
          </h3>
          <span className="text-[10px] bg-[#059669]/15 text-[#047857] font-bold px-2 py-0.5 rounded border border-[#059669]/30 animate-pulse">
            LOADING TRACE...
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-[#E5E7EB] rounded animate-pulse w-1/3" />
          <div className="h-4 bg-[#E5E7EB] rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (trace) {
    // Group events by type for summary
    const eventSummary = traceEvents.reduce((acc, evt) => {
      const agent = evt.agentName || 'SYSTEM';
      if (!acc[agent]) {
        acc[agent] = { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
      }
      acc[agent].total++;
      if (evt.status === 'SUCCESS') acc[agent].completed++;
      else if (evt.status === 'FAILED') acc[agent].failed++;
      else if (evt.status === 'RUNNING') acc[agent].running++;
      else if (evt.status === 'PENDING') acc[agent].pending++;
      return acc;
    }, {} as Record<string, { total: number; completed: number; failed: number; running: number; pending: number }>);

    const agents = Object.keys(eventSummary);
    const totalEvents = traceEvents.length;
    const completedEvents = traceEvents.filter(e => e.status === 'SUCCESS').length;
    const failedEvents = traceEvents.filter(e => e.status === 'FAILED').length;
    const runningEvents = traceEvents.filter(e => e.status === 'RUNNING').length;

    // Calculate overall progress
    const progress = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

    return (
      <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D4AF37]" />
            LIVE EXECUTION TRACE
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-[#D4AF37]/15 text-[#8C6D13] font-bold px-2 py-0.5 rounded border border-[#D4AF37]/30">
              {trace.status}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-48 bg-[#E5E7EB] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227] rounded-full"
                />
              </div>
              <span className="text-[10px] font-bold text-[#111827] w-10 text-right">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Trace ID and Run ID */}
        <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
          <div className="bg-white p-3 rounded border border-[#E5E7EB]">
            <span className="text-[#6B7280] block">TRACE ID</span>
            <span className="font-bold text-[#111827] truncate block">{trace.traceId}</span>
          </div>
          <div className="bg-white p-3 rounded border border-[#E5E7EB]">
            <span className="text-[#6B7280] block">RUN ID</span>
            <span className="font-bold text-[#111827] truncate block">{trace.runId}</span>
          </div>
          <div className="bg-white p-3 rounded border border-[#E5E7EB]">
            <span className="text-[#6B7280] block">STARTED</span>
            <span className="font-bold text-[#111827] truncate block">
              {trace.startedAt ? new Date(trace.startedAt).toLocaleTimeString() : '—'}
            </span>
          </div>
          <div className="bg-white p-3 rounded border border-[#E5E7EB]">
            <span className="text-[#6B7280] block">DURATION</span>
            <span className="font-bold text-[#111827] truncate block">
              {trace.totalDurationMs ? `${(trace.totalDurationMs / 1000).toFixed(1)}s` : '—'}
            </span>
          </div>
        </div>

        {/* Agent Status Summary */}
        {agents.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-2">
              <Bot className="w-3.5 h-3.5" />
              AGENT EXECUTION STATUS
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {agents.map((agentName) => {
                const summary = eventSummary[agentName];
                const isRunning = summary.running > 0;
                const isFailed = summary.failed > 0 && summary.completed === 0;
                const isComplete = summary.completed > 0 && summary.running === 0 && summary.failed === 0;
                
                return (
                  <motion.div
                    key={agentName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={clsx(
                      'p-3 rounded-xl border transition-all',
                      isRunning 
                        ? 'bg-[#059669]/5 border-[#059669]/30 shadow-xs shadow-[#059669]/10' 
                        : isFailed
                        ? 'bg-[#991B1B]/5 border-[#DC2626]/30'
                        : isComplete
                        ? 'bg-[#047857]/5 border-[#059669]/30'
                        : 'bg-[#FAF9F6] border-[#E5E7EB]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          'w-7 h-7 rounded-lg flex items-center justify-center',
                          isRunning ? 'bg-[#059669]/15' : isFailed ? 'bg-[#991B1B]/15' : isComplete ? 'bg-[#047857]/15' : 'bg-[#E5E7EB]'
                        )}>
                          {getAgentIcon(agentName)}
                        </span>
                        <span className="font-bold text-[#111827]">{agentName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {summary.completed > 0 && (
                          <span className="text-[10px] font-bold text-[#047857] flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {summary.completed}
                          </span>
                        )}
                        {summary.running > 0 && (
                          <span className="text-[10px] font-bold text-[#047857] animate-pulse flex items-center gap-1">
                            <PlayCircle className="w-2.5 h-2.5" /> {summary.running}
                          </span>
                        )}
                        {summary.failed > 0 && (
                          <span className="text-[10px] font-bold text-[#DC2626] flex items-center gap-1">
                            <XCircle className="w-2.5 h-2.5" /> {summary.failed}
                          </span>
                        )}
                        {summary.pending > 0 && (
                          <span className="text-[10px] font-bold text-[#8C6D13] flex items-center gap-1">
                            <PauseCircle className="w-2.5 h-2.5" /> {summary.pending}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-[#6B7280]">
                      <span>{summary.total} events</span>
                      {summary.running > 0 && <span className="text-[#047857] font-bold">● EXECUTING</span>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Event Stream */}
        <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E7EB]">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5" />
            LIVE EVENT STREAM ({traceEvents.length} events)
          </h4>
          {traceEvents.length === 0 ? (
            <p className="text-[#6B7280] italic pl-8">Waiting for execution events...</p>
          ) : (
            traceEvents.slice(-20).reverse().map((evt, idx) => {
              const statusConfig = STATUS_CONFIG[evt.status] || { 
                icon: <Activity className="w-3.5 h-3.5" />, 
                color: 'text-[#6B7280]', 
                label: evt.status 
              };
              const agentIcon = getAgentIcon(evt.agentName || 'SYSTEM');
              
              return (
                <motion.div
                  key={evt.eventId || idx}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="relative pl-8 space-y-1"
                >
                  <div className="absolute left-1.5 top-1 w-4 h-4 rounded-full bg-white border-2 flex items-center justify-center text-[8px] font-bold text-[#111827]"
                    style={{ borderColor: statusConfig.color.replace('text-', '') }}
                  >
                    <span className={statusConfig.color}>{idx + 1}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'font-bold px-1.5 py-0.5 rounded border text-[10px]',
                        statusConfig.color.replace('text-', 'bg-') + '/15',
                        statusConfig.color.replace('text-', 'text-'),
                        statusConfig.color.replace('text-', 'border-') + '/30'
                      )}>
                        [{evt.eventType}]
                      </span>
                      <span className={clsx(
                        'font-bold text-[10px]',
                        statusConfig.color
                      )}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {evt.durationMs && (
                      <span className="text-[10px] font-bold text-[#8C6D13] bg-[#FAF9F6] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                        {evt.durationMs}ms
                      </span>
                    )}
                  </div>

                  <p className="text-[#374151] font-sans text-xs pl-1">
                    {evt.input ? JSON.stringify(evt.input).substring(0, 100) : 'Executing...'}
                  </p>

                  {(evt.agentName || evt.toolCall) && (
                    <div className="bg-white p-2 rounded border border-[#E5E7EB] text-[11px] text-[#4B5563] font-mono flex flex-wrap gap-2">
                      {evt.agentName && (
                        <span className="flex items-center gap-1 text-[#8C6D13] font-bold">
                          {agentIcon}
                          AGENT: {evt.agentName}
                        </span>
                      )}
                      {evt.agentExecution?.status && (
                        <span className="text-[#047857] font-bold">STATUS: {evt.agentExecution.status}</span>
                      )}
                      {evt.toolCall && (
                        <span className="text-[#7C3AED] font-bold flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          TOOL: {evt.toolCall.toolName}
                        </span>
                      )}
                      {evt.tokenUsage && evt.tokenUsage.available && (
                        <span className="text-[#D97706] font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {evt.tokenUsage.totalTokens} tokens
                        </span>
                      )}
                    </div>
                  )}

                  {evt.error && (
                    <div className="bg-red-50/50 border border-red-200 p-2 rounded text-red-900 text-[11px] font-mono flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>ERROR: {evt.error.message}</span>
                      {evt.error.recoveryAction && evt.error.finalStatus === 'RECOVERED' && (
                        <span className="text-green-700 font-bold ml-auto flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          RECOVERED via {evt.error.recoveryAction}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Key Metrics */}
        {trace.totalDurationMs && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[#E5E7EB]">
            <MetricCard label="Total Latency" value={`${(trace.totalDurationMs / 1000).toFixed(1)}s`} icon={<Clock className="w-4 h-4" />} />
            <MetricCard label="Tool Calls" value={trace.totalToolCalls.toString()} icon={<Wrench className="w-4 h-4" />} />
            <MetricCard label="LLM Calls" value="—" icon={<Cpu className="w-4 h-4" />} />
            <MetricCard label="Tokens" value={trace.totalTokens?.total ? trace.totalTokens.total.toLocaleString() : '—'} icon={<Zap className="w-4 h-4" />} />
            <MetricCard label="Retries" value={trace.totalRetries.toString()} icon={<RefreshCw className="w-4 h-4" />} />
            <MetricCard label="Errors" value={trace.totalErrors.toString()} icon={<AlertTriangle className="w-4 h-4" />} />
            <MetricCard label="Fallbacks" value="0" icon={<ArrowRight className="w-4 h-4" />} />
            <MetricCard label="Success Rate" value={`${trace.status === 'COMPLETED' ? 100 : trace.status === 'PARTIAL' ? 50 : 0}%`} icon={<CheckCircle className="w-4 h-4" />} />
          </div>
        )}
      </div>
    );
  }

  return null;
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-3 rounded-xl border border-[#E5E7EB]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#C9A227]">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</span>
      </div>
      <span className="text-lg font-extrabold text-[#111827] font-mono">{value}</span>
    </div>
  );
}

export default LiveTracePanel;