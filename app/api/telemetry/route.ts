import { NextRequest } from "next/server"
import { getTelemetryEvents, type TelemetryEvent } from "@/lib/telemetry"

interface PerModelStat {
  model: string
  provider: string
  count: number
  avgLatencyMs: number
  p95LatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
}

interface LatencyStats {
  avgLatencyMs: number
  p95LatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
}

function computeLatencyStats(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return { avgLatencyMs: 0, p95LatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0 }
  }

  const sorted = [...latencies].sort((a, b) => a - b)
  const sum = sorted.reduce((total, value) => total + value, 0)
  const p95Index = Math.floor(0.95 * (sorted.length - 1))

  return {
    avgLatencyMs: Math.round(sum / sorted.length),
    p95LatencyMs: sorted[p95Index],
    minLatencyMs: sorted[0],
    maxLatencyMs: sorted[sorted.length - 1],
  }
}

export async function GET(request: NextRequest) {
  const events = getTelemetryEvents()
  const { searchParams } = new URL(request.url)
  const rawParam = searchParams.get("raw")

  if (rawParam !== null) {
    const count = Math.max(0, parseInt(rawParam, 10) || 0)
    const raw: TelemetryEvent[] = events.slice(-count).reverse()
    return Response.json(raw)
  }

  const totalRequests = events.length
  const overallStats = computeLatencyStats(events.map((e) => e.latencyMs))

  const modelGroups = new Map<string, TelemetryEvent[]>()
  for (const event of events) {
    const key = `${event.provider}::${event.model}`
    const group = modelGroups.get(key)
    if (group) {
      group.push(event)
    } else {
      modelGroups.set(key, [event])
    }
  }

  const perModel: PerModelStat[] = Array.from(modelGroups.entries())
    .map(([key, groupEvents]) => {
      const [provider, model] = key.split("::")
      const stats = computeLatencyStats(groupEvents.map((e) => e.latencyMs))
      return {
        model,
        provider,
        count: groupEvents.length,
        ...stats,
      }
    })
    .sort((a, b) => b.count - a.count)

  const mostUsedModel = perModel.length > 0 ? perModel[0].model : null

  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  const requestsPerHour: { hour: string; count: number }[] = []
  for (let i = 23; i >= 0; i--) {
    const bucketDate = new Date(now - i * hourMs)
    requestsPerHour.push({
      hour: `${bucketDate.getHours().toString().padStart(2, "0")}:00`,
      count: 0,
    })
  }
  for (const event of events) {
    const hoursAgo = Math.floor((now - event.timestamp) / hourMs)
    if (hoursAgo >= 0 && hoursAgo < 24) {
      requestsPerHour[23 - hoursAgo].count += 1
    }
  }

  const textCount = events.filter((e) => e.requestType === "text").length
  const imageCount = events.filter((e) => e.requestType === "image").length
  const compositeCount = events.filter((e) => e.isComposite).length
  const compositePercentage =
    totalRequests > 0 ? Math.round((compositeCount / totalRequests) * 100) : 0

  return Response.json({
    totalRequests,
    perModel,
    requestsPerHour,
    mostUsedModel,
    textVsImage: { text: textCount, image: imageCount },
    compositePercentage,
    avgLatencyMs: overallStats.avgLatencyMs,
    p95LatencyMs: overallStats.p95LatencyMs,
    minLatencyMs: overallStats.minLatencyMs,
    maxLatencyMs: overallStats.maxLatencyMs,
    imagesGenerated: imageCount,
  })
}
