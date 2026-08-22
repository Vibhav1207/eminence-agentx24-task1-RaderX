'use client';

import React from 'react';
import { InvestigationModel } from '@/lib/types';
import { AlertTriangle, RefreshCw, Lock, Zap } from 'lucide-react';

interface LoopDeadlockNoticePanelProps {
  investigation: InvestigationModel | null;
}

export function LoopDeadlockNoticePanel({ investigation }: LoopDeadlockNoticePanelProps) {
  if (!investigation) return null;

  const metadata = investigation.metadata || {};
  const orchestratorStatus = investigation.orchestratorStatus || '';

  const hasLoop = metadata.loopDetected || orchestratorStatus.includes('LOOP_DETECTED');
  const hasStagnation = metadata.stagnationDetected || orchestratorStatus.includes('STAGNANT');
  const hasDeadlock = metadata.deadlockDetected || orchestratorStatus.includes('DEADLOCK_DETECTED');
  const hasExhaustion = metadata.resourceExhausted || orchestratorStatus.includes('RESOURCE_EXHAUSTED');

  if (!hasLoop && !hasStagnation && !hasDeadlock && !hasExhaustion) {
    return null; // Don't show if no event triggered
  }

  return (
    <div className="space-y-3 font-mono text-xs">
      {hasLoop && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
              LOOP DETECTED BY RADARX CONTROLLER
            </span>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
              AUTONOMOUS RECOVERY
            </span>
          </div>
          <p className="text-xs font-sans text-amber-850">
            "RadarX identified repeated planning without meaningful new evidence. Strategy diversified."
          </p>
          <span className="text-[10px] font-bold text-amber-700 block">
            RECOVERY ACTION: Modified search query & research strategy.
          </span>
        </div>
      )}

      {hasStagnation && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border-2 border-purple-500/40 text-purple-900 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              STAGNATION DETECTED
            </span>
            <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded">
              PROGRESS FLAT
            </span>
          </div>
          <p className="text-xs font-sans text-purple-850">
            "Multiple iterations produced no confidence improvement. Finalizing with current uncertainty."
          </p>
        </div>
      )}

      {hasDeadlock && (
        <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/40 text-red-900 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-red-600" />
              DEADLOCK DETECTED
            </span>
            <span className="text-[10px] bg-red-200 text-red-900 font-bold px-2 py-0.5 rounded">
              DEPENDENCY CYCLE
            </span>
          </div>
          <p className="text-xs font-sans text-red-850">
            "Cyclic task dependency identified in execution graph. Relaxed lowest-value dependency edge."
          </p>
        </div>
      )}

      {hasExhaustion && (
        <div className="p-4 rounded-2xl bg-yellow-500/10 border-2 border-yellow-500/40 text-yellow-900 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-yellow-600" />
              RESOURCE EXHAUSTION SAFE STOP
            </span>
            <span className="text-[10px] bg-yellow-200 text-yellow-900 font-bold px-2 py-0.5 rounded">
              GRACEFUL TERMINATION
            </span>
          </div>
          <p className="text-xs font-sans text-yellow-850">
            "Execution budget exhausted. Checkpointed state and synthesized best available report."
          </p>
        </div>
      )}
    </div>
  );
}

export default LoopDeadlockNoticePanel;
