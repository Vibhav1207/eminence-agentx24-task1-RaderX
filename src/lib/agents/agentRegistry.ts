/**
 * Agent Registry - Centralized agent management
 * 
 * This is the single source of truth for agent definitions and state.
 * It handles initialization, persistence, and retrieval of agents.
 * 
 * Key principles:
 * - Agents are defined once in the registry
 * - State is persisted to MongoDB
 * - Initialization is idempotent (safe to call multiple times)
 * - Separates global agent definitions from investigation-specific execution state
 */

import { AgentModel, AgentType, AgentStatus } from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

/**
 * Core agent definitions - these are the canonical agent types
 * Each agent has a stable ID, name, role, and capabilities
 */
const AGENT_DEFINITIONS: Omit<AgentModel, 'id' | 'createdAt' | 'updatedAt' | 'lastActive' | 'evidenceProcessed' | 'confidence' | 'currentInvestigationId' | 'currentTask' | 'status'>[] = [
  {
    type: 'ORCHESTRATOR',
    name: 'RadarX Orchestrator',
    role: 'Central Dispatcher & Strategy Planner',
    color: '#D4AF37',
    capabilities: ['PLANNING', 'COORDINATION', 'TASK_DELEGATION', 'CONFLICT_RESOLUTION', 'SELF_EVALUATION'],
    tools: ['langgraph-orchestrator', 'decision-engine', 'conflict-resolver'],
    enabled: true,
  },
  {
    type: 'RESEARCH',
    name: 'Research Agent',
    role: 'Academic & arXiv Literature Search',
    color: '#06B6D4',
    capabilities: ['ACADEMIC_SEARCH', 'PREPRINT_MONITORING', 'CITATION_ANALYSIS', 'TECHNOLOGY_TRACKING'],
    tools: ['crossref-api', 'arxiv-api', 'semantic-scholar'],
    enabled: true,
  },
  {
    type: 'PATENT',
    name: 'Patent Agent',
    role: 'USPTO & Global Patent IP Analysis',
    color: '#D97706',
    capabilities: ['PATENT_SEARCH', 'IP_LANDSCAPING', 'CLAIM_ANALYSIS', 'ASSIGNEE_TRACKING', 'PRIOR_ART'],
    tools: ['uspto-api', 'epo-api', 'google-patents', 'patent-claim-parser'],
    enabled: true,
  },
  {
    type: 'NEWS',
    name: 'News Agent',
    role: 'Financial Media & Press Analysis',
    color: '#3B82F6',
    capabilities: ['FINANCIAL_NEWS', 'PRESS_MONITORING', 'SENTIMENT_ANALYSIS', 'EVENT_EXTRACTION'],
    tools: ['newsapi', 'bloomberg-feed', 'reuters-feed', 'sentiment-analyzer'],
    enabled: true,
  },
  {
    type: 'COMPETITOR',
    name: 'Competitor Agent',
    role: 'SEC Filings & Product Roadmap Tracker',
    color: '#059669',
    capabilities: ['SEC_FILINGS', 'PRODUCT_LAUNCHES', 'SUPPLY_CHAIN', 'EXECUTIVE_CHANGES', 'CAPEX_TRACKING'],
    tools: ['sec-edgar', 'earnings-transcripts', 'supply-chain-db', 'roadmap-tracker'],
    enabled: true,
  },
  {
    type: 'WEB',
    name: 'Web Intelligence Agent',
    role: 'Open Source Intelligence & Technical Monitoring',
    color: '#8B5CF6',
    capabilities: ['GITHUB_MONITORING', 'TECHNICAL_BLOGS', 'DOCUMENTATION', 'COMMUNITY_SIGNALS', 'REPO_ACTIVITY'],
    tools: ['github-api', 'npm-registry', 'pypi-api', 'docker-hub', 'huggingface-api'],
    enabled: true,
  },
];

/**
 * Generate stable agent ID from type
 */
function generateAgentId(type: AgentType): string {
  return `agent-${type.toLowerCase()}`;
}

/**
 * Create a full agent model from definition
 */
function createAgentModel(def: typeof AGENT_DEFINITIONS[0], status: AgentStatus = 'IDLE'): AgentModel {
  const now = new Date().toISOString();
  return {
    id: generateAgentId(def.type),
    name: def.name,
    type: def.type,
    role: def.role,
    status,
    currentTask: 'Awaiting investigation assignment',
    currentInvestigationId: undefined,
    evidenceProcessed: 0,
    confidence: 1.0, // Canonical 0-1 representation
    color: def.color,
    lastActive: now,
    createdAt: now,
    updatedAt: now,
    capabilities: def.capabilities,
    tools: def.tools,
    enabled: def.enabled,
  };
}

/**
 * Agent Registry - Single source of truth for all agent operations
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Initialize the agent registry - idempotent, safe to call multiple times
   * Loads existing agents from MongoDB, creates missing ones
   */
  async initialize(): Promise<void> {
    // Prevent duplicate initialization
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      const db = await (await import('@/lib/mongodb')).getDb();
      // Load existing agents from database
      const existingAgents = await db.collection<AgentModel>('agents').find({}).toArray();
      const existingByType = new Map(existingAgents.map(a => [a.type, a]));

      // Ensure all defined agents exist
      for (const def of AGENT_DEFINITIONS) {
        if (!def.enabled) continue;

        const existing = existingByType.get(def.type);
        if (!existing) {
          // Create new agent in database
          const agent = createAgentModel(def, 'IDLE');
          try {
            await db.collection('agents').insertOne(agent);
          } catch (e) {
            console.warn(`Failed to persist agent ${def.type}:`, e);
          }
        } else if (existing.status !== 'OFFLINE') {
          // Reset status to IDLE for online agents on startup
          if (existing.status !== 'IDLE') {
            await dbRepository.updateAgentStatus(existing.id, 'IDLE');
          }
        }
      }

      // Disable agents that are no longer in definitions
      for (const existing of existingAgents) {
        const def = AGENT_DEFINITIONS.find(d => d.type === existing.type);
        if (!def || !def.enabled) {
          if (existing.status !== 'OFFLINE') {
            await dbRepository.updateAgentStatus(existing.id, 'OFFLINE');
          }
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Agent registry initialization failed:', error);
      // Do not permanently poison the singleton after a transient database
      // outage. A later request should be able to retry after connectivity is
      // restored instead of reusing a rejected initialization promise.
      this.initialized = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Get all agents (from database)
   */
  async getAllAgents(): Promise<AgentModel[]> {
    await this.initialize();
    return dbRepository.getAgents();
  }

  /**
   * Get agents by status
   */
  async getAgentsByStatus(status: AgentStatus): Promise<AgentModel[]> {
    const agents = await this.getAllAgents();
    return agents.filter(a => a.status === status);
  }

  /**
   * Get agent by type
   */
  async getAgentByType(type: AgentType): Promise<AgentModel | undefined> {
    const agents = await this.getAllAgents();
    return agents.find(a => a.type === type);
  }

  /**
   * Get agent by ID
   */
  async getAgentById(id: string): Promise<AgentModel | undefined> {
    return dbRepository.getAgentById(id);
  }

  /**
   * Get count of agents by status category
   */
  async getAgentCounts(): Promise<{
    total: number;
    configured: number;
    active: number;
    running: number;
    idle: number;
    completed: number;
    failed: number;
    offline: number;
  }> {
    const agents = await this.getAllAgents();
    const enabledAgents = agents.filter(a => a.enabled !== false);
    
    return {
      total: agents.length,
      configured: enabledAgents.length,
      active: agents.filter(a => 
        ['PLANNING', 'EXECUTING', 'VERIFYING', 'RUNNING'].includes(a.status)
      ).length,
      running: agents.filter(a => a.status === 'EXECUTING').length,
      idle: agents.filter(a => a.status === 'IDLE').length,
      completed: agents.filter(a => a.status === 'COMPLETE').length,
      failed: agents.filter(a => a.status === 'FAILED').length,
      offline: agents.filter(a => a.status === 'OFFLINE').length,
    };
  }

  /**
   * Update agent status (persists to database)
   */
  async updateAgentStatus(
    agentId: string,
    status: AgentStatus,
    taskDescription?: string,
    investigationId?: string
  ): Promise<AgentModel | undefined> {
    const updates: Partial<AgentModel> = {
      status,
      lastActive: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (taskDescription) updates.currentTask = taskDescription;
    if (investigationId) updates.currentInvestigationId = investigationId;

    return dbRepository.updateAgentStatus(agentId, status, taskDescription);
  }

  /**
   * Reset all agents to IDLE (for new investigation)
   */
  async resetAllAgents(): Promise<void> {
    const agents = await this.getAllAgents();
    for (const agent of agents) {
      if (agent.enabled !== false && agent.status !== 'OFFLINE') {
        await this.updateAgentStatus(agent.id, 'IDLE');
      }
    }
  }

  /**
   * Get agents participating in an investigation
   */
  async getAgentsForInvestigation(investigationId: string): Promise<AgentModel[]> {
    const agents = await this.getAllAgents();
    return agents.filter(a => a.currentInvestigationId === investigationId);
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Singleton instance
 */
export const agentRegistry = AgentRegistry.getInstance();

/**
 * Convenience function to initialize agents
 * Call this on application startup or when creating a new investigation
 */
export async function initializeAgents(): Promise<void> {
  return agentRegistry.initialize();
}

/**
 * Get all agents for API responses
 */
export async function getAllAgents(): Promise<AgentModel[]> {
  return agentRegistry.getAllAgents();
}

/**
 * Get agent counts for UI display
 */
export async function getAgentCounts() {
  return agentRegistry.getAgentCounts();
}
