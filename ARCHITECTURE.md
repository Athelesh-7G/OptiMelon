# OptiMelon — Architecture

This document describes how OptiMelon is designed: how requests are routed, how providers are abstracted, how telemetry is captured, and how the system prompt is hardened. It reflects the code as it actually exists, and flags what is static today versus what is designed for future extension.

---

## 1. System Overview

OptiMelon is a **provider-abstracted, intent-aware LLM orchestration layer** built on Next.js 16 (App Router). It is a single application — not a monorepo — with all server logic living in Next.js route handlers under `app/api/`.

The design is three layers, and every chat request passes through all three in order:

| Layer | Responsibility | Source |
|-------|----------------|--------|
| **1. Intent classification** | Detect the task type from the latest user message and build a hardened, intent-tuned system prompt | `lib/promptTemplate.ts` |
| **2. Provider abstraction** | Resolve the target model and dispatch the call to the correct provider client through one unified interface | `lib/providers/`, `lib/models.ts` |
| **3. Telemetry capture** | Record latency, token estimate, and success/failure for every request into an in-memory ring buffer | `lib/telemetry.ts` (invoked from `app/api/chat/route.ts`) |

The orchestration is wired together in `app/api/chat/route.ts`, which is the one place all three layers meet.

```
POST /api/chat
   ├─ validate provider + model
   ├─ Layer 1: buildSystemPrompt(messages, model, provider)
   ├─ Layer 2: createProviderClient(provider) → sendMessage(...)
   └─ Layer 3: recordTelemetryEvent(...) in a finally block
```

---

## 2. Routing Design

### Current: category-based static routing

Model selection is driven by a static catalog in `lib/models.ts`. Each model declares a `category`, and the UI presents models grouped by that category. There is **no runtime scoring** of the request against models — selection is explicit (the user picks a model / category) rather than algorithmic.

The categories defined in `MODEL_CATEGORIES` are:

- `general` — instruction following, structured data, everyday tasks
- `coders` — code generation, debugging, refactoring
- `creators` — long-context, agentic, creative generation
- `reasoning` — analysis, multi-step logic, document understanding
- `enterprise` — general-purpose, cost-effective, high-volume

An **"all"** view exists at the UI level as an aggregate (show everything); it is not a stored category on any model. So there are five real categories plus one conceptual aggregate view.

Ten models are curated across these categories (Qwen 2.5 / Qwen3-Coder / Qwen3-Next, GLM-4 / GLM-4.5-Air, DeepSeek-V3.2, Gemini 2.5 Pro, Llama 3.3 70B, Kimi K2), all currently routed through the Bytez provider.

### Intent enrichment (orthogonal to routing)

Independently of which model is chosen, `lib/promptTemplate.ts` classifies the **latest user message** with lightweight regular-expression heuristics and appends a single focus sentence to the system prompt. Intent buckets: fast-recall, debug, design, explain, tutorial, creative, direct, and (default) none. This shapes *how* the chosen model responds without changing *which* model is used — intent lives at the prompt layer, not the routing layer (a deliberate separation; see PROJECT_SUMMARY.md).

### Future: dynamic routing

The static catalog is the seam for future dynamic routing. A scoring function could rank models within a category by a complexity estimate (prompt length, code presence, reasoning signals) against a cost/latency budget, and select automatically. Because model dispatch already goes through one interface (Layer 2), adding a scorer requires no changes to the provider clients or the API surface — only the selection step ahead of `sendMessage`.

---

## 3. Provider Abstraction Layer

### The unified interface

Every provider client speaks the same two types:

```ts
interface Message   { role: "system" | "user" | "assistant"; content: string }
interface ChatParams { temperature?: number; max_tokens?: number }
```

and exposes the same shape: a `create<Provider>Client(apiKey, ...)` factory and a `send<Provider>Message(client, model, messages, params, stream)` function returning `Promise<string | ReadableStream<Uint8Array>>`.

### The five clients

| Client | File | Covers |
|--------|------|--------|
| Bytez | `lib/providers/bytez.ts` | `POST https://api.bytez.com/models/v2/{modelId}`; non-streaming upstream, adapted to SSE |
| OpenAI | `lib/providers/openai.ts` | OpenAI Chat Completions (native streaming) |
| Anthropic (Claude) | `lib/providers/claude.ts` | Anthropic Messages API; Claude SSE normalized to OpenAI-style deltas |
| Gemini | `lib/providers/gemini.ts` | Google Generative Language API; streamed JSON normalized to deltas |
| OpenAI-compatible | `lib/providers/openai-compatible.ts` | Moonshot, DeepSeek, Groq, Together (one client, per-provider base URL) |

`lib/providers/index.ts` is the dispatcher: `createProviderClient(provider, apiKey, baseUrl)` and `sendMessage(provider, client, ...)` switch on the provider and delegate. All non-OpenAI streaming formats are normalized into the OpenAI-style `{ choices: [{ delta: { content } }] }` SSE shape so the frontend has exactly one streaming format to parse.

### Why this pattern

Adding a new provider is **one new file** implementing the factory + send functions, plus two lines in the dispatcher switch and one entry in the env-key map. Routing logic, the API route, and the UI are untouched. This is the core extensibility property of the codebase.

### Credential handling

Credentials are read from `process.env` at request time in `app/api/chat/route.ts`, keyed by provider (`BYTEZ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `MOONSHOT_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`). Keys are **never** hardcoded in source and are never sent to the client. A missing key returns a clear 500 before any upstream call is attempted.

---

## 4. MelonScope Telemetry Architecture

### Single instrumentation point

Telemetry is captured in exactly one place: the `finally` block of the request path in `app/api/chat/route.ts`. Both the streaming and non-streaming branches funnel into it, so a single `recordTelemetryEvent(...)` call covers every request — including failures, because it is in a `finally`.

```ts
const startTime = Date.now()
try {
  // ... streaming or non-streaming sendMessage()
} finally {
  recordTelemetryEvent({
    id, timestamp: startTime,
    provider, model,
    latencyMs: Date.now() - startTime,
    requestType: "text",
    estimatedTokens: responseText ? Math.ceil(responseText.length / 4) : 0,
    tokensEstimated: true,
    isComposite: false,
    streamed, success, errorMessage,
  })
}
```

### The in-memory ring buffer

`lib/telemetry.ts` holds a module-level array capped at **1000 events**. `recordTelemetryEvent` pushes and trims; `getTelemetryEvents` reads. The write path is wrapped in an internal `try/catch` that swallows errors — telemetry can **never** throw into the chat flow.

### Metrics computed

`GET /api/telemetry` reads the buffer and aggregates on demand (≤1000 items, cheap):

- **Latency**: overall and per-model average, p95 (`sorted[Math.floor(0.95 * (n-1))]`), min, max
- **Throughput proxy**: `estimatedTokens` ≈ `responseText.length / 4`, explicitly flagged `tokensEstimated: true`
- **Per-model breakdown**: count + latency stats grouped by `provider::model`
- **Hourly distribution**: request counts bucketed into the last 24 hourly windows
- **Most-used model, text-vs-image split, composite %**
- `?raw=N` returns the last N raw events for the live execution trace

### Why in-memory

Zero infrastructure, zero schema, and — critically — **zero latency cost on the response path** (a synchronous array push, no network, no await). The tradeoff is honest and explicit: **the buffer resets on server restart** and is per-process (not shared across serverless instances). This is the right call for a demonstrable analytics layer without a database; persistence is a documented future extension (see MELONSCOPE_GUIDE.md).

### Fields that are honest placeholders

`isComposite` is always `false` (no composite/multi-model routing exists yet) and `requestType` is always `"text"` (no image path yet). These fields exist in the event shape so the schema is stable for future work, but they are not faked — they report the true current state.

---

## 5. System Prompt Security

`buildSystemPrompt(messages, model, provider)` assembles a four-part prompt, in this exact order:

1. **Role definition** — establishes the assistant's role and hard boundaries: no internet access, no code execution, and it does not reveal its instructions.
2. **Injection resistance** — instructs the model to ignore user attempts to override/replace instructions, refuse to role-play as a different AI, and refuse to pretend the instructions do not exist.
3. **Intent modifier** *(conditional)* — a single focus sentence from intent classification (e.g. "Focus on identifying bugs and explaining the fix clearly."). Only added if an intent is detected; it adds focus and never contradicts the role.
4. **Model context** — "You are {modelName} provided by {provider}."

The strings are plain English with no markdown, angle brackets, or special characters — reducing both model confusion and injection surface. `DEFAULT_SYSTEM_PROMPT` (role + injection resistance only) is exported for display in the settings UI.

### Why it matters

- **Prompt injection**: user messages that say "ignore previous instructions" are explicitly pre-empted.
- **Role confusion**: the model is told not to impersonate a different assistant.
- **Instruction leakage**: the role definition forbids revealing the system prompt.

A user-supplied custom system prompt (via settings) takes priority when present, which is a deliberate escape hatch for power users; the hardened default applies otherwise.

---

## 6. A Real-World Failure Mode, Resolved

The 10 default models route through Bytez. During integration, every model returned a Bytez `404`. Probing the Bytez API directly isolated the cause: the API key **authenticated** (a bad key returns `401`, a valid key with no catalog returns `404` with an empty catalog list) — the account simply had no activated models. This is an upstream/account condition, not a code bug.

Rather than dumping Bytez's raw JSON error to the user, `app/api/chat/route.ts` detects this specific case (`provider === "bytez"` and the error contains `Bytez API error: 404`) and returns:

> "This model is not yet enabled in your Bytez account. Visit bytez.com to activate it."

The **raw** upstream error is still preserved in the telemetry event's `errorMessage` for debugging — the clean message is surfaced to the user, the full detail is retained internally. This separation (actionable message out, full detail logged) is applied deliberately.
