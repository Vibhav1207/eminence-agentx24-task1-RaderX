export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Investigation } from "@/lib/schemas";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";

import { getDb } from "@/lib/mongodb";

async function getInvestigations(): Promise<Investigation[]> {
  try {
    const db = await getDb();
    const investigations = await db
      .collection("investigations")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    // We must map it because _id is an ObjectId which cannot be passed to Client Components safely
    return investigations.map((inv) => {
      const { _id, ...rest } = inv;
      return rest as unknown as Investigation;
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

export default async function ReportsPage() {
  const investigations = await getInvestigations();
  const completed = investigations.filter((i) => i.status === "completed");

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto bg-[#f8f9ff] p-8 custom-scroll">
          <div className="max-w-[1200px] mx-auto">
            <h1 className="text-[28px] font-semibold text-black mb-6">All Analyzed Reports</h1>
            
            {completed.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {completed.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/report/${inv.id}`}
                    className="bg-white border border-[#c6c6cd] rounded-lg p-5 hover:shadow-[0_4px_6px_-1px_rgb(0,0,0,0.05)] transition-shadow block"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#82f5c1] text-[#006c4a] border border-[#006c4a]">
                        COMPLETED
                      </span>
                      <span className="text-[12px] text-[#45464d]">{formatDate(inv.createdAt)}</span>
                    </div>
                    <h3 className="text-[16px] font-semibold text-black mb-1 leading-5">
                      {inv.organization}
                    </h3>
                    <p className="text-[13px] text-[#45464d] mb-4 line-clamp-2 leading-4">
                      {inv.technology}
                    </p>
                    <div className="mt-4 pt-3 border-t border-[#c6c6cd] flex items-center justify-between text-[12px] text-[#45464d]">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-[#ba1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        {inv.report?.threats?.length || inv.report?.signals?.filter(s => s.classification === 'threat').length || 0} Threats
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-[#006c4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a11.954 11.954 0 0 1-3 .344 11.954 11.954 0 0 1-3-.344" />
                        </svg>
                        {inv.report?.opportunities?.length || inv.report?.signals?.filter(s => s.classification === 'opportunity').length || 0} Opportunities
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#c6c6cd] rounded-lg p-10 text-center">
                <p className="text-[15px] text-[#45464d] mb-4">No analyzed reports found.</p>
                <Link
                  href="/investigate"
                  className="bg-black text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 transition-opacity inline-block"
                >
                  Start New Investigation
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
