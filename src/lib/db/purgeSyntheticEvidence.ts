import { getDb } from '../mongodb';

export async function auditAndPurgeSyntheticEvidence() {
  console.log('[Audit] Starting database audit for synthetic and unverified evidence...');
  try {
    const db = await getDb();
    const collection = db.collection('evidence');

    // Find synthetic evidence pattern records
    const syntheticRegex = /Patent Priority Disclosure:|USPTO Granted Patent: Quantized|Financial Times: .* Expands Custom AI Chip|TechCrunch: Strategic Shift in|Reuters: SEC Filing & Executive Roadmap|GitHub Repository Velocity: High-Throughput|Technical Documentation & Architecture Guidelines:/i;

    const result = await collection.deleteMany({
      $or: [
        { title: { $regex: syntheticRegex } },
        { verificationStatus: 'REJECTED' },
        { verificationStatus: { $exists: false }, url: { $exists: false } },
        { url: { $regex: /patents\.google\.com\/\?q=.*patent/i } },
        { url: { $regex: /example-1001|example-8k/i } }
      ]
    });

    console.log(`[Audit] Database audit complete. Deleted ${result.deletedCount} synthetic/unverified evidence records.`);
    return result.deletedCount;
  } catch (err: any) {
    console.error('[Audit] Failed to clean MongoDB evidence collection:', err.message || err);
    return 0;
  }
}
