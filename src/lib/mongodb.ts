import { MongoClient, Db } from "mongodb";

// Server-only imports
let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;

if (typeof window === 'undefined') {
  fs = require('fs');
  path = require('path');
}

let client: MongoClient;
let db: Db;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

const MOCK_DB_FILE = typeof window === 'undefined' ? path!.resolve(process.cwd(), 'src/lib/db/mock_db.json') : '';

function readMockDb(): Record<string, any[]> {
  try {
    if (typeof window === 'undefined' && fs!.existsSync(MOCK_DB_FILE)) {
      const content = fs!.readFileSync(MOCK_DB_FILE, 'utf-8');
      return JSON.parse(content);
    } else {
      if (process.env.DEBUG_MOCK_DB === 'true') {
        console.log(`[MOCK_DB] File does not exist at: ${MOCK_DB_FILE}`);
      }
    }
  } catch (err: any) {
    console.error(`[MOCK_DB] Read error at "${MOCK_DB_FILE}":`, err.message || err);
  }
  return {};
}

function writeMockDb(data: Record<string, any[]>) {
  try {
    if (typeof window === 'undefined') {
      fs!.mkdirSync(path!.dirname(MOCK_DB_FILE), { recursive: true });
      fs!.writeFileSync(MOCK_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      if (process.env.DEBUG_MOCK_DB === 'true') {
        console.log(`[MOCK_DB] Successfully wrote mock DB to: ${MOCK_DB_FILE}`);
      }
    }
  } catch (err: any) {
    console.error(`[MOCK_DB] Write error at "${MOCK_DB_FILE}":`, err.message || err);
  }
}

class MockCollection {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  find(query: any = {}) {
    const toArray = async () => {
      const dbData = readMockDb();
      let items = dbData[this.collectionName] || [];
      
      if (process.env.DEBUG_MOCK_DB === 'true' || query.id) {
        console.log(`[MOCK_DB] Collection "${this.collectionName}" read. Items count: ${items.length}, query:`, JSON.stringify(query));
      }

      if (query && typeof query === 'object') {
        items = items.filter((item: any) => {
          for (const key in query) {
            const val = query[key];
            if (val !== undefined) {
              if (typeof val === 'object' && val !== null) {
                if (val.$lt !== undefined) {
                  if (item[key] >= val.$lt) return false;
                }
                continue;
              }
              if (item[key] !== val) return false;
            }
          }
          return true;
        });
      }
      
      if (process.env.DEBUG_MOCK_DB === 'true' || query.id) {
        console.log(`[MOCK_DB] Collection "${this.collectionName}" filter results: ${items.length}`);
      }
      return items;
    };

    const cursor = {
      toArray,
      sort: (sortObj: any) => {
        const originalToArray = toArray;
        const sortedToArray = async () => {
          const items = await originalToArray();
          if (sortObj.timestamp === -1) {
            items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          }
          return items;
        };
        return { toArray: sortedToArray };
      }
    };

    return cursor as any;
  }

  async findOne(query: any = {}) {
    const items = await this.find(query).toArray();
    return items[0] || null;
  }

  async insertOne(doc: any) {
    const dbData = readMockDb();
    if (!dbData[this.collectionName]) dbData[this.collectionName] = [];
    const newDoc = { _id: doc.id || doc._id || `id-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, ...doc };
    dbData[this.collectionName].push(newDoc);
    writeMockDb(dbData);
    return { acknowledged: true, insertedId: newDoc._id };
  }

  async updateOne(filter: any, update: any) {
    const dbData = readMockDb();
    const items = dbData[this.collectionName] || [];
    const item = items.find((i: any) => {
      for (const key in filter) {
        if (i[key] !== filter[key]) return false;
      }
      return true;
    });
    if (item && update.$set) {
      Object.assign(item, update.$set);
      writeMockDb(dbData);
    }
    return { acknowledged: true };
  }

  async deleteOne(filter: any) {
    const dbData = readMockDb();
    let items = dbData[this.collectionName] || [];
    const idx = items.findIndex((i: any) => {
      for (const key in filter) {
        if (i[key] !== filter[key]) return false;
      }
      return true;
    });
    if (idx >= 0) {
      items.splice(idx, 1);
      dbData[this.collectionName] = items;
      writeMockDb(dbData);
    }
    return { acknowledged: true };
  }

  async deleteMany(filter: any) {
    const dbData = readMockDb();
    let items = dbData[this.collectionName] || [];
    if (filter._id && filter._id.$in) {
      const ids = filter._id.$in;
      items = items.filter((i: any) => !ids.includes(i._id));
      dbData[this.collectionName] = items;
      writeMockDb(dbData);
    }
    return { acknowledged: true };
  }

  async countDocuments(query: any = {}) {
    const items = await this.find(query).toArray();
    return items.length;
  }
}

export async function getDb(): Promise<Db> {
  const useMock = process.env.NODE_ENV === 'test' || 
                  process.env.USE_MOCK_DB === 'true' || 
                  process.argv.includes('--worker') ||
                  process.argv.includes('--resume-worker');

  if (useMock) {
    return {
      collection: (name: string) => new MockCollection(name) as any
    } as any;
  }

  if (db) return db;

  const currentUri = process.env.MONGODB_URI || "";
  const currentDbName = process.env.MONGODB_DB || "task1web";

  if (!currentUri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(currentUri, { serverSelectionTimeoutMS: 5000 });
      await global._mongoClient.connect();
    }
    client = global._mongoClient;
  } else {
    client = new MongoClient(currentUri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
  }

  db = client.db(currentDbName);
  return db;
}
