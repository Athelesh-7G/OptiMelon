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
    { label: "Min", value: `${minLatencyMs}ms` },
    { label: "Max", value: `${maxLatencyMs}ms` },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
          }}
        >
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {stat.label}
          </p>
          <p className="mt-2" style={{ color: "var(--text-primary)", fontSize: "28px", fontWeight: 600, lineHeight: 1.1 }}>
            {stat.value}
          </p>
          <div style={{ width: "24px", height: "2px", background: "var(--accent)", marginTop: "10px" }} />
        </div>
      ))}
    </div>
  )
}
