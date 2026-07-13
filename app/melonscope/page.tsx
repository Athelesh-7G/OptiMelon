"use client"

import { useEffect, useState } from "react"
import { StatCards } from "@/components/MelonScope/StatCards"
import { ModelBreakdownTable } from "@/components/MelonScope/ModelBreakdownTable"
import { ExecutionTraceExplorer } from "@/components/MelonScope/ExecutionTraceExplorer"
import { UserAnalytics } from "@/components/MelonScope/UserAnalytics"
import { UsageTimeline } from "@/components/MelonScope/UsageTimeline"

interface PerModelStat {
  model: string
  provider: string
  count: number
  avgLatencyMs: number
  p95LatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
}

interface TelemetrySummary {
  totalRequests: number
  perModel: PerModelStat[]
  requestsPerHour: { hour: string; count: number }[]
  mostUsedModel: string | null
  textVsImage: { text: number; image: number }
  compositePercentage: number
  avgLatencyMs: number
  p95LatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
  imagesGenerated: number
}

export default function MelonScopePage() {
  const [data, setData] = useState<TelemetrySummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchTelemetry = async () => {
      try {
        const response = await fetch("/api/telemetry")
        if (!response.ok) throw new Error("Request failed")
        const json: TelemetrySummary = await response.json()
        if (isMounted) {
          setData(json)
          setError(null)
        }
      } catch {
        if (isMounted) {
          setError("Could not load telemetry data")
        }
      }
    }

    fetchTelemetry()
    const interval = setInterval(fetchTelemetry, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">MelonScope</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time intelligence into your AI usage
          </p>
        </div>

        {error && (
          <div
            className="rounded-xl border px-4 py-3"
            style={{ background: "var(--melon-red-muted)", borderColor: "var(--melon-red-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--melon-red)" }}>
              {error}
            </p>
          </div>
        )}

        {!data && !error ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl border border-border bg-card" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">Loading...</p>
          </div>
        ) : data ? (
          <>
            <StatCards
              totalRequests={data.totalRequests}
              avgLatencyMs={data.avgLatencyMs}
              p95LatencyMs={data.p95LatencyMs}
              minLatencyMs={data.minLatencyMs}
              maxLatencyMs={data.maxLatencyMs}
            />
            <ModelBreakdownTable perModel={data.perModel} />
            <ExecutionTraceExplorer />
            <UserAnalytics
              mostUsedModel={data.mostUsedModel}
              avgLatencyMs={data.avgLatencyMs}
              compositePercentage={data.compositePercentage}
              imagesGenerated={data.imagesGenerated}
            />
            <UsageTimeline requestsPerHour={data.requestsPerHour} />
          </>
        ) : null}
      </div>
    </div>
  )
}
