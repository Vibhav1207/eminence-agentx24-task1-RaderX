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
          className="sidebar-overlay" 
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
      <nav className="mobile-nav" role="navigation" aria-label="Primary navigation">
        <a href="/dashboard" className={`mobile-nav-item ${pathname === '/dashboard' || pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard className="icon" />
          <span>Dashboard</span>
        </a>
        <a href="/investigations/new" className={`mobile-nav-item ${pathname.startsWith('/investigations') ? 'active' : ''}`}>
          <PlusCircle className="icon" />
          <span>Investigate</span>
        </a>
        <a href="/alerts" className={`mobile-nav-item ${pathname === '/alerts' ? 'active' : ''}`}>
          <Zap className="icon" />
          <span>Alerts</span>
        </a>
        <a href="/agents" className={`mobile-nav-item ${pathname === '/agents' ? 'active' : ''}`}>
          <Bot className="icon" />
          <span>Agents</span>
        </a>
        <a href="/watchlists" className={`mobile-nav-item ${pathname === '/watchlists' ? 'active' : ''}`}>
          <Eye className="icon" />
          <span>Watchlists</span>
        </a>
      </nav>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </div>
  );
}
