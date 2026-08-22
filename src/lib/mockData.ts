'use client';

export interface Agent {
  id: string;
  name: string;
  type: 'orchestrator' | 'research' | 'patent' | 'news' | 'competitor' | 'web' | 'signal' | 'synthesis';
  role: string;
  status: 'active' | 'analyzing' | 'synthesizing' | 'idle' | 'coordinating';
  currentTask: string;
  evidenceProcessed: number;
  confidence: number;
  color: string;
  lastActive?: string;
}

export interface EvidenceItem {
  id: string;
  sourceType: 'research' | 'patent' | 'news' | 'competitor' | 'web';
  title: string;
  source: string;
  date: string;
  summary: string;
  confidence: number;
  url?: string;
  metrics?: { label: string; value: string }[];
}

export interface SignalItem {
  id: string;
  title: string;
  classification: 'threat' | 'opportunity' | 'neutral';
  impact: string;
  confidence: number;
  momentum: number;
  summary: string;
  whyItMatters: string;
  sourcesCount: number;
  evidence: EvidenceItem[];
  detectedStreams: ('research' | 'patent' | 'news' | 'competitor' | 'web')[];
  recommendedActions: { action: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string }[];
  detectedAt: string;
  type?: string;
  sourceTypes?: string[];
  explanationMatrix?: {
    what: string;
    why: string;
    evidence: string;
    impact: string;
    confidence: string;
    momentum: string;
    entities: string[];
    timeframe: string;
  };
}

export interface InvestigationItem {
  id: string;
  title: string;
  organization: string;
  technology: string;
  strategicQuestion: string;
  timeRange: string;
  status: 'RUNNING' | 'COMPLETE' | 'QUEUED' | 'PAUSED' | 'INVESTIGATING' | 'SYNTHESIZING';
  progress: number;
  confidence: number;
  threatScore: number;
  opportunityScore: number;
  signalVelocity: number;
  orchestratorStatus: string;
  orchestratorAction: string;
  executiveSummary: string;
  whyThisMatters: string;
  evidenceCount: number;
  signalsCount: number;
  sourcesCount: number;
  activeAgentsCount: number;
  evidence: EvidenceItem[];
  signals: SignalItem[];
  keyFindings: { finding: string; impact: string; confidence: number; evidenceCount: number }[];
  recommendations: { action: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string }[];
  agentContributions?: Array<{ agentName: string; role: string; contribution: string; evidenceCount: number; confidence: number }>;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface EntityNode {
  id: string;
  name: string;
  type: 'organization' | 'technology' | 'person' | 'product' | 'patent';
  relevance: number; // 0-100
  connections: string[]; // Connected entity IDs
  summary?: string;
  confidence: number;
}

export interface EntityLink {
  source: string;
  target: string;
  label?: string;
  relationship?: string;
  confidence?: number;
  whyConnected?: string;
}

export interface WatchlistItem {
  id: string;
  title: string;
  organization: string;
  technology: string;
  status: 'ACTIVE' | 'PAUSED' | 'ALERTING' | 'MONITORING';
  lastChecked: string;
  alertCount: number;
  currentSignal: string;
  confidence: number;
  frequency?: string;
  lastMeaningfulChange?: string;
  activeAgents: string[];
  createdAt?: string;
}

export interface AlertItem {
  id: string;
  title: string;
  timeAgo: string;
  impact?: 'HIGH IMPACT' | 'MEDIUM-HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  read: boolean;
  category: 'THREAT' | 'OPPORTUNITY' | 'SIGNAL' | 'HIGH IMPACT';
  evidenceCount?: number;
  confidence?: number;
  investigationId?: string;
}

export interface SourceItem {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'syncing' | 'paused' | 'offline';
  coverage: string;
  lastSync: string;
  availability: number;
}

// Global Seed Dataset
export const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'RadarX Master Orchestrator',
    type: 'orchestrator',
    role: 'Deconstructs goals & coordinates agent network',
    status: 'coordinating',
    currentTask: 'Synthesizing cross-stream evidence for NVIDIA GPU architecture',
    evidenceProcessed: 48,
    confidence: 96,
    color: '#D4AF37', // Gold
  },
  {
    id: 'agent-2',
    name: 'Academic & Preprint Agent',
    type: 'research',
    role: 'Scans arXiv, IEEE Xplore, and research repositories',
    status: 'analyzing',
    currentTask: 'Correlating sub-linear attention kernels with Tensor Core FP4 claims',
    evidenceProcessed: 14,
    confidence: 92,
    color: '#06B6D4', // Cyan
  },
  {
    id: 'agent-3',
    name: 'USPTO & WIPO Patent Agent',
    type: 'patent',
    role: 'Tracks patent filings, claims & assignee activity',
    status: 'active',
    currentTask: 'Analyzing USPTO 2026-019842 (Sub-byte Quantization)',
    evidenceProcessed: 8,
    confidence: 94,
    color: '#3B82F6', // Blue
  },
  {
    id: 'agent-4',
    name: 'Global Financial & Tech News Agent',
    type: 'news',
    role: 'Monitors Bloomberg, Reuters, SEC filings, tech press',
    status: 'active',
    currentTask: 'Tracking TSMC CoWoS packaging allocation reports',
    evidenceProcessed: 12,
    confidence: 88,
    color: '#10B981', // Emerald
  },
  {
    id: 'agent-5',
    name: 'Competitor Intelligence Agent',
    type: 'competitor',
    role: 'Tracks AMD, Cerebras, Custom ASIC hyperscaler moves',
    status: 'analyzing',
    currentTask: 'Benchmarking Hyperscaler ASIC capex shift disclosures',
    evidenceProcessed: 6,
    confidence: 90,
    color: '#9333EA', // Purple
  },
  {
    id: 'agent-6',
    name: 'Web Intelligence & Code Velocity Agent',
    type: 'web',
    role: 'Monitors GitHub repos, documentation, tech forums',
    status: 'active',
    currentTask: 'Indexing GitHub cuBLAS-FP4 repository commit velocity',
    evidenceProcessed: 8,
    confidence: 89,
    color: '#F59E0B', // Amber
  },
  {
    id: 'agent-7',
    name: 'Cross-Stream Signal Discovery Agent',
    type: 'signal',
    role: 'Identifies emerging pattern clusters & anomaly velocity',
    status: 'synthesizing',
    currentTask: 'Calculating momentum vector on AI Infrastructure Acceleration',
    evidenceProcessed: 22,
    confidence: 95,
    color: '#EC4899', // Pink
  },
  {
    id: 'agent-8',
    name: 'Executive Synthesis Agent',
    type: 'synthesis',
    role: 'Compiles unified intelligence reports & recommendations',
    status: 'active',
    currentTask: 'Generating strategic threat matrix and action items',
    evidenceProcessed: 48,
    confidence: 94,
    color: '#14B8A6', // Teal
  },
];

export const mockEvidence: EvidenceItem[] = [
  {
    id: 'ev-1',
    sourceType: 'patent',
    title: 'USPTO Patent Application 2026-019842: Low-Precision FP4 Tensor Execution Units',
    source: 'USPTO Patent Office',
    date: '2 days ago',
    summary: 'NVIDIA patent filing details hardware-level FP4 sub-byte quantization execution units directly embedded into next-generation Tensor Cores.',
    confidence: 94,
    metrics: [
      { label: 'Speedup', value: '2.4x vs FP8' },
      { label: 'Energy Reduction', value: '40%' },
    ],
  },
  {
    id: 'ev-2',
    sourceType: 'research',
    title: 'arXiv: Sub-Linear Attention Memory Kernels for Blackwell Datacenter Racks',
    source: 'arXiv.org Archive',
    date: '3 days ago',
    summary: 'Preprint details memory-efficient KV cache reduction kernels achieving 60% memory savings on 70B parameter LLM inference.',
    confidence: 91,
    metrics: [
      { label: 'KV Cache Reduction', value: '60%' },
      { label: 'Throughput', value: '+85%' },
    ],
  },
  {
    id: 'ev-3',
    sourceType: 'news',
    title: 'Bloomberg: TSMC Increases CoWoS Advanced Packaging Allocation for NVIDIA by 30%',
    source: 'Bloomberg Technology',
    date: '4 days ago',
    summary: 'Foundry sources confirm TSMC has dedicated additional CoWoS-L packaging capacity specifically for multi-chip NVLink wafer interconnects.',
    confidence: 89,
  },
  {
    id: 'ev-4',
    sourceType: 'competitor',
    title: 'SEC EDGAR 8-K: Hyperscaler Custom ASIC Capex Allocation Reaches 25%',
    source: 'SEC EDGAR Filings',
    date: '5 days ago',
    summary: 'Cloud service provider disclosures indicate 25% of 2027 inference capex is shifting toward internal custom silicon rather than commercial GPUs.',
    confidence: 93,
    metrics: [
      { label: 'Capex Reallocation', value: '25%' },
      { label: 'Time Horizon', value: '2027-2028' },
    ],
  },
  {
    id: 'ev-5',
    sourceType: 'web',
    title: 'GitHub API: cuBLAS-FP4 Repository Commit Velocity Surges 180%',
    source: 'GitHub Developer API',
    date: 'Yesterday',
    summary: 'Open-source repository commit logs reveal intense optimization activity on CUDA low-level sub-byte matrix multiplication bindings.',
    confidence: 88,
  },
];

export const mockSignals: SignalItem[] = [
  {
    id: 'sig-1',
    title: 'AI Infrastructure Acceleration via Native FP4 Hardware Defaults',
    classification: 'opportunity',
    impact: 'HIGH IMPACT',
    confidence: 94,
    momentum: 42,
    summary: 'Correlated evidence across USPTO patent filings, arXiv preprints, and open-source GitHub commit velocity reveals NVIDIA is shifting native default LLM inference execution to sub-byte FP4 precision.',
    whyItMatters: 'Extends NVIDIA GPU price-to-performance moat significantly, doubling datacenter inference density without forcing architectural customer rewrites.',
    sourcesCount: 5,
    evidence: mockEvidence.slice(0, 3),
    detectedStreams: ['patent', 'research', 'web', 'news'],
    recommendedActions: [
      {
        action: 'Benchmark internal LLM workloads on FP4 sub-byte quantization simulators',
        priority: 'HIGH',
        reason: 'Early adoption can reduce token inference costs by up to 50%',
      },
      {
        action: 'Evaluate NVLink interconnect lock-in risks for custom server clusters',
        priority: 'MEDIUM',
        reason: 'Prevents vendor lock-in as proprietary packaging ramps up',
      },
    ],
    detectedAt: '12 hours ago',
  },
  {
    id: 'sig-2',
    title: 'Hyperscaler Custom ASIC Inference Substitution Threat',
    classification: 'threat',
    impact: 'MEDIUM-HIGH',
    confidence: 88,
    momentum: 18,
    summary: 'SEC disclosures and competitor filings confirm major cloud providers are directing 25% of future inference capex to proprietary internal custom ASICs.',
    whyItMatters: 'Could erode commercial GPU margin premiums in routine inferencing over a 24-month horizon as cloud giants build internal silicon capabilities.',
    sourcesCount: 4,
    evidence: [mockEvidence[3]],
    detectedStreams: ['competitor', 'news'],
    recommendedActions: [
      {
        action: 'Monitor cloud provider SEC Form 10-Q silicon R&D expense lines quarterly',
        priority: 'HIGH',
        reason: 'Provides early signal on custom chip production volume timelines',
      },
    ],
    detectedAt: '1 day ago',
  },
];

export const mockInvestigation: InvestigationItem = {
  id: 'inv-001',
  title: 'NVIDIA × Generative AI Competitive & Technical Intelligence',
  organization: 'NVIDIA',
  technology: 'Generative AI',
  strategicQuestion: 'Analyze NVIDIA\'s position in Generative AI and identify emerging competitive threats and opportunities.',
  timeRange: 'Last 30 days',
  status: 'RUNNING',
  progress: 72,
  confidence: 94,
  threatScore: 68,
  opportunityScore: 74,
  signalVelocity: 42,
  orchestratorStatus: '● CORRELATING STREAMS',
  orchestratorAction: 'Evaluating cross-source correlation between USPTO patent filings and arXiv preprints.',
  executiveSummary: 'NVIDIA\'s position in Generative AI is strengthening rapidly based on cross-source correlation. However, custom hyperscaler silicon poses a medium-high long-term margin threat.',
  whyThisMatters: 'Native FP4 sub-byte quantization in upcoming GPU architectures creates a 2.4x inference efficiency leap, neutralizing emerging software-only optimization startups.',
  evidenceCount: 14,
  signalsCount: 3,
  sourcesCount: 6,
  activeAgentsCount: 5,
  evidence: mockEvidence,
  signals: mockSignals,
  keyFindings: [
    {
      finding: 'Patent US-2026-019842 confirms native FP4 sub-byte quantization matrix execution in Tensor Cores.',
      impact: 'HIGH',
      confidence: 94,
      evidenceCount: 5,
    },
    {
      finding: 'TSMC CoWoS-L packaging allocation for NVLink racks increased by 30% for 2026 delivery.',
      impact: 'HIGH',
      confidence: 89,
      evidenceCount: 4,
    },
    {
      finding: 'Cloud provider SEC 8-K filings show 25% inference capex reallocation to internal ASICs.',
      impact: 'MEDIUM-HIGH',
      confidence: 92,
      evidenceCount: 3,
    },
  ],
  recommendations: [
    {
      action: 'Benchmark internal LLM workloads on FP4 sub-byte quantization simulators',
      priority: 'HIGH',
      reason: 'Early adoption can reduce token inference costs by up to 50%',
    },
    {
      action: 'Monitor cloud provider SEC Form 10-Q silicon R&D expense lines quarterly',
      priority: 'HIGH',
      reason: 'Provides early signal on custom chip production volume timelines',
    },
    {
      action: 'Evaluate NVLink interconnect lock-in risks for custom server clusters',
      priority: 'MEDIUM',
      reason: 'Prevents vendor lock-in as proprietary packaging ramps up',
    },
  ],
};

export const mockInvestigations: InvestigationItem[] = [mockInvestigation];

export const mockEntities: EntityNode[] = [
  {
    id: 'ent-1',
    name: 'NVIDIA',
    type: 'organization',
    relevance: 100,
    connections: ['ent-2', 'ent-3', 'ent-4', 'ent-5'],
    summary: 'Leader in datacenter GPU computing and parallel software ecosystems.',
    confidence: 98,
  },
  {
    id: 'ent-2',
    name: 'Generative AI',
    type: 'technology',
    relevance: 95,
    connections: ['ent-1', 'ent-3', 'ent-6'],
    summary: 'Core domain focus for datacenter acceleration.',
    confidence: 96,
  },
  {
    id: 'ent-3',
    name: 'FP4 Sub-Byte Quantization',
    type: 'technology',
    relevance: 90,
    connections: ['ent-1', 'ent-2', 'ent-5'],
    summary: 'Sub-byte quantization matrix execution units.',
    confidence: 94,
  },
  {
    id: 'ent-4',
    name: 'TSMC CoWoS Packaging',
    type: 'organization',
    relevance: 85,
    connections: ['ent-1', 'ent-5'],
    summary: 'Advanced 2.5D wafer packaging foundry partner.',
    confidence: 92,
  },
  {
    id: 'ent-5',
    name: 'Patent US-2026-019842',
    type: 'patent',
    relevance: 88,
    connections: ['ent-1', 'ent-3'],
    summary: 'USPTO published application for low-precision INT4/FP4 Tensor Cores.',
    confidence: 94,
  },
  {
    id: 'ent-6',
    name: 'Cerebras Wafer-Scale Engine',
    type: 'organization',
    relevance: 75,
    connections: ['ent-2'],
    summary: 'Competitor developing single-wafer datacenter inference engines.',
    confidence: 90,
  },
];

export const mockGraphLinks: EntityLink[] = [
  { source: 'ent-1', target: 'ent-2', label: 'DEVELOPS', relationship: 'DEVELOPS', confidence: 98, whyConnected: 'NVIDIA builds primary Generative AI hardware.' },
  { source: 'ent-1', target: 'ent-3', label: 'PATENT FILED', relationship: 'DEVELOPS', confidence: 96, whyConnected: 'FP4 quantization hardware embedded in Tensor Cores.' },
  { source: 'ent-1', target: 'ent-4', label: 'PARTNERED WITH', relationship: 'PARTNERED_WITH', confidence: 92, whyConnected: 'Advanced CoWoS packaging allocation reserved.' },
  { source: 'ent-1', target: 'ent-5', label: 'FILED PATENT', relationship: 'FILED_PATENT', confidence: 94, whyConnected: 'Assignee of USPTO patent filing.' },
  { source: 'ent-6', target: 'ent-2', label: 'COMPETES WITH', relationship: 'COMPETES_WITH', confidence: 90, whyConnected: 'Competes for real-time inference capex.' },
];

export const mockWatchlists: WatchlistItem[] = [
  {
    id: 'watch-1',
    title: 'NVIDIA Generative AI Infrastructure Watch',
    organization: 'NVIDIA',
    technology: 'Generative AI',
    status: 'ACTIVE',
    lastChecked: '10 mins ago',
    alertCount: 2,
    currentSignal: 'Native FP4 Hardware Standard Ramping',
    confidence: 94,
    frequency: 'Continuous (24/7)',
    lastMeaningfulChange: '10 mins ago',
    activeAgents: ['Research', 'Patent', 'News', 'Competitor', 'Signal'],
  },
  {
    id: 'watch-2',
    title: 'Hyperscaler Custom ASIC Capex Watch',
    organization: 'AWS / Google / Meta',
    technology: 'Custom Silicon ASICs',
    status: 'ALERTING',
    lastChecked: '1 hour ago',
    alertCount: 5,
    currentSignal: 'SEC 8-K 25% Capex Reallocation Detected',
    confidence: 91,
    frequency: 'Continuous (24/7)',
    lastMeaningfulChange: '1 hour ago',
    activeAgents: ['Research', 'Patent', 'News', 'Competitor', 'Signal'],
  },
];

export const mockAlerts: AlertItem[] = [
  {
    id: 'alt-1',
    title: 'New High-Impact Patent Published by NVIDIA (FP4 Sub-Byte)',
    timeAgo: '2 hours ago',
    impact: 'HIGH IMPACT',
    summary: 'USPTO Application 2026-019842 details 2.4x inference efficiency gain via native FP4 Tensor Cores.',
    read: false,
    category: 'OPPORTUNITY',
    evidenceCount: 5,
    confidence: 94,
    investigationId: 'inv-001',
  },
  {
    id: 'alt-2',
    title: 'Cloud Provider SEC Filing Indicates 25% Inference ASIC Shift',
    timeAgo: '5 hours ago',
    impact: 'HIGH IMPACT',
    summary: 'SEC EDGAR 8-K disclosures indicate long-term commercial GPU margin pressure in routine inferencing.',
    read: false,
    category: 'THREAT',
    evidenceCount: 3,
    confidence: 92,
    investigationId: 'inv-001',
  },
];

export const mockSources: SourceItem[] = [
  {
    id: 'src-1',
    name: 'Crossref Research Provider',
    category: 'RESEARCH',
    status: 'active',
    coverage: 'Academic DOIs & arXiv Preprints',
    lastSync: 'Live',
    availability: 99.4,
  },
  {
    id: 'src-2',
    name: 'USPTO Patent Data Index',
    category: 'PATENTS',
    status: 'active',
    coverage: 'USPTO & WIPO Patent Applications',
    lastSync: 'Live',
    availability: 99.1,
  },
];
