'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from '../ui/CommandPalette';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, Zap, Bot, Eye } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F6F2] text-[#111827] bg-ambient-gold antialiased font-sans relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Left Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar 
          onOpenCommandPalette={() => setIsCommandOpen(true)} 
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto custom-scroll bg-[#F7F6F2]/80 pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] flex items-center justify-around py-2 md:hidden" role="navigation" aria-label="Primary navigation">
        <a href="/dashboard" className={`flex flex-col items-center gap-1 p-2 text-[10px] font-mono transition-colors min-h-[44px] min-w-[44px] ${pathname === '/dashboard' || pathname === '/' ? 'text-[#8C6D13] font-bold' : 'text-[#6B7280]'}`} onClick={() => setIsSidebarOpen(false)}>
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </a>
        <a href="/investigations/new" className={`flex flex-col items-center gap-1 p-2 text-[10px] font-mono transition-colors min-h-[44px] min-w-[44px] ${pathname.startsWith('/investigations') ? 'text-[#8C6D13] font-bold' : 'text-[#6B7280]'}`} onClick={() => setIsSidebarOpen(false)}>
          <PlusCircle className="w-5 h-5" />
          <span>Investigate</span>
        </a>
        <a href="/alerts" className={`flex flex-col items-center gap-1 p-2 text-[10px] font-mono transition-colors min-h-[44px] min-w-[44px] ${pathname === '/alerts' ? 'text-[#8C6D13] font-bold' : 'text-[#6B7280]'}`} onClick={() => setIsSidebarOpen(false)}>
          <Zap className="w-5 h-5" />
          <span>Alerts</span>
        </a>
        <a href="/agents" className={`flex flex-col items-center gap-1 p-2 text-[10px] font-mono transition-colors min-h-[44px] min-w-[44px] ${pathname === '/agents' ? 'text-[#8C6D13] font-bold' : 'text-[#6B7280]'}`} onClick={() => setIsSidebarOpen(false)}>
          <Bot className="w-5 h-5" />
          <span>Agents</span>
        </a>
        <a href="/watchlists" className={`flex flex-col items-center gap-1 p-2 text-[10px] font-mono transition-colors min-h-[44px] min-w-[44px] ${pathname === '/watchlists' ? 'text-[#8C6D13] font-bold' : 'text-[#6B7280]'}`} onClick={() => setIsSidebarOpen(false)}>
          <Eye className="w-5 h-5" />
          <span>Watchlists</span>
        </a>
      </nav>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </div>
  );
}
