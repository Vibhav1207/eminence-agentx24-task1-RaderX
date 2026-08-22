'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Archive,
  Info,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  CheckCheck,
  Bell,
  BellOff,
  AlertCircle
} from 'lucide-react';
import { alertsApi } from '@/lib/api';
import { AlertModel } from '@/lib/types';
import { RightDrawer } from '@/components/ui/Overlays';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState<AlertModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'ALL' | 'HIGH IMPACT' | 'THREAT' | 'OPPORTUNITY' | 'SIGNAL'>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<AlertModel | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      setError(null);
      const data = await alertsApi.getWithCount({ category: activeTab === 'ALL' ? undefined : activeTab });
      // Sort: unread first, then by createdAt descending
      const sorted = [...data.alerts].sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setAlerts(sorted);
      setUnreadCount(data.unreadCount);
    } catch (e: any) {
      console.error('Failed to load alerts:', e);
      setError(e.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleMarkRead = async (id: string) => {
    try {
      await alertsApi.markRead(id);
      loadAlerts();
    } catch (e) {
      console.error('Failed to mark alert as read:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await alertsApi.markAllRead();
      setUnreadCount(0);
      loadAlerts();
    } catch (e) {
      console.error('Failed to mark all alerts as read:', e);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await alertsApi.dismiss(id);
      setAlerts(alerts.filter((a) => a.id !== id));
      if (selectedAlert?.id === id) setSelectedAlert(null);
      loadAlerts(); // Refresh to get updated unread count
    } catch (e) {
      console.error('Failed to archive alert:', e);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown time';
    try {
      return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const filteredAlerts = alerts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="container-responsive p-responsive space-y-responsive min-h-screen"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-responsive-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="badge-responsive bg-[#D97706]/15 text-[#B45309] border border-[#D97706]/35 shadow-2xs uppercase tracking-widest">
              INTELLIGENCE ALERTS & SIGNALS
            </span>
          </div>
          <h1 className="text-responsive-2xl font-extrabold tracking-tight text-[#111827] font-sans">
            ALERT CENTER
          </h1>
          <p className="text-responsive-xs text-[#6B7280] font-sans mt-1">
            "High-confidence intelligence notifications validated across multi-agent streams."
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-responsive-xs font-mono w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280] font-bold hidden sm:inline">UNREAD:</span>
            <span className="badge-responsive bg-[#D4AF37]/20 text-[#7A5E0A] font-extrabold border border-[#D4AF37]/40 shadow-2xs">
              {unreadCount} ACTIVE
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!loading && unreadCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-responsive py-2 rounded-lg bg-[#D4AF37]/10 text-[#8C6D13] font-mono text-responsive-xs font-bold border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-all cursor-pointer touch-target"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">MARK ALL READ</span>
                <span className="sm:hidden">READ ALL</span>
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 px-responsive py-2 rounded-lg bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37] font-mono text-responsive-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 touch-target"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">REFRESH</span>
              <span className="sm:hidden">REF</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-level-2 p-responsive border border-[#FCA5A5]/50 bg-[#FEF2F2] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
            <span className="text-responsive-sm text-[#991B1B] font-mono">{error}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="px-responsive py-1.5 rounded-lg bg-[#DC2626]/10 text-[#DC2626] font-mono text-responsive-xs font-bold border border-[#DC2626]/30 hover:bg-[#DC2626]/20 transition-all cursor-pointer touch-target shrink-0"
          >
            RETRY
          </motion.button>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2 overflow-x-auto custom-scroll">
        {(['ALL', 'HIGH IMPACT', 'THREAT', 'OPPORTUNITY', 'SIGNAL'] as const).map((tab) => (
          <motion.button
            key={tab}
            onClick={() => handleTabChange(tab)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 py-2 rounded-xl text-responsive-xs font-mono font-bold transition-all whitespace-nowrap border cursor-pointer ${ 
              activeTab === tab
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#111827] border-[#D4AF37] shadow-xs'
                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            {tab}
            {tab === 'ALL' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#111827] text-white text-[9px] font-extrabold">
                {unreadCount}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-level-2 p-responsive h-28 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E5E7EB]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-[#E5E7EB] rounded" />
                    <div className="h-3 w-1/4 bg-[#E5E7EB] rounded" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 8 }}
              whileHover={{ y: -2 }}
              onClick={() => setSelectedAlert(alert)}
              className={`glass-level-2 p-responsive shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden cursor-pointer group ${
                alert.read ? 'opacity-70' : 'border-l-4 border-l-[#D4AF37] border-[#D4AF37]/35 shadow-lg'
              }`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-responsive bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/35 font-extrabold uppercase">
                    {alert.category}
                  </span>
                  <span className="badge-responsive bg-[#D97706]/15 text-[#B45309] font-bold">
                    {alert.severity || alert.impact || 'HIGH'} SEVERITY
                  </span>
                  <span className="text-responsive-xs font-mono text-[#6B7280] hidden sm:inline">{getTimeAgo(alert.createdAt)}</span>
                  <span className="text-responsive-xs font-mono text-[#6B7280] sm:hidden">{getTimeAgo(alert.createdAt).split(' ')[0]}</span>
                </div>

                <h3 className="text-responsive-base font-bold text-[#111827] group-hover:text-[#8C6D13] transition-colors font-sans truncate">
                  {alert.title}
                </h3>

                <p className="text-responsive-xs text-[#374151] font-sans leading-relaxed line-clamp-2 md:line-clamp-3">{alert.summary}</p>

                <div className="flex flex-wrap items-center gap-4 text-responsive-xs font-mono text-[#6B7280] pt-1">
                  <span>Supported by {alert.evidenceCount} evidence item{alert.evidenceCount !== 1 ? 's' : ''}</span>
                  <span className="text-[#047857] font-extrabold">{alert.confidence}% CONFIDENCE</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Link href={`/intelligence/${alert.investigationId}`}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-responsive-xs font-extrabold px-responsive py-2 rounded-xl transition-colors shadow-sm cursor-pointer whitespace-nowrap touch-target"
                  >
                    <span className="hidden sm:inline">VIEW INTELLIGENCE</span>
                    <span className="sm:hidden">VIEW</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.div>
                </Link>

                {!alert.read && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleMarkRead(alert.id)}
                    className="p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37] text-xs font-mono transition-colors shadow-2xs cursor-pointer touch-target"
                    title="Mark as Read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleArchive(alert.id)}
                  className="p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37] text-xs font-mono transition-colors shadow-2xs cursor-pointer touch-target"
                  title="Archive Alert"
                >
                  <Archive className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-level-2 p-responsive text-center text-responsive-xs font-mono text-[#6B7280]"
          >
            <BellOff className="w-12 h-12 mx-auto mb-4 text-[#D1D5DB]" />
            <p className="font-bold text-[#374151]">No alerts found in this category.</p>
            <p className="mt-1">Alerts will appear here when watchlists detect strategic signals.</p>
          </motion.div>
        )}
      </div>

      {/* Alert Detail Drawer */}
      <RightDrawer
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.title || 'ALERT DETAILS'}
        subtitle="Full Multi-Agent Intelligence Explanation"
      >
        {selectedAlert && (
          <div className="space-y-6 text-responsive-xs font-sans max-h-[70vh] overflow-y-auto pr-2">
            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-responsive-xs">
              <span className="badge-responsive bg-[#D4AF37]/20 text-[#8C6D13] font-bold">
                {selectedAlert.category}
              </span>
              <span className="badge-responsive bg-[#047857]/15 text-[#047857] font-bold">
                {selectedAlert.confidence}% CONFIDENCE
              </span>
              <span className="badge-responsive bg-[#B45309]/15 text-[#B45309] font-bold">
                {selectedAlert.evidenceCount} EVIDENCE ITEMS
              </span>
              <span className="badge-responsive bg-[#6B7280]/15 text-[#6B7280] font-bold">
                {getTimeAgo(selectedAlert.createdAt).toUpperCase()}
              </span>
            </div>

            {/* 1. WHAT CHANGED */}
            <div className="bg-[#FAF9F6] p-responsive rounded-xl border border-[#E5E7EB] space-y-1">
              <div className="text-responsive-xs font-mono font-bold text-[#8C6D13] uppercase flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                WHAT CHANGED?
              </div>
              <p className="text-[#111827] leading-relaxed font-medium">
                {selectedAlert.whatChanged || selectedAlert.summary}
              </p>
            </div>

            {/* 2. WHY IT MATTERS */}
            <div className="bg-[#FAF9F6] p-responsive rounded-xl border border-[#E5E7EB] space-y-1">
              <div className="text-responsive-xs font-mono font-bold text-[#B45309] uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                WHY DOES IT MATTER?
              </div>
              <p className="text-[#111827] leading-relaxed font-medium">
                {selectedAlert.whyItMatters || 'Correlated multi-stream activity indicates accelerated competitive movement or hardware-level shift.'}
              </p>
            </div>

            {/* 3. RECOMMENDED ACTION */}
            <div className="bg-[#FAF9F6] p-responsive rounded-xl border border-[#E5E7EB] space-y-1">
              <div className="text-responsive-xs font-mono font-bold text-[#047857] uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                RECOMMENDED ACTION
              </div>
              <p className="text-[#111827] leading-relaxed font-medium">
                {selectedAlert.recommendedAction || 'Benchmark internal engineering workloads and establish continuous background watchlist alerts.'}
              </p>
            </div>

            {/* Navigation CTA */}
            <div className="pt-4 border-t border-[#E5E7EB] flex justify-end">
              <Link href={`/intelligence/${selectedAlert.investigationId}`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-responsive-xs font-extrabold px-responsive py-2.5 rounded-xl shadow-md cursor-pointer touch-target"
                >
                  <span className="hidden sm:inline">OPEN FULL INTELLIGENCE REPORT</span>
                  <span className="sm:hidden">OPEN REPORT</span>
                  <ExternalLink className="w-4 h-4" />
                </motion.div>
              </Link>
            </div>
          </div>
        )}
      </RightDrawer>
    </motion.div>
  );
}
