'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  AlertCircle,
  Lightbulb,
  Bot,
} from 'lucide-react';
import { InvestigationMemoryModel, AgentStepMemoryModel } from '@/lib/types';
import { investigationsApi } from '@/lib/api';

interface InvestigationMemoryPanelProps {
  investigationId: string;
}

const AGENT_COLORS: Record<string, string> = {
  RESEARCH:    'text-[#0891B2] bg-[#06B6D4]/10 border-[#06B6D4]/30',
  PATENT:      'text-[#2563EB] bg-[#3B82F6]/10 border-[#3B82F6]/30',
  NEWS:        'text-[#047857] bg-[#10B981]/10 border-[#10B981]/30',
  COMPETITOR:  'text-[#7C3AED] bg-[#9333EA]/10 border-[#9333EA]/30',
  WEB:         'text-[#B45309] bg-[#F59E0B]/10 border-[#F59E0B]/30',
  SIGNAL:      'text-[#BE185D] bg-[#EC4899]/10 border-[#EC4899]/30',
  SYNTHESIS:   'text-[#047857] bg-[#14B8A6]/10 border-[#14B8A6]/30',
  ORCHESTRATOR:'text-[#8C6D13] bg-[#D4AF37]/10 border-[#D4AF37]/30',
};

const CONTEXT_STATUS_STYLES: Record<string, { label: string; color: string }> = {
  BUILDING:  { label: 'BUILDING',  color: 'text-[#D97706] bg-[#D97706]/10 border-[#D97706]/30' },
  ACTIVE:    { label: 'ACTIVE',    color: 'text-[#0891B2] bg-[#06B6D4]/10 border-[#06B6D4]/30' },
  OPTIMIZED: { label: 'OPTIMIZED', color: 'text-[#047857] bg-[#059669]/10 border-[#059669]/30' },
  COMPLETE:  { label: 'COMPLETE',  color: 'text-[#8C6D13] bg-[#D4AF37]/10 border-[#D4AF37]/30' },
};

export function InvestigationMemoryPanel({ investigationId }: InvestigationMemoryPanelProps) {
  const [memory, setMemory] = useState<InvestigationMemoryModel | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStepMemoryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!investigationId) return;

    const fetchMemory = async () => {
      try {
        const res = await investigationsApi.getMemory(investigationId);
        if (res) {
          setMemory(res.memory);
          setAgentSteps(res.agentSteps || []);
        }
      } catch (err) {
        setError('Memory data unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchMemory();

    // Poll every 4s while investigation is running
    const interval = setInterval(async () => {
      try {
        const res = await investigationsApi.getMemory(investigationId);
        if (res) {
          setMemory(res.memory);
          setAgentSteps(res.agentSteps || []);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [investigationId]);

  const ctxStyle = memory
    ? CONTEXT_STATUS_STYLES[memory.contextStatus] ?? CONTEXT_STATUS_STYLES.BUILDING
    : CONTEXT_STATUS_STYLES.BUILDING;

  return (
    <div className="glass-level-2 p-6 space-y-5 shadow-md font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2 text-[11px]">
          <BrainCircuit className="w-4 h-4 text-[#D4AF37]" />
          INVESTIGATION MEMORY &amp; CONTEXT
        </h3>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${ctxStyle.color}`}>
          {loading ? 'LOADING…' : `CONTEXT ${ctxStyle.label}`}
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[#6B7280] text-[11px] py-2">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          Loading investigation memory…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 text-[#991B1B] text-[11px] py-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {!loading && memory && (
        <>
          {/* Snapshot Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <MemoryCard label="TARGET" value={memory.targetEntity || '—'} icon={<Cpu className="w-3 h-3" />} />
            <MemoryCard label="FINDINGS" value={String(memory.keyFindings.length)} icon={<Lightbulb className="w-3 h-3" />} highlight />
            <MemoryCard label="EVIDENCE" value={String(memory.totalEvidenceCount)} icon={<Layers className="w-3 h-3" />} />
            <MemoryCard label="OPEN Q's" value={String(memory.openQuestions.length)} icon={<AlertCircle className="w-3 h-3" />} />
            <MemoryCard label="AGENTS DONE" value={String(memory.completedAgents.length)} icon={<Bot className="w-3 h-3" />} />
            <MemoryCard label="STEPS" value={String(memory.totalAgentSteps)} icon={<CheckCircle2 className="w-3 h-3" />} />
          </div>

          {/* Objective */}
          <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E7EB]">
            <span className="text-[10px] font-bold text-[#8C6D13] block mb-1">ACTIVE OBJECTIVE</span>
            <p className="text-[11px] text-[#111827] font-sans leading-relaxed line-clamp-2">
              "{memory.objective}"
            </p>
          </div>

          {/* Key Findings */}
          {memory.keyFindings.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#111827] uppercase block">KEY FINDINGS IN MEMORY</span>
              <div className="space-y-1">
                {memory.keyFindings.slice(0, 5).map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 bg-white p-2 rounded-lg border border-[#E5E7EB]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#047857] mt-0.5 shrink-0" />
                    <span className="text-[10px] text-[#374151] leading-relaxed">{f}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Open Questions */}
          {memory.openQuestions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#D97706] uppercase block">OPEN QUESTIONS</span>
              <div className="space-y-1">
                {memory.openQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 bg-[#FFFBEB] p-2 rounded-lg border border-[#FDE68A]">
                    <AlertCircle className="w-3 h-3 text-[#D97706] mt-0.5 shrink-0" />
                    <span className="text-[10px] text-[#92400E] leading-relaxed">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent Step Timeline */}
          {agentSteps.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#111827] uppercase block">AGENT EXECUTION TIMELINE</span>
              <div className="relative space-y-0">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#E5E7EB]" />
                {agentSteps.map((step, i) => {
                  const color = AGENT_COLORS[step.agentType] || 'text-[#6B7280] bg-[#F3F4F6] border-[#E5E7EB]';
                  const isExpanded = expandedStep === step.id;
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="relative pl-8"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-3 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                        color.includes('bg-') ? color.split(' ').find(c => c.startsWith('bg-'))?.replace('/10', '') || 'bg-[#D4AF37]' : 'bg-[#D4AF37]'
                      }`} />

                      <button
                        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                        className="w-full text-left mb-1"
                      >
                        <div className="bg-white border border-[#E5E7EB] rounded-xl p-2.5 hover:border-[#D4AF37]/40 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${color}`}>
                                {step.agentType}
                              </span>
                              <span className="text-[10px] text-[#111827] font-bold">{step.agentName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-[#047857] font-bold">{step.confidence}% CONF</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3 text-[#6B7280]" /> : <ChevronDown className="w-3 h-3 text-[#6B7280]" />}
                            </div>
                          </div>
                          <p className="text-[10px] text-[#6B7280] mt-1 font-sans">{step.result}</p>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden mb-1"
                          >
                            <div className="bg-[#FAF9F6] border border-[#E5E7EB] rounded-xl p-3 space-y-2 text-[10px]">
                              <div>
                                <span className="font-bold text-[#8C6D13]">TOOL:</span>
                                <span className="ml-1 text-[#374151]">{step.toolUsed}</span>
                              </div>
                              <div>
                                <span className="font-bold text-[#8C6D13]">INPUT CONTEXT:</span>
                                <span className="ml-1 text-[#374151]">
                                  {step.input.priorFindingsCount} prior findings · {step.input.openQuestionsCount} open questions
                                </span>
                              </div>
                              <div>
                                <span className="font-bold text-[#8C6D13]">EVIDENCE:</span>
                                <span className="ml-1 text-[#374151]">{step.evidenceIds.length} items · {step.importantEvidenceIds.length} flagged important</span>
                              </div>
                              {step.importantFindings.length > 0 && (
                                <div>
                                  <span className="font-bold text-[#047857] block mb-1">IMPORTANT FINDINGS:</span>
                                  {step.importantFindings.map((f, fi) => (
                                    <div key={fi} className="flex items-start gap-1.5 text-[10px] text-[#374151] mb-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-[#047857] mt-0.5 shrink-0" />
                                      {f}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="text-[9px] text-[#9CA3AF] border-t border-[#F3F4F6] pt-1.5">
                                {new Date(step.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {agentSteps.length === 0 && (
            <div className="text-center py-4 text-[#9CA3AF] text-[10px]">
              <Clock className="w-5 h-5 mx-auto mb-1 opacity-40" />
              Awaiting agent execution — steps will appear here in real-time.
            </div>
          )}

          {/* Follow-up context indicator */}
          {memory.parentInvestigationId && (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-2.5 flex items-start gap-2">
              <BrainCircuit className="w-3 h-3 text-[#2563EB] mt-0.5 shrink-0" />
              <span className="text-[10px] text-[#1E40AF]">
                <span className="font-bold">FOLLOW-UP CONTEXT:</span> This investigation inherits memory from parent investigation{' '}
                <code className="bg-white px-1 py-0.5 rounded border border-[#BFDBFE]">
                  {memory.parentInvestigationId}
                </code>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemoryCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-2 flex flex-col gap-0.5 ${
      highlight
        ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
        : 'bg-white border-[#E5E7EB]'
    }`}>
      <div className={`flex items-center gap-1 text-[9px] font-bold uppercase ${highlight ? 'text-[#8C6D13]' : 'text-[#6B7280]'}`}>
        {icon}
        {label}
      </div>
      <span className={`text-base font-extrabold font-mono ${highlight ? 'text-[#8C6D13]' : 'text-[#111827]'}`}>
        {value}
      </span>
    </div>
  );
}

export default InvestigationMemoryPanel;
