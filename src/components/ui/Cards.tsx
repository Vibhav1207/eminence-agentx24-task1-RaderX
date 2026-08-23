'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Bot,
  FileText,
  Building2,
  TrendingUp,
  Cpu,
  Database,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { StatusBadge, SourceBadge } from './Indicators';
import { Agent, EvidenceItem, SignalItem, InvestigationItem } from '@/lib/mockData';
import { SourceModel } from '@/lib/types';

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'gold'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  color?: 'gold' | 'emerald' | 'amber' | 'red' | 'cyan';
}) {
  const colorStyles = {
    gold: 'border-[#D4AF37]/35 text-[#8C6D13] bg-[#D4AF37]/15',
    emerald: 'border-[#059669]/35 text-[#047857] bg-[#059669]/15',
    amber: 'border-[#D97706]/35 text-[#B45309] bg-[#D97706]/15',
    red: 'border-[#991B1B]/35 text-[#991B1B] bg-[#991B1B]/15',
    cyan: 'border-[#06B6D4]/35 text-[#0891B2] bg-[#06B6D4]/15',
  };

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="glass-level-1 hover:glass-level-2 p-responsive transition-all flex flex-col justify-between group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#6B7280]">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${colorStyles[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#111827]"
        >
          {value}
        </motion.span>
        {trend && (
          <span className="text-responsive-xs font-mono font-bold text-[#047857] bg-[#059669]/15 border border-[#059669]/30 px-2 py-0.5 rounded-md flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-responsive-sm text-[#6B7280] mt-2 font-sans line-clamp-1">{subtitle}</p>
      )}
    </motion.div>
  );
}

export function AgentCard({ agent }: { agent: any }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.008 }}
      whileTap={{ scale: 0.98 }}
      className="glass-level-1 hover:border-[#D4AF37]/50 p-responsive transition-all flex flex-col justify-between group cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0"
              style={{ backgroundColor: `${agent.color || '#C9A227'}15`, borderColor: `${agent.color || '#C9A227'}40` }}
            >
              <Bot className="w-4.5 h-4.5" style={{ color: agent.color || '#C9A227' }} />
            </div>
            <div>
              <h4 className="text-responsive-sm font-bold text-[#111827] group-hover:text-[#8C6D13] transition-colors">
                {agent.name}
              </h4>
              <p className="text-responsive-xs text-[#6B7280] font-mono">{agent.role}</p>
            </div>
          </div>
          <StatusBadge status={agent.status} />
        </div>

        <p className="text-responsive-sm text-[#374151] bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E5E7EB] leading-relaxed line-clamp-3 mb-3">
          {agent.description || agent.currentTask || 'No description available.'}
        </p>
        <div className="mb-3 space-y-1.5">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D13]">Current execution</p>
          <p className="text-responsive-xs text-[#4B5563] line-clamp-2">{agent.currentTask || 'No task assigned'}</p>
          {agent.capabilities?.length > 0 && (
            <p className="text-[10px] text-[#6B7280] line-clamp-2">Capabilities: {agent.capabilities.join(' · ')}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] text-responsive-xs font-mono text-[#6B7280]">
        <span>{agent.evidenceProcessed || 0} items</span>
        <span className="text-[#047857] font-bold">{Math.round((agent.confidence ?? 0) <= 1 ? (agent.confidence ?? 0) * 100 : agent.confidence)}% CONF</span>
      </div>
    </motion.div>
  );
}

export function EvidenceCard({ evidence }: { evidence: any }) {
  const sourceType = (evidence.sourceType || 'research').toString().toUpperCase();
  const dateDisplay = evidence.publishedAt || evidence.date || (evidence.discoveredAt ? new Date(evidence.discoveredAt).toLocaleDateString() : 'Recent');
  const isVerified = evidence.verificationStatus === 'VERIFIED' || evidence.verificationStatus === undefined;
  const externalIdDisplay = evidence.doi?.[0] || evidence.externalId || evidence.doi;
  const sourceName = evidence.sourceName || evidence.provider || evidence.source || 'External Verified Source';

  const getSourceCta = () => {
    if (evidence.doi?.[0] || (evidence.url && evidence.url.includes('doi.org'))) {
      return 'VIEW DOI / PAPER';
    }
    switch (sourceType) {
      case 'RESEARCH':
        return 'VIEW PAPER';
      case 'PATENT':
        return 'VIEW PATENT';
      case 'NEWS':
      case 'COMPETITOR':
        return 'READ ARTICLE';
      default:
        return 'VIEW SOURCE';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.005 }}
      className="glass-level-1 hover:glass-level-2 p-responsive transition-all space-y-2.5 border border-[#E5E7EB] bg-white rounded-xl shadow-xs"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SourceBadge type={sourceType.toLowerCase() as any} />
          <span
            className={`text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md ${
              isVerified
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {isVerified ? '✓ VERIFIED SOURCE' : '● UNVERIFIED'}
          </span>
        </div>
        <span className="text-responsive-xs font-mono text-[#6B7280] font-bold">{dateDisplay}</span>
      </div>

      <h4 className="text-responsive-sm font-extrabold text-[#111827] leading-snug font-sans">
        {evidence.title}
      </h4>

      <p className="text-responsive-sm text-[#4B5563] line-clamp-2 leading-relaxed font-sans">{evidence.summary}</p>

      {externalIdDisplay && (
        <div className="text-responsive-xs font-mono text-[#4B5563] bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block font-semibold">
          {evidence.doi?.[0] ? `DOI: ${evidence.doi[0]}` : `EXTERNAL ID: ${externalIdDisplay}`}
        </div>
      )}

      {evidence.authors && evidence.authors.length > 0 && (
        <div className="text-responsive-xs font-mono text-[#8C6D13] font-semibold truncate">
          AUTHORS: {evidence.authors.join(', ')}
        </div>
      )}

      {evidence.metrics && evidence.metrics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {evidence.metrics.map((m: any, idx: number) => (
            <span key={idx} className="text-responsive-xs font-mono px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E7EB] text-[#374151] font-bold">
              {m.label}: {m.value}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] text-responsive-xs font-mono">
        <span className="text-[#6B7280] truncate max-w-[170px] font-medium" title={sourceName}>
          SOURCE: {sourceName}
        </span>
        {evidence.url ? (
          <a
            href={evidence.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-responsive-xs font-bold text-[#8C6D13] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 px-2.5 py-1 rounded-md border border-[#D4AF37]/35 transition-all touch-target"
          >
            <span>{getSourceCta()}</span>
          </a>
        ) : (
          <span className="text-[#047857] font-bold">{evidence.confidence || 90}% CONF</span>
        )}
      </div>
    </motion.div>
  );
}

export function SignalCard({ signal }: { signal: SignalItem }) {
  const isThreat = signal.classification === 'threat';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.008 }}
      whileTap={{ scale: 0.98 }}
      className={`glass-level-2 border-l-4 p-responsive transition-all relative overflow-hidden group ${
        isThreat
          ? 'border-l-[#991B1B] border-[#991B1B]/25 hover:border-[#991B1B]/50'
          : 'border-l-[#059669] border-[#059669]/25 hover:border-[#059669]/50'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-responsive-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-md ${
                isThreat
                  ? 'bg-[#991B1B]/15 text-[#991B1B] border border-[#991B1B]/30'
                  : 'bg-[#059669]/15 text-[#047857] border border-[#059669]/30'
              }`}
            >
              {signal.impact}
            </span>
            <span className="text-responsive-xs font-mono text-[#6B7280]">{signal.detectedAt}</span>
          </div>
          <span className="text-responsive-sm font-mono font-bold text-[#047857] bg-[#059669]/15 px-2 py-0.5 rounded-md border border-[#059669]/30">
            +{signal.momentum}% MOMENTUM
          </span>
        </div>

        <h3 className="text-responsive-lg font-bold text-[#111827] group-hover:text-[#8C6D13] transition-colors leading-snug">
          {signal.title}
        </h3>

        <p className="text-responsive-sm text-[#374151] leading-relaxed line-clamp-2 font-sans">{signal.summary}</p>

        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] text-responsive-xs font-mono text-[#6B7280]">
          <span>Detected across {signal.detectedStreams.length} streams</span>
          <span className="text-[#8C6D13] font-bold">{signal.confidence}% Confidence</span>
        </div>
      </div>
    </motion.div>
  );
}

export function InvestigationCard({ investigation }: { investigation: any }) {
  const isComplete = investigation.status === 'COMPLETED';
  const hasCheckpoint = !!investigation.metadata?.lastCheckpointId;

  const linkHref = isComplete
    ? `/intelligence/${investigation.id}`
    : `/investigations/${investigation.id}`;

  const createdDate = investigation.createdAt
    ? new Date(investigation.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : 'Recent';

  const lastActivity = investigation.lastHeartbeatAt || investigation.updatedAt
    ? new Date(investigation.lastHeartbeatAt || investigation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined;

  return (
    <Link href={linkHref}>
      <motion.div
        whileHover={{ y: -3, scale: 1.008 }}
        whileTap={{ scale: 0.98 }}
        className="glass-level-2 hover:border-[#D4AF37]/50 p-responsive transition-all flex flex-col justify-between group cursor-pointer h-full"
      >
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <StatusBadge status={investigation.status} />
            <span className="text-responsive-xs font-mono text-[#6B7280] font-bold">Created {createdDate}</span>
          </div>

          <h3 className="text-responsive-lg font-bold text-[#111827] group-hover:text-[#8C6D13] transition-colors mb-1 font-sans">
            {investigation.title}
          </h3>

          <p className="text-responsive-sm text-[#4B5563] line-clamp-2 mb-3 font-sans leading-relaxed">
            {investigation.strategicQuestion || investigation.objective}
          </p>

          {/* Timestamps & Availability Badges (Requirement 20) */}
          <div className="flex flex-wrap gap-2 mb-4 font-mono text-responsive-xs font-bold">
            {lastActivity && (
              <span className="bg-gray-100 text-[#4B5563] px-2 py-0.5 rounded border border-gray-200">
                ACTIVE: {lastActivity}
              </span>
            )}

            {hasCheckpoint && (
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                ● RECOVERABLE
              </span>
            )}

            {isComplete && (
              <span className="bg-[#D4AF37]/15 text-[#8C6D13] px-2 py-0.5 rounded border border-[#D4AF37]/35">
                ● REPORT READY
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-responsive-xs font-mono text-[#6B7280] mb-1">
              <span>PROGRESS</span>
              <span className="text-[#8C6D13] font-bold">{investigation.progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#E5E7EB] overflow-hidden border border-[#D1D5DB]">
              <div
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C9A227] transition-all duration-500 rounded-full"
                style={{ width: `${investigation.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] text-responsive-xs font-mono text-[#6B7280] font-semibold">
            <span>{investigation.activeAgentsCount || 5} agents</span>
            <span>{investigation.evidenceCount || 0} evidence</span>
            <span className="text-[#047857] font-bold">{investigation.confidence || 90}% CONF</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export function SourceCard({ source }: { source: SourceModel }) {
  const isActive = source.status === 'active';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.008 }}
      whileTap={{ scale: 0.98 }}
      className="glass-level-2 hover:border-[#D4AF37]/50 p-responsive transition-all flex flex-col justify-between group cursor-pointer h-full space-y-4"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="badge-responsive bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/35">
            {source.category}
          </span>
          <span
            className={`text-responsive-xs font-mono font-bold px-2 py-0.5 rounded ${
              isActive ? 'bg-[#059669]/15 text-[#047857]' : 'bg-[#D97706]/15 text-[#B45309]'
            }`}
          >
            {isActive ? '● LIVE ACTIVE' : '● SYNCING'}
          </span>
        </div>

        <h3 className="text-responsive-lg font-bold text-[#111827] group-hover:text-[#8C6D13] transition-colors leading-snug font-sans">
          {source.name}
        </h3>

        <p className="text-responsive-sm text-[#4B5563] font-mono leading-relaxed mt-2">
          {source.coverage}
        </p>
      </div>

      <div className="space-y-2 pt-2 border-t border-[#E5E7EB] text-responsive-xs font-mono text-[#6B7280]">
        <div className="flex items-center justify-between">
          <span>AVAILABILITY:</span>
          <span className="text-[#047857] font-bold">{source.availability}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span>RELIABILITY:</span>
          <span className="text-[#111827] font-bold">{source.reliability}%</span>
        </div>
        <div className="flex items-center justify-between text-responsive-xs pt-1">
          <span>LAST SYNC:</span>
          <span className="text-[#8C6D13] font-bold">{source.lastSync}</span>
        </div>
      </div>
    </motion.div>
  );
}
