'use client';

import React from 'react';
import { AlertTriangle, TrendingUp, Cpu } from 'lucide-react';
import { clsx } from 'clsx';
import { confidenceToPercent } from '@/lib/utils/confidence';

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  let style = 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';
  let dotColor = 'bg-[#6B7280]';

  if (normalized.includes('INVESTIGATING') || normalized.includes('RUNNING')) {
    style = 'bg-[#D4AF37]/15 text-[#8C6D13] border-[#D4AF37]/35';
    dotColor = 'bg-[#C9A227] animate-pulse';
  } else if (normalized.includes('SYNTHESIZING') || normalized.includes('COORDINATING')) {
    style = 'bg-[#D4AF37]/20 text-[#7A5E0A] border-[#D4AF37]/45';
    dotColor = 'bg-[#D4AF37] animate-pulse';
  } else if (normalized.includes('COMPLETE') || normalized.includes('HEALTHY') || normalized.includes('ONLINE')) {
    style = 'bg-[#059669]/15 text-[#047857] border-[#059669]/30';
    dotColor = 'bg-[#059669]';
  } else if (normalized.includes('MONITORING')) {
    style = 'bg-[#06B6D4]/15 text-[#0891B2] border-[#06B6D4]/30';
    dotColor = 'bg-[#06B6D4] animate-pulse';
  } else if (normalized.includes('ALERT') || normalized.includes('THREAT') || normalized.includes('HIGH')) {
    style = 'bg-[#991B1B]/15 text-[#991B1B] border-[#991B1B]/30';
    dotColor = 'bg-[#991B1B] animate-ping';
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border shadow-xs',
        style
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', dotColor)} />
      {normalized}
    </span>
  );
}

export function ConfidenceIndicator({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  // Normalize confidence value to 0-100 range for display
  const displayValue = confidenceToPercent(value);
  
  let color = 'text-[#047857] border-[#059669]/30 bg-[#059669]/10';
  if (displayValue < 85) color = 'text-[#D97706] border-[#F59E0B]/30 bg-[#F59E0B]/10';
  if (displayValue < 70) color = 'text-[#991B1B] border-[#991B1B]/30 bg-[#991B1B]/10';

  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          'font-mono font-extrabold rounded-lg border flex items-center justify-center shadow-xs',
          color,
          size === 'sm' && 'text-[10px] px-1.5 py-0.5',
          size === 'md' && 'text-xs px-2 py-0.5',
          size === 'lg' && 'text-sm px-2.5 py-1'
        )}
      >
        {displayValue}%
      </div>
      <span className="text-[10px] font-mono text-[#6B7280] font-bold uppercase tracking-wider">CONFIDENCE</span>
    </div>
  );
}

export function ThreatIndicator({ score }: { score: number }) {
  return (
    <div className="glass-level-2 border-l-4 border-l-[#991B1B] border-[#991B1B]/20 p-3.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#991B1B]/10 border border-[#991B1B]/30 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-[#991B1B]" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-[#6B7280] uppercase font-bold">THREAT SCORE</div>
          <div className="text-xs font-extrabold text-[#991B1B] font-mono">
            {score > 60 ? 'HIGH THREAT' : 'MODERATE THREAT'}
          </div>
        </div>
      </div>
      <div className="text-xl font-extrabold font-mono text-[#991B1B]">{score}%</div>
    </div>
  );
}

export function OpportunityIndicator({ score }: { score: number }) {
  return (
    <div className="glass-level-2 border-l-4 border-l-[#059669] border-[#059669]/20 p-3.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#059669]/10 border border-[#059669]/30 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#059669]" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-[#6B7280] uppercase font-bold">OPPORTUNITY SCORE</div>
          <div className="text-xs font-extrabold text-[#059669] font-mono">
            {score > 70 ? 'HIGH OPPORTUNITY' : 'MODERATE'}
          </div>
        </div>
      </div>
      <div className="text-xl font-extrabold font-mono text-[#059669]">{score}%</div>
    </div>
  );
}

export function SourceBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  let bg = 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';

  if (t === 'research') bg = 'bg-[#059669]/15 text-[#047857] border-[#059669]/30';
  if (t === 'patent') bg = 'bg-[#06B6D4]/15 text-[#0891B2] border-[#06B6D4]/30';
  if (t === 'news') bg = 'bg-[#D97706]/15 text-[#B45309] border-[#D97706]/30';
  if (t === 'competitor') bg = 'bg-[#D4AF37]/20 text-[#8C6D13] border-[#D4AF37]/40';
  if (t === 'web') bg = 'bg-[#2563EB]/15 text-[#1D4ED8] border-[#2563EB]/30';

  return (
    <span className={clsx('text-[10px] font-mono uppercase font-extrabold px-2 py-0.5 rounded-md border shadow-2xs', bg)}>
      {type}
    </span>
  );
}

export function AgentStatus({ name, status, role, color }: { name: string; status: string; role: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-[#E5E7EB] shadow-2xs">
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
          style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}
        >
          <Cpu className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div>
          <div className="text-xs font-bold text-[#111827]">{name}</div>
          <div className="text-[10px] text-[#6B7280]">{role}</div>
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}
