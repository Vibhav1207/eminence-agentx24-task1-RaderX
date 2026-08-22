'use client';

import * as React from 'react';
import { useState } from 'react';
import { TaskModel, InvestigationModel } from '../../lib/types';
import { 
  HelpCircle, 
  ArrowRight,
  Info,
  Layers,
  Clock
} from 'lucide-react';

interface DynamicMissionPlanProps {
  tasks: TaskModel[];
  investigation?: InvestigationModel;
}

export function DynamicMissionPlan({ tasks, investigation }: DynamicMissionPlanProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-xs';
      case 'RUNNING':
        return 'bg-amber-50 text-amber-700 border-amber-200/60 animate-pulse shadow-xs';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border-red-200/60 shadow-xs';
      case 'VERIFYING':
        return 'bg-blue-50 text-blue-700 border-blue-200/60 animate-pulse';
      case 'REPLANNED':
        return 'bg-purple-50 text-purple-700 border-purple-200/60';
      case 'BLOCKED':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'QUEUED':
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'MEDIUM':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'LOW':
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Concurrency & Parallel Execution Timing Helpers (Requirement 16)
  const calculateEstimatedSequentialTime = () => {
    let sum = 0;
    tasks.forEach(t => {
      if (t.startedAt && t.completedAt) {
        const diff = (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 1000;
        sum += Math.max(0.1, Number(diff.toFixed(1)));
      }
    });
    return sum.toFixed(1);
  };

  const calculateParallelTime = () => {
    const startedTimes = tasks
      .filter(t => t.startedAt)
      .map(t => new Date(t.startedAt!).getTime());
    const completedTimes = tasks
      .filter(t => t.completedAt)
      .map(t => new Date(t.completedAt!).getTime());

    if (startedTimes.length === 0) return '0.0';

    const minStart = Math.min(...startedTimes);
    const maxEnd = completedTimes.length > 0 ? Math.max(...completedTimes) : Date.now();

    return ((maxEnd - minStart) / 1000).toFixed(1);
  };

  return (
    <div className="glass-level-2 p-6 space-y-6 shadow-lg font-mono text-xs border border-[#E5E7EB] rounded-2xl bg-white/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-extrabold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#D4AF37]" />
          DYNAMIC MISSION PLAN & PLANNER DECOMPOSITION ({tasks.length})
        </h3>
        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded border border-emerald-200/40">
          GEMINI LLM POWERED PLANNER
        </span>
      </div>

      {/* Concurrency & Parallel Execution Metrics (Requirement 16) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 font-mono text-[10px]">
        <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-center shadow-2xs">
          <span className="text-[#6B7280] block text-[8px] uppercase">PARALLEL TASKS</span>
          <span className="text-[#111827] text-sm font-extrabold">
            {tasks.filter(t => t.status !== 'PENDING' && t.status !== 'QUEUED').length}
          </span>
        </div>
        <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-center shadow-2xs">
          <span className="text-[#6B7280] block text-[8px] uppercase">ACTIVE AGENTS</span>
          <span className="text-amber-600 text-sm font-extrabold animate-pulse">
            {tasks.filter(t => t.status === 'RUNNING' || t.status === 'VERIFYING').length}
          </span>
        </div>
        <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-center shadow-2xs">
          <span className="text-[#6B7280] block text-[8px] uppercase">COMPLETED</span>
          <span className="text-emerald-600 text-sm font-extrabold">
            {tasks.filter(t => t.status === 'COMPLETED' || t.status === 'PARTIAL').length}
          </span>
        </div>
        <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-center shadow-2xs">
          <span className="text-[#6B7280] block text-[8px] uppercase">FAILED</span>
          <span className="text-red-600 text-sm font-extrabold">
            {tasks.filter(t => t.status === 'FAILED').length}
          </span>
        </div>
        <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-center shadow-2xs">
          <span className="text-[#6B7280] block text-[8px] uppercase">EST. SEQ TIME</span>
          <span className="text-[#111827] text-sm font-extrabold flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            {calculateEstimatedSequentialTime()}s
          </span>
        </div>
        <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-center shadow-2xs">
          <span className="text-[#6B7280] block text-[8px] uppercase">PARALLEL TIME</span>
          <span className="text-blue-600 text-sm font-extrabold flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-blue-400" />
            {calculateParallelTime()}s
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Tasks List */}
        <div className="lg:col-span-2 space-y-2.5 max-h-[360px] overflow-y-auto pr-2">
          {tasks.map((task, idx) => {
            const isSelected = selectedTaskId === task.id;

            return (
              <button
                key={`${task.id}-${idx}`}
                onClick={() => setSelectedTaskId(task.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                  isSelected 
                    ? 'bg-amber-50/20 border-[#D4AF37] ring-1 ring-[#D4AF37]/30 shadow-md' 
                    : task.status === 'RUNNING'
                    ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30 hover:bg-[#D4AF37]/10'
                    : 'bg-white/80 border-[#E5E7EB] hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#111827] text-[11px] truncate uppercase">
                      {task.title}
                    </span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase border ${getStatusStyle(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${getPriorityStyle(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4B5563] font-sans leading-tight line-clamp-2">
                    {task.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-[9px] text-[#9CA3AF]">
                  <span>DEP: {task.dependencies.length}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Detailed Task Inspection (Requirement 17) */}
        <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E5E7EB] flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] block mb-3 uppercase flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
              TASK INSPECTOR PANEL
            </span>
            {selectedTask ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <h4 className="font-extrabold text-[#111827] text-xs uppercase truncate max-w-[150px]">
                    {selectedTask.title}
                  </h4>
                  <span className="text-[9px] bg-amber-100 text-[#8C6D13] px-2 py-0.5 rounded font-extrabold uppercase">
                    {selectedTask.agentType}
                  </span>
                </div>

                <div className="space-y-3 text-[11px] font-sans">
                  {/* Why this task */}
                  <div>
                    <span className="font-bold text-[#6B7280] font-mono text-[9px] block uppercase">WHY THIS TASK?</span>
                    <p className="text-[#374151] mt-0.5 leading-relaxed italic bg-white p-2.5 rounded-xl border border-[#E5E7EB]">
                      "{selectedTask.whyThisTask || 'This task was dynamically scheduled by the Gemini planner engine to retrieve foundational evidence for verification.'}"
                    </p>
                  </div>

                  {/* Concurrency parameters */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E7EB] font-mono text-[9px]">
                    {selectedTask.startedAt && (
                      <div>
                        <span className="text-[#6B7280] block">START TIME</span>
                        <span className="text-[#111827] font-semibold">{new Date(selectedTask.startedAt).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {selectedTask.completedAt && (
                      <div>
                        <span className="text-[#6B7280] block">END TIME</span>
                        <span className="text-[#111827] font-semibold">{new Date(selectedTask.completedAt).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {selectedTask.startedAt && selectedTask.completedAt && (
                      <div className="col-span-2 mt-1">
                        <span className="text-[#6B7280] block">ACTUAL DURATION</span>
                        <span className="text-blue-600 font-extrabold">
                          {((new Date(selectedTask.completedAt).getTime() - new Date(selectedTask.startedAt).getTime()) / 1000).toFixed(1)}s
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Information Gain */}
                  {selectedTask.infoGain && (
                    <div>
                      <span className="font-bold text-[#6B7280] font-mono text-[9px] block uppercase">EXPECTED INFORMATION VALUE</span>
                      <p className="text-[#111827] font-semibold mt-0.5">{selectedTask.infoGain}</p>
                    </div>
                  )}

                  {/* Verification Requirement */}
                  <div>
                    <span className="font-bold text-[#6B7280] font-mono text-[9px] block uppercase">VERIFICATION REQUIRED?</span>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 border ${
                      selectedTask.verificationRequired 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {selectedTask.verificationRequired ? 'YES (CRITIC RE-EVALUATION)' : 'NO'}
                    </span>
                  </div>

                  {/* Dependencies */}
                  {selectedTask.dependencies.length > 0 && (
                    <div>
                      <span className="font-bold text-[#6B7280] font-mono text-[9px] block uppercase">DEPENDENCIES</span>
                      <div className="flex flex-wrap gap-1.5 mt-1 font-mono text-[9px]">
                        {selectedTask.dependencies.map(depId => (
                          <span key={depId} className="bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                            {depId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inputs terminal window */}
                  <div>
                    <span className="font-bold text-[#6B7280] font-mono text-[9px] block uppercase">INPUT PARAMETERS</span>
                    <pre className="bg-[#111827] text-emerald-400 p-2.5 rounded-xl text-[9px] font-mono overflow-x-auto mt-1 border border-gray-800">
                      {JSON.stringify(selectedTask.input, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-[#9CA3AF] space-y-2">
                <HelpCircle className="w-10 h-10 mx-auto opacity-40 text-[#6B7280]" />
                <p>Select any active mission task from the queue to inspect planning reasons, expected information gains, and inputs.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] text-[9px] text-[#6B7280] flex justify-between items-center font-mono">
            <span>Planner status: ACTIVE</span>
            <span>Dependencies tracked: YES</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DynamicMissionPlan;
