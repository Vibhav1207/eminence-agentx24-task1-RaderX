'use client';

import React, { useState, useEffect } from 'react';
import { defaultAdversarialScenarioFramework, AdversarialScenarioDefinition, AdversarialScenarioId } from '@/lib/orchestrator/adversarialScenarioFramework';
import { investigationsApi } from '@/lib/api';
import { InvestigationModel, TaskModel, MissionEventModel, DecisionLogModel } from '@/lib/types';
import { ShieldAlert, Play, Cpu, CheckCircle2, Zap, RefreshCw, AlertTriangle, ArrowRight, Layers, Database } from 'lucide-react';

import { InvestigationFlowGraph } from '@/components/investigation/InvestigationFlowGraph';
import { DecisionExplanationStream } from '@/components/investigation/DecisionExplanationStream';
import { ExecutionBudgetPanel } from '@/components/investigation/ExecutionBudgetPanel';
import { ActiveTaskQueuePanel } from '@/components/investigation/ActiveTaskQueuePanel';
import { LoopDeadlockNoticePanel } from '@/components/investigation/LoopDeadlockNoticePanel';
import { SelfEvaluationPanel } from '@/components/investigation/SelfEvaluationPanel';
import { ConclusionRevisionPanel } from '@/components/investigation/ConclusionRevisionPanel';
import { HypothesisPanel } from '@/components/investigation/HypothesisPanel';

export default function AdversarialTestPage() {
  const scenarios = defaultAdversarialScenarioFramework.listScenarios();
  const [selectedScenarioId, setSelectedScenarioId] = useState<AdversarialScenarioId>('TOOL_FAILURE_AND_FALLBACK');
  const [targetEntity, setTargetEntity] = useState('Company Quantum');
  const [isRunning, setIsRunning] = useState(false);
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>(null);

  const [investigation, setInvestigation] = useState<InvestigationModel | null>(null);
  const [tasks, setTasks] = useState<TaskModel[]>([]);
  const [events, setEvents] = useState<MissionEventModel[]>([]);
  const [decisions, setDecisions] = useState<DecisionLogModel[]>([]);
  const [selfEvaluation, setSelfEvaluation] = useState<any>(null);
  const [conclusions, setConclusions] = useState<any[]>([]);
  const [hypotheses, setHypotheses] = useState<any[]>([]);

  // Polling active investigation state
  useEffect(() => {
    if (!activeInvestigationId) return;

    const fetchState = async () => {
      try {
        const inv = await investigationsApi.getById(activeInvestigationId);
        setInvestigation(inv);

        const tasksData = await investigationsApi.getTasks(activeInvestigationId);
        setTasks(tasksData);

        const eventsData = await investigationsApi.getEvents(activeInvestigationId);
        setEvents(eventsData);

        const stateRes = await fetch(`/api/investigations/${activeInvestigationId}/state`).then((r) => r.json());
        if (stateRes.success && stateRes.data) {
          setDecisions(stateRes.data.decisions || []);
        }

        const evalRes = await fetch(`/api/investigations/${activeInvestigationId}/evaluation`).then((r) => r.json());
        if (evalRes.success && evalRes.data) {
          setSelfEvaluation(evalRes.data.latest || null);
        }

        const hypRes = await fetch(`/api/investigations/${activeInvestigationId}/hypotheses`).then((r) => r.json());
        if (hypRes.success && hypRes.data) {
          setHypotheses(hypRes.data || []);
        }

        const concRes = await fetch(`/api/investigations/${activeInvestigationId}/conclusions`).then((r) => r.json());
        if (concRes.success && concRes.data) {
          setConclusions(concRes.data || []);
        }

        if (inv.status === 'COMPLETED' || inv.status === 'FAILED') {
          setIsRunning(false);
        }
      } catch (err) {
        console.error('[AdversarialTestPage] Poll error:', err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [activeInvestigationId]);

  const handleStartTest = async () => {
    setIsRunning(true);
    setInvestigation(null);
    setTasks([]);
    setEvents([]);
    setDecisions([]);
    setSelfEvaluation(null);

    try {
      const res = await fetch('/api/adversarial-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenarioId,
          targetEntity,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setActiveInvestigationId(res.investigationId);
      } else {
        alert(`Failed to launch scenario: ${res.error}`);
        setIsRunning(false);
      }
    } catch (err: any) {
      alert(`Error starting test: ${err.message}`);
      setIsRunning(false);
    }
  };

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="container-responsive p-responsive space-y-responsive">
      {/* Header Banner */}
      <div className="glass-level-2 p-responsive rounded-2xl border border-white/20 shadow-md space-y-3 bg-gradient-to-r from-white/90 via-amber-50/40 to-white/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-[#8C6D13]" />
            </div>
            <div>
              <h1 className="text-responsive-lg font-extrabold tracking-tight text-[#111827] font-mono">
                RADARX — ADVERSARIAL LIVE TEST BENCH
              </h1>
              <p className="text-responsive-xs text-gray-600 font-sans mt-0.5">
                Live verification bench for LangGraph dynamic planning, failure recovery, tool fallback, conflict resolution, self-evaluation & resource-aware execution.
              </p>
            </div>
          </div>
          <span className="badge-responsive bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/30 uppercase tracking-widest shrink-0">
            LANGGRAPH AGENTIC ENGINE
          </span>
        </div>

        {/* Framework Justification */}
        <div className="p-responsive bg-white/80 rounded-xl border border-gray-200 text-responsive-xs leading-relaxed text-gray-700 space-y-1 font-sans">
          <span className="font-bold text-[#111827] block font-mono text-responsive-xs uppercase tracking-wider">
            💡 FRAMEWORK CHOICE & ARCHITECTURE JUSTIFICATION (LANGGRAPH):
          </span>
          <p>
            RadarX utilizes <strong>LangGraph</strong> for its stateful directed-graph execution model. Unlike fixed pipeline frameworks, LangGraph enables <strong>cyclic node transitions, native state checkpointing, fine-grained conditional edge routing, parallel sub-graph branching, and in-memory state persistence</strong>. This allows RadarX to dynamically route around tool timeouts, resolve evidence conflicts, evaluate hypotheses, self-correct overclaiming statements, and recover from crashes seamlessly.
          </p>
        </div>
      </div>

      {/* Live Scenario Selector Grid */}
      <div className="space-y-responsive">
        <h2 className="text-responsive-sm font-bold uppercase tracking-wider text-gray-700 font-mono flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#D4AF37]" />
          SELECT ADVERSARIAL LIVE TEST SCENARIO
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-responsive">
          {scenarios.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <div
                key={sc.id}
                onClick={() => !isRunning && setSelectedScenarioId(sc.id)}
                className={`p-responsive rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-[#D4AF37] shadow-md ring-2 ring-[#D4AF37]/20'
                    : 'bg-white/70 border-gray-200 hover:border-gray-300 hover:bg-white'
                } ${isRunning ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-responsive-xs font-bold font-mono text-[#111827]">{sc.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />}
                  </div>
                  <p className="text-responsive-xs text-gray-600 font-sans leading-snug">{sc.description}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 font-mono text-responsive-xs text-amber-900 bg-amber-50/50 p-2 rounded-lg">
                  <span className="font-bold">EXPECTED RECOVERY: </span>
                  {sc.expectedBehavior}
                </div>
              </div>
            );
          })}
        </div>

        {/* Launch Control Panel */}
        <div className="glass-level-2 p-responsive rounded-2xl border border-white/20 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 flex-wrap">
          <div className="space-y-1 w-full sm:w-auto">
            <span className="text-responsive-xs font-bold text-gray-900 font-mono block">
              SELECTED: {selectedScenario?.name}
            </span>
            <p className="text-responsive-xs text-gray-500 font-sans">
              Target Entity: <input type="text" value={targetEntity} onChange={(e) => setTargetEntity(e.target.value)} className="input-responsive px-responsive py-1 rounded border border-gray-300 font-mono text-responsive-xs text-gray-900 ml-1 w-full sm:w-auto" />
            </p>
          </div>

          <button
            onClick={handleStartTest}
            disabled={isRunning}
            className={`px-responsive py-3 rounded-xl font-mono text-responsive-xs font-extrabold flex items-center gap-2 shadow-md transition-all touch-target shrink-0 ${
              isRunning
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#B89218] text-white hover:shadow-lg hover:scale-102 active:scale-98'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                RUNNING ADVERSARIAL LIVE TEST...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                RUN ADVERSARIAL LIVE TEST
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Execution Results Section */}
      {activeInvestigationId && (
        <div className="space-y-responsive pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-wrap">
            <h2 className="text-responsive-sm font-bold uppercase tracking-wider text-gray-800 font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#4F46E5]" />
              LIVE EXECUTION DASHBOARD (ID: {activeInvestigationId})
            </h2>
            <span className="text-responsive-xs font-mono text-gray-500 shrink-0">
              STATUS: <strong className="text-gray-900">{investigation?.status || 'INITIALIZING'}</strong>
            </span>
          </div>

          {/* Master LangGraph Visual Flow */}
          <InvestigationFlowGraph tasks={tasks} investigation={investigation} />

          {/* Resource Budget & Loop/Deadlock Alerts */}
          <ExecutionBudgetPanel investigation={investigation} />
          <LoopDeadlockNoticePanel investigation={investigation} />

          {/* Active Task Queue & Priority Scheduler */}
          <ActiveTaskQueuePanel tasks={tasks} />

          {/* Self Evaluation, Hypotheses & Conclusions */}
          <SelfEvaluationPanel evaluation={selfEvaluation} isEvaluating={investigation?.orchestratorStatus?.includes('CRITIC')} />
          <ConclusionRevisionPanel versions={conclusions} />
          <HypothesisPanel hypotheses={hypotheses} />

          {/* Decision Stream */}
          <DecisionExplanationStream decisions={decisions} />

          {/* Final Report Output */}
          {investigation?.intelligence && (
            <div className="glass-level-2 p-responsive rounded-2xl border border-white/20 shadow-md space-y-4 bg-white/95">
              <h3 className="font-bold text-[#111827] uppercase tracking-wider font-mono text-responsive-sm border-b border-gray-200 pb-2">
                📄 FINAL EXECUTIVE INTELLIGENCE BRIEF (ADVERSARIAL RECOVERY VERIFIED)
              </h3>
              <div className="p-responsive bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-responsive-xs text-gray-800 font-sans leading-relaxed">
                <span className="font-bold text-gray-900 block font-mono">EXECUTIVE SUMMARY:</span>
                <p>{investigation.intelligence.executiveSummary}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
