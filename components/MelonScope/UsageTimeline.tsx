"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"

interface UsageTimelineProps {
  requestsPerHour: { hour: string; count: number }[]
}

export function UsageTimeline({ requestsPerHour }: UsageTimelineProps) {
  const hasActivity = requestsPerHour.some((bucket) => bucket.count > 0)

  if (!hasActivity) {
    return (
      <p className="text-center py-8 text-[13px]" style={{ color: "var(--text-muted)" }}>
        No activity yet
      </p>
    )
  }

  return (
    <div style={{ height: "240px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={requestsPerHour} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
          <XAxis
            dataKey="hour"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border-subtle)" }}
            tickLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-elevated)" }}
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "13px",
            }}
            labelStyle={{ color: "var(--text-secondary)" }}
          />
          <Bar dataKey="count" fill="var(--accent)" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
