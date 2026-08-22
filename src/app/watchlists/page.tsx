'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  Zap,
  Bot,
  Radio,
  Plus,
  Play,
  Pause,
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Indicators';
import { SignalCard } from '@/components/ui/Cards';
import { RightDrawer } from '@/components/ui/Overlays';
import { watchlistsApi, investigationsApi } from '@/lib/api';
import { WatchlistModel, SignalModel, WatchlistSensitivity, MonitoringSchedule } from '@/lib/types';

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<WatchlistModel[]>([]);
  const [signals, setSignals] = useState<SignalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningWatchlistId, setRunningWatchlistId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newSensitivity, setNewSensitivity] = useState<WatchlistSensitivity>('MEDIUM');
  const [newSchedule, setNewSchedule] = useState<MonitoringSchedule>('DAILY');

  const loadData = async () => {
    try {
      const lists = await watchlistsApi.getAll();
      setWatchlists(lists);

      const invs = await investigationsApi.getAll();
      if (invs.length > 0) {
        const sigs = await investigationsApi.getSignals(invs[0].id);
        setSignals(sigs);
      }
    } catch (e) {
      console.warn('Failed to load watchlist data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function handleRunNow(id: string) {
    setRunningWatchlistId(id);
    try {
      await watchlistsApi.runNow(id);
      await loadData();
    } catch (err) {
      console.error('Failed to run watchlist:', err);
    } finally {
      setRunningWatchlistId(null);
    }
  }

  async function handleTogglePause(w: WatchlistModel) {
    try {
      if (w.status === 'PAUSED') {
        await watchlistsApi.resume(w.id);
      } else {
        await watchlistsApi.pause(w.id);
      }
      loadData();
    } catch (err) {
      console.error('Failed to toggle pause status:', err);
    }
  }

  async function handleCreateNewWatchlist(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await watchlistsApi.create({
        name: newTitle.trim(),
        title: newTitle.trim(),
        organization: newOrg.trim() || 'Target Organization',
        technology: newTech.trim() || 'Core Technology',
        sensitivity: newSensitivity,
        schedule: newSchedule,
      });

      setNewTitle('');
      setNewOrg('');
      setNewTech('');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to create watchlist:', err);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="container-responsive p-responsive space-y-responsive"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-responsive-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-responsive bg-[#06B6D4]/15 text-[#0891B2] border border-[#06B6D4]/30 shadow-2xs uppercase tracking-widest">
              CONTINUOUS AUTONOMOUS MONITORING
            </span>
          </div>
          <h1 className="text-responsive-2xl font-extrabold tracking-tight text-[#111827] font-sans">
            AUTONOMOUS WATCHLISTS & ALERTS
          </h1>
          <p className="text-responsive-sm text-[#6B7280] font-sans mt-responsive-sm">
            "Real-time incremental delta detection & intelligent signal alert thresholding."
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-responsive-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md shadow-[#D4AF37]/25 transition-all cursor-pointer shrink-0 touch-target"
        >
          <Eye className="w-4 h-4 text-[#111827]" />
          <span className="hidden sm:inline">+ ADD TOPIC TO WATCHLIST</span>
          <span className="sm:hidden">+ ADD</span>
        </motion.button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-responsive">
        <div className="lg:col-span-2 space-y-responsive">
          {/* Active Watchlists Grid */}
          <div className="space-y-responsive">
            <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#06B6D4]" />
              ACTIVE WATCHLISTS ({watchlists.length})
            </h2>

            <div className="grid grid-cols-1 gap-responsive">
              {watchlists.length > 0 ? (
                watchlists.map((w) => {
                  const isRunning = runningWatchlistId === w.id || w.status === 'INVESTIGATING';
                  return (
                    <motion.div
                      key={w.id}
                      whileHover={{ y: -3, scale: 1.005 }}
                      className="glass-level-2 hover:border-[#D4AF37]/50 p-responsive space-y-responsive shadow-md transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-responsive-sm">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={w.status} />
                            <span className="badge-responsive bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/30 uppercase tracking-widest">
                              {w.sensitivity || 'MEDIUM'} SENSITIVITY
                            </span>
                            <span className="text-responsive-xs font-mono text-[#6B7280]">
                              FREQ: {w.schedule || 'DAILY'}
                            </span>
                          </div>
                          <h3 className="text-responsive-lg font-bold text-[#111827] group-hover:text-[#8C6D13] transition-colors mt-responsive-sm font-sans">
                            {w.name || w.title}
                          </h3>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRunNow(w.id)}
                            disabled={isRunning}
                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#111827] font-mono text-responsive-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs hover:opacity-90 disabled:opacity-50 cursor-pointer touch-target"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                            <span>{isRunning ? 'RUNNING...' : 'RUN NOW'}</span>
                          </button>

                          <button
                            onClick={() => handleTogglePause(w)}
                            className="p-1.5 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] text-responsive-xs font-mono transition-colors cursor-pointer touch-target"
                            title={w.status === 'PAUSED' ? 'Resume Watchlist' : 'Pause Watchlist'}
                          >
                            {w.status === 'PAUSED' ? <Play className="w-4 h-4 text-[#047857]" /> : <Pause className="w-4 h-4 text-[#B45309]" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#FAF9F6] p-responsive rounded-xl border border-[#E5E7EB] space-y-1">
                        <span className="text-responsive-xs font-mono text-[#B45309] font-extrabold uppercase">
                          CURRENT SIGNAL DETECTED
                        </span>
                        <p className="text-responsive-xs text-[#111827] font-sans font-medium">{w.currentSignal}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between pt-1 text-responsive-xs font-mono text-[#6B7280]">
                        <div className="flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-[#8C6D13]" />
                          <span>Agents active: {w.activeAgents?.join(', ') || 'Research, Signal'}</span>
                        </div>
                        <span className="text-[#047857] font-extrabold">{w.confidence}% CONF</span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="p-responsive text-center glass-level-2 text-responsive-xs font-mono text-[#6B7280]">
                  No active watchlists. Click "+ ADD TOPIC TO WATCHLIST" to begin continuous monitoring.
                </div>
              )}
            </div>
          </div>

          {/* Recent Signals */}
          <div className="space-y-responsive">
            <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D97706]" />
              CORRELATED INTELLIGENCE SIGNALS ({signals.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-responsive">
              {signals.length > 0 ? (
                signals.slice(0, 4).map((sig) => (
                  <SignalCard key={sig.id} signal={sig as any} />
                ))
              ) : (
                <div className="sm:col-span-2 p-responsive text-center glass-level-2 text-responsive-xs font-mono text-[#6B7280]">
                  No validated signals detected for this monitoring window.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Champagne Gold Radar Scanning Visual */}
        <div className="space-y-responsive">
          <div className="glass-level-3 p-responsive space-y-responsive text-center relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E7EB] pb-responsive-sm text-left">
              <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#C9A227] animate-pulse" />
                RADARX CONTINUOUS SCANNER
              </h2>
              <span className="text-responsive-xs font-mono text-[#8C6D13] font-extrabold">24/7 ACTIVE</span>
            </div>

            <div className="relative w-40 h-40 mx-auto my-responsive flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#D4AF37]/30" />
              <div className="absolute inset-4 rounded-full border border-[#D4AF37]/45" />
              <div className="absolute inset-10 rounded-full border border-[#D4AF37]/60" />

              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#D4AF37]/40" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#D4AF37]/40" />

              <div className="absolute inset-0 rounded-full animate-radar-sweep bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(212,175,55,0.35)_360deg)] pointer-events-none" />

              <div className="w-4 h-4 rounded-full bg-[#C9A227] shadow-lg shadow-[#D4AF37]/50 animate-ping" />
              <div className="w-3 h-3 rounded-full bg-[#C9A227]" />
            </div>

            <p className="text-responsive-xs text-[#374151] font-sans leading-relaxed">
              Incremental delta engine fingerprints new DOIs, patent filings, and news disclosures automatically.
            </p>
          </div>

          <div className="glass-level-2 p-responsive space-y-responsive">
            <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827]">
              ALERT ENGINE DECISION PIPELINE
            </h2>

            <div className="space-y-2 text-responsive-xs font-mono">
              {[
                { label: 'EVIDENCE FINGERPRINTING', status: 'DE-DUP' },
                { label: 'INCREMENTAL DELTA', status: 'CALCULATED' },
                { label: 'SENSITIVITY THRESHOLD', status: 'EVALUATED' },
                { label: 'SIGNAL MOMENTUM', status: 'EVOLVED' },
                { label: 'NOISE CONTROL GATE', status: 'PASSED' },
                { label: 'INTELLIGENT ALERT', status: 'DISPATCHED' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-responsive rounded-xl bg-white border border-[#E5E7EB] shadow-2xs"
                >
                  <span className="text-[#374151] font-semibold">
                    {idx + 1}. {step.label}
                  </span>
                  <span className="badge-responsive bg-[#D4AF37]/20 text-[#7A5E0A] font-extrabold">
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Watchlist Creation Modal */}
      <RightDrawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="ADD NEW TOPIC TO WATCHLIST"
        subtitle="Establish autonomous background monitoring"
      >
        <form onSubmit={handleCreateNewWatchlist} className="space-y-responsive">
          <div className="space-y-1">
            <label className="text-responsive-xs font-mono font-bold text-[#111827]">WATCHLIST TITLE</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., AMD AI Chip Roadmap Watch"
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-responsive py-responsive text-responsive-xs text-[#111827] font-mono focus:border-[#D4AF37] focus:outline-none input-responsive"
            />
          </div>

          <div className="space-y-1">
            <label className="text-responsive-xs font-mono font-bold text-[#111827]">PRIMARY ORGANIZATION</label>
            <input
              type="text"
              value={newOrg}
              onChange={(e) => setNewOrg(e.target.value)}
              placeholder="e.g., AMD"
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-responsive py-responsive text-responsive-xs text-[#111827] font-mono focus:border-[#D4AF37] focus:outline-none input-responsive"
            />
          </div>

          <div className="space-y-1">
            <label className="text-responsive-xs font-mono font-bold text-[#111827]">TARGET TECHNOLOGY</label>
            <input
              type="text"
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              placeholder="e.g., MI300X Memory Bandwidth"
              className="w-full bg-white border border-[#E5E7EB] rounded-xl px-responsive py-responsive text-responsive-xs text-[#111827] font-mono focus:border-[#D4AF37] focus:outline-none input-responsive"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-responsive">
            <div className="space-y-1">
              <label className="text-responsive-xs font-mono font-bold text-[#111827]">ALERT SENSITIVITY</label>
              <select
                value={newSensitivity}
                onChange={(e) => setNewSensitivity(e.target.value as WatchlistSensitivity)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-responsive py-responsive text-responsive-xs text-[#111827] font-mono focus:border-[#D4AF37] focus:outline-none input-responsive"
              >
                <option value="LOW">LOW (Major events)</option>
                <option value="MEDIUM">MEDIUM (Balanced)</option>
                <option value="HIGH">HIGH (Emerging)</option>
                <option value="CRITICAL">CRITICAL (Only top)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-responsive-xs font-mono font-bold text-[#111827]">SCHEDULE</label>
              <select
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value as MonitoringSchedule)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-responsive py-responsive text-responsive-xs text-[#111827] font-mono focus:border-[#D4AF37] focus:outline-none input-responsive"
              >
                <option value="HOURLY">Every Hour</option>
                <option value="EVERY_6_HOURS">Every 6 Hours</option>
                <option value="DAILY">Daily (24/7)</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-responsive-xs font-extrabold py-3 px-4 rounded-xl shadow-md shadow-[#D4AF37]/25 transition-all cursor-pointer mt-responsive-sm touch-target"
          >
            <Plus className="w-4 h-4 text-[#111827]" />
            <span className="hidden sm:inline">START AUTONOMOUS MONITORING</span>
            <span className="sm:hidden">START MONITORING</span>
          </motion.button>
        </form>
      </RightDrawer>
    </motion.div>
  );
}
