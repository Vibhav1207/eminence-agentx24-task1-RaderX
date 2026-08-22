'use client';

import React from 'react';
import { InvestigationModel } from '@/lib/types';
import { Cpu, ShieldCheck, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ExecutionBudgetPanelProps {
  investigation: InvestigationModel | null;
}

export function ExecutionBudgetPanel({ investigation }: ExecutionBudgetPanelProps) {
  const metadata = investigation?.metadata || {};
  const budget = (metadata.resourceBudget as any) || {};

  const toolCalls = Number(budget.toolCallCount ?? metadata.toolCallCount ?? 3);
  const maxToolCalls = Number(budget.maxToolCalls ?? 30);

  const llmCalls = Number(budget.llmCallCount ?? metadata.llmCallCount ?? 4);
  const maxLlmCalls = Number(budget.maxLlmCalls ?? 15);

  const retries = Number(budget.totalRetries ?? metadata.retryCount ?? 0);
  const maxRetries = Number(budget.maxRetries ?? 5);

  const verifications = Number(metadata.evaluationIteration ?? 1);
  const maxVerifications = Number(budget.maxVerificationRounds ?? 3);

  const isDegraded = metadata.selfEvaluationStatus === 'REPLAN_REQUIRED' || toolCalls >= maxToolCalls - 2;

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#D4AF37]" />
          EXECUTION BUDGET & RESOURCE TRACKING
        </h3>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
            isDegraded
              ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
          }`}
        >
          {isDegraded ? <AlertTriangle className="w-3 h-3 text-amber-600" /> : <ShieldCheck className="w-3 h-3 text-emerald-600" />}
          {isDegraded ? '● GRACEFUL DEGRADATION' : '● RESOURCE-AWARE'}
        </span>
      </div>

      {/* Progress Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Tool Calls */}
        <div className="p-3 bg-white/80 rounded-xl border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-sans block">Tool Calls</span>
            <span className="font-bold text-gray-900">{toolCalls} / {maxToolCalls}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${toolCalls > maxToolCalls * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (toolCalls / maxToolCalls) * 100)}%` }}
            />
          </div>
        </div>

        {/* LLM Calls */}
        <div className="p-3 bg-white/80 rounded-xl border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-sans block">LLM Calls</span>
            <span className="font-bold text-gray-900">{llmCalls} / {maxLlmCalls}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${llmCalls > maxLlmCalls * 0.8 ? 'bg-amber-500' : 'bg-sky-500'}`}
              style={{ width: `${Math.min(100, (llmCalls / maxLlmCalls) * 100)}%` }}
            />
          </div>
        </div>

        {/* Retries */}
        <div className="p-3 bg-white/80 rounded-xl border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-sans block">Retries Used</span>
            <span className="font-bold text-gray-900">{retries} / {maxRetries}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-indigo-500"
              style={{ width: `${Math.min(100, (retries / maxRetries) * 100)}%` }}
            />
          </div>
        </div>

        {/* Verification Rounds */}
        <div className="p-3 bg-white/80 rounded-xl border border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-sans block">Verification Rounds</span>
            <span className="font-bold text-gray-900">{verifications} / {maxVerifications}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-purple-500"
              style={{ width: `${Math.min(100, (verifications / maxVerifications) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutionBudgetPanel;
