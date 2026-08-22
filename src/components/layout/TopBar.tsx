'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Bell, Cpu, User, ChevronRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { appConfig } from '@/lib/config';

interface TopBarProps {
  onOpenCommandPalette: () => void;
}

export default function TopBar({ onOpenCommandPalette }: TopBarProps) {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    if (pathname === '/dashboard' || pathname === '/') return ['Command', 'Command Center'];
    if (pathname === '/investigations/new') return ['Investigations', 'New Investigation'];
    if (pathname.startsWith('/investigations/')) return ['Investigations', 'Live Workspace'];
    if (pathname.startsWith('/intelligence/graph')) return ['Intelligence', 'Intelligence Graph'];
    if (pathname.startsWith('/intelligence/')) return ['Intelligence', 'Unified Report'];
    if (pathname === '/watchlists') return ['Monitoring', 'Autonomous Watchlists'];
    if (pathname === '/agents') return ['Agents', 'Agent Network Transparency'];
    if (pathname === '/sources') return ['System', 'Source Connectors'];
    if (pathname === '/alerts') return ['Monitoring', 'Intelligence Alerts'];
    return ['RadarX', 'Platform'];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-2xs">
      {/* Breadcrumb Path */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#6B7280]">
        <span>{breadcrumbs[0]}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
        <span className="text-[#111827] font-semibold">{breadcrumbs[1]}</span>
      </div>

      {/* Global Controls Right */}
      <div className="flex items-center gap-3">
        {/* App Mode Explicit Indicator */}
        {appConfig.isDemo ? (
          <div className="flex items-center gap-1.5 bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30 px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold shadow-2xs">
            <AlertTriangle className="w-3 h-3 text-[#D97706]" />
            <span>DEMO MODE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#059669]/10 text-[#047857] border border-[#059669]/25 px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold shadow-2xs">
            <ShieldCheck className="w-3 h-3 text-[#059669]" />
            <span>PRODUCTION • REAL DATA</span>
          </div>
        )}

        {/* Command Search Trigger */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenCommandPalette}
          className="flex items-center gap-3 bg-white/90 border border-[#E5E7EB] hover:border-[#D4AF37]/50 text-[#6B7280] hover:text-[#111827] text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors group"
        >
          <Search className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#C9A227]" />
          <span className="font-sans">Search entity, signal, agent...</span>
          <kbd className="bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB] font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold">
            ⌘K
          </kbd>
        </motion.button>

        {/* Agent Network Status Badge */}
        <div className="hidden md:flex items-center gap-2 bg-white/90 border border-[#E5E7EB] px-3 py-1 rounded-xl text-xs font-mono text-[#374151] shadow-xs">
          <Cpu className="w-3.5 h-3.5 text-[#059669]" />
          <span className="text-[11px] font-bold">NETWORK:</span>
          <span className="text-[#059669] font-bold">COORDINATING</span>
        </div>

        {/* Notifications Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => (window.location.href = '/alerts')}
          className="relative p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] hover:border-[#D4AF37]/50 shadow-xs transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4AF37]" />
        </motion.button>

        {/* User Profile Badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#E5E7EB]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] border border-[#C9A227]/40 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-bold text-[#111827] leading-none">Intelligence Operator</span>
            <span className="text-[9px] font-mono text-[#8C6D13] font-semibold mt-0.5">ADMIN MODE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
