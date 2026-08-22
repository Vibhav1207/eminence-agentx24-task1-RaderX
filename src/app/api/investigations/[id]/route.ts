import { getDb } from "@/lib/mongodb";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const investigation = await db
      .collection("investigations")
      .findOne({ id });

    if (!investigation) {
      return Response.json({ error: "Investigation not found" }, { status: 404 });
    }

    return Response.json({ investigation });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
