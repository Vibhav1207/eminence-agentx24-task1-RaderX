'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { KnowledgeGapModel, TaskModel } from '@/lib/types';
import { AlertCircle, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

interface KnowledgeGapPanelProps {
  gaps: KnowledgeGapModel[];
  tasks: TaskModel[];
}

export function KnowledgeGapPanel({ gaps, tasks }: KnowledgeGapPanelProps) {
  const followupTasks = tasks.filter((t) => t.title.includes('Autonomous') || t.title.includes('Follow-up'));

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#D97706]" />
          AUTONOMOUS KNOWLEDGE GAP DETECTION & FOLLOW-UP RESOLUTION
        </h3>
        <span className="text-[10px] bg-[#D97706]/15 text-[#D97706] font-bold px-2 py-0.5 rounded border border-[#D97706]/30">
          {gaps.length} GAPS DETECTED
        </span>
      </div>

      {gaps.length === 0 ? (
        <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] text-[#047857] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#047857]" />
          No unresolved domain knowledge gaps. All primary evidence streams fully satisfied.
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap, idx) => {
            const matchingTask = followupTasks.find((t) => t.title.includes(gap.description) || t.description.includes(gap.description));
            return (
              <div key={gap.id || idx} className="p-4 rounded-xl bg-white border border-[#D97706]/40 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111827] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#D97706]" />
                    KNOWLEDGE GAP: {gap.description.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#D97706]/15 text-[#B45309]">
                    IMPORTANCE: {gap.importance}
                  </span>
                </div>

                <p className="text-xs text-[#374151] font-sans">{gap.description}</p>

                <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#E5E7EB] space-y-1 font-mono text-[11px]">
                  <span className="text-[#8C6D13] font-bold block">RADARX AUTONOMOUS RESPONSE:</span>
                  <div className="flex items-center gap-2 text-[#047857] font-bold">
                    <ArrowRight className="w-3 h-3 text-[#047857]" />
                    Created follow-up task & assigned specialized agent to resolve gap.
                  </div>
                  {matchingTask && (
                    <div className="text-[10px] text-[#4B5563]">
                      FOLLOW-UP TASK: "{matchingTask.title}" ({matchingTask.status})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default KnowledgeGapPanel;
