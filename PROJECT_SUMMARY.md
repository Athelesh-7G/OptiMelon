# OptiMelon — Project Summary

A concise, placement-oriented overview of what OptiMelon is, the engineering decisions behind it, and the problems solved while building it.

---

## What I Built

**OptiMelon** — an intent-aware, multi-model AI orchestration platform that organizes 10+ open-source LLMs by task specialization (coding, reasoning, creative, general, enterprise) and routes requests to the right specialist instead of forcing one general-purpose model to do everything. Every request is wrapped in a hardened, injection-resistant system prompt tuned to the detected task intent, and every model interaction is captured by **MelonScope**, a built-in real-time telemetry dashboard.

Built with **Next.js 16 (App Router), React 19, and TypeScript 5**, with a provider abstraction that unifies Bytez, OpenAI, Anthropic, Gemini, and any OpenAI-compatible provider behind a single interface.

---

## Engineering Decisions and Why

### 1. Provider abstraction behind one interface
Every provider client implements the same `Message` / `ChatParams` contract and the same `create*Client` + `send*Message` shape, and all non-OpenAI streaming formats are normalized to one SSE shape. **Why:** adding a new provider becomes one new file plus two dispatcher lines — routing, the API route, and the UI never change. Extensibility is a structural property, not a promise.

### 2. A single instrumentation point for telemetry
Telemetry is captured once, in the `finally` block of `app/api/chat/route.ts`, rather than inside each of the five provider clients. **Why:** all requests already funnel through `sendMessage()`, so one wrapper covers every provider and — because it is a `finally` — every failure too. Instrumenting five files would have been five times the surface area and five chances to drift out of sync.

### 3. In-memory ring buffer instead of a database
Telemetry lives in a 1000-event module-level array, not a datastore. **Why:** it adds zero infrastructure and — most importantly — zero latency on the response path (a synchronous push, no network, no await). The tradeoff is stated openly: it resets on restart and is per-process. For a demonstrable analytics layer, that is the right cost/benefit; persistence is a clean future extension because the read path is already a single function.

### 4. Intent classification at the prompt layer, not the routing layer
Intent detection shapes *how* a model answers (a focus sentence in the system prompt), while category selection decides *which* model runs. **Why:** keeping these orthogonal means intent tuning never fights model selection, and either can evolve independently — e.g. adding dynamic routing later doesn't touch the intent logic.

### 5. Hardened system prompt design
The prompt is a fixed four-part structure: role definition → injection resistance → intent modifier → model context, in plain characters with no markdown. **Why:** it defends against prompt injection, role confusion, and instruction leakage in a way that is auditable and stable, while still allowing a power-user custom prompt to override it.

---

## Key Metrics / Proof of Work

- **10+ models** integrated across **5 provider clients** (Bytez, OpenAI, Anthropic, Gemini, OpenAI-compatible).
- **MelonScope tracks:** per-model latency, p95 latency, estimated token throughput, requests-per-hour over the last 24h, most-used model, and a live trace of the last 20 requests.
- **0 external telemetry dependencies** — the entire analytics layer is in-house.
- **System prompt hardened** against instruction override, role impersonation, and system-prompt leakage.
- **Type-safe end to end** — the project passes `tsc --noEmit` with zero errors across the API and UI.

---

## Technical Challenges Solved

1. **Provider-specific API format differences.** Bytez (non-streaming, raw `Authorization` header), OpenAI (native SSE), Anthropic (`content_block_delta` events), and Gemini (streamed JSON chunks) all return different shapes. Each client normalizes into one `{ choices: [{ delta: { content } }] }` SSE format so the frontend parses a single stream format.

2. **Bytez empty-catalog failure (diagnosed, not guessed).** Every model returned a `404`. By probing the Bytez API directly I distinguished authentication (`401`) from an empty catalog (`404`), proving the key was valid but the account had no activated models — an upstream condition, not a code bug. The finding is documented, and the app now surfaces a clean, actionable error instead of a raw JSON dump.

3. **Telemetry that never blocks the response.** The capture is a synchronous ring-buffer push wrapped in an internal `try/catch`, invoked from a `finally`. It cannot throw into the chat flow and cannot add latency to the user's response, yet it still records failed requests with their full raw error.

---

## What I Learned

These are genuine takeaways from building this codebase:

1. **Diagnose the boundary before touching code.** The Bytez `404` looked like a bug in the request logic; it was an account/catalog condition upstream. Reproducing the exact call against the API directly — and reading the difference between `401` and `404` — saved me from "fixing" code that was already correct. Isolating whether a failure is yours or the dependency's is the first move, not the last.

2. **One choke point beats N touch points.** Because every request already passed through `sendMessage()`, telemetry needed exactly one wrapper. Hunting for the single seam where all paths converge — and instrumenting there — is almost always cleaner than distributing the same logic across every implementation.

3. **Design tokens are load-bearing.** The UI is wired on Tailwind v4's `@theme` tokens, and utility classes reference them everywhere. Changing the visual system safely means understanding how deeply those tokens are threaded before editing them — a lesson in respecting the seams a framework has already established rather than fighting them.

4. **Surface actionable errors, retain full detail internally.** The most useful error is one the user can act on ("activate the model on Bytez"), but the raw upstream error still matters for debugging. Splitting these — clean message to the client, full detail into telemetry — makes the product feel considered without losing observability.
