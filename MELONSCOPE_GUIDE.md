# MelonScope — Telemetry Guide

MelonScope is OptiMelon's built-in observability layer: real-time analytics on every model interaction, with no external services and no database.

---

## What It Is and Why It Exists

Running requests across 10+ models and multiple providers, you quickly need to answer: *which models am I actually using, how fast are they, and where do failures cluster?* MelonScope answers that directly inside the app.

It exists to make model behavior **observable** without adding infrastructure. Every request through `/api/chat` is instrumented at a single point and recorded; the dashboard reads and aggregates that data live. There are no third-party analytics SDKs and no telemetry service to provision — the whole system is two files (`lib/telemetry.ts` + `app/api/telemetry/route.ts`) plus the dashboard UI.

---

## How to Access It

Navigate to **`/melonscope`** (linked from the sidebar). The page polls `/api/telemetry` every 5 seconds and the execution trace polls `/api/telemetry?raw=20` every 3 seconds, so it updates in near real time as you use the chat.

---

## Metrics: What They Mean and How They're Calculated

All metrics are derived from the recorded events at read time in `app/api/telemetry/route.ts`.

| Metric | Meaning | Calculation |
|--------|---------|-------------|
| **Total Requests** | Number of chat requests recorded | `events.length` |
| **Avg Latency** | Mean round-trip time of the model call | mean of `latencyMs` |
| **P95 Latency** | 95th-percentile latency (tail behavior) | sort ascending, take `sorted[Math.floor(0.95 * (n - 1))]` |
| **Min / Max Latency** | Fastest and slowest recorded calls | first / last of the sorted latencies |
| **Per-model breakdown** | Count + latency stats for each model | events grouped by `provider::model`, same stats per group |
| **Requests per hour** | Volume over the last 24 hours | events bucketed into 24 hourly windows by `timestamp` |
| **Most-used model** | The model with the highest request count | top entry of the per-model breakdown |
| **Text vs Image** | Split by request type | count of `requestType === "text"` vs `"image"` |
| **Composite %** | Share of requests using composite routing | `compositeCount / total` (currently always 0) |
| **Estimated tokens** | Throughput proxy per request | `Math.ceil(responseText.length / 4)`, flagged `tokensEstimated: true` |

**Latency** is measured in the API route as `Date.now() - startTime`, where `startTime` is captured immediately before dispatch and the delta is taken in a `finally` block — so it reflects the full model round-trip and is recorded even when the request fails.

**Estimated tokens** is deliberately an *estimate* (character count ÷ 4). None of the provider clients currently return usage/token counts, so rather than fabricate exact numbers, the event marks the value `tokensEstimated: true`. It is a throughput proxy, not a billing figure.

**Composite % and Images** are honest placeholders: no composite (multi-model) routing or image generation path exists yet, so `isComposite` is always `false` and `requestType` is always `"text"`. The fields exist to keep the schema stable for future work — they report the true current state, not a mock.

---

## The API Endpoint

### `GET /api/telemetry`

Returns the aggregated summary:

```jsonc
{
  "totalRequests": 12,
  "perModel": [
    {
      "model": "Qwen/Qwen2.5-7B-Instruct",
      "provider": "bytez",
      "count": 12,
      "avgLatencyMs": 543,
      "p95LatencyMs": 902,
      "minLatencyMs": 210,
      "maxLatencyMs": 1104
    }
  ],
  "requestsPerHour": [ { "hour": "14:00", "count": 0 }, /* ... 24 buckets */ ],
  "mostUsedModel": "Qwen/Qwen2.5-7B-Instruct",
  "textVsImage": { "text": 12, "image": 0 },
  "compositePercentage": 0,
  "avgLatencyMs": 543,
  "p95LatencyMs": 902,
  "minLatencyMs": 210,
  "maxLatencyMs": 1104,
  "imagesGenerated": 0
}
```

### `GET /api/telemetry?raw=N`

Returns the last `N` raw events (newest first), used by the execution trace:

```jsonc
[
  {
    "id": "b1e2...",
    "timestamp": 1783949174675,
    "provider": "bytez",
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "latencyMs": 527,
    "requestType": "text",
    "estimatedTokens": 0,
    "tokensEstimated": true,
    "isComposite": false,
    "streamed": false,
    "success": false,
    "errorMessage": "Bytez API error: 404 - ..."
  }
]
```

Note that the **raw upstream error is preserved here** even though the user-facing chat response shows a cleaned-up message — full detail is retained internally for debugging.

---

## The Ring Buffer Design and Its Tradeoffs

`lib/telemetry.ts` is the store:

```ts
const MAX_EVENTS = 1000
let events: TelemetryEvent[] = []

export function recordTelemetryEvent(event: TelemetryEvent): void {
  try {
    events.push(event)
    if (events.length > MAX_EVENTS) {
      events = events.slice(events.length - MAX_EVENTS)
    }
  } catch {
    // Swallow silently — telemetry must never break chat
  }
}

export function getTelemetryEvents(): TelemetryEvent[] {
  return events
}
```

**Design properties:**
- **Bounded memory** — capped at 1000 events; oldest are dropped first (a ring buffer).
- **Non-blocking** — a synchronous array push with no network and no `await`, invoked from a `finally`, so it adds no latency to the response and captures failures.
- **Cannot break chat** — the write is wrapped in `try/catch` that swallows any error.

**Tradeoffs (stated honestly):**
- **Resets on server restart** — state is process memory, not persisted.
- **Per-process** — in a multi-instance / serverless deployment, each instance has its own buffer; the numbers reflect one instance, not a global aggregate.
- **Estimated tokens, not exact** — throughput is a proxy until providers return usage data.

---

## How to Extend It

### Add a new metric
1. If the metric needs new per-request data, add a field to `TelemetryEvent` in `lib/telemetry.ts` and populate it in the `recordTelemetryEvent(...)` call in `app/api/chat/route.ts`.
2. Compute the aggregate in `app/api/telemetry/route.ts` and add it to the response object.
3. Surface it in a component under `components/MelonScope/` and render it in `app/melonscope/page.tsx`.

### Capture real token counts
Extend each provider client's return type to include a `usage` object (input/output tokens) alongside the text, thread it back through `sendMessage`, and replace the character-based estimate with the real count (dropping the `tokensEstimated` flag). This is the single biggest fidelity upgrade.

### Persist to a database
Replace the module-level array with writes to a store (e.g. a KV store, SQLite, or Postgres). Because reads go through the single `getTelemetryEvents()` function and the aggregation lives in the API route, persistence is a localized change — swap the read/write implementation, keep the interface. This also fixes the per-process limitation in serverless deployments.

### Add composite-routing analytics
When multi-model/composite routing is built, set `isComposite: true` on the relevant events; `compositePercentage` will begin reporting real usage automatically, with no other changes.

---

## Current Limitations

- **In-memory only** — telemetry resets on server restart and is not shared across instances.
- **Estimated token throughput** — a character-count proxy, not exact provider usage.
- **Text-only, single-model** — `requestType` is always `"text"` and `isComposite` is always `false` until image and composite-routing paths exist.
- **24-hour horizon** — the hourly distribution covers the last 24 hours; there is no long-term history without persistence.
