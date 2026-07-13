"use client"

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MelonIcon } from "@/components/ui/MelonIcon"
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3"
      style={{
        color: "var(--text-muted)",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  )
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
        if (isMounted) setError("Could not load telemetry data")
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
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between"
        style={{ padding: "32px 32px 24px", borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center rounded-md transition-colors"
            style={{ width: "32px", height: "32px", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
            aria-label="Back to chat"
          >
            <ArrowLeft size={16} />
          </Link>
          <MelonIcon variant="slice" size={32} />
          <div>
            <h1 style={{ color: "var(--text-primary)", fontSize: "24px", fontWeight: 600, lineHeight: 1.2 }}>
              MelonScope
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              Real-time telemetry for your AI sessions
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2"
          style={{
            padding: "6px 12px",
            borderRadius: "999px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-surface)",
          }}
        >
          <span className="live-dot" style={{ width: "8px", height: "8px", borderRadius: "999px", background: "var(--success)" }} />
          <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Live</span>
        </div>
      </header>

      <div className="mx-auto" style={{ maxWidth: "900px", padding: "32px" }}>
        {error && (
          <div
            className="mb-8 px-4 py-3"
            style={{ background: "var(--accent-subtle)", color: "var(--accent)", borderRadius: "var(--radius-md)" }}
          >
            {error}
          </div>
        )}

        {!data && !error ? (
          <div className="space-y-3 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{ height: "104px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}
                />
              ))}
            </div>
            <p className="text-center pt-4 text-[13px]" style={{ color: "var(--text-muted)" }}>
              Loading...
            </p>
          </div>
        ) : data ? (
          <div className="flex flex-col" style={{ gap: "32px" }}>
            <section>
              <StatCards
                totalRequests={data.totalRequests}
                avgLatencyMs={data.avgLatencyMs}
                p95LatencyMs={data.p95LatencyMs}
                minLatencyMs={data.minLatencyMs}
                maxLatencyMs={data.maxLatencyMs}
              />
            </section>

            <section>
              <SectionLabel>Model Usage</SectionLabel>
              <ModelBreakdownTable perModel={data.perModel} />
            </section>

            <section>
              <SectionLabel>Execution Trace</SectionLabel>
              <ExecutionTraceExplorer />
            </section>

            <section>
              <SectionLabel>User Analytics</SectionLabel>
              <UserAnalytics
                mostUsedModel={data.mostUsedModel}
                avgLatencyMs={data.avgLatencyMs}
                compositePercentage={data.compositePercentage}
                imagesGenerated={data.imagesGenerated}
              />
            </section>

            <section>
              <SectionLabel>Usage Timeline</SectionLabel>
              <UsageTimeline requestsPerHour={data.requestsPerHour} />
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
