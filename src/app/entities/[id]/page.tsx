'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  Shield,
  Zap,
  FileText,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { ConfidenceIndicator } from '@/components/ui/Indicators';
import { entitiesApi } from '@/lib/api';
import { EntityProfileModel } from '@/lib/types';

export default function EntityProfilePage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const [profile, setProfile] = useState<EntityProfileModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      entitiesApi
        .getById(id)
        .then((data) => setProfile(data))
        .catch(console.warn)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-[#6B7280]">
        Loading canonical entity intelligence profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-12 text-center text-xs font-mono text-[#6B7280]">
        Entity profile <span className="font-bold text-[#111827]">{id}</span> not found in database.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8"
    >
      {/* Header Profile Section */}
      <div className="glass-level-2 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35">
                CANONICAL ENTITY PROFILE • {profile.type}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#111827] font-sans">
              {profile.name}
            </h1>
            {profile.aliases && profile.aliases.length > 0 && (
              <p className="text-xs font-mono text-[#6B7280]">
                Aliases: {profile.aliases.join(', ')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <ConfidenceIndicator value={profile.confidence} size="lg" />
            <Link
              href={`/investigations/new?objective=${encodeURIComponent(`Deep-dive strategic audit of ${profile.name}`)}`}
            >
              <button className="bg-gradient-to-r from-[#D4AF37] via-[#C9A227] to-[#E0C46C] text-[#111827] font-mono text-xs font-extrabold px-5 py-3 rounded-xl shadow-md cursor-pointer hover:scale-102 transition-all">
                LAUNCH ENTITY INVESTIGATION →
              </button>
            </Link>
          </div>
        </div>

        <p className="text-sm text-[#374151] font-sans leading-relaxed">{profile.description}</p>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-level-2 p-5 space-y-2 text-xs font-mono">
          <span className="text-[#6B7280]">EVIDENCE COUNT</span>
          <p className="text-2xl font-extrabold text-[#111827]">{profile.evidenceCount}</p>
        </div>

        <div className="glass-level-2 p-5 space-y-2 text-xs font-mono">
          <span className="text-[#6B7280]">STRATEGIC IMPORTANCE</span>
          <p className="text-2xl font-extrabold text-[#D4AF37]">{profile.importance}/100</p>
        </div>

        <div className="glass-level-2 p-5 space-y-2 text-xs font-mono">
          <span className="text-[#6B7280]">LAST SEEN ACTIVITY</span>
          <p className="text-sm font-bold text-[#047857]">
            {new Date(profile.lastSeen).toLocaleDateString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
