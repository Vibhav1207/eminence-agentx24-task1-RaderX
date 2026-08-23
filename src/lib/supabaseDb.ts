import { Pool } from 'pg';

type Document = { id?: string; _id?: string };
type RawDocument = Record<string, unknown> & Partial<Document>;
type Query = Record<string, unknown>;

let pool: Pool | undefined;
let schemaPromise: Promise<void> | undefined;

function getPool() {
  if (!pool) {
    const connectionString = process.env.SUPABASE_DATABASE_URL;
    if (!connectionString) throw new Error('SUPABASE_DATABASE_URL is not configured');
    pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = getPool().query(`
      create table if not exists public.radarx_documents (
        collection_name text not null,
        document_id text not null,
        document jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (collection_name, document_id)
      );
      create index if not exists radarx_documents_collection_idx
        on public.radarx_documents (collection_name);
      create index if not exists radarx_documents_document_gin_idx
        on public.radarx_documents using gin (document);
    `).then(() => undefined).catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  return schemaPromise;
}

function valueAt(document: Document, key: string): unknown {
  return key.split('.').reduce<unknown>((value, part) => {
    if (value && typeof value === 'object') return (value as Record<string, unknown>)[part];
    return undefined;
  }, document);
}

function matches(document: Document, query: Query): boolean {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or' && Array.isArray(expected)) return expected.some((part) => matches(document, part as Query));
    const actual = valueAt(document, key);
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      const operators = expected as Record<string, unknown>;
      if ('$in' in operators && Array.isArray(operators.$in) && !operators.$in.includes(actual)) return false;
      if ('$lt' in operators && !(new Date(String(actual)).getTime() < new Date(String(operators.$lt)).getTime())) return false;
      if ('$ne' in operators && actual === operators.$ne) return false;
      if ('$exists' in operators && (actual !== undefined) !== Boolean(operators.$exists)) return false;
      if ('$regex' in operators && !(new RegExp(String(operators.$regex))).test(String(actual ?? ''))) return false;
      return true;
    }
    return actual === expected;
  });
}

function documentId(document: Document, collectionName: string): string {
  const raw = document as Document & Record<string, unknown>;
  return String(
    raw.id ??
    raw._id ??
    raw.traceId ??
    raw.eventId ??
    raw.diagnosisId ??
    raw.comparisonId ??
    raw.checkpointId ??
    `${collectionName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
}

class SqlCursor<T> {
  constructor(private readonly loader: () => Promise<T[]>, private readonly sortSpec?: Query, private readonly max?: number) {}
  sort(spec: Query) { return new SqlCursor(this.loader, spec, this.max); }
  limit(max: number) { return new SqlCursor(this.loader, this.sortSpec, max); }
  async toArray() {
    let documents = await this.loader();
    const sortSpec = this.sortSpec;
    if (sortSpec) {
      documents = [...documents].sort((left, right) => {
        for (const [key, direction] of Object.entries(sortSpec)) {
          const a = String(valueAt(left as Document, key) ?? '');
          const b = String(valueAt(right as Document, key) ?? '');
          if (a === b) continue;
          return (a > b ? 1 : -1) * Number(direction);
        }
        return 0;
      });
    }
    return this.max === undefined ? documents : documents.slice(0, this.max);
  }
}

export class SupabaseCollection<T = Document> {
  constructor(private readonly name: string) {}

  find(query: Query = {}) {
    return new SqlCursor<T>(async () => {
      await ensureSchema();
      const result = await getPool().query<{ document: T }>(
        'select document from public.radarx_documents where collection_name = $1', [this.name]
      );
      return result.rows.map((row) => row.document).filter((document) => matches(document as Document, query)) as T[];
    });
  }

  async findOne(query: Query = {}) { return (await this.find(query).limit(1).toArray())[0] || null; }

  async insertOne(document: T) {
    await ensureSchema();
    const raw = document as T & RawDocument;
    const id = documentId(raw, this.name);
    const stored = { ...raw, _id: raw._id ?? id };
    await getPool().query(
      `insert into public.radarx_documents (collection_name, document_id, document)
       values ($1, $2, $3::jsonb)
       on conflict (collection_name, document_id) do update set document = excluded.document, updated_at = now()`,
      [this.name, id, JSON.stringify(stored)]
    );
    return { acknowledged: true, insertedId: id };
  }

  async insertMany(documents: T[] | unknown[]) {
    for (const document of documents) await this.insertOne(document as T);
    return { acknowledged: true, insertedCount: documents.length };
  }

  async updateOne(filter: Query, update: Query, options?: { upsert?: boolean }) {
    const existing = await this.findOne(filter);
    if (!existing && !options?.upsert) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    const equalityFields = Object.fromEntries(Object.entries(filter).filter(([, value]) => !(value && typeof value === 'object')));
    const next = { ...(existing || equalityFields) } as RawDocument;
    const set = (update.$set || {}) as Record<string, unknown>;
    Object.assign(next, set);
    const unset = (update.$unset || {}) as Record<string, unknown>;
    for (const key of Object.keys(unset)) delete next[key];
    const inc = (update.$inc || {}) as Record<string, number>;
    for (const [key, amount] of Object.entries(inc)) next[key] = Number(next[key] || 0) + amount;
    const push = (update.$push || {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(push)) {
      const values = Array.isArray(next[key]) ? [...next[key] as unknown[]] : [];
      values.push(value);
      next[key] = values;
    }
    const addToSet = (update.$addToSet || {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(addToSet)) {
      const values = Array.isArray(next[key]) ? [...next[key] as unknown[]] : [];
      if (!values.some((item) => JSON.stringify(item) === JSON.stringify(value))) values.push(value);
      next[key] = values;
    }
    await this.insertOne(next as T);
    return { acknowledged: true, matchedCount: existing ? 1 : 0, modifiedCount: 1, upsertedCount: existing ? 0 : 1 };
  }

  async deleteOne(filter: Query) {
    await ensureSchema();
    const existing = await this.findOne(filter);
    if (!existing) return { acknowledged: true, deletedCount: 0 };
    const raw = existing as T & RawDocument;
    const id = documentId(raw, this.name);
    const result = await getPool().query('delete from public.radarx_documents where collection_name = $1 and document_id = $2', [this.name, id]);
    return { acknowledged: true, deletedCount: result.rowCount ?? 0 };
  }

  async deleteMany(filter: Query) {
    const documents = await this.find(filter).toArray();
    await ensureSchema();
    const ids = documents.map((document) => documentId(document as T & RawDocument, this.name));
    if (ids.length > 0) {
      await getPool().query(
        'delete from public.radarx_documents where collection_name = $1 and document_id = any($2::text[])',
        [this.name, ids]
      );
    }
    return { acknowledged: true, deletedCount: documents.length };
  }

  async countDocuments(query: Query = {}) { return (await this.find(query).toArray()).length; }
  async createIndex(..._args: unknown[]) { return 'supabase-jsonb-index'; }
}

export async function getSupabaseDb() {
  await ensureSchema();
  return {
    collection: <T = Document>(name: string) => new SupabaseCollection<T>(name),
    command: async (command: Query) => { if (command.ping) await getPool().query('select 1'); return { ok: 1 }; },
  };
}

export async function closeSupabaseDb() {
  const currentPool = pool;
  pool = undefined;
  schemaPromise = undefined;
  if (currentPool) await currentPool.end();
}
