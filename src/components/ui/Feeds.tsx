'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Clock, Bot } from 'lucide-react';
import { clsx } from 'clsx';

export interface ActivityItem {
  id: string;
  time: string;
  agentName: string;
  action: string;
  type?: 'info' | 'success' | 'warning' | 'alert';
}

export function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="space-y-3">
      {activities.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.08 }}
          className="flex items-start gap-3 p-3 rounded-xl bg-white/70 border border-[#E5E7EB] hover:border-[#D4AF37]/40 transition-colors shadow-2xs"
        >
          <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="w-3.5 h-3.5 text-[#8C6D13]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="font-bold text-[#8C6D13]">{item.agentName}</span>
              <span className="text-[#9CA3AF]">{item.time}</span>
            </div>
            <p className="text-xs text-[#374151] font-sans leading-relaxed">{item.action}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export interface ProgressStep {
  label: string;
  completed: boolean;
  active?: boolean;
}

export function InvestigationProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="glass-level-2 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#C9A227]" />
          INVESTIGATION PROGRESS FLOW
        </h4>
        <span className="text-[11px] font-mono text-[#047857] font-bold">
          {steps.filter((s) => s.completed).length}/{steps.length} STAGES COMPLETE
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            className={clsx(
              'p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all shadow-2xs',
              step.completed
                ? 'bg-[#059669]/10 border-[#059669]/30 text-[#047857]'
                : step.active
                ? 'bg-[#D4AF37]/15 border-[#D4AF37]/45 text-[#7A5E0A] font-bold shadow-xs'
                : 'bg-[#FAF9F6] border-[#E5E7EB] text-[#9CA3AF]'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-black/10">
                {idx + 1}
              </span>
              <span className="truncate">{step.label}</span>
            </div>
            {step.completed ? (
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            ) : step.active ? (
              <div className="w-2 h-2 rounded-full bg-[#C9A227] animate-ping shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
