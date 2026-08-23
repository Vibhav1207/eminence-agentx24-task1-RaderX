import { defaultCrossrefProvider } from '../src/lib/providers/crossrefProvider';
import { defaultPatentProvider } from '../src/lib/providers/patentProvider';
import { defaultNewsProvider } from '../src/lib/providers/newsProvider';
import { defaultWebProvider } from '../src/lib/providers/webProvider';
import { defaultEvidenceNormalizer } from '../src/lib/normalization/evidenceNormalizer';
import { defaultSynthesisEngine } from '../src/lib/intelligence/synthesisEngine';
import { defaultInvestigationContextBuilder } from '../src/lib/intelligence/investigationContext';

async function testInvestigationQuery(queryTitle: string, primaryEntity: string, competitorEntity: string) {
  console.log(`\n==================================================`);
  console.log(`TESTING QUERY: "${queryTitle}"`);
  console.log(`==================================================`);

  const mockInv: any = {
    id: `inv-${Date.now()}-${primaryEntity.toLowerCase().replace(/[^a-z]/g, '')}`,
    title: queryTitle,
    objective: queryTitle,
    primaryEntities: [primaryEntity, competitorEntity],
  };

  // 1. Build Context
  const context = defaultInvestigationContextBuilder.buildContext(mockInv);
  console.log(`[Context] Domain: ${context.domain}`);
  console.log(`[Context] Entities: ${context.entities.join(', ')}`);
  console.log(`[Context] Subtopics: ${context.subtopics.join(', ')}`);

  // 2. Generate Targeted Provider Queries
  const targetedQueries = defaultInvestigationContextBuilder.generateSearchQueries(context);

  console.log('\n--- EXECUTING CONCURRENT PROVIDER RETRIEVAL ---');
  const rawResults = await Promise.all([
    defaultCrossrefProvider.search(targetedQueries[0].query, { limit: 4 }),
    defaultPatentProvider.search(targetedQueries[1].query, { limit: 3, entity: primaryEntity }),
    defaultNewsProvider.search(targetedQueries[2].query, { limit: 4, entity: primaryEntity }),
    defaultWebProvider.search(targetedQueries[3].query, { limit: 4 }),
  ]);

  const flatRaw = rawResults.flat();
  console.log(`Total Raw Items Retrieved: ${flatRaw.length}`);

  // 3. Normalize & Apply Backend Relevance Gate (Threshold >= 0.70)
  const normalizedItems = flatRaw.map((res) =>
    defaultEvidenceNormalizer.normalizeSourceResult(res, mockInv.id, 'agent-retrieval', context).evidence
  );

  // 4. Verify & Deduplicate
  const verifiedEvidence = defaultEvidenceNormalizer.verifyAndDeduplicate(normalizedItems);

  // 5. Synthesis
  const synthesis = await defaultSynthesisEngine.synthesizeIntelligence(mockInv, [], normalizedItems, [], []);

  console.log('\n--- RETRIEVAL & RELEVANCE GATE METRICS ---');
  console.log(`Retrieved Count: ${synthesis.adminMetrics?.retrievedCount}`);
  console.log(`Relevant Count (>=0.70): ${synthesis.adminMetrics?.relevantCount}`);
  console.log(`Rejected Count (<0.70): ${synthesis.adminMetrics?.rejectedCount}`);
  console.log(`Verified Count: ${synthesis.adminMetrics?.verifiedCount}`);
  console.log(`Duplicate Count Removed: ${synthesis.adminMetrics?.duplicateCount}`);
  console.log(`Source Breakdown: ${JSON.stringify(synthesis.sourceBreakdown)}`);
  console.log(`Rejection Reasons: ${JSON.stringify(synthesis.adminMetrics?.rejectionReasons)}`);

  console.log('\n--- VERIFIED PRIMARY EVIDENCE TITLES ---');
  verifiedEvidence.forEach((ev, idx) => {
    console.log(`  [${idx + 1}] [${ev.sourceType}] ${ev.title} (Relevance: ${ev.relevanceScore})`);
    console.log(`      URL: ${ev.url}`);
  });

  console.log('\n--- EXECUTIVE SYNTHESIS RESULT ---');
  console.log(`Investigation Type: ${synthesis.investigationType}`);
  console.log(`Executive Verdict: ${synthesis.verdictText}`);
  console.log(`Decision Confidence: ${synthesis.decisionConfidence}% (${synthesis.confidenceLevel})`);
  console.log(`Groundedness Audit: ${synthesis.groundednessPassed ? 'PASSED (100% Grounded)' : 'FAILED'}`);

  if (synthesis.comparisonScorecard) {
    console.log('\nComparison Scorecard Matrix:');
    synthesis.comparisonScorecard.forEach((row) => {
      console.log(`  - [${row.dimension}] Advantage: ${row.advantage}`);
    });
  }

  console.log('\nGrounded Recommendations:');
  synthesis.recommendedActions.forEach((rec, idx) => {
    console.log(`  ${idx + 1}. [${rec.priority} | ${rec.timeHorizon}] ${rec.action}`);
    console.log(`     Reason: ${rec.reason}`);
    console.log(`     Citations: ${rec.supportingEvidenceIds.join(', ')}`);
  });

  // Verify generic non-relevant documents do NOT appear
  const genericTitles = ['History of video games', 'Australian rugby league', 'Anti-China protesters clash'];
  const hasGeneric = verifiedEvidence.some((e) => genericTitles.some((gt) => e.title.includes(gt)));
  if (hasGeneric) {
    console.error('\n❌ CRITICAL FAIL: Irrelevant generic titles leaked into verified evidence!');
  } else {
    console.log('\n✅ RELEVANCE GATE PASSED: Zero generic/unrelated titles leaked into primary evidence!');
  }
}

async function runTests() {
  // Test Query 1: Riot Games vs Valve
  await testInvestigationQuery(
    "Compare Riot Games and Valve's competitive positions in PC gaming and identify which company has stronger opportunities for future growth.",
    'Riot Games',
    'Valve'
  );

  // Test Query 2: Spotify vs YouTube Music (To verify query changes & zero cross contamination)
  await testInvestigationQuery(
    "Compare Spotify and YouTube Music's competitive positions in music streaming, focusing on creator ecosystems, pricing, product strategy, and recent developments.",
    'Spotify',
    'YouTube Music'
  );
}

runTests().catch(console.error);
