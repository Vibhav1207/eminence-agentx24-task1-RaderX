'use client';

import React, { useState } from 'react';
import { HypothesisModel, HypothesisStatus } from '@/lib/types';
import { FileSearch, CheckCircle, AlertCircle, XCircle, HelpCircle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface HypothesisPanelProps {
  hypotheses: HypothesisModel[];
}

export function HypothesisPanel({ hypotheses }: HypothesisPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!hypotheses || hypotheses.length === 0) {
    return null;
  }

  const getStatusBadge = (status: HypothesisStatus) => {
    switch (status) {
      case 'SUPPORTED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'SUPPORTED',
        };
      case 'PARTIALLY_SUPPORTED':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'PARTIALLY SUPPORTED',
        };
      case 'CONTRADICTED':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
          label: 'CONTRADICTED',
        };
      case 'UNSUPPORTED':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <HelpCircle className="w-3.5 h-3.5 text-purple-600" />,
          label: 'UNSUPPORTED',
        };
      default:
        return {
          bg: 'bg-gray-50 text-gray-700 border-gray-200',
          icon: <HelpCircle className="w-3.5 h-3.5 text-gray-500" />,
          label: 'UNRESOLVED',
        };
    }
  };

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-white/20">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-[#0284C7]" />
          INVESTIGATION HYPOTHESES & VERIFICATION
        </h3>
        <span className="text-[10px] bg-[#0284C7]/15 text-[#0284C7] font-bold px-2 py-0.5 rounded border border-[#0284C7]/30">
          {hypotheses.length} HYPOTHESES FORMULATED
        </span>
      </div>

      <div className="space-y-3">
        {hypotheses.map((hyp) => {
          const badge = getStatusBadge(hyp.status);
          const isExpanded = expandedId === hyp.id;

          return (
            <div
              key={hyp.id}
              className="p-4 rounded-xl bg-white/90 border border-gray-200 space-y-3 shadow-2xs transition-all"
            >
              {/* Header: Hypothesis statement & Status badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">HYPOTHESIS</span>
                  <p className="text-xs font-semibold text-gray-900 font-sans leading-relaxed">
                    "{hyp.statement}"
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md border shrink-0 self-start sm:self-center flex items-center gap-1.5 ${badge.bg}`}>
                  {badge.icon}
                  {badge.label}
                </span>
              </div>

              {/* Confidence Bar & Counts */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-[11px]">
                {/* Confidence */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-sans">Confidence</span>
                    <span className="font-bold text-gray-800">{hyp.confidence}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${
                        hyp.confidence >= 75
                          ? 'bg-emerald-500'
                          : hyp.confidence >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${hyp.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Supporting evidence count */}
                <div className="text-center bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
                  <span className="text-[9px] text-emerald-700 font-sans block">Supporting Evidence</span>
                  <span className="font-bold text-emerald-800 text-xs">{hyp.supportingEvidenceIds.length} items</span>
                </div>

                {/* Contradicting evidence count */}
                <div className="text-center bg-red-50/60 p-1.5 rounded border border-red-100">
                  <span className="text-[9px] text-red-700 font-sans block">Contradicting Evidence</span>
                  <span className="font-bold text-red-800 text-xs">{hyp.contradictingEvidenceIds.length} items</span>
                </div>
              </div>

              {/* Verification status / tasks */}
              {hyp.verificationTasks.length > 0 && (
                <div className="bg-sky-50/60 p-2.5 rounded-lg border border-sky-100 flex items-center justify-between text-[11px] text-sky-800">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <ArrowRight className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    Verification Pending: {hyp.verificationTasks.length} task(s) requested
                  </span>
                  <span className="text-[9px] bg-sky-200/60 font-bold px-1.5 py-0.5 rounded text-sky-900">
                    AUTOMATIC REPLAN
                  </span>
                </div>
              )}

              {/* Toggle Expand Button */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : hyp.id)}
                className="text-[10px] text-gray-500 hover:text-gray-800 font-bold flex items-center gap-1 pt-1"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {isExpanded ? 'HIDE EVIDENCE LINKAGE' : '[ VIEW EVIDENCE LINKAGE ]'}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="pt-2 border-t border-gray-100 space-y-2 text-[11px] font-sans text-gray-700">
                  <div>
                    <span className="font-bold text-gray-900 block text-[10px]">SUPPORTING EVIDENCE IDS:</span>
                    <span className="font-mono text-gray-600">
                      {hyp.supportingEvidenceIds.length > 0
                        ? hyp.supportingEvidenceIds.join(', ')
                        : 'None linked yet'}
                    </span>
                  </div>
                  {hyp.contradictingEvidenceIds.length > 0 && (
                    <div>
                      <span className="font-bold text-red-700 block text-[10px]">CONTRADICTING EVIDENCE IDS:</span>
                      <span className="font-mono text-red-600">{hyp.contradictingEvidenceIds.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HypothesisPanel;
