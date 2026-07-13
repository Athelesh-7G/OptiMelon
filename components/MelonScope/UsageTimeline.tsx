"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface UsageTimelineProps {
  requestsPerHour: { hour: string; count: number }[]
}

export function UsageTimeline({ requestsPerHour }: UsageTimelineProps) {
  const hasActivity = requestsPerHour.some((bucket) => bucket.count > 0)

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Usage Timeline</h2>
      {!hasActivity ? (
        <p className="py-6 text-sm text-muted-foreground text-center">No activity yet.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={requestsPerHour}>
              <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  color: "var(--popover-foreground)",
                }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
