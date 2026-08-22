'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  PlusCircle,
  Zap,
  FileText,
  GitGraph,
  Bot,
  Eye,
  Bell,
  Database,
  Settings,
  Shield,
  Activity,
  Cpu,
  Share2,
  Briefcase,
  Search
} from 'lucide-react';
import { clsx } from 'clsx';
import { CommandPalette } from '../ui/CommandPalette';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      title: 'COMMAND',
      items: [
        { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Decision Center', href: '/decision-center', icon: Briefcase, badge: 'EXEC' },
        { label: 'New Investigation', href: '/investigations/new', icon: PlusCircle, badge: 'NEW' },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { label: 'Intelligence Graph', href: '/intelligence/graph', icon: GitGraph },
        { label: 'Signals & Alerts', href: '/alerts', icon: Zap },
      ],
    },
    {
      title: 'AGENTS',
      items: [
        { label: 'Agent Network', href: '/agents', icon: Bot, badge: '7' },
        { label: 'Adversarial Live Test', href: '/adversarial-test', icon: Shield, badge: 'LIVE DEMO' },
      ],
    },
    {
      title: 'MONITORING',
      items: [
        { label: 'Watchlists', href: '/watchlists', icon: Eye },
        { label: 'Alerts', href: '/alerts', icon: Bell },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Data Sources', href: '/sources', icon: Database },
      ],
    },
  ];

  return (
    <>
      <CommandPalette />
      <aside className="w-[250px] bg-white/75 backdrop-blur-md border-r border-[#E5E7EB] flex flex-col shrink-0 h-screen sticky top-0 z-30 select-none shadow-sm">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-col space-y-3">
          <Link href="/dashboard" className="flex flex-col group">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4AF37] via-[#C9A227] to-[#E0C46C] flex items-center justify-center shadow-md shadow-[#D4AF37]/20 group-hover:scale-105 transition-transform">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-extrabold tracking-wider text-xl text-[#111827] font-mono">
                RADAR<span className="text-[#C9A227]">X</span>
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest text-[#9CA3AF] font-bold mt-1">
              AUTONOMOUS INTELLIGENCE
            </span>
          </Link>

          {/* Command Palette Trigger Button */}
          <div className="px-1">
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                window.dispatchEvent(event);
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-[#FAF9F6] border border-[#E5E7EB] text-xs font-mono text-[#6B7280] hover:border-[#D4AF37] transition-all cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#D4AF37]" />
                Search...
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E5E7EB] text-[9px] font-extrabold text-[#111827]">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto custom-scroll px-3 py-4 space-y-5">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] font-mono">
                {section.title}
              </h3>
              <nav className="space-y-0.5 mt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link key={item.label} href={item.href}>
                      <motion.div
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        className={clsx(
                          'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all relative group',
                          isActive
                            ? 'bg-[#D4AF37]/15 text-[#8C6D13] font-semibold border border-[#D4AF37]/35 shadow-xs'
                            : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activePill"
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#D4AF37]"
                          />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0 pl-1">
                          <Icon
                            className={clsx(
                              'w-4 h-4 shrink-0 transition-colors',
                              isActive ? 'text-[#C9A227]' : 'text-[#6B7280] group-hover:text-[#374151]'
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={clsx(
                              'text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded shrink-0',
                              isActive
                                ? 'bg-[#D4AF37]/25 text-[#7A5E0A]'
                                : 'bg-[#E5E7EB] text-[#4B5563] group-hover:bg-[#D1D5DB]'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Agent Network Status */}
        <div className="p-3 border-t border-[#E5E7EB] bg-[#FAF9F6]">
          <Link href="/agents">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#D4AF37]/50 shadow-xs transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Cpu className="w-4 h-4 text-[#059669]" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#059669] animate-ping" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#059669]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#374151] font-mono">
                    AGENT NETWORK
                  </span>
                  <span className="text-[11px] font-semibold text-[#059669] flex items-center gap-1">
                    ● ONLINE
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#8C6D13] bg-[#D4AF37]/15 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                7 active
              </span>
            </motion.div>
          </Link>
        </div>
      </aside>
    </>
  );
}
