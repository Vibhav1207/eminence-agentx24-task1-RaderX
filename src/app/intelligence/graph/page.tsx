'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Filter,
  ExternalLink,
  Search,
  Cpu
} from 'lucide-react';
import { ConfidenceIndicator } from '@/components/ui/Indicators';
import { graphApi, investigationsApi } from '@/lib/api';
import { InvestigationModel, GraphNodeModel, GraphEdgeModel } from '@/lib/types';
import { normalizeConfidence } from '@/lib/utils/confidence';

export default function IntelligenceGraphPage() {
  const router = useRouter();
  const [investigations, setInvestigations] = useState<InvestigationModel[]>([]);
  const [activeInvId, setActiveInvId] = useState<string>('');
  const [nodes, setNodes] = useState<GraphNodeModel[]>([]);
  const [edges, setEdges] = useState<GraphEdgeModel[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNodeModel | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdgeModel | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const nodeColorMap: Record<string, string> = {
    COMPANY: '#2563EB',
    PERSON: '#06B6D4',
    TECHNOLOGY: '#8C6D13',
    PRODUCT: '#D4AF37',
    RESEARCH: '#059669',
    PATENT: '#D97706',
    NEWS: '#DC2626',
    EVENT: '#991B1B',
    OTHER: '#6B7280',
  };

  useEffect(() => {
    async function loadGraph() {
      try {
        const invs = await investigationsApi.getAll();
        setInvestigations(invs);
        const invId = invs[0]?.id;
        if (invId) setActiveInvId(invId);

        const data = await graphApi.getGraph(invId);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        if (data.nodes && data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      } catch (e) {
        console.warn('Failed to load graph:', e);
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, []);

  const handleSelectInvestigation = async (invId: string) => {
    setActiveInvId(invId);
    setLoading(true);
    try {
      const data = await graphApi.getGraph(invId);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setSelectedNode(data.nodes[0] || null);
      setSelectedEdge(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredNodes = nodes.filter((n) => {
    if (filterType !== 'ALL' && n.type !== filterType) return false;
    // Normalize confidence for consistent filtering (0-100 scale)
    const normalizedConfidence = normalizeConfidence(n.confidence);
    if (normalizedConfidence < minConfidence) return false;
    return true;
  });

  const handleStartInvestigationForEdge = (edge: GraphEdgeModel) => {
    const srcNode = nodes.find((n) => n.id === edge.sourceNodeId);
    const tgtNode = nodes.find((n) => n.id === edge.targetNodeId);
    const title = srcNode && tgtNode ? `${srcNode.label} - ${tgtNode.label} ${edge.relationshipType}` : 'Graph Edge Relationship';
    const obj = encodeURIComponent(`Investigate strategic relationship: ${title}`);
    router.push(`/investigations/new?objective=${obj}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 flex flex-col min-h-[calc(100vh-3.5rem)]"
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35 shadow-2xs">
              STAGE 2.10 EVIDENCE-BACKED INTELLIGENCE GRAPH
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#111827] font-sans">
            INTELLIGENCE GRAPH EXPLORER
          </h1>
          <p className="text-xs text-[#6B7280] font-sans">
            Every edge is backed by primary source evidence ({nodes.length} nodes, {edges.length} evidence-backed edges).
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            value={activeInvId}
            onChange={(e) => handleSelectInvestigation(e.target.value)}
            className="bg-white border border-[#E5E7EB] text-xs font-mono px-3 py-2 rounded-xl text-[#111827]"
          >
            <option value="">GLOBAL GRAPH</option>
            {investigations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.title}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-[#E5E7EB] text-xs font-mono px-3 py-2 rounded-xl text-[#111827]"
          >
            <option value="ALL">ALL TYPES</option>
            <option value="COMPANY">COMPANY</option>
            <option value="RESEARCH">RESEARCH</option>
            <option value="PATENT">PATENT</option>
            <option value="NEWS">NEWS</option>
            <option value="PRODUCT">PRODUCT</option>
          </select>
        </div>
      </div>

      {/* Main Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
        {/* Interactive Graph Canvas */}
        <div className="lg:col-span-2 glass-level-2 p-6 flex flex-col relative overflow-hidden min-h-[480px]">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 mb-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D4AF37]" />
              DYNAMIC TOPOLOGY CANVAS
            </span>
            <span className="text-[10px] font-mono text-[#047857] font-bold">
              ● REAL-TIME DISCOVERY
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs font-mono text-[#6B7280]">
              Building intelligence graph topology...
            </div>
          ) : filteredNodes.length > 0 ? (
            <div className="flex-1 relative flex flex-wrap content-start gap-4 p-4 overflow-y-auto custom-scroll">
              {filteredNodes.map((n) => {
                const color = nodeColorMap[n.type] || '#6B7280';
                const isSelected = selectedNode?.id === n.id;

                return (
                  <motion.div
                    key={n.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedNode(n);
                      setSelectedEdge(null);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 min-w-[180px] max-w-[240px] shadow-sm ${
                      isSelected
                        ? 'bg-white border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-lg'
                        : 'bg-[#FAF9F6] border-[#E5E7EB] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: color }}
                      >
                        {n.type}
                      </span>
                      <ConfidenceIndicator value={n.confidence} size="sm" />
                    </div>
                    <h3 className="font-extrabold text-[#111827] text-sm leading-tight font-sans">
                      {n.label}
                    </h3>
                    <p className="text-[11px] text-[#6B7280] line-clamp-2">{n.description}</p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs font-mono text-[#6B7280]">
              No nodes match selected graph filter.
            </div>
          )}
        </div>

        {/* Node & Edge Inspector Panel */}
        <div className="glass-level-2 p-6 flex flex-col justify-between space-y-6">
          {selectedNode ? (
            <div className="space-y-5">
              <div className="border-b border-[#E5E7EB] pb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C6D13] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md">
                  {selectedNode.type} NODE INSPECTOR
                </span>
                <h2 className="text-xl font-extrabold text-[#111827] font-sans mt-2">
                  {selectedNode.label}
                </h2>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-[#6B7280]">Description:</span>
                  <p className="text-[#374151] font-sans text-xs mt-1">{selectedNode.description}</p>
                </div>
                <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-3">
                  <span className="text-[#6B7280]">Node Confidence:</span>
                  <ConfidenceIndicator value={selectedNode.confidence} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280]">Node Importance:</span>
                  <span className="font-bold text-[#D4AF37]">{selectedNode.importance}/100</span>
                </div>
              </div>

              {/* Connected Edges */}
              <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-[#111827]">
                  EVIDENCE-BACKED EDGES
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scroll">
                  {edges
                    .filter((e) => e.sourceNodeId === selectedNode.id || e.targetNodeId === selectedNode.id)
                    .map((edge) => (
                      <div
                        key={edge.id}
                        onClick={() => setSelectedEdge(edge)}
                        className="p-3 rounded-xl border border-[#E5E7EB] bg-[#FAF9F6] text-xs font-mono hover:border-[#D4AF37] cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#D97706]">{edge.relationshipType}</span>
                          <span className="text-[10px] text-[#059669]">Evidence: {edge.evidenceIds.length}</span>
                        </div>
                        <p className="text-[11px] text-[#6B7280]">Click to inspect primary evidence</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-[#6B7280]">
              Select a node or edge to inspect primary evidence.
            </div>
          )}

          {/* Edge Evidence Modal / Action Footer */}
          {selectedEdge && (
            <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between font-bold text-[#7A5E0A]">
                  <span>SUPPORTING EVIDENCE ({selectedEdge.evidenceIds.length})</span>
                  <ConfidenceIndicator value={selectedEdge.confidence} size="sm" />
                </div>
                <button
                  onClick={() => handleStartInvestigationForEdge(selectedEdge)}
                  className="w-full bg-[#111827] text-white py-2 rounded-lg text-xs font-mono font-bold hover:bg-black transition-all"
                >
                  INVESTIGATE THIS RELATIONSHIP →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Router() {
  return useRouter();
}
