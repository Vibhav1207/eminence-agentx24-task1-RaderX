import { apiFetch } from './client';
import {
  InvestigationModel,
  AgentModel,
  EvidenceModel,
  SignalModel,
  EntityModel,
  RelationshipModel,
  RecommendationModel,
  TimelineEventModel,
  WatchlistModel,
  AlertModel,
  SourceModel,
  VerifiedProviderModel,
  MissionModel,
  TaskModel,
  MissionEventModel,
  CorrelationResultModel,
  ExecutiveIntelligence,
  MonitoringRunModel,
  InvestigationMemoryModel,
  AgentStepMemoryModel,
} from '@/lib/types';
import { CreateInvestigationInput, CreateWatchlistInput } from '@/lib/schemas';

export const investigationsApi = {
  getAll: () => apiFetch<InvestigationModel[]>('/api/investigations'),
  getById: (id: string) => apiFetch<InvestigationModel>(`/api/investigations/${id}`),
  create: (data: CreateInvestigationInput) =>
    apiFetch<InvestigationModel>('/api/investigations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<InvestigationModel>) =>
    apiFetch<InvestigationModel>(`/api/investigations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ deleted: boolean; id: string }>(`/api/investigations/${id}`, {
      method: 'DELETE',
    }),
  getEvidence: (id: string) => apiFetch<EvidenceModel[]>(`/api/investigations/${id}/evidence`),
  getSignals: (id: string) => apiFetch<SignalModel[]>(`/api/investigations/${id}/signals`),
  getEntities: (id: string) => apiFetch<EntityModel[]>(`/api/investigations/${id}/entities`),
  getGraph: (id: string) =>
    apiFetch<{ entities: EntityModel[]; relationships: RelationshipModel[] }>(
      `/api/investigations/${id}/graph`
    ),
  getTimeline: (id: string) => apiFetch<TimelineEventModel[]>(`/api/investigations/${id}/timeline`),
  getRecommendations: (id: string) =>
    apiFetch<RecommendationModel[]>(`/api/investigations/${id}/recommendations`),
  getIntelligence: (id: string) =>
    apiFetch<ExecutiveIntelligence>(`/api/investigations/${id}/intelligence`),
  regenerateIntelligence: (id: string) =>
    apiFetch<{ version: number; intelligence: ExecutiveIntelligence }>(
      `/api/investigations/${id}/intelligence`,
      { method: 'POST' }
    ),
  getGaps: (id: string) => apiFetch<any[]>(`/api/investigations/${id}/gaps`),
  getDecisions: (id: string) => apiFetch<any[]>(`/api/investigations/${id}/decisions`),
  getState: (id: string) => apiFetch<any>(`/api/investigations/${id}/state`),

  // Orchestrator API
  startMission: (id: string) =>
    apiFetch<MissionModel>(`/api/investigations/${id}/start`, { method: 'POST' }),
  getMission: (id: string) => apiFetch<MissionModel>(`/api/investigations/${id}/mission`),
  getTasks: (id: string) => apiFetch<TaskModel[]>(`/api/investigations/${id}/tasks`),
  getEvents: (id: string) => apiFetch<MissionEventModel[]>(`/api/investigations/${id}/events`),
  pauseMission: (id: string) =>
    apiFetch<MissionModel>(`/api/investigations/${id}/pause`, { method: 'POST' }),
  resumeMission: (id: string) =>
    apiFetch<MissionModel>(`/api/investigations/${id}/resume`, { method: 'POST' }),
  cancelMission: (id: string) =>
    apiFetch<MissionModel>(`/api/investigations/${id}/cancel`, { method: 'POST' }),
  getMemory: (id: string) =>
    apiFetch<{ memory: InvestigationMemoryModel; agentSteps: AgentStepMemoryModel[]; contextStatus: string }>(
      `/api/investigations/${id}/memory`
    ),
};

export const signalsApi = {
  getCorrelations: (investigationId: string) =>
    apiFetch<CorrelationResultModel>(`/api/investigations/${investigationId}/correlations`),
  getSignals: (investigationId: string) =>
    apiFetch<SignalModel[]>(`/api/investigations/${investigationId}/signals`),
  getById: (id: string) => apiFetch<SignalModel>(`/api/signals/${id}`),
  getEvidence: (id: string) => apiFetch<EvidenceModel[]>(`/api/signals/${id}/evidence`),
  validate: (id: string) => apiFetch<SignalModel>(`/api/signals/${id}/validate`, { method: 'POST' }),
};

export const agentsApi = {
  getAll: () => apiFetch<AgentModel[]>('/api/agents'),
  getById: (id: string) => apiFetch<AgentModel>(`/api/agents/${id}`),
  getActivity: () =>
    apiFetch<Array<{ id: string; time: string; agentName: string; action: string }>>(
      '/api/agents/activity'
    ),
};

export const watchlistsApi = {
  getAll: () => apiFetch<WatchlistModel[]>('/api/watchlists'),
  getById: (id: string) => apiFetch<WatchlistModel>(`/api/watchlists/${id}`),
  create: (data: Partial<WatchlistModel>) =>
    apiFetch<WatchlistModel>('/api/watchlists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<WatchlistModel>) =>
    apiFetch<WatchlistModel>(`/api/watchlists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ deleted: boolean; id: string }>(`/api/watchlists/${id}`, {
      method: 'DELETE',
    }),
  runNow: (id: string) =>
    apiFetch<{ run: MonitoringRunModel }>(`/api/watchlists/${id}/run`, { method: 'POST' }),
  pause: (id: string) =>
    apiFetch<WatchlistModel>(`/api/watchlists/${id}/pause`, { method: 'POST' }),
  resume: (id: string) =>
    apiFetch<WatchlistModel>(`/api/watchlists/${id}/resume`, { method: 'POST' }),
  getRuns: (id: string) => apiFetch<MonitoringRunModel[]>(`/api/watchlists/${id}/runs`),
};

export const alertsApi = {
  getAll: () => apiFetch<AlertModel[]>('/api/alerts'),
  markRead: (id: string) =>
    apiFetch<AlertModel>(`/api/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    }),
  update: (id: string, data: Partial<AlertModel>) =>
    apiFetch<AlertModel>(`/api/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export const sourcesApi = {
  getAll: () => apiFetch<VerifiedProviderModel[]>('/api/sources'),
};

export const graphApi = {
  getGraph: (investigationId?: string) =>
    apiFetch<{ nodes: any[]; edges: any[]; totalNodes: number; totalEdges: number }>(
      `/api/graph${investigationId ? `?investigationId=${investigationId}` : ''}`
    ),
  getNodes: (investigationId?: string) =>
    apiFetch<any[]>(`/api/graph/nodes${investigationId ? `?investigationId=${investigationId}` : ''}`),
  getEdges: (investigationId?: string) =>
    apiFetch<any[]>(`/api/graph/edges${investigationId ? `?investigationId=${investigationId}` : ''}`),
  getInvestigationGraph: (id: string) =>
    apiFetch<{ investigationId: string; nodes: any[]; edges: any[]; totalNodes: number; totalEdges: number }>(
      `/api/graph/investigations/${id}`
    ),
};

export const entitiesApi = {
  getAll: () => apiFetch<any[]>('/api/entities'),
  getById: (id: string) => apiFetch<any>(`/api/entities/${id}`),
};

export const decisionCenterApi = {
  getBrief: (id: string) => apiFetch<any>(`/api/decision-center/${id}`),
  getChanges: (id: string) => apiFetch<any[]>(`/api/decision-center/${id}/changes`),
  getVersions: (id: string) => apiFetch<any[]>(`/api/decision-center/${id}/versions`),
};

export const recommendationsApi = {
  updateStatus: (id: string, status: string, notes?: string) =>
    apiFetch<any>(`/api/recommendations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
  investigateFurther: (id: string) =>
    apiFetch<{ investigation: any }>(`/api/recommendations/${id}/investigate`, { method: 'POST' }),
};

export const searchApi = {
  query: (q: string) => apiFetch<{ query: string; investigations: any[]; entities: any[]; nodes: any[]; total: number }>(`/api/search?q=${encodeURIComponent(q)}`),
};
