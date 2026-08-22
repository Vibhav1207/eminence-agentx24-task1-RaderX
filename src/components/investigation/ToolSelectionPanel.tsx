'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { EvidenceModel } from '@/lib/types';
import { Wrench, CheckCircle2, ShieldCheck, Database, HelpCircle } from 'lucide-react';

interface ToolSelectionPanelProps {
  evidence: EvidenceModel[];
}

export function ToolSelectionPanel({ evidence }: ToolSelectionPanelProps) {
  const tools = [
    {
      id: 'RESEARCH',
      name: 'Crossref / arXiv Research API',
      category: 'Scientific Literature',
      used: evidence.some((e) => e.sourceType === 'RESEARCH'),
      reason: 'Scientific publication & preprint evidence required to assess foundational ML algorithms.',
      evidenceCount: evidence.filter((e) => e.sourceType === 'RESEARCH').length,
    },
    {
      id: 'PATENT',
      name: 'USPTO Tensor IP Search API',
      category: 'Intellectual Property',
      used: evidence.some((e) => e.sourceType === 'PATENT'),
      reason: 'Patent priority dates & technical claim filings required to establish IP coverage.',
      evidenceCount: evidence.filter((e) => e.sourceType === 'PATENT').length,
    },
    {
      id: 'NEWS',
      name: 'Global Financial Media & Foundry Scan',
      category: 'Market Intelligence',
      used: evidence.some((e) => e.sourceType === 'NEWS' || e.sourceType === 'COMPETITOR'),
      reason: 'Corporate announcements & SEC filings required to validate executive strategy.',
      evidenceCount: evidence.filter((e) => e.sourceType === 'NEWS' || e.sourceType === 'COMPETITOR').length,
    },
    {
      id: 'WEB',
      name: 'Web Code Velocity & Repository Monitor',
      category: 'Web Intelligence',
      used: evidence.some((e) => e.sourceType === 'WEB'),
      reason: 'Open-source repository star velocity & live docs required to evaluate developer adoption.',
      evidenceCount: evidence.filter((e) => e.sourceType === 'WEB').length,
    },
  ];

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <h3 className="font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#D4AF37]" />
          DYNAMIC TOOL SELECTION & DECISION REASONING ("WHY THIS TOOL?")
        </h3>
        <span className="text-[10px] bg-[#047857]/15 text-[#047857] font-bold px-2 py-0.5 rounded border border-[#047857]/30">
          {tools.filter((t) => t.used).length} / {tools.length} TOOLS ACTIVATED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className={`p-4 rounded-xl border ${
              tool.used ? 'bg-white border-[#D4AF37]/40 shadow-xs' : 'bg-[#FAF9F6] border-[#E5E7EB] opacity-60'
            } space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111827] flex items-center gap-1.5">
                {tool.used ? (
                  <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-[#9CA3AF]" />
                )}
                {tool.name}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E7EB] text-[#6B7280]">
                {tool.category}
              </span>
            </div>

            <div className="text-[11px] text-[#374151] font-sans">
              <span className="font-bold text-[#8C6D13] font-mono block mb-0.5">WHY THIS TOOL WAS SELECTED:</span>
              "{tool.reason}"
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#6B7280] border-t border-[#F3F4F6] pt-2">
              <span>STATUS: {tool.used ? 'ACTIVE & QUERIED' : 'NOT REQUIRED'}</span>
              <span className="font-bold text-[#111827]">{tool.evidenceCount} EVIDENCE ITEMS</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ToolSelectionPanel;
