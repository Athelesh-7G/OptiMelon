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

export function ModelBreakdownTable({ perModel }: ModelBreakdownTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Model Usage Breakdown</h2>
      </div>
      {perModel.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">No model usage yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Requests</th>
                <th className="px-4 py-2 font-medium">Avg Latency</th>
                <th className="px-4 py-2 font-medium">P95</th>
                <th className="px-4 py-2 font-medium">Min / Max</th>
              </tr>
            </thead>
            <tbody>
              {perModel.map((stat) => (
                <tr
                  key={`${stat.provider}-${stat.model}`}
                  className="border-b border-border last:border-0 hover:bg-secondary/50"
                >
                  <td className="px-4 py-2 text-foreground font-medium">{stat.model}</td>
                  <td className="px-4 py-2 text-muted-foreground">{stat.provider}</td>
                  <td className="px-4 py-2 text-foreground">{stat.count}</td>
                  <td className="px-4 py-2 text-foreground">{stat.avgLatencyMs}ms</td>
                  <td className="px-4 py-2 text-foreground">{stat.p95LatencyMs}ms</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {stat.minLatencyMs}ms / {stat.maxLatencyMs}ms
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
