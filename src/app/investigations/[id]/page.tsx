'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  Bot,
  Zap,
  Activity,
  ArrowRight,
  Share2,
  Cpu,
  Clock,
  Check,
  Pause,
  Play,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { StatusBadge, ConfidenceIndicator } from '@/components/ui/Indicators';
import { ActivityFeed, ActivityItem } from '@/components/ui/Feeds';
import { EvidenceCard } from '@/components/ui/Cards';
import { investigationsApi } from '@/lib/api';
import { InvestigationModel, MissionModel, TaskModel, MissionEventModel, TraceModel, TraceEventModel } from '@/lib/types';

import { InvestigationTracePanel } from '@/components/investigation/InvestigationTracePanel';
import { LiveTracePanel } from '@/components/investigation/LiveTracePanel';
import { ToolSelectionPanel } from '@/components/investigation/ToolSelectionPanel';
import { InvestigationMemoryPanel } from '@/components/investigation/InvestigationMemoryPanel';
import { AgentNetworkPanel } from '@/components/investigation/AgentNetworkPanel';
import { KnowledgeGapPanel } from '@/components/investigation/KnowledgeGapPanel';
import { DynamicMissionPlan } from '@/components/investigation/DynamicMissionPlan';
import { SelfEvaluationPanel } from '@/components/investigation/SelfEvaluationPanel';
import { HypothesisPanel } from '@/components/investigation/HypothesisPanel';
import { ConclusionRevisionPanel } from '@/components/investigation/ConclusionRevisionPanel';
import { ExecutionBudgetPanel } from '@/components/investigation/ExecutionBudgetPanel';
import { ActiveTaskQueuePanel } from '@/components/investigation/ActiveTaskQueuePanel';
import { LoopDeadlockNoticePanel } from '@/components/investigation/LoopDeadlockNoticePanel';
import { DecisionExplanationStream } from '@/components/investigation/DecisionExplanationStream';
import { InvestigationFlowGraph } from '@/components/investigation/InvestigationFlowGraph';

export default function LiveInvestigationWorkspace() {
  const params = useParams();
  const id = (params?.id as string) || '';

  const [investigation, setInvestigation] = useState<InvestigationModel | null>(null);
  const [mission, setMission] = useState<MissionModel | null>(null);
  const [tasks, setTasks] = useState<TaskModel[]>([]);
  const [events, setEvents] = useState<MissionEventModel[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [selfEvaluation, setSelfEvaluation] = useState<any>(null);
  const [hypotheses, setHypotheses] = useState<any[]>([]);
  const [conclusions, setConclusions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Trace state for live trace updates
  const [trace, setTrace] = useState<TraceModel | null>(null);
  const [traceEvents, setTraceEvents] = useState<TraceEventModel[]>([]);
  const [traceLoading, setTraceLoading] = useState(false);

  const fetchMissionState = useCallback(async () => {
    if (!id) return;
    try {
      const inv = await investigationsApi.getById(id);
      if (inv) setInvestigation(inv);

      const m = await investigationsApi.getMission(id);
      if (m) setMission(m);

      const tList = await investigationsApi.getTasks(id);
      if (tList) setTasks(tList);

      const eList = await investigationsApi.getEvents(id);
      if (eList) setEvents(eList);

      const gList = await investigationsApi.getGaps(id);
      if (gList) setGaps(gList);

      const dList = await investigationsApi.getDecisions(id);
      if (dList) setDecisions(dList);

      const sigList = await investigationsApi.getSignals(id);
      if (sigList) setSignals(sigList);

      // Stage 5G: Self-Evaluation & Hypothesis API calls
      fetch(`/api/investigations/${id}/evaluation`).then((res) => res.json()).then((res) => {
        if (res.data?.latest) setSelfEvaluation(res.data.latest);
      }).catch(() => {});

      fetch(`/api/investigations/${id}/hypotheses`).then((res) => res.json()).then((res) => {
        if (res.data) setHypotheses(res.data);
      }).catch(() => {});

      fetch(`/api/investigations/${id}/conclusions`).then((res) => res.json()).then((res) => {
        if (res.data) setConclusions(res.data);
      }).catch(() => {});
    } catch {
      // Clean error handling
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      investigationsApi.getById(id).then((inv) => {
        if (inv) {
          setInvestigation(inv);
          investigationsApi.startMission(id).catch(() => {});
          fetchMissionState();
        } else {
          // Investigation not found - show error instead of auto-creating
          console.error(`[Workspace] Investigation ${id} not found`);
          setLoading(false);
        }
      }).catch((err) => {
        console.error(`[Workspace] Failed to load investigation ${id}:`, err);
        setLoading(false);
      });
    }
  }, [id, fetchMissionState]);

  useEffect(() => {
    const interval = setInterval(fetchMissionState, 1200);
    return () => clearInterval(interval);
  }, [fetchMissionState]);

  // Fetch trace data for live trace updates
  const fetchTraceData = useCallback(async () => {
    if (!id || !mission) return;
    
    try {
      setTraceLoading(true);
      
      // Try to get trace by investigation ID
      const traceRes = await fetch(`/api/traces?investigationId=${id}&limit=1`);
      const traceData = await traceRes.json();
      
      if (traceData.success && traceData.data && traceData.data.length > 0) {
        const currentTrace = traceData.data[0];
        setTrace(currentTrace);
        
        // Fetch trace events
        const eventsRes = await fetch(`/api/traces/events?traceId=${currentTrace.traceId}&limit=200`);
        const eventsData = await eventsRes.json();
        
        if (eventsData.success && eventsData.data) {
          setTraceEvents(eventsData.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trace data:', err);
    } finally {
      setTraceLoading(false);
    }
  }, [id, mission]);

  useEffect(() => {
    if (mission) {
      fetchTraceData();
      const interval = setInterval(fetchTraceData, 2000); // Poll every 2 seconds for live updates
      return () => clearInterval(interval);
    }
  }, [fetchTraceData, mission]);

  if (loading || !investigation) {
    return (
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 font-mono text-xs">
        {/* Workspace Shell & Top Taskbar */}
        <div className="glass-level-2 p-6 space-y-4 shadow-xl border border-[#E5E7EB]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35 animate-pulse">
                  CONNECTING ORCHESTRATOR NETWORK
                </span>
                <span className="bg-[#FAF9F6] text-[#6B7280] px-2 py-0.5 rounded text-[10px] border border-[#E5E7EB] font-bold">
                  MISSION ID: {id}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#111827] font-sans flex items-center gap-3">
                <Zap className="w-6 h-6 text-[#D4AF37] animate-spin" />
                <span>Initializing Live Orchestrated Mission Workspace...</span>
              </h1>
            </div>
          </div>

          {/* Skeleton Taskbar & Progress */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            <div className="md:col-span-2 space-y-1">
              <span className="text-[#6B7280] text-[10px] block font-bold">STRATEGIC OBJECTIVE</span>
              <div className="h-4 bg-[#FAF9F6] border border-[#E5E7EB] rounded animate-pulse w-3/4" />
            </div>
            <div className="space-y-1">
              <span className="text-[#6B7280] text-[10px] block font-bold">PROGRESS</span>
              <div className="h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-[#D4AF37] w-1/4 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[#6B7280] text-[10px] block font-bold">STATUS</span>
              <span className="font-bold text-[#047857]">● SYNCING PROVIDERS</span>
            </div>
          </div>
        </div>

        {/* Taskbar Steps Header Shell */}
        <div className="glass-level-2 p-4 flex items-center justify-between gap-2 overflow-x-auto border border-[#E5E7EB]">
          {['Objective', 'Planner Tasks', 'Discovery', 'Investigation', 'Correlation', 'Validation', 'Synthesis', 'Recommendations'].map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-[#6B7280] shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-[#D4AF37] text-[#111827]' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>
                {idx + 1}
              </div>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isComplete = investigation.status === 'COMPLETED';
  const isPaused = mission?.status === 'PAUSED';

  const handlePause = async () => {
    await investigationsApi.pauseMission(id);
    fetchMissionState();
  };

  const handleResume = async () => {
    await investigationsApi.resumeMission(id);
    fetchMissionState();
  };

  const handleCancel = async () => {
    await investigationsApi.cancelMission(id);
    fetchMissionState();
  };

  const handleToggleAdversarial = async (flag: string) => {
    if (!investigation) return;
    const currentMetadata = investigation.metadata || {};
    
    // Map flags to failure injection configs
    const failureInjectionMap: Record<string, any> = {
      'forceResearchFail': {
        enabled: true,
        type: 'TOOL_TIMEOUT',
        targetAgent: 'RESEARCH',
        targetTool: 'research',
        errorMessage: 'Crossref API timeout (controlled failure)',
        delayMs: 5000,
        label: 'CONTROLLED TEST FAILURE'
      },
      'forcePatentTimeout': {
        enabled: true,
        type: 'TOOL_TIMEOUT',
        targetAgent: 'PATENT',
        targetTool: 'patent',
        errorMessage: 'USPTO API timeout (controlled failure)',
        delayMs: 5000,
        label: 'CONTROLLED TEST FAILURE'
      },
      'injectConflictingEvidence': {
        enabled: true,
        type: 'INVALID_TOOL_RESPONSE',
        targetAgent: 'COMPETITOR',
        targetTool: 'competitor',
        errorMessage: 'Conflicting evidence injected (controlled failure)',
        label: 'CONTROLLED TEST FAILURE'
      },
      'forceLowConfidence': {
        enabled: true,
        type: 'AGENT_EXECUTION_FAILURE',
        targetAgent: 'CRITIC',
        errorMessage: 'Simulated critic rejection (controlled failure)',
        label: 'CONTROLLED TEST FAILURE'
      }
    };

    const isEnabled = !currentMetadata[flag];
    const updatedMetadata = {
      ...currentMetadata,
      [flag]: isEnabled,
      failureInjection: isEnabled ? failureInjectionMap[flag] : undefined
    };
    
    setInvestigation({
      ...investigation,
      metadata: updatedMetadata,
    });
    
    try {
      await investigationsApi.update(id, { metadata: updatedMetadata });
    } catch {
      // Bypassed
    }
  };

  const progressSteps = [
    { label: 'Objective', completed: true },
    { label: 'Planner Tasks', completed: tasks.length > 0 },
    { label: 'Discovery', completed: investigation.progress >= 20 },
    { label: 'Investigation', completed: investigation.progress >= 50, active: !isComplete && investigation.progress >= 20 && investigation.progress < 50 },
    { label: 'Correlation', completed: investigation.progress >= 70, active: !isComplete && investigation.progress >= 50 && investigation.progress < 70 },
    { label: 'Validation', completed: investigation.progress >= 85, active: !isComplete && investigation.progress >= 70 && investigation.progress < 85 },
    { label: 'Synthesis', completed: investigation.progress >= 95 },
    { label: 'Recommendations', completed: isComplete },
  ];

  const activityFeedItems: ActivityItem[] = events.map((e) => ({
    id: e.id,
    time: new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    agentName: e.agentType ? `${e.agentType} AGENT` : 'RADARX ORCHESTRATOR',
    action: e.message,
  }));

  const evidenceList = investigation.evidence || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8"
    >
      {/* Workspace Header */}
      <div className="glass-level-2 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35 shadow-2xs">
                {isComplete ? 'MISSION COMPLETED' : 'LIVE ORCHESTRATED MISSION'}
              </span>
              <StatusBadge status={investigation.status} />
            </div>
            <h1 className="text-2xl font-extrabold text-[#111827] font-sans">
              {investigation.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ConfidenceIndicator value={investigation.confidenceScore ?? investigation.confidence ?? 90} size="lg" />
            <Link href={`/intelligence/${investigation.id}`}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`inline-flex items-center gap-2 text-xs font-mono font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer ${
                  isComplete
                    ? 'bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] shadow-[#D4AF37]/25'
                    : 'bg-[#E5E7EB] text-[#6B7280]'
                }`}
              >
                <span>VIEW UNIFIED INTELLIGENCE</span>
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Objective & Metadata Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono pt-1">
          <div className="md:col-span-2">
            <span className="text-[#6B7280] text-[10px] block font-bold">STRATEGIC OBJECTIVE</span>
            <span className="text-[#111827] font-sans font-semibold line-clamp-1">
              "{investigation.objective}"
            </span>
          </div>
          <div>
            <span className="text-[#6B7280] text-[10px] block font-bold">PROGRESS</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-2.5 rounded-full bg-[#E5E7EB] overflow-hidden border border-[#D1D5DB]">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227] transition-all duration-500 rounded-full"
                  style={{ width: `${investigation.progress}%` }}
                />
              </div>
              <span className="text-[#8C6D13] font-extrabold">{investigation.progress}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#6B7280] text-[10px] block font-bold">EVIDENCE COLLECTED</span>
              <span className="text-[#111827] font-bold">{evidenceList.length} items</span>
            </div>
            <div>
              <span className="text-[#6B7280] text-[10px] block font-bold">MISSION TASKS</span>
              <span className="text-[#111827] font-bold">{tasks.length} total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumable Investigation Banner (Requirement 18) */}
      {investigation.status === 'INTERRUPTED' && (
        <div className="glass-level-3 p-6 border-l-4 border-l-red-500 bg-red-50/5 space-y-4 rounded-2xl shadow-lg font-mono text-xs">
          <div className="flex items-center justify-between border-b border-red-200/50 pb-3">
            <h3 className="text-sm font-extrabold text-[#DC2626] uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              INVESTIGATION INTERRUPTED
            </h3>
            <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded border border-red-300">
              RESUMABLE STATE DETECTED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[#4B5563] text-[11px]">
            <div>
              <span className="text-gray-500 text-[10px] block font-bold">LAST CHECKPOINT</span>
              <span className="text-[#111827] font-bold text-sm">
                {investigation.metadata?.lastCheckpointTimestamp
                  ? new Date(String(investigation.metadata.lastCheckpointTimestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                Node: {String(investigation.metadata?.lastCheckpointNode || 'Unknown')}
              </span>
            </div>

            <div>
              <span className="text-gray-500 text-[10px] block font-bold">COMPLETED TASKS</span>
              <span className="text-emerald-700 font-extrabold text-sm block mt-1">
                {tasks.filter(t => t.status === 'COMPLETED' || t.status === 'PARTIAL').length} tasks
              </span>
            </div>

            <div>
              <span className="text-gray-500 text-[10px] block font-bold">PENDING / INTERRUPTED</span>
              <span className="text-amber-700 font-extrabold text-sm block mt-1">
                {tasks.filter(t => t.status === 'PENDING' || t.status === 'QUEUED' || t.status === 'INTERRUPTED').length} tasks
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleResume}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-mono text-xs font-extrabold px-6 py-3 rounded-xl shadow-md cursor-pointer transition-all border border-red-500/20"
            >
              <Zap className="w-4 h-4 animate-bounce" />
              <span>RESUME INVESTIGATION</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* RADARX ORCHESTRATOR Live Status Banner + MISSION CONTROLS */}
      <div className="glass-level-3 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[#D4AF37]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
            <Cpu className={`w-5 h-5 text-[#8C6D13] ${!isComplete && !isPaused && investigation.status !== 'INTERRUPTED' ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-extrabold text-[#111827]">
                RADARX ORCHESTRATOR
              </span>
              <span className="text-[10px] font-mono text-[#7A5E0A] bg-[#D4AF37]/25 px-2 py-0.2 rounded font-extrabold">
                {investigation.orchestratorStatus || '● RUNNING'}
              </span>
              {mission && (
                <span className="text-[9px] font-mono text-[#6B7280] bg-[#E5E7EB] px-2 py-0.2 rounded font-bold">
                  PHASE: {mission.currentPhase}
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-[#8C6D13] mt-1 font-semibold">
              Current action: "{investigation.orchestratorAction || 'Orchestrating agent network.'}"
            </p>

            {/* Subtle Checkpoint Status Indicator (Requirement 19) */}
            {Boolean(investigation.metadata?.lastCheckpointId) && (
              <div className="mt-2 text-[10px] font-mono text-emerald-700 flex flex-wrap items-center gap-x-3 gap-y-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-max shadow-2xs">
                <span className="font-extrabold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  ● CHECKPOINT SAVED ({String(investigation.metadata?.lastCheckpointId || '')})
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Last checkpoint: {new Date(String(investigation.metadata?.lastCheckpointTimestamp || '')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Node: {String(investigation.metadata?.lastCheckpointNode || '')}
                </span>
                <span className="text-gray-300">|</span>
                <span className="font-extrabold text-emerald-800 bg-emerald-500/20 px-1.5 py-0.2 rounded">Recoverable</span>
              </div>
            )}
          </div>
        </div>

        {/* Mission Controls Buttons (Pause / Resume / Cancel) */}
        <div className="flex items-center gap-2 shrink-0">
          {!isComplete && (
            <>
              {isPaused || investigation.status === 'INTERRUPTED' ? (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#059669]/15 border border-[#059669]/35 text-[#047857] text-xs font-mono font-bold hover:bg-[#059669]/25 transition-all cursor-pointer shadow-2xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>RESUME</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D97706]/15 border border-[#D97706]/35 text-[#B45309] text-xs font-mono font-bold hover:bg-[#D97706]/25 transition-all cursor-pointer shadow-2xs"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>PAUSE</span>
                </button>
              )}

              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#991B1B]/15 border border-[#991B1B]/35 text-[#991B1B] text-xs font-mono font-bold hover:bg-[#991B1B]/25 transition-all cursor-pointer shadow-2xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>CANCEL</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-2 text-[11px] font-mono text-[#4B5563] bg-white/80 px-3 py-1.5 rounded-xl border border-[#E5E7EB] shrink-0 font-semibold shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${!isComplete && !isPaused && investigation.status !== 'INTERRUPTED' ? 'bg-[#059669] animate-ping' : 'bg-[#059669]'}`} />
            <span>{isPaused ? 'MISSION PAUSED' : investigation.status === 'INTERRUPTED' ? 'MISSION INTERRUPTED' : isComplete ? 'MISSION COMPLETED' : 'ORCHESTRATOR ACTIVE'}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Mission Plan & Planner Decomposition */}
      {tasks.length > 0 && (
        <DynamicMissionPlan tasks={tasks} investigation={investigation} />
      )}

      {/* Adversarial Testing & Fault Injection Console */}
      <div className="glass-level-2 p-5 space-y-4 border border-red-200/50 shadow-md font-mono text-xs bg-red-50/5 rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h3 className="font-extrabold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
            ADVERSARIAL FAULT INJECTION & RECOVERY TESTING CONSOLE
          </h3>
          <span className="text-[9px] bg-red-100 text-red-800 font-extrabold px-2.5 py-0.5 rounded border border-red-300">
            HACKATHON DESTRUCTIVE TESTS
          </span>
        </div>
        
        <p className="text-[11px] font-sans text-[#4B5563] leading-relaxed">
          Select fault scenarios below to simulate provider outages, evidence conflicts, and resource bounds. 
          The LangGraph engine will autonomously adapt, retry, trigger fallbacks, and update confidence values without crashing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-[11px] font-sans">
          <label className="flex items-center gap-3.5 p-3.5 bg-white border border-[#E5E7EB] rounded-2xl cursor-pointer hover:bg-red-50/10 transition-all">
            <input
              type="checkbox"
              checked={!!investigation.metadata?.forceResearchFail}
              onChange={() => handleToggleAdversarial('forceResearchFail')}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#111827] block font-mono text-[10px]">FORCE RESEARCH FAIL</span>
              <span className="text-[10px] text-[#6B7280] block">Forces Crossref API timeout/degradation.</span>
            </div>
          </label>

          <label className="flex items-center gap-3.5 p-3.5 bg-white border border-[#E5E7EB] rounded-2xl cursor-pointer hover:bg-red-50/10 transition-all">
            <input
              type="checkbox"
              checked={!!investigation.metadata?.forcePatentTimeout}
              onChange={() => handleToggleAdversarial('forcePatentTimeout')}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#111827] block font-mono text-[10px]">FORCE PATENT TIMEOUT</span>
              <span className="text-[10px] text-[#6B7280] block">Forces USPTO timeout. Triggers Web fallback.</span>
            </div>
          </label>

          <label className="flex items-center gap-3.5 p-3.5 bg-white border border-[#E5E7EB] rounded-2xl cursor-pointer hover:bg-red-50/10 transition-all">
            <input
              type="checkbox"
              checked={!!investigation.metadata?.injectConflictingEvidence}
              onChange={() => handleToggleAdversarial('injectConflictingEvidence')}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#111827] block font-mono text-[10px]">INJECT CONFLICTING EVIDENCE</span>
              <span className="text-[10px] text-[#6B7280] block">Triggers Conflict Resolution agent logic.</span>
            </div>
          </label>

          <label className="flex items-center gap-3.5 p-3.5 bg-white border border-[#E5E7EB] rounded-2xl cursor-pointer hover:bg-red-50/10 transition-all">
            <input
              type="checkbox"
              checked={!!investigation.metadata?.forceLowConfidence}
              onChange={() => handleToggleAdversarial('forceLowConfidence')}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
            />
            <div>
              <span className="font-bold text-[#111827] block font-mono text-[10px]">FORCE CRITIC REPLAN</span>
              <span className="text-[10px] text-[#6B7280] block">Forces critic rejection. Triggers replan cycle.</span>
            </div>
          </label>
        </div>
      </div>

      {/* Stage 5I Master LangGraph Visual Flow */}
      <InvestigationFlowGraph tasks={tasks} investigation={investigation} />

      {/* Stage 5H Resource Budget, Active Task Queue & Loop/Deadlock Notices */}
      <ExecutionBudgetPanel investigation={investigation} />
      <LoopDeadlockNoticePanel investigation={investigation} />
      <ActiveTaskQueuePanel tasks={tasks} />

      {/* Stage 5G Self-Evaluation, Hypotheses & Conclusion Revisions */}
      <SelfEvaluationPanel evaluation={selfEvaluation} isEvaluating={investigation.orchestratorStatus?.includes('CRITIC') || investigation.orchestratorStatus?.includes('SELF_EVALUATION')} />
      <ConclusionRevisionPanel versions={conclusions} />
      <HypothesisPanel hypotheses={hypotheses} />

      {/* Stage 5I Autonomous Decision Explanation Stream */}
      <DecisionExplanationStream decisions={decisions} />
      
      {/* Live Trace Panel - Task 7 Advanced Tracing */}
      <LiveTracePanel trace={trace} traceEvents={traceEvents} traceLoading={traceLoading} />

      <ToolSelectionPanel evidence={evidenceList} />
      <InvestigationMemoryPanel investigationId={id} />
      <AgentNetworkPanel tasks={tasks} investigation={investigation} />
      <KnowledgeGapPanel gaps={gaps} tasks={tasks} />

      {/* Grid: Mission Event Log & Evidence Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Mission Events Log */}
        <div className="glass-level-2 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#C9A227]" />
              MISSION EVENTS STREAM
            </h2>
            <span className="text-[10px] font-mono text-[#9CA3AF] font-bold">
              {events.length} EVENTS EMITTED
            </span>
          </div>

          <ActivityFeed
            activities={
              activityFeedItems.length > 0
                ? activityFeedItems
                : [
                    {
                      id: 'def-1',
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      agentName: 'RadarX Orchestrator',
                      action: 'Orchestrator mission initialization.',
                    },
                  ]
            }
          />
        </div>

        {/* Dynamic Evidence Stream */}
        <div className="glass-level-2 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D97706]" />
              ACCUMULATED EVIDENCE STREAM ({evidenceList.length})
            </h2>
            <span className="text-[10px] font-mono text-[#047857] font-bold">
              REAL EVIDENCE ACCUMULATION
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scroll pr-1">
            {evidenceList.length > 0 ? (
              evidenceList.map((ev: any, idx: number) => <EvidenceCard key={`${ev.id}-${idx}`} evidence={ev} />)
            ) : (
              <div className="p-8 text-center text-xs font-mono text-[#6B7280]">
                Scanning external data providers...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stage 2.9 Knowledge Gaps & Autonomous Decision Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Knowledge Gaps Panel */}
        <div className="glass-level-2 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              AUTONOMOUS KNOWLEDGE GAPS ({gaps.length})
            </h2>
            <span className="text-[10px] font-mono text-[#7A5E0A] font-bold">
              DYNAMIC GAP RESOLUTION
            </span>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scroll pr-1">
            {gaps.length > 0 ? (
              gaps.map((g: any) => (
                <div
                  key={g.id}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#FAF9F6] space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#111827]">{g.description}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        g.status === 'RESOLVED'
                          ? 'bg-[#059669]/15 text-[#047857]'
                          : g.importance === 'HIGH'
                          ? 'bg-[#DC2626]/15 text-[#991B1B]'
                          : 'bg-[#D4AF37]/20 text-[#7A5E0A]'
                      }`}
                    >
                      {g.status} • {g.importance}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#4B5563] flex flex-wrap gap-2">
                    <span>Evidence needed:</span>
                    {g.evidenceNeeded?.map((e: string, idx: number) => (
                      <span key={idx} className="bg-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs font-mono text-[#6B7280]">
                No knowledge gaps detected. Evidence coverage is optimal.
              </div>
            )}
          </div>
        </div>

        {/* Autonomous Decision Log */}
        <div className="glass-level-2 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#059669]" />
              AUTONOMOUS DECISION LOG ({decisions.length})
            </h2>
            <span className="text-[10px] font-mono text-[#047857] font-bold">
              CONTROLLER EXECUTION
            </span>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scroll pr-1">
            {decisions.length > 0 ? (
              decisions.map((d: any) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#FAF9F6] space-y-1.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#059669]">{d.decision}</span>
                    <span className="text-[10px] text-[#6B7280]">
                      {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[#374151] font-sans text-xs">{d.reason}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs font-mono text-[#6B7280]">
                Controller initializing decision evaluation loop...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Investigation Progress Checklist */}
      <div className="glass-level-2 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827]">
            INVESTIGATION STAGE CHECKLIST
          </h2>
          <span className="text-xs font-mono text-[#8C6D13] font-bold">
            {isComplete ? 'ALL STAGES COMPLETE' : 'STAGES IN PROGRESS'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {progressSteps.map((s, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                s.completed
                  ? 'bg-[#059669]/10 border-[#059669]/30 text-[#047857]'
                  : s.active
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37]/45 text-[#7A5E0A] font-bold shadow-xs'
                  : 'bg-[#FAF9F6] border-[#E5E7EB] text-[#9CA3AF]'
              }`}
            >
              <span>
                {idx + 1}. {s.label}
              </span>
              {s.completed ? (
                <Check className="w-4 h-4 text-[#059669]" />
              ) : s.active ? (
                <span className="w-2 h-2 rounded-full bg-[#C9A227] animate-ping" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3">
          <Link href={`/intelligence/${investigation.id}`}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-xs font-extrabold px-6 py-3 rounded-xl shadow-md shadow-[#D4AF37]/25 transition-all cursor-pointer"
            >
              <span>VIEW UNIFIED INTELLIGENCE →</span>
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
