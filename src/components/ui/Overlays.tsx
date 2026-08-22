'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';

export function RightDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl border-l border-[#E5E7EB] h-full shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FAF9F6]">
            <div>
              <h3 className="text-sm font-bold text-[#111827] font-sans">{title}</h3>
              {subtitle && <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-[#6B7280] hover:text-[#111827] p-1.5 rounded-xl hover:bg-[#E5E7EB] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-4">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="glass-level-2 p-10 text-center space-y-3 flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
        <ShieldAlert className="w-6 h-6 text-[#C9A227]" />
      </div>
      <h3 className="text-sm font-bold text-[#111827]">{title}</h3>
      <p className="text-xs text-[#6B7280] max-w-sm leading-relaxed font-sans">{description}</p>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          className="mt-2 text-xs font-bold font-mono bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] px-4 py-2 rounded-xl transition-all shadow-md shadow-[#D4AF37]/20"
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}

export function LoadingState({ message = 'Autonomous Agents Analyzing...' }: { message?: string }) {
  return (
    <div className="glass-level-2 p-12 text-center space-y-4 flex flex-col items-center justify-center">
      <div className="relative">
        <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
        <span className="absolute inset-0 w-8 h-8 rounded-full bg-[#D4AF37]/20 animate-ping" />
      </div>
      <p className="text-xs font-mono text-[#111827] font-bold tracking-wider">{message}</p>
    </div>
  );
}

export function ErrorState({ title = 'Operation Failed', message }: { title?: string; message: string }) {
  return (
    <div className="glass-level-2 border-l-4 border-l-[#991B1B] p-6 text-center space-y-2 flex flex-col items-center justify-center">
      <AlertCircle className="w-8 h-8 text-[#991B1B]" />
      <h3 className="text-sm font-bold text-[#111827]">{title}</h3>
      <p className="text-xs text-[#6B7280] font-sans">{message}</p>
    </div>
  );
}
