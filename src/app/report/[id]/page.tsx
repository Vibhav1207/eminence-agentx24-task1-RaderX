export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import ReportClient from "./ReportClient";
import type { Investigation } from "@/lib/schemas";

import { getDb } from "@/lib/mongodb";

async function getInvestigation(id: string): Promise<Investigation | null> {
  try {
    const db = await getDb();
    const investigation = await db.collection("investigations").findOne({ id });
    if (!investigation) return null;
    
    // Convert ObjectId to string if necessary, but we can just return it as any
    // since the schema only cares about the fields it defines.
    return investigation as unknown as Investigation;
  } catch {
    return null;
  }
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const investigation = await getInvestigation(id);

  if (!investigation) {
    notFound();
  }

  return <ReportClient investigation={investigation} />;
}
