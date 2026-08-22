'use client';

import React, { useState } from 'react';
import { ConclusionVersion } from '@/lib/types';
import { FileEdit, History, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react';

interface ConclusionRevisionPanelProps {
  versions: ConclusionVersion[];
}

export function ConclusionRevisionPanel({ versions }: ConclusionRevisionPanelProps) {
  const [showHistory, setShowHistory] = useState(false);

  if (!versions || versions.length < 2) {
    return null; // Only show when a conclusion revision has actually occurred
  }

  // Sorted by version descending (V3, V2, V1)
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const latest = sorted[0];
  const previous = sorted[1];

  return (
    <div className="glass-level-2 p-6 space-y-4 shadow-md font-mono text-xs rounded-2xl border border-amber-200/50 bg-amber-50/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
        <h3 className="font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-amber-600" />
          AUTONOMOUS CONCLUSION REVISION
        </h3>
        <span className="text-[10px] bg-amber-600/15 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-600/30 flex items-center gap-1">
          <History className="w-3 h-3" />
          REVISION VERSION {latest.version}
        </span>
      </div>

      {/* Main Diff Card */}
      <div className="p-4 bg-white/95 rounded-xl border border-amber-200 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            CONCLUSION AUTONOMOUSLY UPDATED BY SELF-EVALUATOR
          </span>
          <span className="text-[10px] text-gray-500 font-normal">
            {new Date(latest.createdAt).toLocaleTimeString()}
          </span>
        </div>

        {/* Previous Version */}
        <div className="p-3 bg-red-50/60 rounded-lg border border-red-100 space-y-1">
          <span className="text-[9px] text-red-700 font-bold uppercase block">
            PREVIOUS CONCLUSION (Version {previous.version}):
          </span>
          <p className="text-xs text-red-900 font-sans line-through opacity-85">
            "{previous.conclusion}"
          </p>
        </div>

        {/* Arrow Transition */}
        <div className="flex items-center justify-center py-0.5">
          <ArrowRight className="w-4 h-4 text-amber-600 rotate-90 sm:rotate-90" />
        </div>

        {/* Updated Version */}
        <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-emerald-800 font-bold uppercase flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              UPDATED CONCLUSION (Version {latest.version}):
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
              CONFIDENCE {latest.confidence}%
            </span>
          </div>
          <p className="text-xs text-emerald-950 font-sans font-medium leading-relaxed">
            "{latest.conclusion}"
          </p>
        </div>

        {/* Reason Box */}
        <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px]">
          <span className="text-[9px] text-gray-500 font-bold uppercase block">REVISION RATIONALE:</span>
          <p className="text-xs text-gray-800 font-sans">"{latest.reason}"</p>
        </div>
      </div>

      {/* History Toggle */}
      {sorted.length > 2 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-[10px] text-amber-800 font-bold hover:underline flex items-center gap-1"
          >
            <History className="w-3 h-3" />
            {showHistory ? 'Hide Version History' : `View Full Version History (${sorted.length} versions)`}
          </button>

          {showHistory && (
            <div className="space-y-2 pt-2 border-t border-amber-200/50">
              {sorted.map((ver) => (
                <div key={ver.id} className="p-2.5 bg-white/70 rounded-lg border border-gray-200 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="font-bold text-gray-800">Version {ver.version}</span>
                    <span className="text-[9px]">{new Date(ver.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-800 font-sans">"{ver.conclusion}"</p>
                  <span className="text-[9px] text-gray-500 font-sans block">Reason: {ver.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConclusionRevisionPanel;
