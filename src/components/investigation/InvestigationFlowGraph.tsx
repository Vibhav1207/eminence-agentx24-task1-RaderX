'use client';

import React from 'react';
import { TaskModel, InvestigationModel } from '@/lib/types';
import { Cpu, ArrowRight, CheckCircle2, Clock, AlertTriangle, ShieldCheck, FileText, Zap } from 'lucide-react';

interface InvestigationFlowGraphProps {
  tasks: TaskModel[];
  investigation: InvestigationModel | null;
}

export function InvestigationFlowGraph({ tasks, investigation }: InvestigationFlowGraphProps) {
  const orchestratorStatus = investigation?.orchestratorStatus || '● RUNNING';
  const isComplete = investigation?.status === 'COMPLETED';

  // Compute node statuses from active tasks
  const hasResearch = tasks.some((t) => t.agentType === 'RESEARCH');
  const hasPatent = tasks.some((t) => t.agentType === 'PATENT');
  const hasNews = tasks.some((t) => t.agentType === 'NEWS');
  const hasCompetitor = tasks.some((t) => t.agentType === 'COMPETITOR');
  const hasWeb = tasks.some((t) => t.agentType === 'WEB');

  const researchDone = tasks.filter((t) => t.agentType === 'RESEARCH' && t.status === 'COMPLETED').length;
  const patentDone = tasks.filter((t) => t.agentType === 'PATENT' && t.status === 'COMPLETED').length;
  const newsDone = tasks.filter((t) => t.agentType === 'NEWS' && t.status === 'COMPLETED').length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;

  const getNodeBadge = (label: string, isDone: boolean, isActive: boolean, details?: string) => {
    if (isComplete || isDone) {
      return {
        bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        statusText: details || 'COMPLETED',
      };
    }
    if (isActive) {
      return {
        bg: 'bg-amber-50 border-amber-300 text-amber-900',
        icon: <Zap className="w-4 h-4 text-amber-600 animate-bounce" />,
        statusText: details || 'EXECUTING',
      };
    }
    return {
      bg: 'bg-gray-50 border-gray-200 text-gray-600',
      icon: <Clock className="w-4 h-4 text-gray-400" />,
      statusText: 'PENDING',
    };
  };

  const plannerNode = getNodeBadge('DYNAMIC PLANNER', completedTasks > 0, !isComplete && completedTasks === 0, `${totalTasks} tasks planned`);
  const agentsNode = getNodeBadge('PARALLEL AGENTS', completedTasks > 0, !isComplete && completedTasks > 0 && completedTasks < totalTasks, `${completedTasks}/${totalTasks} finished`);
  const validatorNode = getNodeBadge('VALIDATOR & CLAIMS', completedTasks >= Math.max(1, Math.floor(totalTasks * 0.6)), false, 'Evidence Normalized');
  const criticNode = getNodeBadge('SELF-EVALUATOR', isComplete, orchestratorStatus.includes('CRITIC') || orchestratorStatus.includes('EVALUATION'), 'Coverage Verified');
  const synthesisNode = getNodeBadge('INTELLIGENCE SYNTHESIS', isComplete, orchestratorStatus.includes('SYNTHESIZING'), isComplete ? 'Brief Generated' : 'Finalizing');

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#4F46E5]" />
          MASTER LANGGRAPH EXECUTION WORKFLOW
        </h3>
        <span className="text-[10px] bg-[#4F46E5]/15 text-[#4F46E5] font-bold px-2 py-0.5 rounded border border-[#4F46E5]/30">
          DYNAMIC ROUTING ENABLED
        </span>
      </div>

      {/* Visual Graph Nodes Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
        {/* Node 1: Dynamic Planner */}
        <div className={`p-3.5 rounded-xl border space-y-2 text-center transition-all ${plannerNode.bg}`}>
          <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
            {plannerNode.icon}
            <span>1. PLANNER</span>
          </div>
          <span className="text-[10px] block font-sans opacity-85 font-medium">{plannerNode.statusText}</span>
        </div>

        {/* Node 2: Parallel Agents */}
        <div className={`p-3.5 rounded-xl border space-y-2 text-center transition-all ${agentsNode.bg}`}>
          <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
            {agentsNode.icon}
            <span>2. AGENT NETWORK</span>
          </div>
          <span className="text-[10px] block font-sans opacity-85 font-medium">{agentsNode.statusText}</span>
        </div>

        {/* Node 3: Validator & Conflict Resolver */}
        <div className={`p-3.5 rounded-xl border space-y-2 text-center transition-all ${validatorNode.bg}`}>
          <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
            {validatorNode.icon}
            <span>3. VALIDATOR</span>
          </div>
          <span className="text-[10px] block font-sans opacity-85 font-medium">{validatorNode.statusText}</span>
        </div>

        {/* Node 4: Self-Evaluator */}
        <div className={`p-3.5 rounded-xl border space-y-2 text-center transition-all ${criticNode.bg}`}>
          <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
            {criticNode.icon}
            <span>4. EVALUATOR</span>
          </div>
          <span className="text-[10px] block font-sans opacity-85 font-medium">{criticNode.statusText}</span>
        </div>

        {/* Node 5: Synthesis */}
        <div className={`p-3.5 rounded-xl border space-y-2 text-center transition-all ${synthesisNode.bg}`}>
          <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
            {synthesisNode.icon}
            <span>5. SYNTHESIS</span>
          </div>
          <span className="text-[10px] block font-sans opacity-85 font-medium">{synthesisNode.statusText}</span>
        </div>
      </div>
    </div>
  );
}

export default InvestigationFlowGraph;
