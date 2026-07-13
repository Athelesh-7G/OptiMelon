import type React from "react"

interface PerModelStat {
  model: string
  provider: string
  count: number
  avgLatencyMs: number
  p95LatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
}

interface ModelBreakdownTableProps {
  perModel: PerModelStat[]
}

const thStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "12px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  padding: "0 16px 10px",
}

export function ModelBreakdownTable({ perModel }: ModelBreakdownTableProps) {
  if (perModel.length === 0) {
    return (
      <p className="text-center py-8 text-[13px]" style={{ color: "var(--text-muted)" }}>
        No model usage yet
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Model</th>
            <th style={thStyle}>Provider</th>
            <th style={thStyle}>Requests</th>
            <th style={thStyle}>Avg</th>
            <th style={thStyle}>P95</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Min / Max</th>
          </tr>
        </thead>
        <tbody>
          {perModel.map((stat) => (
            <tr
              key={`${stat.provider}-${stat.model}`}
              style={{ height: "44px", borderBottom: "1px solid var(--border-subtle)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "0 16px", color: "var(--text-primary)", fontSize: "14px", fontWeight: 500 }}>
                {stat.model}
              </td>
              <td style={{ padding: "0 16px", color: "var(--text-secondary)", fontSize: "13px" }}>{stat.provider}</td>
              <td style={{ padding: "0 16px", color: "var(--text-primary)", fontSize: "13px" }}>{stat.count}</td>
              <td style={{ padding: "0 16px", color: "var(--text-primary)", fontSize: "13px" }}>{stat.avgLatencyMs}ms</td>
              <td style={{ padding: "0 16px", color: "var(--text-primary)", fontSize: "13px" }}>{stat.p95LatencyMs}ms</td>
              <td
                className="font-mono"
                style={{ padding: "0 16px", color: "var(--text-secondary)", fontSize: "13px", textAlign: "right" }}
              >
                {stat.minLatencyMs} / {stat.maxLatencyMs}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
