'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  Bot,
  Zap,
  ArrowRight,
  Sparkles,
  Tag,
  Sliders,
  Plus,
  X
} from 'lucide-react';
import { investigationsApi } from '@/lib/api';

export default function NewInvestigationPage() {
  const router = useRouter();

  const [question, setQuestion] = useState(
    "Analyze NVIDIA's position in Generative AI and identify emerging competitive threats and opportunities."
  );
  const [entities, setEntities] = useState<string[]>(['NVIDIA', 'Generative AI']);
  const [newEntityInput, setNewEntityInput] = useState('');
  const [investigationType, setInvestigationType] = useState('Competitive Intelligence');
  const [timeHorizon, setTimeHorizon] = useState('30 days');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [isLaunching, setIsLaunching] = useState(false);

  function handleAddEntity(e: React.FormEvent) {
    e.preventDefault();
    if (newEntityInput.trim() && !entities.includes(newEntityInput.trim())) {
      setEntities([...entities, newEntityInput.trim()]);
      setNewEntityInput('');
    }
  }

  function handleRemoveEntity(target: string) {
    setEntities(entities.filter((e) => e !== target));
  }

  async function handleStartInvestigation() {
    if (!question.trim()) return;
    setIsLaunching(true);

    const primaryOrg = entities[0] || 'NVIDIA';
    const primaryTech = entities[1] || 'Generative AI';

    try {
      const newInv = await investigationsApi.create({
        organization: primaryOrg,
        technology: primaryTech,
        strategicQuestion: question.trim(),
        priority,
        timeHorizon: `Last ${timeHorizon}`,
        primaryEntities: entities,
      });

      if (newInv?.id) {
        await investigationsApi.startMission(newInv.id).catch(() => {});
        router.push(`/investigations/${newInv.id}`);
      } else {
        setIsLaunching(false);
      }
    } catch (err) {
      console.error('Failed to create investigation:', err);
      setIsLaunching(false);
    }
  }

  const investigationTypes = [
    'Competitive Intelligence',
    'Research Intelligence',
    'Market Intelligence',
    'Technology Intelligence',
    'Strategic Watch',
  ];

  const timeHorizons = ['7 days', '30 days', '90 days', '6 months', '1 year'];

  const proposedFlow = [
    { label: 'Understand objective', status: 'AUTO' },
    { label: 'Discover sources', status: 'AUTO' },
    { label: 'Parallel investigation', status: 'PARALLEL' },
    { label: 'Cross-source correlation', status: 'CORRELATE' },
    { label: 'Signal detection', status: 'DETECT' },
    { label: 'Synthesis', status: 'SYNTHESIZE' },
    { label: 'Recommendations', status: 'OUTPUT' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-8"
    >
      {/* Page Header */}
      <div className="border-b border-[#E5E7EB] pb-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35 shadow-2xs">
            MISSION LAUNCH INTERFACE
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111827] font-sans">
          NEW INVESTIGATION
        </h1>
        <p className="text-xs md:text-sm text-[#6B7280] font-sans">
          "Give RadarX a strategic question. RadarX decides how to investigate it."
        </p>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Question Input & Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Textarea */}
          <div className="glass-level-2 p-5 space-y-3">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              WHAT DO YOU WANT TO KNOW?
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="e.g., Analyze NVIDIA's position in Generative AI and identify emerging competitive threats and opportunities."
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-4 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 font-sans leading-relaxed resize-none shadow-xs"
            />
            <p className="text-[11px] text-[#6B7280] font-mono">
              Pro-tip: RadarX performs best with objective-oriented strategic questions.
            </p>
          </div>

          {/* Primary Entity Input */}
          <div className="glass-level-2 p-5 space-y-3">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#8C6D13]" />
              PRIMARY ENTITIES & TARGETS
            </label>

            <div className="flex flex-wrap gap-2">
              {entities.map((entity) => (
                <span
                  key={entity}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/35 shadow-2xs"
                >
                  {entity}
                  <button
                    onClick={() => handleRemoveEntity(entity)}
                    className="hover:text-[#111827] p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <form onSubmit={handleAddEntity} className="flex gap-2">
              <input
                type="text"
                value={newEntityInput}
                onChange={(e) => setNewEntityInput(e.target.value)}
                placeholder="Add entity (e.g. OpenAI, Cerebras, TSMC)..."
                className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#D4AF37] font-mono shadow-2xs"
              />
              <button
                type="submit"
                className="bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#111827] text-xs font-mono font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>
          </div>

          {/* Investigation Parameters */}
          <div className="glass-level-2 p-5 space-y-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#06B6D4]" />
              INVESTIGATION PARAMETERS
            </h3>

            {/* Investigation Type */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-[#6B7280] uppercase font-bold">
                INVESTIGATION TYPE
              </label>
              <div className="flex flex-wrap gap-2">
                {investigationTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInvestigationType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                      investigationType === type
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#111827] border-[#D4AF37] shadow-sm'
                        : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:text-[#111827]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizon & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E5E7EB]">
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-[#6B7280] uppercase font-bold">
                  TIME HORIZON
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {timeHorizons.map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setTimeHorizon(th)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border cursor-pointer ${
                        timeHorizon === th
                          ? 'bg-[#111827] text-white border-[#111827] font-bold'
                          : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:text-[#111827]'
                      }`}
                    >
                      {th}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono text-[#6B7280] uppercase font-bold">PRIORITY</label>
                <div className="flex gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                        priority === p
                          ? p === 'HIGH' || p === 'CRITICAL'
                            ? 'bg-[#991B1B]/15 text-[#991B1B] border-[#991B1B]/35'
                            : 'bg-[#D97706]/15 text-[#B45309] border-[#D97706]/35'
                          : 'bg-white border-[#E5E7EB] text-[#9CA3AF]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Autonomous Mission Preview (Level 3 Glass) */}
        <div className="space-y-6">
          <div className="glass-level-3 p-6 space-y-5 shadow-xl relative overflow-hidden">
            <div className="border-b border-[#E5E7EB] pb-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13]">
                AUTONOMOUS MISSION PREVIEW
              </span>
              <h3 className="text-sm font-bold text-[#111827] font-sans mt-0.5">
                RADARX ORCHESTRATOR
              </h3>
              <p className="text-[11px] text-[#6B7280] mt-1 font-sans leading-relaxed">
                RadarX automatically predicts required specialized sub-agents based on your objective.
              </p>
            </div>

            {/* Proposed Flow */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-[#6B7280]">
                PROPOSED INVESTIGATION FLOW
              </span>
              <div className="space-y-1.5">
                {proposedFlow.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] font-mono text-[#374151] bg-white px-2.5 py-1.5 rounded-lg border border-[#E5E7EB]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#8C6D13] font-bold">{idx + 1}.</span>
                      <span>{step.label}</span>
                    </div>
                    <span className="text-[9px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.2 rounded font-bold">
                      {step.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Launch CTA */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartInvestigation}
              disabled={isLaunching || !question.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-xs font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-[#D4AF37]/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLaunching ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#111827] border-t-transparent rounded-full animate-spin" />
                  <span>LAUNCHING ORCHESTRATOR...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-[#111827]" />
                  <span>START AUTONOMOUS INVESTIGATION</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
