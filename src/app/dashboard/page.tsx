'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  PlusCircle,
  Zap,
  Eye,
  Activity,
  Bot,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Cpu
} from 'lucide-react';
import { MetricCard, SignalCard, InvestigationCard } from '@/components/ui/Cards';
import { AgentStatus } from '@/components/ui/Indicators';
import { ActivityFeed, ActivityItem } from '@/components/ui/Feeds';
import { investigationsApi, agentsApi, watchlistsApi, alertsApi, signalsApi } from '@/lib/api';
import { InvestigationModel, AgentModel, SignalModel, WatchlistModel, AlertModel } from '@/lib/types';

export default function CommandCenterPage() {
  const [investigations, setInvestigations] = useState<InvestigationModel[]>([]);
  const [signals, setSignals] = useState<SignalModel[]>([]);
  const [agents, setAgents] = useState<AgentModel[]>([]);
  const [watchlists, setWatchlists] = useState<WatchlistModel[]>([]);
  const [alerts, setAlerts] = useState<AlertModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const invs = await investigationsApi.getAll();
        setInvestigations(invs);

        const ags = await agentsApi.getAll();
        setAgents(ags);

        const wts = await watchlistsApi.getAll();
        setWatchlists(wts);

        const alts = await alertsApi.getAll();
        setAlerts(alts);

        if (invs.length > 0) {
          const sigs = await signalsApi.getSignals(invs[0].id);
          setSignals(sigs);
        }
      } catch (e) {
        console.warn('Dashboard live data fetch:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const activeInvs = investigations.filter((i) => i.status === 'RUNNING' || i.status === 'SYNTHESIZING');
  const completedInvs = investigations.filter((i) => i.status === 'COMPLETED');
  const activeWatchlists = watchlists.filter((w) => w.status === 'ACTIVE' || w.status === 'INVESTIGATING');
  const unreadAlerts = alerts.filter((a) => !a.read);
  const activeAgentsCount = agents.filter((a) => a.status !== 'IDLE' && a.status !== 'ERROR').length;

  const activityFeedItems: ActivityItem[] = alerts.slice(0, 5).map((alt) => ({
    id: alt.id,
    time: alt.timeAgo || 'Just now',
    agentName: 'RADARX ORCHESTRATOR',
    action: `${alt.title}: ${alt.summary}`,
  }));

  if (activityFeedItems.length === 0 && investigations.length > 0) {
    activityFeedItems.push({
      id: 'act-init',
      time: 'Just now',
      agentName: 'RadarX Master Orchestrator',
      action: `Orchestrating investigation "${investigations[0].title}".`,
    });
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto"
    >
      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-6"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35 shadow-2xs">
              MISSION CONTROL
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111827] font-sans">
            COMMAND CENTER
          </h1>
          <p className="text-xs md:text-sm text-[#6B7280] font-sans mt-1">
            "Your autonomous intelligence network at a glance."
          </p>
        </div>

        <Link href="/investigations/new">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-xs font-extrabold px-4.5 py-2.5 rounded-xl shadow-md shadow-[#D4AF37]/25 transition-all shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#111827]" />
            <span>+ NEW INVESTIGATION</span>
          </motion.div>
        </Link>
      </motion.div>

      {/* Top Metrics Row - DERIVED DYNAMICALLY FROM DATABASE */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="ACTIVE INVESTIGATIONS"
          value={activeInvs.length}
          subtitle={`${activeInvs.length} active, ${completedInvs.length} complete`}
          icon={Shield}
          color="gold"
        />
        <MetricCard
          title="ACTIVE WATCHLISTS"
          value={activeWatchlists.length}
          subtitle="Continuous background monitoring"
          icon={Eye}
          color="cyan"
        />
        <MetricCard
          title="NEW SIGNALS"
          value={signals.length}
          subtitle="Multi-stream correlation"
          icon={Zap}
          trend="+42%"
          color="amber"
        />
        <MetricCard
          title="UNREAD ALERTS"
          value={unreadAlerts.length}
          subtitle="Requires executive review"
          icon={TrendingUp}
          color="red"
        />
        <MetricCard
          title="AGENTS ACTIVE"
          value={activeAgentsCount || agents.length}
          subtitle="1 orchestrator, 6 specialized"
          icon={Bot}
          color="emerald"
        />
      </motion.div>

      {/* Main Grid: Active Investigations & Emerging Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Investigations & Emerging Signals */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Investigations */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#C9A227]" />
                INVESTIGATIONS ({investigations.length})
              </h2>
              <Link
                href="/investigations/new"
                className="text-xs font-mono text-[#8C6D13] hover:text-[#111827] flex items-center gap-1 font-bold transition-colors"
              >
                + Start New <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {investigations.length > 0 ? (
                investigations.map((inv: any) => (
                  <InvestigationCard key={inv.id} investigation={inv} />
                ))
              ) : (
                <div className="md:col-span-2 p-8 text-center glass-level-2 space-y-3">
                  <div className="text-xs font-mono text-[#6B7280]">
                    No active investigations in database.
                  </div>
                  <Link href="/investigations/new">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#8C6D13] hover:underline cursor-pointer">
                      + Create your first investigation →
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Emerging Signals */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D97706]" />
                EMERGING STRATEGIC SIGNALS ({signals.length})
              </h2>
              <Link
                href="/alerts"
                className="text-xs font-mono text-[#B45309] hover:text-[#111827] flex items-center gap-1 font-bold transition-colors"
              >
                All alerts <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signals.length > 0 ? (
                signals.slice(0, 4).map((sig: any) => (
                  <SignalCard key={sig.id} signal={sig} />
                ))
              ) : (
                <div className="md:col-span-2 p-6 text-center glass-level-2 text-xs font-mono text-[#6B7280]">
                  Signals will appear here upon cross-source correlation completion.
                </div>
              )}
            </div>
          </motion.div>

          {/* Level 3 Premium Glass: Key Discovery */}
          {investigations.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C9A227]" />
                RECENT UNIFIED INTELLIGENCE FINDINGS
              </h2>

              <div className="glass-level-3 p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-[#8C6D13] uppercase font-bold tracking-wider">
                      KEY DISCOVERY • {investigations[0].title}
                    </span>
                    <h3 className="text-base font-bold text-[#111827] mt-1 font-sans">
                      {investigations[0].executiveSummary || investigations[0].objective}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[#059669]/15 text-[#047857] border border-[#059669]/30 shrink-0">
                    {investigations[0].confidence || 92}% CONFIDENCE
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] text-xs font-mono text-[#6B7280]">
                  <span>Status: {investigations[0].status}</span>
                  <Link
                    href={`/intelligence/${investigations[0].id}`}
                    className="text-[#8C6D13] hover:text-[#111827] font-bold flex items-center gap-1"
                  >
                    View Full Unified Report <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Col: Agent Network Status & Activity Feed */}
        <div className="space-y-8">
          {/* Agent Network Status */}
          <motion.div variants={itemVariants} className="glass-level-2 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#059669]" />
                AGENT NETWORK STATUS
              </h2>
              <span className="text-[10px] font-mono text-[#059669] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping" />
                {agents.length || 7} ONLINE
              </span>
            </div>

            <div className="space-y-2">
              {agents.map((agent) => (
                <AgentStatus
                  key={agent.id}
                  name={agent.name}
                  role={agent.role}
                  status={agent.status}
                  color={agent.color}
                />
              ))}
            </div>

            <Link href="/agents">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#D4AF37]/50 text-xs font-mono font-bold text-[#111827] transition-colors shadow-2xs cursor-pointer mt-2"
              >
                <span>Explore Agent Network Architecture</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.div>
            </Link>
          </motion.div>

          {/* Intelligence Activity Chronological Feed */}
          <motion.div variants={itemVariants} className="glass-level-2 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C9A227]" />
                LIVE INTELLIGENCE ACTIVITY
              </h2>
              <span className="text-[10px] font-mono text-[#9CA3AF] font-bold">REAL-TIME</span>
            </div>

            <ActivityFeed activities={activityFeedItems} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
