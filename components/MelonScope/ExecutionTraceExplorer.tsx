"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import type { TelemetryEvent } from "@/lib/telemetry"

function latencyColor(ms: number): string {
  if (ms < 1000) return "var(--accent)"
  if (ms <= 3000) return "var(--warning)"
  return "var(--error)"
}

export function ExecutionTraceExplorer() {
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/telemetry?raw=20")
        if (!response.ok) return
        const data: TelemetryEvent[] = await response.json()
        if (isMounted) {
          setEvents(data)
          setLoaded(true)
        }
      } catch {
        // keep last known data
      }
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, 3000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  if (loaded && events.length === 0) {
    return (
      <p className="text-center py-8 text-[13px]" style={{ color: "var(--text-muted)" }}>
        No executions yet
      </p>
    )
  }

  return (
    <div>
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center gap-4"
          style={{ height: "48px", padding: "0 8px", borderBottom: "1px solid var(--border-subtle)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div className="flex-1 min-w-0">
            <span className="block truncate text-[14px]" style={{ color: "var(--text-primary)" }}>
              {event.model}
            </span>
            <span className="block truncate text-[12px]" style={{ color: "var(--text-secondary)" }}>
              {event.provider}
            </span>
          </div>
          <span className="font-mono text-[13px] flex-shrink-0" style={{ color: latencyColor(event.latencyMs) }}>
            {event.latencyMs}ms
          </span>
          <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: "110px", justifyContent: "flex-end" }}>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {formatDistanceToNow(event.timestamp, { addSuffix: true })}
            </span>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                background: event.success ? "var(--success)" : "var(--error)",
              }}
              title={event.success ? "Success" : "Failed"}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
