'use client';

import React from 'react';
import { DecisionLogModel } from '@/lib/types';
import { Bot, HelpCircle, ArrowRight, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';

interface DecisionExplanationStreamProps {
  decisions: DecisionLogModel[];
}

export function DecisionExplanationStream({ decisions }: DecisionExplanationStreamProps) {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-white/20">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#D4AF37]" />
            RADARX AUTONOMOUS DECISION STREAM
          </h3>
          <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded">
            INITIALIZING
          </span>
        </div>
        <p className="text-xs text-gray-500 font-sans text-center py-4">
          Autonomous controller decisions will stream live as graph execution proceeds.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#D4AF37]" />
          RADARX AUTONOMOUS DECISION STREAM ({decisions.length})
        </h3>
        <span className="text-[10px] bg-[#D4AF37]/15 text-[#8C6D13] font-bold px-2 py-0.5 rounded border border-[#D4AF37]/30 flex items-center gap-1">
          <Zap className="w-3 h-3 text-[#D4AF37]" />
          LIVE EXPLANATION FEED
        </span>
      </div>

      {/* Decision Cards */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scroll pr-1">
        {decisions.map((dec, idx) => (
          <div
            key={dec.id || idx}
            className="p-4 rounded-xl bg-white/90 border border-gray-200 space-y-2.5 shadow-2xs transition-all hover:border-[#D4AF37]/50"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-900 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-3.5 h-3.5 text-[#D4AF37]" />
                {dec.decision} — {dec.trigger}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {new Date(dec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Why Did RadarX Do This? Explanation Box */}
            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 space-y-1">
              <span className="text-[9px] font-bold text-[#8C6D13] uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-[#D4AF37]" />
                WHY DID RADARX DO THIS?
              </span>
              <p className="text-xs text-gray-800 font-sans leading-relaxed">
                "{dec.decisionExplanation || dec.reason}"
              </p>
            </div>

            {/* Target & Task metadata */}
            {dec.createdTaskIds && dec.createdTaskIds.length > 0 && (
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Created {dec.createdTaskIds.length} dynamic task(s): {dec.createdTaskIds.slice(0, 2).join(', ')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DecisionExplanationStream;
