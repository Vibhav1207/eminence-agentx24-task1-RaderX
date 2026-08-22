'use client';

import React from 'react';
import { SelfEvaluationResult } from '@/lib/types';
import { ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, XCircle, Search, Cpu } from 'lucide-react';

interface SelfEvaluationPanelProps {
  evaluation: SelfEvaluationResult | null;
  isEvaluating?: boolean;
}

export function SelfEvaluationPanel({ evaluation, isEvaluating }: SelfEvaluationPanelProps) {
  if (!evaluation) {
    return (
      <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-white/20">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4F46E5]" />
            SELF-EVALUATION & HYPOTHESIS VERIFICATION
          </h3>
          <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded">
            INITIALIZING
          </span>
        </div>
        <div className="p-6 text-center text-[#6B7280] font-sans text-xs flex flex-col items-center gap-2">
          <Cpu className="w-6 h-6 text-[#4F46E5] animate-pulse" />
          <span>Self-evaluator will inspect conclusions after agent evidence collection completes.</span>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: SelfEvaluationResult['overallStatus']) => {
    switch (status) {
      case 'PASS':
        return {
          bg: 'bg-[#047857]/15 text-[#047857] border-[#047857]/30',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />,
          label: 'PASS',
        };
      case 'NEEDS_VERIFICATION':
        return {
          bg: 'bg-[#D97706]/15 text-[#B45309] border-[#D97706]/30',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />,
          label: 'NEEDS VERIFICATION',
        };
      case 'INSUFFICIENT_EVIDENCE':
        return {
          bg: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
          icon: <Search className="w-3.5 h-3.5 text-yellow-600" />,
          label: 'INSUFFICIENT EVIDENCE',
        };
      case 'CONTRADICTED':
        return {
          bg: 'bg-red-500/15 text-red-700 border-red-500/30',
          icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
          label: 'CONTRADICTED',
        };
      case 'REPLAN_REQUIRED':
        return {
          bg: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
          icon: <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin" />,
          label: 'REPLAN REQUIRED',
        };
      default:
        return {
          bg: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          label: status,
        };
    }
  };

  const badge = getStatusBadge(evaluation.overallStatus);

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4F46E5]" />
          SELF-EVALUATION
        </h3>
        <div className="flex items-center gap-2">
          {isEvaluating && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-ping" />
              REVIEWING CONCLUSIONS
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${badge.bg}`}>
            {badge.icon}
            {badge.label}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Coverage */}
        <div className="p-3 bg-white/80 rounded-xl border border-gray-100 space-y-1">
          <span className="text-[10px] text-gray-500 font-sans block">Evidence Coverage</span>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-[#111827]">{evaluation.evidenceCoverage}%</span>
            <span className="text-[10px] text-indigo-600 font-bold">{evaluation.evidenceStrength}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                evaluation.evidenceCoverage >= 80
                  ? 'bg-emerald-500'
                  : evaluation.evidenceCoverage >= 60
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${evaluation.evidenceCoverage}%` }}
            />
          </div>
        </div>

        {/* Claim Support */}
        <div className="p-3 bg-white/80 rounded-xl border border-gray-100 space-y-1">
          <span className="text-[10px] text-gray-500 font-sans block">Claim Support</span>
          <span className="text-base font-bold text-[#111827]">
            {evaluation.supportedClaims} / {evaluation.totalMajorClaims}
          </span>
          <span className="text-[9px] text-gray-400 block font-sans">
            {evaluation.partiallySupportedClaims} partial
          </span>
        </div>

        {/* Conflicts */}
        <div className="p-3 bg-white/80 rounded-xl border border-gray-100 space-y-1">
          <span className="text-[10px] text-gray-500 font-sans block">Active Conflicts</span>
          <span
            className={`text-base font-bold ${
              evaluation.conflicts.length > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {evaluation.conflicts.length}
          </span>
          <span className="text-[9px] text-gray-400 block font-sans">
            {evaluation.conflicts.length === 0 ? 'Fully aligned' : 'Unresolved'}
          </span>
        </div>

        {/* Unverified Assumptions */}
        <div className="p-3 bg-white/80 rounded-xl border border-gray-100 space-y-1">
          <span className="text-[10px] text-gray-500 font-sans block">Assumptions</span>
          <span
            className={`text-base font-bold ${
              evaluation.unverifiedAssumptions.length > 0 ? 'text-purple-600' : 'text-emerald-600'
            }`}
          >
            {evaluation.unverifiedAssumptions.length}
          </span>
          <span className="text-[9px] text-gray-400 block font-sans">
            {evaluation.unverifiedAssumptions.length === 0 ? 'Direct support' : 'Speculative'}
          </span>
        </div>
      </div>

      {/* Reasoning Box */}
      <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
        <span className="text-[10px] text-indigo-700 font-bold block uppercase tracking-wider">
          EVALUATOR REASONING & FINDINGS
        </span>
        <p className="text-xs text-gray-800 font-sans leading-relaxed">
          "{evaluation.reasoning}"
        </p>

        {evaluation.missingEvidence.length > 0 && (
          <div className="pt-2 border-t border-indigo-100/60 space-y-1">
            <span className="text-[10px] text-amber-700 font-bold block">MISSING EVIDENCE GAPS:</span>
            <ul className="list-disc list-inside text-[11px] text-gray-700 font-sans space-y-0.5">
              {evaluation.missingEvidence.map((gap, idx) => (
                <li key={idx}>{gap}</li>
              ))}
            </ul>
          </div>
        )}

        {evaluation.reasoningLimitReached && (
          <div className="mt-2 text-[10px] bg-amber-100 text-amber-800 p-2 rounded font-bold border border-amber-200">
            ⚠ REASONING_LIMIT_REACHED: Maximum evaluation iterations reached. Finalized with remaining uncertainty.
          </div>
        )}
      </div>
    </div>
  );
}

export default SelfEvaluationPanel;
