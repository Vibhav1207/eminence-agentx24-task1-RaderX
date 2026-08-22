"use client";

import { useState, useEffect, useRef } from "react";
import type { Investigation } from "@/lib/schemas";
import type { AgentEvent } from "@/lib/agent/events";

interface LogsClientProps {
  recentInvestigations: Investigation[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LogsClient({ recentInvestigations }: LogsClientProps) {
  const [selectedId, setSelectedId] = useState<string>(
    recentInvestigations[0]?.id || ""
  );
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<"IDLE" | "RUNNING" | "COMPLETED" | "FAILED">("IDLE");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedInv = recentInvestigations.find((inv) => inv.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;

    let isPolling = true;
    let pollInterval: NodeJS.Timeout;

    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/investigations/${selectedId}/events`);
        if (!res.ok) return;
        
        const data = await res.json();
        if (data.events && isPolling) {
          setEvents(data.events);
          
          // Determine status based on the latest event
          if (data.events.length === 0) {
            setStatus("IDLE");
          } else {
            const lastEvent = data.events[data.events.length - 1];
            if (lastEvent.eventType === "INVESTIGATION_COMPLETED") {
              setStatus("COMPLETED");
              isPolling = false;
              clearInterval(pollInterval);
            } else if (lastEvent.eventType === "INVESTIGATION_FAILED") {
              setStatus("FAILED");
              isPolling = false;
              clearInterval(pollInterval);
            } else {
              setStatus("RUNNING");
            }
          }
        }
      } catch (err) {
        console.error("Failed to poll events:", err);
      }
    };

    // Initial fetch
    fetchEvents();

    // Poll every 3 seconds
    pollInterval = setInterval(fetchEvents, 3000);

    return () => {
      isPolling = false;
      clearInterval(pollInterval);
    };
  }, [selectedId]);

  useEffect(() => {
    // Auto-scroll to bottom when new events arrive
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const getEventColor = (eventType: string) => {
    if (eventType.includes("STARTED") || eventType === "GOAL_RECEIVED") return "text-blue-600";
    if (eventType.includes("COMPLETED") || eventType === "EVIDENCE_RECEIVED") return "text-green-600";
    if (eventType.includes("FAILED")) return "text-red-600";
    if (eventType === "TOOL_SELECTED" || eventType === "NEXT_ACTION_SELECTED") return "text-purple-600";
    return "text-gray-600";
  };

  return (
    <div className="flex h-full max-w-[1440px] mx-auto w-full">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-[#c6c6cd] flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-[#c6c6cd] bg-[#f8f9ff]">
          <h2 className="text-[13px] font-bold text-[#45464d] uppercase tracking-wider">Recent Investigations</h2>
        </div>
        <div className="flex flex-col">
          {recentInvestigations.map((inv) => (
            <button
              key={inv.id}
              onClick={() => setSelectedId(inv.id)}
              className={`text-left p-4 border-b border-[#c6c6cd] transition-colors ${
                selectedId === inv.id ? "bg-[#dce9ff]" : "hover:bg-[#f1f5f9]"
              }`}
            >
              <div className="font-semibold text-[14px] text-black mb-1 truncate">
                {inv.organization}
              </div>
              <div className="text-[12px] text-[#45464d] truncate mb-2">
                {inv.technology}
              </div>
              <div className="text-[11px] text-[#76777d]">
                {new Date(inv.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
          {recentInvestigations.length === 0 && (
            <div className="p-6 text-center text-[13px] text-[#76777d]">
              No investigations found.
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-white relative">
        {selectedInv ? (
          <>
            <div className="p-6 border-b border-[#c6c6cd] flex items-start justify-between bg-[#f8f9ff]">
              <div>
                <div className="text-[12px] font-mono text-[#76777d] mb-1">ID: {selectedId}</div>
                <h2 className="text-[18px] font-bold text-black mb-1">
                  {selectedInv.organization} &mdash; {selectedInv.technology}
                </h2>
                <div className="text-[13px] text-[#45464d]">Goal: Investigate competitive landscape</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#45464d] mb-1">Status</div>
                <div className={`text-[13px] font-bold px-3 py-1 rounded inline-flex items-center gap-2 ${
                  status === "RUNNING" ? "bg-blue-100 text-blue-700" :
                  status === "COMPLETED" ? "bg-green-100 text-green-700" :
                  status === "FAILED" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {status === "RUNNING" && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                  {status}
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto font-mono text-[13px]">
              {events.length === 0 ? (
                <div className="text-[#76777d] text-center mt-10">Waiting for events...</div>
              ) : (
                <div className="flex flex-col gap-6 max-w-3xl">
                  {events.map((ev, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="text-[#76777d] shrink-0 pt-0.5 w-20">
                        {formatDate(ev.timestamp)}
                      </div>
                      <div className="flex-1 border-l-2 border-[#dce9ff] pl-4 pb-2">
                        <div className={`font-bold mb-1 ${getEventColor(ev.eventType)}`}>
                          {ev.eventType.replace(/_/g, " ")}
                        </div>
                        <div className="text-black font-medium mb-1">{ev.message}</div>
                        {ev.toolName && (
                          <div className="text-[#45464d] text-[12px]">
                            Tool: {ev.toolName}
                            {ev.durationMs ? ` (${ev.durationMs}ms)` : ""}
                          </div>
                        )}
                        {ev.resultMetadata && ev.resultMetadata.count !== undefined && (
                          <div className="text-[#45464d] text-[12px]">
                            Results returned: {ev.resultMetadata.count}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#76777d]">
            Select an investigation from the sidebar to view logs.
          </div>
        )}
      </main>
    </div>
  );
}
