export interface TelemetryEvent {
  id: string
  timestamp: number
  provider: string
  model: string
  latencyMs: number
  requestType: "text" | "image"
  estimatedTokens: number
  tokensEstimated: true
  isComposite: boolean
  streamed: boolean
  success: boolean
  errorMessage?: string
}

const MAX_EVENTS = 1000

let events: TelemetryEvent[] = []

// Must never throw - telemetry can never break the chat flow.
export function recordTelemetryEvent(event: TelemetryEvent): void {
  try {
    events.push(event)
    if (events.length > MAX_EVENTS) {
      events = events.slice(events.length - MAX_EVENTS)
    }
  } catch {
    // Swallow silently
  }
}

export function getTelemetryEvents(): TelemetryEvent[] {
  return events
}
