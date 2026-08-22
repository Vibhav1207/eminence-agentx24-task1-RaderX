'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MissionEventModel, DecisionLogModel } from '@/lib/types';
import { Activity, CheckCircle2, Clock, AlertTriangle, ArrowRight, Bot, Wrench } from 'lucide-react';

interface InvestigationTracePanelProps {
  events: MissionEventModel[];
  decisions: DecisionLogModel[];
}

export function InvestigationTracePanel({ events, decisions }: InvestigationTracePanelProps) {
  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#D4AF37]" />
          AGENTIC INVESTIGATION TRACE (REACT EXECUTION LOOP)
        </h3>
        <span className="text-[10px] bg-[#D4AF37]/15 text-[#8C6D13] font-bold px-2 py-0.5 rounded border border-[#D4AF37]/30">
          {events.length} EVENTS LOGGED
        </span>
      </div>

      <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E7EB]">
        {events.length === 0 ? (
          <p className="text-[#6B7280] italic pl-8">No trace events recorded yet. Start mission to observe live loop.</p>
        ) : (
          events.map((evt, idx) => (
            <motion.div
              key={evt.id || idx}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="relative pl-8 space-y-1"
            >
              <div className="absolute left-1.5 top-1 w-4 h-4 rounded-full bg-white border-2 border-[#D4AF37] flex items-center justify-center text-[8px] font-bold text-[#111827]">
                {idx + 1}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#111827] bg-[#FAF9F6] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                    [{evt.type}]
                  </span>
                  <span className="text-[10px] text-[#6B7280]">
                    {new Date(evt.createdAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <p className="text-[#374151] font-sans text-xs">{evt.message}</p>

              {(evt.agentType || evt.metadata) && (
                <div className="bg-white p-2 rounded border border-[#E5E7EB] text-[11px] text-[#4B5563] font-mono">
                  {evt.agentType && <span className="text-[#8C6D13] font-bold mr-2">AGENT: {evt.agentType}</span>}
                  {evt.taskId && <span className="text-[#047857] font-bold mr-2">TASK: {evt.taskId}</span>}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default InvestigationTracePanel;
