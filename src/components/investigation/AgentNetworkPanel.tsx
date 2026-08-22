'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TaskModel } from '@/lib/types';
import { Users, Bot, ArrowRight, CheckCircle2, GitMerge } from 'lucide-react';

interface AgentNetworkPanelProps {
  tasks: TaskModel[];
}

export function AgentNetworkPanel({ tasks }: AgentNetworkPanelProps) {
  const agents = [
    { name: 'PLANNER AGENT', role: 'Decomposes objective & detects gaps', status: 'ACTIVE' },
    { name: 'RESEARCH AGENT', role: 'Crossref academic literature', status: 'ACTIVE' },
    { name: 'PATENT AGENT', role: 'USPTO tensor IP filings', status: 'ACTIVE' },
    { name: 'NEWS AGENT', role: 'Financial media & SEC scan', status: 'ACTIVE' },
    { name: 'WEB INTELLIGENCE AGENT', role: 'Open-source code velocity', status: 'ACTIVE' },
    { name: 'COMPETITOR AGENT', role: 'ASIC hardware & corporate moves', status: 'ACTIVE' },
    { name: 'SYNTHESIS ENGINE', role: 'Executive brief generation', status: 'ACTIVE' },
  ];

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-[#D4AF37]" />
          MULTI-AGENT COLLABORATION NETWORK & EXECUTION HANDOFFS
        </h3>
        <span className="text-[10px] bg-[#D4AF37]/15 text-[#8C6D13] font-bold px-2 py-0.5 rounded border border-[#D4AF37]/30">
          7 SPECIALIZED AGENTS
        </span>
      </div>

      {/* Collaboration Flow Diagram */}
      <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E7EB] space-y-2">
        <span className="text-[10px] font-bold text-[#8C6D13] uppercase block">COLLABORATION & HANDOFF SEQUENCE</span>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#111827]">
          <span className="bg-white px-2.5 py-1 rounded border border-[#E5E7EB] font-bold">PLANNER</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="bg-white px-2.5 py-1 rounded border border-[#E5E7EB] font-bold text-[#047857]">DISCOVERY AGENTS</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="bg-white px-2.5 py-1 rounded border border-[#E5E7EB] font-bold text-[#D97706]">GAP DETECTOR</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="bg-white px-2.5 py-1 rounded border border-[#E5E7EB] font-bold text-[#2563EB]">FOLLOW-UP AGENTS</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="bg-white px-2.5 py-1 rounded border border-[#D4AF37]/50 font-extrabold text-[#8C6D13]">SYNTHESIS ENGINE</span>
        </div>
      </div>

      {/* Agents Roster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map((agent) => (
          <div key={agent.name} className="p-3 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[#111827] text-[11px]">{agent.name}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
            </div>
            <p className="text-[10px] text-[#6B7280] font-sans">{agent.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentNetworkPanel;
