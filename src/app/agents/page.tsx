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

  useEffect(() => {
    async function loadAgentData() {
      try {
        const ags = await agentsApi.getAll();
        setAgents(ags);

        const acts = await agentsApi.getActivity();
        setActivities(acts);

        const invs = await investigationsApi.getAll();
        if (invs.length > 0) {
          const tList = await investigationsApi.getTasks(invs[0].id);
          setMissionTasks(tList);
        }
      } catch (e) {
        console.warn('Failed to load agent page data:', e);
      }
    }
    loadAgentData();
  }, []);

  const activeAgentsCount = agents.filter(
    (a) => (a.status as string) !== 'IDLE' && (a.status as string) !== 'idle'
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8"
    >
      {/* Header */}
      <div className="border-b border-[#E5E7EB] pb-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8C6D13] bg-[#D4AF37]/15 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35 shadow-2xs">
              SPECIALIZED MULTI-AGENT NETWORK
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#047857] bg-[#059669]/10 px-3 py-1 rounded-xl border border-[#059669]/25 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping" />
            <span>{activeAgentsCount || agents.length} AGENTS CURRENTLY ONLINE</span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111827] font-sans">
          SPECIALIZED AGENTS & ORCHESTRATION
        </h1>
        <p className="text-xs md:text-sm text-[#6B7280] font-sans">
          Monitor real-time task assignment, agent execution, confidence levels, and active mission workloads.
        </p>
      </div>

      {/* Grid of Agents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
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
        })}
      </div>

      {/* Live Activity Stream */}
      <div className="glass-level-2 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C9A227]" />
            REAL-TIME AGENT ACTIVITY FEED
          </h2>
          <span className="text-[10px] font-mono text-[#6B7280]">OPERATIONAL STREAM</span>
        </div>

        <ActivityFeed
          activities={
            activities.length > 0
              ? activities
              : [
                  {
                    id: 'act-1',
                    time: 'Just now',
                    agentName: 'RADARX ORCHESTRATOR',
                    action: 'Orchestrated task dependency execution.',
                  },
                ]
          }
        />
      </div>
    </motion.div>
  );
}
