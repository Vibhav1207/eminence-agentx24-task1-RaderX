import TopNav from "@/components/TopNav";
import Link from "next/link";
import { Investigation } from "@/lib/schemas";

import { WatchConfig } from "@/lib/schemas";

async function getWatches(): Promise<WatchConfig[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/watches`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.watches ?? [];
  } catch {
    return [];
  }
}

async function WatchesSection() {
  const watches = await getWatches();
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[20px] font-semibold text-black">Active Watches</h2>
      </div>
      {watches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {watches.map((w) => (
            <div key={w.id} className="bg-white border border-[#c6c6cd] rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold bg-[#dce9ff] text-black px-2 py-0.5 rounded">
                  {w.status.toUpperCase()}
                </span>
                <span className="text-[12px] text-[#45464d]">{w.frequency}</span>
              </div>
              <h3 className="text-[15px] font-semibold text-black mb-1">{w.organization}</h3>
              <p className="text-[13px] text-[#45464d] line-clamp-2">{w.technology}</p>
              <div className="mt-3 pt-3 border-t border-[#c6c6cd] text-[12px] text-[#45464d]">
                Last Scan: {w.lastScan ? formatDate(w.lastScan) : "Never"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 text-center text-[13px] text-[#45464d]">
          No active watches. Save an investigation to monitor it continuously.
        </div>
      )}
    </div>
  );
}

async function getInvestigations(): Promise<Investigation[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/investigations`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.investigations ?? [];
  } catch {
    return [];
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-[#f1f5f9] text-[#45464d]" },
  running: { label: "In Progress", color: "bg-[#dce9ff] text-black" },
  completed: { label: "Completed", color: "bg-[#e5eeff] text-[#006c4a]" },
  failed: { label: "Failed", color: "bg-[#ffdad6] text-[#ba1a1a]" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? STATUS_LABELS.pending;
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${s.color}`}>
      {s.label}
    </span>
  );
}

export default async function DashboardPage() {
  const investigations = await getInvestigations();

  const completed = investigations.filter((i) => i.status === "completed");
  const running = investigations.filter((i) => i.status === "running");

  const threatCount = completed.reduce(
    (acc, inv) => acc + (inv.report?.threats?.length ?? 0),
    0
  );
  const opportunityCount = completed.reduce(
    (acc, inv) => acc + (inv.report?.opportunities?.length ?? 0),
    0
  );
  const signalCount = completed.reduce(
    (acc, inv) => acc + (inv.report?.signals?.length ?? 0),
    0
  );

  const recentInvestigations = investigations.slice(0, 6);

  // Latest high-impact signal across all completed
  const criticalSignal = completed
    .flatMap((inv) => (inv.report?.signals ?? []).map((s) => ({ ...s, investigation: inv })))
    .find((s) => s.impact === "high");

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav showSearch />

      <div className="flex flex-1 max-w-[1440px] mx-auto w-full">
        {/* Main content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-[32px] font-semibold tracking-tight text-black leading-10 mb-2">
              Intelligence Dashboard
            </h1>
            <p className="text-[16px] text-[#45464d] leading-6">
              {running.length > 0
                ? `${running.length} investigation${running.length > 1 ? "s" : ""} currently running.`
                : investigations.length > 0
                ? `Tracking ${investigations.length} investigation${investigations.length > 1 ? "s" : ""}. Start a new one to discover insights.`
                : "Welcome back. Start a new investigation to discover competitive intelligence."}
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Strategic Threats */}
            <div className="bg-white border border-[#c6c6cd] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-[#45464d] uppercase tracking-wider">
                  Strategic Threats
                </span>
                <svg className="w-5 h-5 text-[#ba1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[32px] font-semibold text-black leading-none">{threatCount}</span>
                {threatCount > 0 && (
                  <span className="text-[12px] font-medium text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded mb-1">
                    from {completed.length} reports
                  </span>
                )}
              </div>
            </div>

            {/* Market Opportunities */}
            <div className="bg-white border border-[#c6c6cd] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-[#45464d] uppercase tracking-wider">
                  Market Opportunities
                </span>
                <svg className="w-5 h-5 text-[#006c4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[32px] font-semibold text-black leading-none">{opportunityCount}</span>
                {opportunityCount > 0 && (
                  <span className="text-[12px] font-medium text-[#006c4a] bg-[#82f5c1] px-2 py-0.5 rounded mb-1">
                    identified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Critical Discovery */}
          <div className="mb-8">
            <h2 className="text-[20px] font-semibold text-black mb-4">Critical Discovery</h2>
            {criticalSignal ? (
              <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 relative overflow-hidden hover:shadow-[0_4px_6px_-1px_rgb(0,0,0,0.05)] transition-shadow">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ba1a1a]" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded bg-[#ffdad6] flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-[#ba1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-semibold bg-[#dce9ff] text-black px-2 py-0.5 rounded uppercase tracking-wide">
                        High Impact
                      </span>
                      <span className="text-[13px] text-[#45464d]">
                        From: {criticalSignal.investigation.organization}
                      </span>
                    </div>
                    <h3 className="text-[20px] font-semibold text-black mb-2 leading-7">
                      {criticalSignal.title}
                    </h3>
                    <p className="text-[14px] text-[#45464d] leading-5">
                      {criticalSignal.summary}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#c6c6cd] rounded-lg p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[#eff4ff] flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#45464d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197A7.5 7.5 0 1 0 5.197 15.803L21 21z" />
                  </svg>
                </div>
                <p className="text-[14px] text-[#45464d] mb-3">No discoveries yet.</p>
                <Link href="/investigate" className="text-[13px] font-medium text-black underline underline-offset-2">
                  Start your first investigation
                </Link>
              </div>
            )}
          </div>

          {/* Recent Investigations */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-semibold text-black">Recent Investigations</h2>
              {investigations.length > 0 && (
                <Link href="/investigations" className="text-[13px] font-medium text-[#45464d] hover:text-black transition-colors">
                  View All
                </Link>
              )}
            </div>

            {recentInvestigations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentInvestigations.map((inv) => (
                  <Link
                    key={inv.id}
                    href={inv.status === "completed" ? `/report/${inv.id}` : `/investigate?id=${inv.id}`}
                    className="bg-white border border-[#c6c6cd] rounded-lg p-5 hover:shadow-[0_4px_6px_-1px_rgb(0,0,0,0.05)] transition-shadow block"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge status={inv.status} />
                      <span className="text-[12px] text-[#45464d]">{formatDate(inv.createdAt)}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-black mb-1 leading-5">
                      {inv.organization}
                    </h3>
                    <p className="text-[13px] text-[#45464d] mb-4 line-clamp-2 leading-4">
                      {inv.technology}
                    </p>
                    <div className="flex items-center gap-1 text-[12px] text-[#45464d]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.348 14.651a3.75 3.75 0 0 1 0-5.303m5.304 0a3.75 3.75 0 0 1 0 5.303m-7.425 2.122a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Z" />
                      </svg>
                      {inv.report?.signals?.length ?? 0} Signals
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#c6c6cd] rounded-lg p-8 text-center">
                <p className="text-[14px] text-[#45464d] mb-4">No investigations yet.</p>
                <Link
                  href="/investigate"
                  className="bg-black text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 transition-opacity inline-block"
                >
                  New Investigation
                </Link>
              </div>
            )}
          </div>

          {/* Active Watches */}
          <WatchesSection />
        </main>

        {/* Strategic Signals sidebar */}
        <aside className="hidden xl:flex flex-col w-80 border-l border-[#c6c6cd] bg-white shrink-0">
          <div className="flex items-center justify-between p-5 border-b border-[#c6c6cd]">
            <h2 className="text-[16px] font-semibold text-black">Strategic Signals</h2>
            <button className="text-[#45464d] hover:text-black transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll">
            {signalCount > 0 ? (
              <div className="divide-y divide-[#c6c6cd]">
                {completed
                  .flatMap((inv) =>
                    (inv.report?.signals ?? []).map((s) => ({ ...s, investigation: inv }))
                  )
                  .slice(0, 10)
                  .map((signal, idx) => (
                    <div key={idx} className="p-4 hover:bg-[#f8f9ff] transition-colors">
                      <div className="flex items-start gap-3">
                        {signal.classification === "threat" ? (
                          <svg className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-[#006c4a] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a11.954 11.954 0 0 1-3 .344 11.954 11.954 0 0 1-3-.344m6 0a12 12 0 0 0-3-11.628 12 12 0 0 0-3 11.628" />
                          </svg>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-black leading-5 mb-1.5">
                            {signal.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#45464d] flex-wrap">
                            <span
                              className={`font-semibold px-1.5 py-0.5 rounded ${
                                signal.classification === "threat"
                                  ? "bg-[#ffdad6] text-[#ba1a1a]"
                                  : "bg-[#82f5c1] text-[#006c4a]"
                              }`}
                            >
                              {signal.classification.charAt(0).toUpperCase() + signal.classification.slice(1)}
                            </span>
                            <span>Impact: {signal.impact.charAt(0).toUpperCase() + signal.impact.slice(1)}</span>
                            <span className="text-[#76777d]">|</span>
                            <span>Conf: {signal.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-[13px] text-[#45464d]">
                  No signals yet. Complete an investigation to see strategic signals here.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-[#c6c6cd] p-4">
            <button className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-[#45464d] hover:text-black transition-colors py-1">
              Load More Signals
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
