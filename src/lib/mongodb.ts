import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let db: Db;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

export async function getDb(): Promise<Db> {
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
