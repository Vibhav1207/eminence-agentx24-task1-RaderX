'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Zap, Eye, Bot, Cpu, ArrowRight, CheckCircle2 } from 'lucide-react';
import { JudgeOverview } from '@/components/ui/JudgeOverview';

export default function HowToUsePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-10"
    >
      {/* Hackathon Judge Overview & Agentic Proof Guide */}
      <JudgeOverview />

      {/* Guide Steps */}
      <div className="space-y-6">
        {/* Step 1 */}
        <div className="glass-level-2 p-6 space-y-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[#111827] flex items-center justify-center font-mono font-extrabold text-sm shadow-md">
              1
            </div>
            <h2 className="text-lg font-extrabold text-[#111827] font-sans">
              Formulate a Strategic Objective
            </h2>
          </div>
          <p className="text-xs text-[#374151] font-sans leading-relaxed pl-11">
            Navigate to <Link href="/investigations/new" className="text-[#8C6D13] font-bold hover:underline">New Investigation</Link> and enter ONE strategic question along with target entities (organizations and technologies).
          </p>
          <div className="ml-11 bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E7EB] space-y-1 font-mono text-xs">
            <div className="text-[#8C6D13] font-bold">EXAMPLE STRATEGIC QUESTION:</div>
            <div className="text-[#111827]">
              "Analyze NVIDIA's position in Generative AI inference chips and identify emerging competitive threats and opportunities."
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="glass-level-2 p-6 space-y-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[#111827] flex items-center justify-center font-mono font-extrabold text-sm shadow-md">
              2
            </div>
            <h2 className="text-lg font-extrabold text-[#111827] font-sans">
              Autonomous Agent Orchestration & Real Evidence Discovery
            </h2>
          </div>
          <p className="text-xs text-[#374151] font-sans leading-relaxed pl-11">
            RadarX Master Orchestrator decomposes your objective into a dynamic task dependency queue. Specialized agents query real APIs (Crossref DOIs, USPTO Patents, Global News, Web Repositories) simultaneously without returning fake fallbacks.
          </p>
          <div className="ml-11 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl">
              <span className="text-[10px] font-bold text-[#8C6D13] block">RESEARCH AGENT</span>
              <span className="text-[#111827]">Crossref DOIs & arXiv Preprints</span>
            </div>
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl">
              <span className="text-[10px] font-bold text-[#D97706] block">PATENT AGENT</span>
              <span className="text-[#111827]">USPTO & Global Patent Filings</span>
            </div>
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl">
              <span className="text-[10px] font-bold text-[#059669] block">SIGNAL ENGINE</span>
              <span className="text-[#111827]">Multi-Stream Event Correlation</span>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="glass-level-2 p-6 space-y-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] text-[#111827] flex items-center justify-center font-mono font-extrabold text-sm shadow-md">
              3
            </div>
            <h2 className="text-lg font-extrabold text-[#111827] font-sans">
              AI Synthesis & Continuous Autonomous Watchlists
            </h2>
          </div>
          <p className="text-xs text-[#374151] font-sans leading-relaxed pl-11">
            Once correlation completes, the Synthesis Engine generates an executive brief with 100% evidence citation traceability. Click <strong>"START AUTONOMOUS MONITORING"</strong> to convert findings into 24/7 background watchlists.
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-4 flex justify-center">
        <Link href="/investigations/new">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-xs font-extrabold px-6 py-3.5 rounded-xl shadow-lg shadow-[#D4AF37]/25 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-[#111827]" />
            <span>START YOUR FIRST AUTONOMOUS INVESTIGATION</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}
