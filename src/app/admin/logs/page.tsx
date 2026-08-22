export const dynamic = 'force-dynamic';

import { getDb } from "@/lib/mongodb";
import LogsClient from "./LogsClient";
import type { Investigation } from "@/lib/schemas";

async function getRecentInvestigations(): Promise<Investigation[]> {
  try {
    const db = await getDb();
    const investigations = await db
      .collection("investigations")
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
      
    return investigations as unknown as Investigation[];
  } catch (err) {
    console.error("Failed to fetch recent investigations for admin:", err);
    return [];
  }
}

export default async function AdminLogsPage() {
  const recentInvestigations = await getRecentInvestigations();

  return (
    <div className="flex flex-col h-screen bg-[#f8f9ff]">
      <header className="bg-white border-b border-[#c6c6cd] flex flex-col justify-center px-8 h-20 shrink-0 z-50 sticky top-0">
        <div className="flex items-center justify-between w-full max-w-[1440px] mx-auto">
          <div>
            <h1 className="font-bold text-[20px] text-black tracking-tight flex items-center gap-2">
              <span className="bg-black text-white px-2 py-0.5 rounded text-xs font-mono uppercase mr-2 tracking-widest">Admin</span>
              Agent Execution Logs
            </h1>
            <p className="text-[13px] text-[#45464d] mt-1">Live visibility into autonomous investigation activity.</p>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <LogsClient recentInvestigations={recentInvestigations} />
      </main>
    </div>
  );
}
