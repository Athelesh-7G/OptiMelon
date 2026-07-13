import { Crown, Timer, Layers, ImageIcon } from "lucide-react"

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
    { label: "Most Used Model", value: mostUsedModel ?? "N/A", icon: <Crown size={16} /> },
    { label: "Average Response Time", value: `${avgLatencyMs}ms`, icon: <Timer size={16} /> },
    { label: "% Composite", value: `${compositePercentage}%`, icon: <Layers size={16} /> },
    { label: "Images Generated", value: imagesGenerated.toLocaleString(), icon: <ImageIcon size={16} /> },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          <div className="flex items-center gap-2" style={{ color: "var(--accent)" }}>
            {stat.icon}
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "12px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {stat.label}
            </span>
          </div>
          <p className="mt-2 truncate" style={{ color: "var(--text-primary)", fontSize: "20px", fontWeight: 600 }}>
            {stat.value}
          </p>
          <div style={{ width: "24px", height: "2px", background: "var(--accent)", marginTop: "10px" }} />
        </div>
      ))}
    </div>
  )
}
