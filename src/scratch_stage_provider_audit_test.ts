import { GET as getSourcesRoute } from '@/app/api/sources/route';

async function testProviderAuditAndRealHealth() {
  console.log('==================================================');
  console.log('RADARX — PROVIDER AUDIT & REAL HEALTH TEST');
  console.log('==================================================\n');

  console.log('[1] CALLING REAL BACKEND PROVIDER REGISTRY (/api/sources)...');
  const res = await getSourcesRoute();
  const json = await res.json();
  const providers = json.data || [];

  console.log(`- Total Providers Registered: ${providers.length}`);

  // 1. Audit categories
  const categories = Array.from(new Set(providers.map((p: any) => p.category)));
  console.log(`- Provider Categories Present: ${categories.join(', ')}`);

  // 2. Check Crossref Live Ping
  const crossref = providers.find((p: any) => p.id === 'prov-crossref');
  console.log(`\n[2] CROSSREF INTEGRATION AUDIT:`);
  console.log(`- Name: ${crossref?.name}`);
  console.log(`- Category: ${crossref?.category}`);
  console.log(`- Status: ${crossref?.status}`);
  console.log(`- Measured Latency: ${crossref?.latencyMs} ms`);

  // 3. Check Gemini & MongoDB
  const gemini = providers.find((p: any) => p.id === 'prov-gemini');
  const mongodb = providers.find((p: any) => p.id === 'prov-mongodb');
  console.log(`\n[3] AI MODEL & INFRASTRUCTURE AUDIT:`);
  console.log(`- Gemini AI Model Status: ${gemini?.status} (${gemini?.notes})`);
  console.log(`- MongoDB Infrastructure Status: ${mongodb?.status} (${mongodb?.notes})`);

  // 4. Check Unconfigured Providers
  const unconfigured = providers.filter((p: any) => p.status === 'NOT_CONFIGURED');
  console.log(`\n[4] UNCONFIGURED PROVIDERS AUDIT:`);
  console.log(`- Total Unconfigured Providers: ${unconfigured.length}`);
  unconfigured.forEach((u: any) => {
    console.log(`   • ${u.name}: ${u.status} (${u.notes})`);
  });

  // 5. Zero Fake Stats Check
  const hasFakeAvailability = providers.some((p: any) => p.availability !== undefined || p.reliability !== undefined);
  console.log(`\n[5] FAKE PERCENTAGES AUDIT:`);
  console.log(`- Hardcoded Availability/Reliability Percentages Found: ${hasFakeAvailability ? 'FOUND (FAIL)' : 'NONE (PASS)'}`);

  console.log('\n==================================================');
  if (crossref?.status === 'CONNECTED' && unconfigured.length >= 3 && !hasFakeAvailability) {
    console.log('🎉 PROVIDER AUDIT TEST RESULT: 100% PASS!');
  } else {
    console.log('❌ PROVIDER AUDIT TEST RESULT: FAILED');
  }
  console.log('==================================================');
}

testProviderAuditAndRealHealth().catch(console.error);
