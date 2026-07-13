"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import type { TelemetryEvent } from "@/lib/telemetry"

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
        // Ignore fetch errors, keep showing last known data
      }
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, 3000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Execution Trace Explorer</h2>
      </div>
      {loaded && events.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">
          No composite executions yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Latency</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                  </td>
                  <td className="px-4 py-2 text-foreground font-medium">{event.model}</td>
                  <td className="px-4 py-2 text-muted-foreground">{event.provider}</td>
                  <td className="px-4 py-2 text-foreground">{event.latencyMs}ms</td>
                  <td className="px-4 py-2 text-muted-foreground">{event.requestType}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        event.success
                          ? "bg-accent/15 text-accent"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {event.success ? "Success" : "Failed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
