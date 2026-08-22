export const dynamic = 'force-dynamic';

import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";
import { getDb } from "@/lib/mongodb";
import { WatchConfig } from "@/lib/schemas";
import Link from "next/link";

async function getWatches(): Promise<WatchConfig[]> {
  try {
    const db = await getDb();
    const watches = await db.collection("watches").find({}).sort({ createdAt: -1 }).toArray();
    return watches.map(w => {
      const { _id, ...rest } = w;
      return rest as unknown as WatchConfig;
    });
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default async function MonitoringPage() {
  const watches = await getWatches();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8f9ff]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto custom-scroll p-8">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[28px] font-semibold text-black mb-1">Active Monitoring</h1>
                <p className="text-[14px] text-[#45464d]">
                  Autonomous agents continuously scanning the web, patents, and research for your saved watches.
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#dce9ff] text-[#006c4a] rounded border border-[#c6c6cd]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c4a] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c4a]" />
                </span>
                <span className="text-[12px] font-mono font-semibold">Live Scanning Active</span>
              </div>
            </div>

            {watches.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {watches.map((w) => (
                  <div key={w.id} className="bg-white border border-[#c6c6cd] rounded-lg p-6 relative overflow-hidden">
                    {/* Live scanning sweep effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#82f5c1]/20 to-transparent -translate-x-full animate-pulse" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold bg-[#e5eeff] text-black px-2 py-0.5 rounded border border-[#c6c6cd]">
                            {w.status.toUpperCase()}
                          </span>
                          <span className="text-[12px] text-[#45464d]">Interval: {w.frequency}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px] text-[#006c4a]">
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Searching...
                        </div>
                      </div>

                      <h3 className="text-[18px] font-semibold text-black mb-1">{w.organization}</h3>
                      <p className="text-[14px] text-[#45464d] mb-4">{w.technology}</p>

                      <div className="space-y-3 bg-[#f8f9ff] p-4 rounded border border-[#c6c6cd]">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-[#76777d]">Targeting:</span>
                          <span className="text-black font-medium text-right line-clamp-1 w-2/3">
                            {w.competitors.join(", ")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-[#76777d]">Querying:</span>
                          <span className="text-black font-medium text-right line-clamp-1 w-2/3">
                            {w.strategicQuestion}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[12px] pt-3 border-t border-[#c6c6cd]">
                          <span className="text-[#76777d]">Last Scan:</span>
                          <span className="text-black font-medium">
                            {w.lastScan ? formatDate(w.lastScan) : "Waiting for next cron cycle"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#c6c6cd] rounded-lg p-10 text-center">
                <div className="w-16 h-16 bg-[#f8f9ff] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#c6c6cd]">
                  <svg className="w-8 h-8 text-[#76777d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                  </svg>
                </div>
                <h3 className="text-[18px] font-semibold text-black mb-2">No Active Monitoring</h3>
                <p className="text-[14px] text-[#45464d] mb-6">
                  You haven't saved any watches yet. Start an investigation and click "Save as Watch" to monitor it continuously.
                </p>
                <Link
                  href="/investigate"
                  className="bg-black text-white text-[13px] font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Start Investigation
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
