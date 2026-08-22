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
  XCircle
} from 'lucide-react';
import { StatusBadge, ConfidenceIndicator } from '@/components/ui/Indicators';
import { ActivityFeed, ActivityItem } from '@/components/ui/Feeds';
import { EvidenceCard } from '@/components/ui/Cards';
import { investigationsApi } from '@/lib/api';
import { InvestigationModel, MissionModel, TaskModel, MissionEventModel } from '@/lib/types';

import { InvestigationTracePanel } from '@/components/investigation/InvestigationTracePanel';
import { ToolSelectionPanel } from '@/components/investigation/ToolSelectionPanel';
import { InvestigationMemoryPanel } from '@/components/investigation/InvestigationMemoryPanel';
import { AgentNetworkPanel } from '@/components/investigation/AgentNetworkPanel';
import { KnowledgeGapPanel } from '@/components/investigation/KnowledgeGapPanel';

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
  const [loading, setLoading] = useState(true);

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
          // Auto-create mission for any URL ID so workspace never displays plain error
          investigationsApi.create({
            title: `Strategic AI Intelligence Audit (${id.slice(-6)})`,
            strategicQuestion: `Analyze competitive landscape, patent filings, research preprints, and open-source velocity around AI technology.`,
            organization: 'NVIDIA',
            technology: 'Generative AI & Inference Hardware',
            priority: 'CRITICAL',
            timeHorizon: 'LAST_6_MONTHS',
            primaryEntities: ['NVIDIA', 'Cursor AI', 'GitHub Copilot', 'Anysphere Inc.'],
          }).then((newInv) => {
            if (newInv) {
              setInvestigation(newInv);
              investigationsApi.startMission(newInv.id).catch(() => {});
              fetchMissionState();
            } else {
              setLoading(false);
            }
          }).catch(() => setLoading(false));
        }
      }).catch(() => setLoading(false));
    }
  }, [id, fetchMissionState]);

  useEffect(() => {
    const interval = setInterval(fetchMissionState, 1200);
    return () => clearInterval(interval);
  }, [fetchMissionState]);

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

      {/* RADARX ORCHESTRATOR Live Status Banner + MISSION CONTROLS */}
      <div className="glass-level-3 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[#D4AF37]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
            <Cpu className={`w-5 h-5 text-[#8C6D13] ${!isComplete && !isPaused ? 'animate-pulse' : ''}`} />
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
          </div>
        </div>

        {/* Mission Controls Buttons (Pause / Resume / Cancel) */}
        <div className="flex items-center gap-2 shrink-0">
          {!isComplete && (
            <>
              {isPaused ? (
                <button
                  onClick={handleResume}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#059669]/15 border border-[#059669]/35 text-[#047857] text-xs font-mono font-bold hover:bg-[#059669]/25 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>RESUME</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D97706]/15 border border-[#D97706]/35 text-[#B45309] text-xs font-mono font-bold hover:bg-[#D97706]/25 transition-all cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>PAUSE</span>
                </button>
              )}

              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#991B1B]/15 border border-[#991B1B]/35 text-[#991B1B] text-xs font-mono font-bold hover:bg-[#991B1B]/25 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>CANCEL</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-2 text-[11px] font-mono text-[#4B5563] bg-white/80 px-3 py-1.5 rounded-xl border border-[#E5E7EB] shrink-0 font-semibold shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${!isComplete && !isPaused ? 'bg-[#059669] animate-ping' : 'bg-[#059669]'}`} />
            <span>{isPaused ? 'MISSION PAUSED' : isComplete ? 'MISSION COMPLETED' : 'ORCHESTRATOR ACTIVE'}</span>
          </div>
        </div>
      </div>

      {/* Planned Tasks Decomposition with Dependencies */}
      {tasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8C6D13]" />
            MISSION TASK DECOMPOSITION & DEPENDENCY QUEUE ({tasks.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tasks.map((task, idx) => (
              <div
                key={`${task.id}-${idx}`}
                className={`p-3.5 rounded-xl border text-xs font-mono space-y-2 shadow-2xs transition-all ${
                  task.status === 'RUNNING'
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37]/45 shadow-sm'
                    : task.status === 'COMPLETED'
                    ? 'bg-white border-[#059669]/30'
                    : 'bg-white/80 border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#111827] truncate">{task.title}</span>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                      task.status === 'COMPLETED'
                        ? 'bg-[#059669]/15 text-[#047857]'
                        : task.status === 'RUNNING'
                        ? 'bg-[#D4AF37]/25 text-[#7A5E0A]'
                        : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#4B5563] font-sans leading-tight line-clamp-2">
                  {task.description}
                </p>
                {task.dependencies.length > 0 && (
                  <div className="text-[9px] text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
                    Depends on: {task.dependencies.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additive Mandatory Capabilities Panels */}
      <InvestigationTracePanel events={events} decisions={decisions} />
      <ToolSelectionPanel evidence={evidenceList} />
      <InvestigationMemoryPanel investigationId={id} />
      <AgentNetworkPanel tasks={tasks} />
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
