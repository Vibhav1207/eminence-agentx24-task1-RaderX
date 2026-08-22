'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Bot,
  Zap,
  GitGraph,
  Layers,
  ArrowRight,
  CheckCircle2,
  Cpu,
  BrainCircuit,
  Search,
  Database
} from 'lucide-react';

export function JudgeOverview() {
  const agentRoles = [
    { name: 'Planner Agent', role: 'Decomposes strategic objectives into task graphs and detects knowledge gaps.', type: 'ORCHESTRATION' },
    { name: 'Research Agent', role: 'Scans arXiv, Crossref, and PubMed for scientific preprints and breakthrough papers.', type: 'DISCOVERY' },
    { name: 'Patent Agent', role: 'Analyzes USPTO patent priority dates and technical IP claims.', type: 'DISCOVERY' },
    { name: 'News Agent', role: 'Tracks global financial media, foundry announcements, and SEC disclosures.', type: 'DISCOVERY' },
    { name: 'Web Intelligence Agent', role: 'Monitors open-source code velocity, repository stars, and live web docs.', type: 'DISCOVERY' },
    { name: 'Competitor Agent', role: 'Monitors corporate hiring, ASIC hardware shifts, and executive filings.', type: 'DISCOVERY' },
    { name: 'Synthesis Engine', role: 'Correlates multi-stream evidence into Executive Briefs and prioritized actions.', type: 'SYNTHESIS' },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto text-xs font-mono">
      {/* Value Proposition Header */}
      <div className="glass-level-2 p-8 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13] bg-[#D4AF37]/15 px-3 py-1 rounded-md border border-[#D4AF37]/35 shadow-2xs">
            HACKATHON DEMO & JUDGE PRESENTATION GUIDE
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-[#111827] font-sans">
          RADARX — AUTONOMOUS COMPETITIVE INTELLIGENCE
        </h1>

        <p className="text-sm text-[#374151] font-sans leading-relaxed max-w-4xl">
          "Turn information overload into strategic intelligence. RadarX autonomously investigates research, patents, news, competitors, and the wider web to identify what changed, why it matters, and what to do next."
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-xl bg-white border border-[#E5E7EB]">
            <span className="text-[#6B7280] block text-[10px]">PRIMARY SOURCES</span>
            <span className="font-bold text-[#111827]">Research + Patents + News + Web</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-[#E5E7EB]">
            <span className="text-[#6B7280] block text-[10px]">GRAPH EVIDENCE</span>
            <span className="font-bold text-[#047857]">100% Backed via evidenceIds</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-[#E5E7EB]">
            <span className="text-[#6B7280] block text-[10px]">EXEC OUTPUT</span>
            <span className="font-bold text-[#D4AF37]">Briefs + Actions + Exports</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-[#E5E7EB]">
            <span className="text-[#6B7280] block text-[10px]">AUTONOMY PROOF</span>
            <span className="font-bold text-[#D97706]">Gap Detection & Follow-up</span>
          </div>
        </div>
      </div>

      {/* Why RadarX is Agentic */}
      <div className="glass-level-2 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#D4AF37]" />
            WHY RADARX IS GENUINELY AGENTIC (NOT A PIPELINE OR CHATBOT)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E7EB] space-y-2">
            <span className="text-[10px] font-bold text-[#8C6D13]">1. DECOMPOSE OBJECTIVE</span>
            <h3 className="font-bold text-[#111827]">Planner Decomposition</h3>
            <p className="text-[11px] text-[#4B5563] font-sans">
              Planner Agent breaks user objective into specialized tasks with dependency tracking.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E7EB] space-y-2">
            <span className="text-[10px] font-bold text-[#D97706]">2. DETECT KNOWLEDGE GAPS</span>
            <h3 className="font-bold text-[#111827]">Domain Gap Analysis</h3>
            <p className="text-[11px] text-[#4B5563] font-sans">
              Identifies missing patent filings or unconfirmed corporate announcements during discovery.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E7EB] space-y-2">
            <span className="text-[10px] font-bold text-[#047857]">3. AUTONOMOUS FOLLOW-UP</span>
            <h3 className="font-bold text-[#111827]">Task Generation</h3>
            <p className="text-[11px] text-[#4B5563] font-sans">
              Controller creates and assigns new follow-up tasks to specialized agents automatically.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E7EB] space-y-2">
            <span className="text-[10px] font-bold text-[#2563EB]">4. CROSS-SOURCE CORRELATION</span>
            <h3 className="font-bold text-[#111827]">Multi-Stream Signal</h3>
            <p className="text-[11px] text-[#4B5563] font-sans">
              Correlates research preprints with patent disclosures and SEC filings into actionable signals.
            </p>
          </div>
        </div>
      </div>

      {/* Human vs RadarX Table */}
      <div className="glass-level-2 p-6 space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827]">
          HUMAN WORKFLOW vs. RADARX INTELLIGENCE MULTIPLIER
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[#6B7280] text-[10px]">
                <th className="py-2 px-3">DIMENSION</th>
                <th className="py-2 px-3">TRADITIONAL HUMAN WORKFLOW</th>
                <th className="py-2 px-3">RADARX AUTONOMOUS PLATFORM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              <tr>
                <td className="py-3 px-3 font-bold text-[#111827]">Discovery</td>
                <td className="py-3 px-3 text-[#4B5563]">Manual keyword searching across disparate tabs.</td>
                <td className="py-3 px-3 font-bold text-[#047857]">Multi-agent parallel querying (Crossref, USPTO, News, Web).</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-[#111827]">Knowledge Gaps</td>
                <td className="py-3 px-3 text-[#4B5563]">Easily missed or overlooked due to information overload.</td>
                <td className="py-3 px-3 font-bold text-[#047857]">Autonomously detected & resolved via follow-up task creation.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-[#111827]">Correlation</td>
                <td className="py-3 px-3 text-[#4B5563]">Manual cross-referencing in spread-sheets or docs.</td>
                <td className="py-3 px-3 font-bold text-[#047857]">Temporal window matching & evidence-backed graph topology.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-[#111827]">Actionability</td>
                <td className="py-3 px-3 text-[#4B5563]">Generic summary notes requiring manual extraction.</td>
                <td className="py-3 px-3 font-bold text-[#D4AF37]">Prioritized Action Center with status workflow & Investigate bridge.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Roles Matrix */}
      <div className="glass-level-2 p-6 space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827]">
          MULTI-AGENT NETWORK ROLES & CAPABILITIES
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentRoles.map((agent) => (
            <div key={agent.name} className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#111827]">{agent.name}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#7A5E0A]">
                  {agent.type}
                </span>
              </div>
              <p className="text-[11px] text-[#4B5563] font-sans">{agent.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default JudgeOverview;
