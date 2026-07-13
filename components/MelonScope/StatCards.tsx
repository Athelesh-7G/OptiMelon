interface StatCardsProps {
  totalRequests: number
  avgLatencyMs: number
  p95LatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
}

export function StatCards({
  totalRequests,
  avgLatencyMs,
  p95LatencyMs,
  minLatencyMs,
  maxLatencyMs,
}: StatCardsProps) {
  const stats = [
    { label: "Total Requests", value: totalRequests.toLocaleString() },
    { label: "Avg Latency", value: `${avgLatencyMs}ms` },
    { label: "P95 Latency", value: `${p95LatencyMs}ms` },
    { label: "Min Latency", value: `${minLatencyMs}ms` },
    { label: "Max Latency", value: `${maxLatencyMs}ms` },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
          <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
