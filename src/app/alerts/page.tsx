'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Archive,
  Info,
  ShieldAlert,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { alertsApi } from '@/lib/api';
import { AlertModel } from '@/lib/types';
import { RightDrawer } from '@/components/ui/Overlays';

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState<AlertModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'HIGH IMPACT' | 'THREAT' | 'OPPORTUNITY' | 'SIGNAL'>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<AlertModel | null>(null);

  const loadAlerts = async () => {
    try {
      const data = await alertsApi.getAll();
      setAlerts(data);
    } catch (e) {
      console.warn('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await alertsApi.update(id, { read: true });
      loadAlerts();
    } catch {}
  };

  const handleArchive = async (id: string) => {
    try {
      await alertsApi.update(id, { read: true });
      setAlerts(alerts.filter((a) => a.id !== id));
      if (selectedAlert?.id === id) setSelectedAlert(null);
    } catch {}
  };

  const filteredAlerts = activeTab === 'ALL'
    ? alerts
    : alerts.filter((a) => a.category?.includes(activeTab));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#B45309] bg-[#D97706]/15 px-2.5 py-0.5 rounded-md border border-[#D97706]/35 shadow-2xs">
              INTELLIGENCE ALERTS & SIGNALS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111827] font-sans">
            ALERT CENTER
          </h1>
          <p className="text-xs md:text-sm text-[#6B7280] font-sans mt-1">
            "High-confidence intelligence notifications validated across multi-agent streams."
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#6B7280] font-bold">UNREAD ALERTS:</span>
          <span className="px-2.5 py-1 rounded-full bg-[#D4AF37]/20 text-[#7A5E0A] font-extrabold border border-[#D4AF37]/40 shadow-2xs">
            {alerts.filter((a) => !a.read).length} ACTIVE
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2 overflow-x-auto custom-scroll">
        {(['ALL', 'HIGH IMPACT', 'THREAT', 'OPPORTUNITY', 'SIGNAL'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap border cursor-pointer ${
              activeTab === tab
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#111827] border-[#D4AF37] shadow-xs'
                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              whileHover={{ y: -2 }}
              onClick={() => setSelectedAlert(alert)}
              className={`glass-level-2 p-5 shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden cursor-pointer group ${
                alert.read ? 'opacity-70' : 'border-l-4 border-l-[#D4AF37] border-[#D4AF37]/35 shadow-lg'
              }`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/35">
                    {alert.category}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#D97706]/15 text-[#B45309]">
                    {alert.severity || alert.impact || 'HIGH'} SEVERITY
                  </span>
                  <span className="text-[11px] font-mono text-[#6B7280]">{alert.timeAgo}</span>
                </div>

                <h3 className="text-base font-bold text-[#111827] group-hover:text-[#8C6D13] transition-colors font-sans">
                  {alert.title}
                </h3>

                <p className="text-xs text-[#374151] font-sans leading-relaxed line-clamp-2">{alert.summary}</p>

                <div className="flex items-center gap-4 text-xs font-mono text-[#6B7280] pt-1">
                  <span>Supported by {alert.evidenceCount} evidence items</span>
                  <span className="text-[#047857] font-extrabold">{alert.confidence}% CONFIDENCE</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap md:flex-col lg:flex-row items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Link href={`/intelligence/${alert.investigationId}`}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-xs font-extrabold px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <span>VIEW INTELLIGENCE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.div>
                </Link>

                {!alert.read && (
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    className="p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37] text-xs font-mono transition-colors shadow-2xs cursor-pointer"
                    title="Mark as Read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleArchive(alert.id)}
                  className="p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D4AF37] text-xs font-mono transition-colors shadow-2xs cursor-pointer"
                  title="Archive Alert"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="glass-level-2 p-10 text-center text-xs font-mono text-[#6B7280]">
            No alerts found in this category.
          </div>
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
          <div className="space-y-6 text-xs font-sans">
            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-md bg-[#D4AF37]/20 text-[#8C6D13] font-bold">
                {selectedAlert.category}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#047857]/15 text-[#047857] font-bold">
                {selectedAlert.confidence}% CONFIDENCE
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#B45309]/15 text-[#B45309] font-bold">
                {selectedAlert.evidenceCount} EVIDENCE ITEMS
              </span>
            </div>

            {/* 1. WHAT CHANGED */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E7EB] space-y-1">
              <div className="text-[10px] font-mono font-bold text-[#8C6D13] uppercase flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                WHAT CHANGED?
              </div>
              <p className="text-[#111827] leading-relaxed font-medium">
                {selectedAlert.whatChanged || selectedAlert.summary}
              </p>
            </div>

            {/* 2. WHY IT MATTERS */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E7EB] space-y-1">
              <div className="text-[10px] font-mono font-bold text-[#B45309] uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                WHY DOES IT MATTER?
              </div>
              <p className="text-[#111827] leading-relaxed font-medium">
                {selectedAlert.whyItMatters || 'Correlated multi-stream activity indicates accelerated competitive movement or hardware-level shift.'}
              </p>
            </div>

            {/* 3. RECOMMENDED ACTION */}
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E7EB] space-y-1">
              <div className="text-[10px] font-mono font-bold text-[#047857] uppercase flex items-center gap-1.5">
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
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  <span>OPEN FULL INTELLIGENCE REPORT</span>
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
