'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Bot, Activity, Zap, CheckCircle2 } from 'lucide-react';
import { AgentCard } from '@/components/ui/Cards';
import { ActivityFeed } from '@/components/ui/Feeds';
import { agentsApi, investigationsApi } from '@/lib/api';
import { AgentModel, TaskModel } from '@/lib/types';

export default function AgentNetworkPage() {
  const [agents, setAgents] = useState<AgentModel[]>([]);
  const [activities, setActivities] = useState<Array<{ id: string; time: string; agentName: string; action: string }>>([]);
  const [missionTasks, setMissionTasks] = useState<TaskModel[]>([]);
  const [agentCounts, setAgentCounts] = useState<{
    total: number;
    configured: number;
    active: number;
    running: number;
    idle: number;
    completed: number;
    failed: number;
    offline: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgentData() {
      try {
        setLoading(true);
        const [ags, acts, counts] = await Promise.all([
          agentsApi.getAll(),
          agentsApi.getActivity(),
          agentsApi.getCounts(),
        ]);
        setAgents(ags);
        setActivities(acts);
        setAgentCounts(counts);

        const invs = await investigationsApi.getAll();
        if (invs.length > 0) {
          const tList = await investigationsApi.getTasks(invs[0].id);
          setMissionTasks(tList);
        }
      } catch (e) {
        console.warn('Failed to load agent page data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadAgentData();
  }, []);

  const activeAgentsCount = agentCounts?.active ?? agents.filter(
    (a) => (a.status as string) !== 'IDLE' && (a.status as string) !== 'idle'
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="container-responsive p-responsive space-y-responsive"
    >
      {/* Header */}
      <div className="border-b border-[#E5E7EB] pb-responsive-sm space-y-responsive-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="badge-responsive bg-[#D4AF37]/15 text-[#8C6D13] border border-[#D4AF37]/35 shadow-2xs uppercase tracking-widest">
              SPECIALIZED MULTI-AGENT NETWORK
            </span>
          </div>
          <div className="flex items-center gap-2 text-responsive-xs font-mono font-semibold text-[#047857] bg-[#059669]/10 px-3 py-1 rounded-xl border border-[#059669]/25 shadow-2xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping" />
            {loading ? (
              <span className="hidden sm:inline">LOADING AGENTS...</span>
            ) : (
              <>
                <span className="hidden sm:inline">{activeAgentsCount} ACTIVE / {agentCounts?.configured ?? agents.length} CONFIGURED</span>
                <span className="sm:hidden">{activeAgentsCount} ACTIVE</span>
              </>
            )}
          </div>
        </div>

        <h1 className="text-responsive-2xl font-extrabold tracking-tight text-[#111827] font-sans">
          SPECIALIZED AGENTS & ORCHESTRATION
        </h1>
        <p className="text-responsive-sm text-[#6B7280] font-sans">
          Monitor real-time task assignment, agent execution, confidence levels, and active mission workloads.
        </p>
      </div>

      {/* Agent Counts Summary */}
      {!loading && agentCounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="glass-level-2 p-3 rounded-xl text-center">
            <div className="text-2xl font-extrabold font-mono text-[#111827]">{agentCounts.configured}</div>
            <div className="text-[10px] font-mono text-[#6B7280] uppercase">CONFIGURED</div>
          </div>
          <div className="glass-level-2 p-3 rounded-xl text-center">
            <div className="text-2xl font-extrabold font-mono text-[#059669]">{agentCounts.active}</div>
            <div className="text-[10px] font-mono text-[#6B7280] uppercase">ACTIVE</div>
          </div>
          <div className="glass-level-2 p-3 rounded-xl text-center">
            <div className="text-2xl font-extrabold font-mono text-[#D4AF37]">{agentCounts.running}</div>
            <div className="text-[10px] font-mono text-[#6B7280] uppercase">RUNNING</div>
          </div>
          <div className="glass-level-2 p-3 rounded-xl text-center">
            <div className="text-2xl font-extrabold font-mono text-[#991B1B]">{agentCounts.failed}</div>
            <div className="text-[10px] font-mono text-[#6B7280] uppercase">FAILED</div>
          </div>
        </div>
      )}

      {/* Grid of Agents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-responsive">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="animate-pulse glass-level-2 p-4 rounded-2xl border border-[#E5E7EB] space-y-3">
              <div className="h-4 bg-[#E5E7EB] rounded w-3/4" />
              <div className="h-3 bg-[#E5E7EB] rounded w-1/2" />
              <div className="h-3 bg-[#E5E7EB] rounded w-5/6" />
            </div>
          ))
        ) : agents.length > 0 ? (
          agents.map((agent) => {
            const taskForAgent = missionTasks.find(
              (t) => String(t.agentType).toLowerCase() === String(agent.type).toLowerCase()
            );
            const customStatus = taskForAgent ? taskForAgent.status : agent.status;
            const customTask = taskForAgent ? taskForAgent.title : agent.currentTask;

            return (
              <AgentCard
                key={agent.id}
                agent={{
                  ...agent,
                  status: customStatus as any,
                  currentTask: customTask,
                }}
              />
            );
          })
        ) : (
          <div className="col-span-full glass-level-2 p-8 text-center text-[#6B7280]">
            No agents configured. Initialize agent registry to begin.
          </div>
        )}
      </div>

      {/* Live Activity Stream */}
      <div className="glass-level-2 p-responsive space-y-responsive">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-responsive-sm flex-wrap gap-2">
          <h2 className="text-responsive-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C9A227]" />
            REAL-TIME AGENT ACTIVITY FEED
          </h2>
          <span className="text-responsive-xs font-mono text-[#6B7280]">OPERATIONAL STREAM</span>
        </div>

        <ActivityFeed activities={activities} />
      </div>
    </motion.div>
  );
}
