import { defaultCrossrefProvider } from '../src/lib/providers/crossrefProvider';
import { defaultPatentProvider } from '../src/lib/providers/patentProvider';
import { defaultNewsProvider } from '../src/lib/providers/newsProvider';
import { defaultWebProvider } from '../src/lib/providers/webProvider';
import { defaultEvidenceNormalizer } from '../src/lib/normalization/evidenceNormalizer';
import { defaultSynthesisEngine } from '../src/lib/intelligence/synthesisEngine';
import { auditAndPurgeSyntheticEvidence } from '../src/lib/db/purgeSyntheticEvidence';

async function runTest() {
  console.log('=== STEP 1: DATABASE AUDIT & SYNTHETIC DATA PURGE ===');
  const purgedCount = await auditAndPurgeSyntheticEvidence();
  console.log(`Purged synthetic records: ${purgedCount}\n`);

  console.log('=== STEP 2: EXECUTING REAL DATA PROVIDER SEARCHES ===');
  const query = "Compare Riot Games and Valve's competitive positions in PC gaming and identify which company has stronger opportunities for future growth.";
  const primaryEntity = "Riot Games";
  const competitorEntity = "Valve";

  console.log(`Searching Crossref Provider for: "${query}"...`);
  const crossrefResults = await defaultCrossrefProvider.search(query, { limit: 3 });
  console.log(`Crossref returned ${crossrefResults.length} raw results.`);

  console.log(`Searching Patent Provider for: "${primaryEntity}"...`);
  const patentResults = await defaultPatentProvider.search(primaryEntity, { limit: 2, entity: primaryEntity });
  console.log(`Patent Provider returned ${patentResults.length} raw results.`);

  console.log(`Searching News Provider for: "${primaryEntity}"...`);
  const newsResults = await defaultNewsProvider.search(primaryEntity, { limit: 3, entity: primaryEntity });
  console.log(`News Provider returned ${newsResults.length} raw results.`);

  console.log(`Searching Web Provider for: "${primaryEntity} vs ${competitorEntity}"...`);
  const webResults = await defaultWebProvider.search(`${primaryEntity} vs ${competitorEntity}`, { limit: 3 });
  console.log(`Web Provider returned ${webResults.length} raw results.\n`);

  console.log('=== STEP 3: EVIDENCE NORMALIZATION & STRICT VERIFICATION GATING ===');
  const rawResults = [...crossrefResults, ...patentResults, ...newsResults, ...webResults];
  const normalizedItems = rawResults.map(res => defaultEvidenceNormalizer.normalizeSourceResult(res, 'test-inv-riot-valve', 'test-agent').evidence);
  
  const verifiedEvidence = defaultEvidenceNormalizer.verifyAndDeduplicate(normalizedItems);
  
  console.log(`Total Normalized Items: ${normalizedItems.length}`);
  console.log(`Total Verified Evidence Items: ${verifiedEvidence.length}`);
  console.log(`Rejected / Unverified Items: ${normalizedItems.length - verifiedEvidence.length}\n`);

  console.log('=== STEP 4: VERIFIED EVIDENCE AUDIT ===');
  let allValid = true;
  verifiedEvidence.forEach((ev, idx) => {
    console.log(`\n[Item ${idx + 1}]`);
    console.log(`  Title: ${ev.title}`);
    console.log(`  Source: ${ev.source}`);
    console.log(`  SourceType: ${ev.sourceType}`);
    console.log(`  URL: ${ev.url}`);
    console.log(`  External ID / DOI: ${ev.externalId || ev.doi?.[0] || 'N/A'}`);
    console.log(`  Publication Date: ${ev.publishedAt}`);
    console.log(`  Verification Status: ${ev.verificationStatus}`);
    console.log(`  Verification Reason: ${ev.verificationReason}`);

    // Inspect synthetic checks
    if (/Patent Priority Disclosure:|USPTO Granted Patent:|Financial Times: .* Expands Custom AI Chip|TechCrunch: Strategic Shift|Reuters: SEC Filing/i.test(ev.title)) {
      console.error(`  CRITICAL FAIL: Item ${idx + 1} contains synthetic pattern!`);
      allValid = false;
    }
    if (!ev.url || !ev.url.startsWith('http')) {
      console.error(`  CRITICAL FAIL: Item ${idx + 1} has invalid or missing URL!`);
      allValid = false;
    }
  });

  if (allValid && verifiedEvidence.length > 0) {
    console.log('\n✅ ALL VERIFIED EVIDENCE ITEMS PASSED PROVENANCE & REAL-DATA INTEGRITY CHECKS!');
  } else if (verifiedEvidence.length === 0) {
    console.log('\nℹ️ ZERO VERIFIED EVIDENCE ITEMS RETURNED (GATED CLEANLY - NO FABRICATED DATA GENERATED).');
  }

  console.log('\n=== STEP 5: SYNTHESIZING REPORT & VERIFYING METRICS ===');
  const mockInv: any = {
    id: 'test-inv-riot-valve',
    title: query,
    objective: query,
    primaryEntities: [primaryEntity, competitorEntity],
    technology: 'PC Gaming & Esports',
  };

  const synthesis = await defaultSynthesisEngine.synthesizeIntelligence(mockInv, [], normalizedItems, [], []);
  console.log('Executive Summary:');
  console.log(synthesis.executiveSummary);
  console.log('\nMetrics:');
  console.log(`  Verified Evidence Count: ${synthesis.verifiedEvidenceCount}`);
  console.log(`  Unverified Evidence Count: ${synthesis.unverifiedEvidenceCount}`);
  console.log(`  Source Breakdown: ${JSON.stringify(synthesis.sourceBreakdown)}`);
  console.log(`  Citation Coverage: ${synthesis.citationCoverage}%`);
  console.log(`  Confidence: ${synthesis.confidence}%`);
  if (synthesis.insufficientEvidenceNotice) {
    console.log(`  Insufficient Evidence Notice: "${synthesis.insufficientEvidenceNotice}"`);
  }
}

runTest().catch(console.error);
