import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const investigations = await db
      .collection("investigations")
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return Response.json({ investigations });
  } catch {
    // MongoDB not configured — return empty list
    return Response.json({ investigations: [] });
  }
}
