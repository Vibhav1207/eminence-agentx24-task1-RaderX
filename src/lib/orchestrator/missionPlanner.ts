import { InvestigationModel, MissionModel, TaskModel } from '@/lib/types';

export class MissionPlanner {
  createMission(investigation: InvestigationModel): MissionModel {
    const now = new Date().toISOString();
    return {
      id: `mission-${Date.now()}`,
      investigationId: investigation.id,
      objective: investigation.objective,
      status: 'PLANNING',
      currentPhase: 'OBJECTIVE_ANALYSIS',
      progress: 5,
      maxIterations: 4,
      iterationCount: 1,
      priority: investigation.priority || 'HIGH',
      createdAt: now,
      startedAt: now,
      createdBy: 'RadarX Orchestrator',
    };
  }

  planInitialTasks(mission: MissionModel, investigation: InvestigationModel): TaskModel[] {
    const now = new Date().toISOString();
    const invId = investigation.id;
    const missionId = mission.id;
    const org = investigation.primaryEntities[0] || 'Target';

    const tResearch: TaskModel = {
      id: `task-res-001`,
      missionId,
      investigationId: invId,
      agentType: 'RESEARCH',
      title: `RESEARCH-001: Academic & Preprint Discovery`,
      description: `Identify recent arXiv research trends and memory optimization kernels related to ${org}.`,
      status: 'QUEUED',
      priority: 'HIGH',
      dependencies: [],
      input: { topic: investigation.objective },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 2,
    };

    const tPatent: TaskModel = {
      id: `task-pat-001`,
      missionId,
      investigationId: invId,
      agentType: 'PATENT',
      title: `PATENT-001: USPTO Tensor IP Analysis`,
      description: `Identify USPTO patent filings and low-precision quantization claims for ${org}.`,
      status: 'QUEUED',
      priority: 'HIGH',
      dependencies: [],
      input: { organization: org },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 2,
    };

    const tNews: TaskModel = {
      id: `task-news-001`,
      missionId,
      investigationId: invId,
      agentType: 'NEWS',
      title: `NEWS-001: Financial Media & Foundry Scan`,
      description: `Identify financial media disclosures and semiconductor foundry capacity agreements.`,
      status: 'QUEUED',
      priority: 'MEDIUM',
      dependencies: [],
      input: { organization: org },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 2,
    };

    const tCompetitor: TaskModel = {
      id: `task-comp-001`,
      missionId,
      investigationId: invId,
      agentType: 'COMPETITOR',
      title: `COMPETITOR-001: SEC Filing & ASIC Shift Analysis`,
      description: `Analyze competitor positioning and SEC Form 8-K cloud capex disclosures.`,
      status: 'QUEUED',
      priority: 'HIGH',
      dependencies: [],
      input: { organization: org },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 2,
    };

    const tWeb: TaskModel = {
      id: `task-web-001`,
      missionId,
      investigationId: invId,
      agentType: 'WEB',
      title: `WEB-001: Open-Source Code Velocity Check`,
      description: `Validate developer commit velocity on open-source CUDA optimization repositories.`,
      status: 'QUEUED',
      priority: 'MEDIUM',
      dependencies: [],
      input: { organization: org },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 2,
    };

    const tSignal: TaskModel = {
      id: `task-sig-001`,
      missionId,
      investigationId: invId,
      agentType: 'SIGNAL',
      title: `SIGNAL-001: Cross-Source Evidence Correlation`,
      description: `Correlate accumulated evidence across research, patent, news, and competitor streams.`,
      status: 'PENDING',
      priority: 'CRITICAL',
      dependencies: [tResearch.id, tPatent.id, tNews.id, tCompetitor.id, tWeb.id],
      input: { mode: 'CORRELATE' },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 1,
    };

    const tSynthesis: TaskModel = {
      id: `task-syn-001`,
      missionId,
      investigationId: invId,
      agentType: 'SYNTHESIS',
      title: `SYNTHESIS-001: Executive Intelligence Assessment`,
      description: `Synthesize unified executive assessment, key findings, and recommendations matrix.`,
      status: 'PENDING',
      priority: 'CRITICAL',
      dependencies: [tSignal.id],
      input: { mode: 'SYNTHESIZE' },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 1,
    };

    return [tResearch, tPatent, tNews, tCompetitor, tWeb, tSignal, tSynthesis];
  }
}

export const defaultMissionPlanner = new MissionPlanner();
