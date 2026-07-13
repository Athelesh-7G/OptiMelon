interface UserAnalyticsProps {
  mostUsedModel: string | null
  avgLatencyMs: number
  compositePercentage: number
  imagesGenerated: number
}

export function UserAnalytics({
  mostUsedModel,
  avgLatencyMs,
  compositePercentage,
  imagesGenerated,
}: UserAnalyticsProps) {
  const stats = [
    { label: "Most Used Model", value: mostUsedModel ?? "N/A" },
    { label: "Average Response Time", value: `${avgLatencyMs}ms` },
    { label: "% Composite", value: `${compositePercentage}%` },
    { label: "Images Generated", value: imagesGenerated.toLocaleString() },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
          <p className="text-lg font-semibold text-foreground truncate">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
