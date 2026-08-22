'use client';

import React from 'react';
import { TaskModel, PriorityLevel } from '@/lib/types';
import { ListOrdered, CheckCircle2, Clock, Zap, AlertCircle, XCircle } from 'lucide-react';

interface ActiveTaskQueuePanelProps {
  tasks: TaskModel[];
}

export function ActiveTaskQueuePanel({ tasks }: ActiveTaskQueuePanelProps) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  const priorityOrder: Record<PriorityLevel, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const pA = priorityOrder[a.priority || 'MEDIUM'];
    const pB = priorityOrder[b.priority || 'MEDIUM'];
    return pB - pA;
  });

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'MEDIUM':
        return 'bg-sky-100 text-sky-800 border-sky-300 font-medium';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 font-normal';
    }
  };

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-[#0284C7]" />
          ACTIVE TASK QUEUE & PRIORITY-AWARE SCHEDULER ({tasks.length})
        </h3>
        <span className="text-[10px] bg-[#0284C7]/15 text-[#0284C7] font-bold px-2 py-0.5 rounded border border-[#0284C7]/30">
          PRIORITY SORTED
        </span>
      </div>

      {/* Task List */}
      <div className="space-y-2.5 max-h-[320px] overflow-y-auto custom-scroll pr-1">
        {sortedTasks.map((t) => {
          const pBadge = getPriorityBadge(t.priority || 'MEDIUM');
          const isDone = t.status === 'COMPLETED';
          const isSkipped = (t.status as string) === 'SKIPPED';

          return (
            <div
              key={t.id}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans transition-all ${
                isDone
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : isSkipped
                  ? 'bg-amber-50/40 border-amber-200 opacity-75'
                  : 'bg-white/90 border-gray-200 shadow-2xs'
              }`}
            >
              {/* Left Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${pBadge}`}>
                    {t.priority || 'MEDIUM'}
                  </span>
                  <span className="font-bold text-xs text-gray-900 font-mono">{t.title}</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">{t.description}</p>
                {t.skipReason && (
                  <span className="text-[10px] text-amber-700 font-mono block font-bold">
                    ⚠ {t.skipReason}
                  </span>
                )}
              </div>

              {/* Right Status & Cost Tags */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-mono text-[10px]">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                  {t.agentType}
                </span>
                <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                  1 TOOL CALL
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : isSkipped
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {t.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActiveTaskQueuePanel;
