"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";
import type { Investigation, StrategicSignal } from "@/lib/schemas";

const EXECUTION_STAGES = [
  "Understanding objective",
  "Creating research plan",
  "Searching research",
  "Analyzing patents",
  "Investigating competitors",
  "Searching web/news",
  "Correlating evidence",
  "Verifying signals",
  "Assessing impact",
  "Generating recommendations",
];

const TIME_RANGE_OPTIONS = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_6_months", label: "Last 6 months" },
  { value: "last_year", label: "Last year" },
];

type Stage = "setup" | "running" | "done";

function classifySignal(signal: StrategicSignal) {
  if (signal.classification === "threat") return "threat";
  if (signal.classification === "opportunity") return "opportunity";
  return "neutral";
}

function SignalCard({ signal }: { signal: StrategicSignal }) {
  const isThreat = classifySignal(signal) === "threat";
  return (
    <div className="bg-white border border-[#c6c6cd] rounded-lg p-6 relative overflow-hidden hover:shadow-[0_4px_6px_-1px_rgb(0,0,0,0.05)] transition-shadow">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${isThreat ? "bg-[#ba1a1a]" : "bg-[#006c4a]"}`}
      />
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {isThreat ? (
              <svg className="w-4 h-4 text-[#ba1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-[#006c4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a11.954 11.954 0 0 1-3 .344 11.954 11.954 0 0 1-3-.344" />
              </svg>
            )}
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${isThreat ? "text-[#ba1a1a]" : "text-[#006c4a]"}`}
            >
              Classification: {signal.classification}
            </span>
          </div>
          <h3 className="text-[18px] font-semibold text-black leading-6">{signal.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#45464d]">Confidence</span>
            <span className="text-[12px] font-semibold text-black bg-[#dce9ff] px-2 py-0.5 rounded font-mono">
              {signal.confidence}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#45464d]">Impact</span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                signal.impact === "high"
                  ? "text-[#ba1a1a] bg-[#ffdad6]"
                  : signal.impact === "medium"
                  ? "text-[#92400e] bg-[#fef3c7]"
                  : "text-[#45464d] bg-[#f1f5f9]"
              }`}
            >
              {signal.impact.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[14px] text-[#45464d] leading-5 mb-4">{signal.summary}</p>
      {signal.evidence.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 border-t border-[#c6c6cd] pt-4">
          {signal.evidence.slice(0, 2).map((ev, i) => (
            <div key={i} className="bg-[#f8f9ff] p-3 rounded border border-[#c6c6cd]">
              <div className="flex items-center gap-1.5 mb-1.5 text-[#45464d]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="text-[11px] font-semibold uppercase tracking-wide">{ev.evidenceType}</span>
              </div>
              <p className="text-[13px] text-black line-clamp-2 leading-4">{ev.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvestigateClient() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("setup");
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    organization: "",
    technology: "",
    competitors: "",
    timeRange: "last_30_days",
    strategicQuestion: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start investigation");
        setIsSubmitting(false);
        return;
      }

      setInvestigation(data.investigation);
      setStage("running");

      // Simulate agent execution progress
      let idx = 0;
      const advance = () => {
        if (idx >= EXECUTION_STAGES.length) {
          setStage("done");
          if (data.investigation?.id) {
            setTimeout(() => router.push(`/report/${data.investigation.id}`), 1500);
          }
          return;
        }
        setActiveStageIdx(idx);
        setCompletedStages((prev) => (idx > 0 ? [...prev, idx - 1] : prev));
        idx++;
        setTimeout(advance, 1800 + Math.random() * 800);
      };
      advance();
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  const invId = investigation ? `INV-${investigation.id.slice(0, 4).toUpperCase()}` : "";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-hidden bg-[#f8f9ff]">
          {/* SETUP STATE */}
          {stage === "setup" && (
            <div className="h-full overflow-y-auto custom-scroll">
              <div className="max-w-[800px] mx-auto py-8 px-6">
                <div className="mb-6">
                  <h1 className="text-[32px] font-semibold tracking-tight text-black leading-10 mb-1">
                    New Investigation
                  </h1>
                  <p className="text-[14px] text-[#45464d]">
                    Configure parameters for the strategic analysis agent.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border border-[#c6c6cd] rounded-lg p-6 flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="organization" className="text-[12px] font-medium text-[#45464d]">
                        Organization
                      </label>
                      <input
                        id="organization"
                        name="organization"
                        type="text"
                        value={form.organization}
                        onChange={handleChange}
                        placeholder="e.g., NVIDIA"
                        required
                        className="w-full border border-[#c6c6cd] bg-white text-black text-[14px] rounded h-10 px-3 focus:outline-none focus:border-[#006c4a] transition-colors placeholder:text-[#76777d]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="technology" className="text-[12px] font-medium text-[#45464d]">
                        Technology / Research Area
                      </label>
                      <input
                        id="technology"
                        name="technology"
                        type="text"
                        value={form.technology}
                        onChange={handleChange}
                        placeholder="e.g., AI Inference"
                        required
                        className="w-full border border-[#c6c6cd] bg-white text-black text-[14px] rounded h-10 px-3 focus:outline-none focus:border-[#006c4a] transition-colors placeholder:text-[#76777d]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="competitors" className="text-[12px] font-medium text-[#45464d]">
                      Competitors
                    </label>
                    <input
                      id="competitors"
                      name="competitors"
                      type="text"
                      value={form.competitors}
                      onChange={handleChange}
                      placeholder="Comma separated list, e.g., AMD, Google, Intel"
                      required
                      className="w-full border border-[#c6c6cd] bg-white text-black text-[14px] rounded h-10 px-3 focus:outline-none focus:border-[#006c4a] transition-colors placeholder:text-[#76777d]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="timeRange" className="text-[12px] font-medium text-[#45464d]">
                      Time Period
                    </label>
                    <select
                      id="timeRange"
                      name="timeRange"
                      value={form.timeRange}
                      onChange={handleChange}
                      className="w-full border border-[#c6c6cd] bg-white text-black text-[14px] rounded h-10 px-3 focus:outline-none focus:border-[#006c4a] transition-colors appearance-none"
                    >
                      {TIME_RANGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="strategicQuestion" className="text-[12px] font-medium text-[#45464d]">
                      Strategic Question
                    </label>
                    <textarea
                      id="strategicQuestion"
                      name="strategicQuestion"
                      value={form.strategicQuestion}
                      onChange={handleChange}
                      placeholder="What are we trying to determine?"
                      required
                      rows={4}
                      className="w-full border border-[#c6c6cd] bg-white text-black text-[14px] rounded p-3 focus:outline-none focus:border-[#006c4a] transition-colors resize-none placeholder:text-[#76777d]"
                    />
                  </div>

                  {error && (
                    <p className="text-[13px] text-[#ba1a1a] bg-[#ffdad6] px-3 py-2 rounded">{error}</p>
                  )}

                  <div className="flex justify-end pt-2 border-t border-[#c6c6cd]">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-black text-white text-[12px] font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isSubmitting ? "Starting..." : "Start Investigation"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ACTIVE / DONE STATE */}
          {(stage === "running" || stage === "done") && investigation && (
            <div className="h-full flex flex-col md:flex-row">
              {/* Main workspace */}
              <div className="flex-1 p-8 overflow-y-auto custom-scroll border-r border-[#c6c6cd]">
                {/* Context header */}
                <div className="mb-6 border-b border-[#c6c6cd] pb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-[#dce9ff] rounded text-[12px] font-mono text-[#45464d]">
                      {invId}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]" />
                    <span className="text-[11px] font-semibold text-[#006c4a] tracking-widest uppercase">
                      {stage === "done" ? "Investigation Complete" : "Investigation Active"}
                    </span>
                  </div>
                  <h1 className="text-[22px] font-semibold text-black mb-3 leading-7">
                    {investigation.strategicQuestion}
                  </h1>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-[#f1f5f9] rounded border border-[#c6c6cd] text-[12px] text-[#45464d]">
                      Org: {investigation.organization}
                    </span>
                    <span className="px-2 py-1 bg-[#f1f5f9] rounded border border-[#c6c6cd] text-[12px] text-[#45464d]">
                      Tech: {investigation.technology}
                    </span>
                    <span className="px-2 py-1 bg-[#f1f5f9] rounded border border-[#c6c6cd] text-[12px] text-[#45464d]">
                      Competitors: {investigation.competitors.join(", ")}
                    </span>
                  </div>
                </div>

                {/* Signals */}
                <div className="flex flex-col gap-5">
                  <h2 className="text-[18px] font-semibold text-black">Strategic Signals Detected</h2>

                  {stage === "done" && investigation.report?.signals?.length ? (
                    investigation.report.signals.map((signal, i) => (
                      <SignalCard key={i} signal={signal} />
                    ))
                  ) : (
                    <div className="bg-white border border-[#c6c6cd] rounded-lg p-8 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c4a] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c4a]" />
                        </span>
                        <span className="text-[12px] font-mono text-[#006c4a]">Analyzing...</span>
                      </div>
                      <p className="text-[14px] text-[#45464d]">
                        Signals will appear here as the agent discovers them.
                      </p>
                    </div>
                  )}

                  {stage === "done" && (
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/watches", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                organization: investigation.organization,
                                technology: investigation.technology,
                                competitors: investigation.competitors,
                                timeRange: investigation.timeRange,
                                strategicQuestion: investigation.strategicQuestion,
                                frequency: "weekly"
                              })
                            });
                            if (res.ok) alert("Watch saved successfully! We will scan this weekly.");
                            else alert("Failed to save watch.");
                          } catch {
                            alert("Failed to save watch.");
                          }
                        }}
                        className="bg-white text-black border border-black text-[12px] font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Save as Watch
                      </button>
                      <a
                        href={`/report/${investigation.id}`}
                        className="bg-black text-white text-[12px] font-medium px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        View Full Report →
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Timeline Sidebar */}
              <div className="w-full md:w-80 bg-white flex flex-col border-l border-[#c6c6cd] shrink-0">
                <div className="p-4 border-b border-[#c6c6cd] bg-[#f8f9ff] flex justify-between items-center sticky top-0 z-10">
                  <span className="text-[12px] font-semibold text-black">Execution Timeline</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          stage === "done" ? "bg-[#006c4a]" : "bg-[#006c4a]"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          stage === "done" ? "bg-[#006c4a]" : "bg-[#006c4a]"
                        }`}
                      />
                    </span>
                    <span className="text-[12px] font-mono text-[#006c4a]">
                      {stage === "done" ? "Complete" : "Analyzing"}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto custom-scroll">
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-4 w-px bg-[#c6c6cd]" />
                    <ul className="flex flex-col gap-6 relative z-10">
                      {EXECUTION_STAGES.map((stageName, i) => {
                        const isDone = completedStages.includes(i) || stage === "done";
                        const isActive = !isDone && i === activeStageIdx && stage === "running";
                        const isPending = !isDone && !isActive;

                        return (
                          <li key={i} className={`flex items-start gap-4 ${isPending ? "opacity-50" : ""}`}>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10 relative ${
                                isDone
                                  ? "bg-[#82f5c1] border border-[#006c4a]"
                                  : isActive
                                  ? "bg-white border-2 border-black pulse-active"
                                  : "bg-[#f8f9ff] border border-[#c6c6cd]"
                              }`}
                            >
                              {isDone && (
                                <svg className="w-3 h-3 text-[#006c4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                              {isActive && <div className="w-2 h-2 rounded-full bg-black" />}
                            </div>
                            <div className="flex flex-col">
                              <span
                                className={`text-[12px] font-medium ${
                                  isDone
                                    ? "text-[#45464d] line-through opacity-70"
                                    : isActive
                                    ? "text-black font-semibold"
                                    : "text-[#45464d]"
                                }`}
                              >
                                {stageName}
                              </span>
                              {isActive && (
                                <span className="text-[11px] font-mono text-[#45464d] mt-1 bg-[#dce9ff] px-2 py-0.5 rounded inline-block w-max">
                                  In progress...
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
