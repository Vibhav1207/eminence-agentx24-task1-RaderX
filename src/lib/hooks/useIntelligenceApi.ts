'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  investigationsApi,
  agentsApi,
  watchlistsApi,
  alertsApi,
  sourcesApi,
} from '@/lib/api';
import {
  InvestigationModel,
  AgentModel,
  EvidenceModel,
  SignalModel,
  EntityModel,
  RelationshipModel,
  WatchlistModel,
  AlertModel,
  VerifiedProviderModel,
} from '@/lib/types';

export function useInvestigations() {
  const [data, setData] = useState<InvestigationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestigations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await investigationsApi.getAll();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load investigations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  return { investigations: data, loading, error, refetch: fetchInvestigations };
}

export function useInvestigation(id: string) {
  const [data, setData] = useState<InvestigationModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestigation = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await investigationsApi.getById(id);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvestigation();
  }, [fetchInvestigation]);

  return { investigation: data, loading, error, refetch: fetchInvestigation };
}

export function useInvestigationEvidence(id: string) {
  const [evidence, setEvidence] = useState<EvidenceModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    investigationsApi
      .getEvidence(id)
      .then(setEvidence)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return { evidence, loading };
}

export function useInvestigationSignals(id: string) {
  const [signals, setSignals] = useState<SignalModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    investigationsApi
      .getSignals(id)
      .then(setSignals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return { signals, loading };
}

export function useInvestigationGraph(id: string) {
  const [graph, setGraph] = useState<{ entities: EntityModel[]; relationships: RelationshipModel[] }>({
    entities: [],
    relationships: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    investigationsApi
      .getGraph(id)
      .then(setGraph)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return { graph, loading };
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentsApi
      .getAll()
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { agents, loading };
}

export function useAgentActivity() {
  const [activities, setActivities] = useState<Array<{ id: string; time: string; agentName: string; action: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentsApi
      .getActivity()
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { activities, loading };
}

export function useWatchlists() {
  const [watchlists, setWatchlists] = useState<WatchlistModel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await watchlistsApi.getAll();
      setWatchlists(res);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  return { watchlists, loading, refetch: fetchWatchlists };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertModel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await alertsApi.getAll();
      setAlerts(res);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markRead = async (id: string) => {
    await alertsApi.markRead(id);
    fetchAlerts();
  };

  return { alerts, loading, markRead, refetch: fetchAlerts };
}

export function useSources() {
  const [sources, setSources] = useState<VerifiedProviderModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sourcesApi
      .getAll()
      .then(setSources)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { sources, loading };
}
