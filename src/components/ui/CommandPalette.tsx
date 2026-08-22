'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, AlertCircle, Cpu, Zap, X } from 'lucide-react';
import { searchApi } from '@/lib/api';

export interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CommandPalette({ isOpen: propIsOpen, onClose }: CommandPaletteProps = {}) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const activeIsOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;

  const closePalette = () => {
    setInternalIsOpen(false);
    if (onClose) onClose();
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ investigations: any[]; entities: any[]; nodes: any[] }>({
    investigations: [],
    entities: [],
    nodes: [],
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setInternalIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') closePalette();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ investigations: [], entities: [], nodes: [] });
      return;
    }
    const timer = setTimeout(() => {
      searchApi
        .query(query)
        .then((res) => setResults(res))
        .catch(console.warn);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = (path: string) => {
    closePalette();
    setQuery('');
    router.push(path);
  };

  return (
    <AnimatePresence>
      {activeIsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
          onClick={closePalette}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#FAF9F6] border border-[#D4AF37]/40 rounded-2xl shadow-2xl overflow-hidden text-xs font-mono"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E7EB] bg-white">
              <Search className="w-4 h-4 text-[#D4AF37]" />
              <input
                type="text"
                autoFocus
                placeholder="Search real intelligence, entities, patents, investigations... (Esc to exit)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm font-sans text-[#111827]"
              />
              <button onClick={closePalette} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions / Results Body */}
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scroll">
              {!query ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#8C6D13]">QUICK NAVIGATION JUMPS</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate('/investigations/new')}
                      className="p-3 text-left rounded-xl border border-[#E5E7EB] bg-white hover:border-[#D4AF37] font-bold text-[#111827]"
                    >
                      + New Investigation
                    </button>
                    <button
                      onClick={() => navigate('/decision-center')}
                      className="p-3 text-left rounded-xl border border-[#E5E7EB] bg-white hover:border-[#D4AF37] font-bold text-[#111827]"
                    >
                      Executive Decision Center
                    </button>
                    <button
                      onClick={() => navigate('/intelligence/graph')}
                      className="p-3 text-left rounded-xl border border-[#E5E7EB] bg-white hover:border-[#D4AF37] font-bold text-[#111827]"
                    >
                      Intelligence Graph
                    </button>
                    <button
                      onClick={() => navigate('/monitoring')}
                      className="p-3 text-left rounded-xl border border-[#E5E7EB] bg-white hover:border-[#D4AF37] font-bold text-[#111827]"
                    >
                      Continuous Monitoring
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.investigations.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#8C6D13]">INVESTIGATIONS</span>
                      {results.investigations.map((i) => (
                        <div
                          key={i.id}
                          onClick={() => navigate(`/investigations/${i.id}`)}
                          className="p-2.5 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#D4AF37] cursor-pointer font-sans text-xs font-bold text-[#111827]"
                        >
                          {i.title}
                        </div>
                      ))}
                    </div>
                  )}

                  {results.entities.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#8C6D13]">ENTITIES</span>
                      {results.entities.map((e) => (
                        <div
                          key={e.id}
                          onClick={() => navigate(`/entities/${e.id}`)}
                          className="p-2.5 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#D4AF37] cursor-pointer font-sans text-xs font-bold text-[#111827]"
                        >
                          {e.name} ({e.type})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;
