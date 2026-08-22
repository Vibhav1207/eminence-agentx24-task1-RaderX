"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Investigation, StrategicSignal, Evidence } from "@/lib/schemas";

interface ReportClientProps {
  investigation: Investigation;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function EvidenceCard({ ev }: { ev: Evidence }) {
  const iconMap: Record<string, React.ReactNode> = {
    research: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
      </svg>
    ),
    patent: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    news: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
      </svg>
    ),
    competitor: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    web: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  };

  return (
    <div className="border border-[#c6c6cd] rounded p-3 bg-white flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-black">
        <span className="text-[#45464d]">{iconMap[ev.evidenceType] ?? iconMap.web}</span>
        <span className="capitalize">{ev.evidenceType}</span>
      </div>
      <p className="text-[13px] text-[#0b1c30] leading-4 flex-1">{ev.title}</p>
      {ev.url ? (
        <a
          href={ev.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono text-[#45464d] hover:text-black truncate block"
        >
          {ev.url}
        </a>
      ) : ev.entity ? (
        <span className="text-[11px] font-mono text-[#45464d]">{ev.entity}</span>
      ) : null}
    </div>
  );
}

function SignalSection({ signal, index }: { signal: StrategicSignal; index: number }) {
  const isThreat = signal.classification === "threat";
  const isOpportunity = signal.classification === "opportunity";

  return (
    <div className="bg-white border border-[#c6c6cd] rounded overflow-hidden">
      <div className="border-b border-[#c6c6cd] p-4 bg-[#f8f9ff] flex justify-between items-start">
        <div>
          <h3 className="text-[18px] font-semibold text-black mb-2 leading-6">{signal.title}</h3>
          <div className="flex gap-2 flex-wrap">
            <span
              className={`text-[12px] font-medium px-2 py-0.5 rounded ${
                isThreat
                  ? "bg-[#fee2e2] text-[#991b1b]"
                  : isOpportunity
                  ? "bg-[#fef3c7] text-[#92400e]"
                  : "bg-[#f1f5f9] text-[#45464d]"
              }`}
            >
              {signal.classification.charAt(0).toUpperCase() + signal.classification.slice(1)}
            </span>
            <span className="text-[12px] font-medium bg-[#dce9ff] text-[#45464d] px-2 py-0.5 rounded">
              {signal.impact.charAt(0).toUpperCase() + signal.impact.slice(1)} Impact
            </span>
            <span className="text-[12px] font-medium bg-[#dce9ff] text-[#45464d] px-2 py-0.5 rounded">
              {signal.confidence}% Confidence
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[14px] text-[#45464d] leading-5 mb-4">
          <span className="font-semibold text-black">Explanation:</span> {signal.summary}
        </p>
        {signal.evidence.length > 0 && (
          <>
            <h4 className="text-[11px] font-semibold text-[#45464d] uppercase tracking-wider mb-3">
              Supporting Evidence
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {signal.evidence.slice(0, 3).map((ev, i) => (
                <EvidenceCard key={i} ev={ev} />
              ))}
            </div>
          </>
        )}
        {signal.whyItMatters && (
          <div className="mt-4 pt-4 border-t border-[#c6c6cd]">
            <h4 className="text-[12px] font-semibold text-[#45464d] uppercase tracking-wider mb-2">
              Why It Matters
            </h4>
            <p className="text-[14px] text-[#45464d] leading-5">{signal.whyItMatters}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const SIDE_NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: "📄" },
  { id: "signals", label: "Strategic Signals", icon: "📡" },
  { id: "evidence", label: "Evidence", icon: "📚" },
  { id: "impact", label: "Impact Analysis", icon: "📊" },
  { id: "recommendations", label: "Recommendations", icon: "✓" },
];

export default function ReportClient({ investigation }: ReportClientProps) {
  const pathname = usePathname();
  const report = investigation.report;

  if (!report) {
    return (
      <div className="flex flex-col h-screen">
        <header className="bg-white border-b border-[#c6c6cd] flex items-center px-8 h-16 sticky top-0 z-50">
          <div className="flex items-center gap-6 w-full max-w-[1440px] mx-auto">
            <Link href="/" className="font-bold text-[18px] text-black tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              RaderX
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[16px] text-[#45464d] mb-4">
              Investigation is still running or has no report yet.
            </p>
            <Link
              href={`/investigate?id=${investigation.id}`}
              className="bg-black text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 transition-opacity"
            >
              Back to Investigation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allSignals = [
    ...(report.signals ?? []),
    ...(report.threats ?? []),
    ...(report.opportunities ?? []),
  ].filter(
    (s, i, arr) => arr.findIndex((x) => x.title === s.title) === i
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9ff]">
      {/* Top Nav */}
      <header className="bg-white border-b border-[#c6c6cd] flex items-center w-full h-16 px-8 shrink-0 z-50 sticky top-0">
        <div className="flex items-center gap-6 w-full max-w-[1440px] mx-auto">
          <Link href="/" className="font-bold text-[18px] text-black tracking-tight shrink-0 flex items-center gap-2">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            RaderX Intelligence
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-4">
            {[
              { href: "/", label: "Dashboard" },
              { href: "/reports", label: "Reports", active: true },
              { href: "/signals", label: "Signals" },
              { href: "/sources", label: "Sources" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium pb-1 transition-colors ${
                  item.active || pathname.startsWith(item.href) && item.href !== "/"
                    ? "text-black border-b-2 border-black"
                    : "text-[#45464d] hover:text-black"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden lg:flex items-center bg-[#eff4ff] border border-[#c6c6cd] rounded px-3 py-1.5">
              <svg className="w-4 h-4 text-[#76777d] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197A7.5 7.5 0 1 0 5.197 15.803L21 21z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none focus:outline-none text-sm text-black w-40 placeholder:text-[#76777d]"
              />
            </div>
            <button className="bg-black text-white px-4 py-2 rounded text-[12px] font-medium hover:opacity-90 transition-opacity">
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1440px] mx-auto w-full relative">
        {/* Side nav */}
        <aside className="hidden md:flex flex-col w-64 bg-[#eff4ff] border-r border-[#c6c6cd] fixed left-0 top-16 h-[calc(100vh-64px)] py-4 z-40">
          <div className="px-6 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#dce9ff] border border-[#c6c6cd] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
              </svg>
            </div>
            <div>
              <div className="text-[14px] font-bold text-black">{investigation.organization}</div>
              <div className="text-[11px] font-semibold text-[#45464d]">{investigation.technology}</div>
            </div>
          </div>
          <Link
            href="/investigate"
            className="mx-6 mb-5 bg-black text-white border border-[#c6c6cd] px-4 py-2 rounded text-[12px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Analysis
          </Link>
          <nav className="flex flex-col text-[12px] font-medium">
            {SIDE_NAV_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`px-6 py-3 flex items-center gap-3 text-[#45464d] hover:bg-[#dce9ff] transition-colors ${
                  section.id === "signals" ? "bg-[#131b2e] text-[#7c839b] font-bold" : ""
                }`}
              >
                <span className="text-base">{section.icon.replace("📄", "").replace("📡", "").replace("📚", "").replace("📊", "").replace("✓", "")}</span>
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-64 p-6 md:p-8 overflow-y-auto">
          {/* Header */}
          <div id="overview" className="mb-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
              <div>
                <h1 className="text-[32px] font-semibold tracking-tight text-black leading-10 mb-3">
                  Competitive Threat Analysis: {investigation.organization} in {investigation.technology}
                </h1>
                <div className="flex flex-wrap gap-2 items-center text-[13px] text-[#45464d]">
                  <span className="bg-[#eff4ff] px-2 py-1 border border-[#c6c6cd] rounded flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                    {investigation.organization}
                  </span>
                  <span className="bg-[#eff4ff] px-2 py-1 border border-[#c6c6cd] rounded flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
                    </svg>
                    {investigation.technology}
                  </span>
                  <span className="bg-[#eff4ff] px-2 py-1 border border-[#c6c6cd] rounded flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    {investigation.competitors.join(", ")}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-semibold text-[#45464d] uppercase tracking-wider mb-1">Date</div>
                <div className="text-[14px] font-medium text-black">{formatDate(investigation.createdAt)}</div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="bg-white border border-[#c6c6cd] rounded p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
                <span className="text-[18px] font-semibold text-black">Overall Confidence</span>
              </div>
              <span className="text-[32px] font-semibold text-black leading-none">{report.confidence}%</span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-white border border-[#c6c6cd] rounded p-6 mb-6">
            <h2 className="text-[22px] font-semibold text-black mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
              Executive Summary
            </h2>
            <p className="text-[16px] text-[#45464d] leading-6">{report.executiveSummary}</p>
          </div>

          {/* Signals + Sidebar grid */}
          <div id="signals" className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            {/* Strategic Signals */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <h2 className="text-[22px] font-semibold text-black flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.348 14.651a3.75 3.75 0 0 1 0-5.303m5.304 0a3.75 3.75 0 0 1 0 5.303m-7.425 2.122a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Z" />
                </svg>
                Strategic Signals
              </h2>
              {allSignals.length > 0 ? (
                allSignals.map((signal, i) => (
                  <SignalSection key={i} signal={signal} index={i} />
                ))
              ) : (
                <div className="bg-white border border-[#c6c6cd] rounded p-6 text-center">
                  <p className="text-[14px] text-[#45464d]">No signals in this report.</p>
                </div>
              )}
            </div>

            {/* Context & Actions Column */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Why It Matters */}
              {allSignals[0]?.whyItMatters && (
                <div className="bg-white border border-[#c6c6cd] rounded p-4">
                  <h2 className="text-[18px] font-semibold text-black mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a11.954 11.954 0 0 1-3 .344 11.954 11.954 0 0 1-3-.344m6 0a12 12 0 0 0-3-11.628 12 12 0 0 0-3 11.628" />
                    </svg>
                    Why It Matters
                  </h2>
                  <p className="text-[14px] text-[#45464d] leading-5">{allSignals[0].whyItMatters}</p>
                </div>
              )}

              {/* Recommended Actions */}
              {report.recommendations?.length > 0 && (
                <div id="recommendations" className="bg-white border border-[#c6c6cd] rounded p-4 flex-1">
                  <h2 className="text-[18px] font-semibold text-black mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Recommended Actions
                  </h2>
                  <ul className="flex flex-col gap-3">
                    {report.recommendations.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] leading-5">
                        <span className="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Emerging Trends */}
              {report.emergingTrends?.length > 0 && (
                <div className="bg-white border border-[#c6c6cd] rounded p-4">
                  <h2 className="text-[16px] font-semibold text-black mb-3">Emerging Trends</h2>
                  <ul className="flex flex-col gap-2">
                    {report.emergingTrends.map((trend, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#45464d] leading-4">
                        <span className="w-1 h-1 rounded-full bg-[#45464d] mt-2 shrink-0" />
                        {trend}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Evidence */}
          {report.evidence?.length > 0 && (
            <div id="evidence" className="mb-6">
              <h2 className="text-[22px] font-semibold text-black mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                Evidence
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.evidence.map((ev, i) => (
                  <EvidenceCard key={i} ev={ev} />
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {report.sources?.length > 0 && (
            <div id="sources" className="mb-6">
              <h2 className="text-[18px] font-semibold text-black mb-3">Sources</h2>
              <div className="bg-white border border-[#c6c6cd] rounded p-4">
                <ul className="flex flex-col gap-1">
                  {report.sources.map((src, i) => (
                    <li key={i} className="text-[12px] font-mono text-[#45464d] hover:text-black transition-colors">
                      {src.startsWith("http") ? (
                        <a href={src} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          {src}
                        </a>
                      ) : (
                        src
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#c6c6cd] w-full py-3 px-8 flex justify-between items-center text-[11px] text-[#45464d]">
        <div>© 2024 Task 1 Intelligence Platform. Proprietary &amp; Confidential.</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
