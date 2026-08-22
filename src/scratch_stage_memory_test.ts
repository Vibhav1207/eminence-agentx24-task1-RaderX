import fs from 'fs';
import path from 'path';

// Load .env file manually at the very beginning
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && val) {
        process.env[key] = val;
      }
    }
  });
  console.log('[TEST] Loaded environment variables from .env manually.');
}

import { dbRepository } from './lib/db/repository';
import { orchestratorService } from './lib/orchestrator/orchestratorService';
import { defaultContextBuilderService } from './lib/orchestrator/contextBuilderService';

async function runMemorySystemTest() {
  console.log('=== RADARX CONTEXT & MEMORY MANAGEMENT SYSTEM ACCEPTANCE TEST ===\n');

  // Step 1: Create a Parent Investigation
  console.log('[TEST] 1. Creating Parent Investigation...');
  const parentInv = await dbRepository.createInvestigation({
    title: 'Apple Silicon M4 Neural Engine',
    objective: 'Analyze Apple M4 Neural Engine performance, CoreML optimization, and competitive positioning against Qualcomm Snapdragon X Elite.',
    priority: 'HIGH',
    timeHorizon: 'Last 30 days',
    primaryEntities: ['Apple M4', 'Snapdragon X Elite', 'CoreML'],
  });
  console.log(`[TEST] Parent Investigation Created: ${parentInv.id}`);

  // Step 2: Start Mission
  console.log('[TEST] 2. Starting execution mission...');
  const mission = await orchestratorService.startMission(parentInv.id);
  console.log(`[TEST] Mission started: ${mission.id} | Phase: ${mission.currentPhase}`);

  // Step 3: Wait for orchestrator decision loop to finish
  let attempts = 0;
  const maxAttempts = 15;
  console.log('[TEST] Waiting for agents to run and save memory steps...');
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const currentMission = orchestratorService.getMissionState(parentInv.id);
    const tasks = orchestratorService.getMissionTasks(mission.id);
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const memory = await dbRepository.getInvestigationMemory(parentInv.id);

    console.log(`[T+${attempts + 1}s] Status: ${currentMission?.status} | Phase: ${currentMission?.currentPhase} | Tasks: ${completedTasks.length}/${tasks.length} | Memory Steps: ${memory?.agentSteps?.length ?? 0}`);

    if (currentMission?.status === 'COMPLETED' || currentMission?.status === 'FAILED') {
      break;
    }
    attempts++;
  }

  // Step 4: Verify Memory Persistence
  console.log('\n[TEST] 3. Verifying persisted memory summary in MongoDB...');
  const parentMemory = await dbRepository.getInvestigationMemory(parentInv.id);
  if (!parentMemory) {
    throw new Error('❌ Test Failed: No investigation memory found in repository.');
  }

  console.log('--- persisted_memory_summary ---');
  console.log(`Investigation ID: ${parentMemory.investigationId}`);
  console.log(`Version: ${parentMemory.version}`);
  console.log(`Context Status: ${parentMemory.contextStatus}`);
  console.log(`Total Agent Steps: ${parentMemory.totalAgentSteps}`);
  console.log(`Completed Agents: ${parentMemory.completedAgents.join(', ')}`);
  console.log(`Key Entities: ${parentMemory.keyEntities.join(', ')}`);
  console.log(`Key Findings Count: ${parentMemory.keyFindings.length}`);
  console.log(`Open Questions Count: ${parentMemory.openQuestions.length}`);
  console.log(`Important Evidence Count: ${parentMemory.importantEvidenceIds.length}`);

  // Check agent steps timeline
  console.log('\n[TEST] 4. Verifying AgentStep timeline data...');
  const steps = await dbRepository.getAgentStepsByInvestigationId(parentInv.id);
  if (steps.length === 0) {
    throw new Error('❌ Test Failed: No AgentStepMemory records found.');
  }
  steps.forEach((step, idx) => {
    console.log(` Step ${idx + 1}: [${step.agentType}] ${step.agentName}`);
    console.log(`   Tool: ${step.toolUsed} | Confidence: ${step.confidence}%`);
    console.log(`   Action: "${step.action.substring(0, 70)}..."`);
    console.log(`   Result: "${step.result.substring(0, 70)}..."`);
    console.log(`   Findings: ${step.importantFindings.slice(0, 2).join('; ')}`);
  });

  // Step 5: Follow-up Investigation Continuity
  console.log('\n[TEST] 5. Testing follow-up investigation continuity...');
  const followupInv = await dbRepository.createInvestigation({
    title: 'Apple M4 core scaling',
    objective: 'Investigate M4 Neural Engine core scaling and performance delta under thermal throttling.',
    priority: 'HIGH',
    timeHorizon: 'Last 30 days',
    primaryEntities: ['Apple M4', 'Thermal Throttling'],
  });
  console.log(`[TEST] Follow-up Investigation Created: ${followupInv.id}`);

  // Link follow-up to parent
  await dbRepository.linkFollowupInvestigation(followupInv.id, parentInv.id);
  console.log(`[TEST] Linked follow-up ${followupInv.id} to parent ${parentInv.id}`);

  // Verify memory linkage
  const followupMemory = await dbRepository.getInvestigationMemory(followupInv.id);
  console.log(`[TEST] Follow-up Parent ID in Memory: ${followupMemory?.parentInvestigationId}`);

  // Build context for the first agent (RESEARCH) of the follow-up mission
  const followupMission = {
    id: 'mission-followup-test',
    investigationId: followupInv.id,
    objective: followupInv.objective,
    status: 'RUNNING' as const,
    currentPhase: 'DISCOVERY' as const,
    progress: 10,
    maxIterations: 4,
    iterationCount: 1,
    priority: 'HIGH' as const,
    createdAt: new Date().toISOString(),
    createdBy: 'Test Engine',
  };

  const dummyTask = {
    id: 'task-res-followup',
    missionId: followupMission.id,
    investigationId: followupInv.id,
    agentType: 'RESEARCH' as const,
    title: 'RESEARCH: Follow-up discovery',
    description: 'Discover follow-up papers',
    status: 'RUNNING' as const,
    priority: 'HIGH' as const,
    dependencies: [],
    input: {},
    evidenceIds: [],
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 1,
  };

  const agentContext = await defaultContextBuilderService.buildAgentContext(
    followupInv,
    followupMission,
    dummyTask,
    'RESEARCH'
  );

  console.log('\n[TEST] 6. Verifying parent context inheritance...');
  const parentContextInjected = agentContext.investigation.strategicQuestion;
  console.log(`Strategic Question Injected Context:`);
  console.log(parentContextInjected);

  if (parentContextInjected.includes('PARENT INVESTIGATION CONTEXT')) {
    console.log('\n✔ SUCCESS: Parent context successfully inherited in follow-up agent context!');
  } else {
    console.log('\n❌ FAILURE: Parent context inheritance failed.');
    throw new Error('Parent context not found in follow-up context strategicQuestion.');
  }

  console.log('\n=== ALL MEMORY SYSTEM TESTS PASSED SUCCESSFULLY ===');
  process.exit(0);
}

runMemorySystemTest().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
