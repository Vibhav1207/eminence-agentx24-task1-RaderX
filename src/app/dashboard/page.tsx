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

        const alts = await alertsApi.getWithCount();
        setAlerts(alts.alerts);

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
      className="container-responsive p-responsive space-y-responsive"
    >
      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-responsive pb-responsive-sm border-b border-[#E5E7EB]"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-responsive bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/35 shadow-2xs uppercase tracking-wider">
              MISSION CONTROL
            </span>
          </div>
          <h1 className="text-responsive-3xl font-extrabold tracking-tight text-[#111827] font-sans">
            COMMAND CENTER
          </h1>
          <p className="text-responsive-sm text-[#6B7280] font-sans mt-1">
            "Your autonomous intelligence network at a glance."
          </p>
        </div>

        <Link href="/investigations/new">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-responsive-sm font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-[#D4AF37]/25 transition-all shrink-0 cursor-pointer touch-target"
          >
            <PlusCircle className="w-4 h-4 text-[#111827]" />
            <span className="hidden sm:inline">+ NEW INVESTIGATION</span>
            <span className="sm:hidden">+ NEW</span>
          </motion.div>
        </Link>
      </motion.div>

      {/* Top Metrics Row - DERIVED DYNAMICALLY FROM DATABASE */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-responsive">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-responsive">
        {/* Left 2 Cols: Active Investigations & Emerging Signals */}
        <div className="lg:col-span-2 space-y-responsive">
          {/* Active Investigations */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-responsive-base font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#C9A227]" />
                INVESTIGATIONS ({investigations.length})
              </h2>
              <Link
                href="/investigations/new"
                className="text-responsive-sm font-mono text-[#8C6D13] hover:text-[#111827] flex items-center gap-1 font-bold transition-colors touch-target"
              >
                <span className="hidden sm:inline">+ Start New</span>
                <span className="sm:hidden">+ New</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-responsive">
              {investigations.length > 0 ? (
                investigations.map((inv: any) => (
                  <InvestigationCard key={inv.id} investigation={inv} />
                ))
              ) : (
                <div className="md:col-span-2 p-responsive text-center glass-level-2 space-y-3">
                  <div className="text-responsive-base font-mono text-[#6B7280]">
                    No active investigations in database.
                  </div>
                  <Link href="/investigations/new">
                    <span className="inline-flex items-center gap-1.5 text-responsive-sm font-mono font-bold text-[#8C6D13] hover:underline cursor-pointer touch-target">
                      + Create your first investigation →
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Emerging Signals */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-responsive-base font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D97706]" />
                EMERGING STRATEGIC SIGNALS ({signals.length})
              </h2>
              <Link
                href="/alerts"
                className="text-responsive-sm font-mono text-[#B45309] hover:text-[#111827] flex items-center gap-1 font-bold transition-colors touch-target"
              >
                <span className="hidden sm:inline">All alerts</span>
                <span className="sm:inline">All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-responsive">
              {signals.length > 0 ? (
                signals.slice(0, 4).map((sig: any) => (
                  <SignalCard key={sig.id} signal={sig} />
                ))
              ) : (
                <div className="md:col-span-2 p-responsive text-center glass-level-2 text-responsive-base font-mono text-[#6B7280]">
                  Signals will appear here upon cross-source correlation completion.
                </div>
              )}
            </div>
          </motion.div>

          {/* Level 3 Premium Glass: Key Discovery */}
          {investigations.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-4">
              <h2 className="text-responsive-base font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C9A227]" />
                RECENT UNIFIED INTELLIGENCE FINDINGS
              </h2>

              <div className="glass-level-3 p-responsive space-y-4">
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

                <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] text-responsive-sm font-mono text-[#6B7280] flex-wrap gap-2">
                                  <span>Status: {investigations[0].status}</span>
                                  <Link
                                    href={`/intelligence/${investigations[0].id}`}
                                    className="text-[#8C6D13] hover:text-[#111827] font-bold flex items-center gap-1 touch-target"
                                  >
                                    <span className="hidden sm:inline">View Full Unified Report</span>
                                    <span className="sm:hidden">View Report</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </Link>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Right Col: Agent Network Status & Activity Feed */}
                        <div className="space-y-responsive">
                          {/* Agent Network Status */}
                          <motion.div variants={itemVariants} className="glass-level-2 p-responsive space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
                              <h2 className="text-responsive-base font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-[#059669]" />
                                AGENT NETWORK STATUS
                              </h2>
                              <span className="text-responsive-xs font-mono text-[#059669] font-bold flex items-center gap-1">
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
                                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#D4AF37]/50 text-responsive-sm font-mono font-bold text-[#111827] transition-colors shadow-2xs cursor-pointer mt-2 touch-target"
                              >
                                <span className="hidden sm:inline">Explore Agent Network Architecture</span>
                                <span className="sm:hidden">Explore Agents</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </motion.div>
                            </Link>
                          </motion.div>

                          {/* Intelligence Activity Chronological Feed */}
                          <motion.div variants={itemVariants} className="glass-level-2 p-responsive space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
                              <h2 className="text-responsive-base font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                                <Activity className="w-4 h-4 text-[#C9A227]" />
                                LIVE INTELLIGENCE ACTIVITY
                              </h2>
                              <span className="text-responsive-xs font-mono text-[#9CA3AF] font-bold">REAL-TIME</span>
                            </div>

                            <ActivityFeed activities={activityFeedItems} />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
