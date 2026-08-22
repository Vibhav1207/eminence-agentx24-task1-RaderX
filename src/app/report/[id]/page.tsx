import { notFound } from "next/navigation";
import ReportClient from "./ReportClient";
import type { Investigation } from "@/lib/schemas";

async function getInvestigation(id: string): Promise<Investigation | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/investigations/${id}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.investigation ?? null;
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
