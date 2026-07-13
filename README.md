# 🍉 OptiMelon

[![Live Demo](https://img.shields.io/badge/Live_Demo-optimelon.vercel.app-ff4d6d?style=flat-square)](https://v0-optimelon.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Athelesh--7G%2FOptiMelon-181717?style=flat-square&logo=github)](https://github.com/Athelesh-7G/OptiMelon)
[![Built with Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**OptiMelon is an intent-aware, provider-abstracted orchestration layer for open-source LLMs.** Instead of manually deciding which of 10+ models to use for debugging vs. creative writing vs. reasoning, OptiMelon organizes models by task specialization, hardens every request with an injection-resistant system prompt tuned to the detected intent, and captures real-time telemetry on every model interaction through a built-in dashboard called **MelonScope**. It routes across Bytez-hosted open models with a unified client layer that also speaks OpenAI, Anthropic, Gemini, and any OpenAI-compatible provider.

---

## Key Features

1. **Adaptive model routing** — models are organized into task categories (general, coders, creators, reasoning, enterprise) so requests map to the right specialist instead of one general-purpose model.
2. **Multi-provider abstraction** — a single `Message`/`ChatParams` interface unifies five provider clients (Bytez, OpenAI, Anthropic, Gemini, and a generic OpenAI-compatible client for Moonshot/DeepSeek/Groq/Together).
3. **MelonScope telemetry** — a real-time dashboard tracking per-model latency, p95, estimated token throughput, hourly request distribution, and routing breakdown, with zero external dependencies.
4. **Hardened system prompts** — every request is wrapped in a role-defined, injection-resistant prompt that refuses instruction overrides and never leaks its own instructions.
5. **Intent classification** — a lightweight heuristic classifies each request into debug / design / explain / tutorial / creative / direct / general modes and enriches the system prompt accordingly.

---

## Architecture at a Glance

OptiMelon is a three-layer orchestration pipeline. Every chat request flows through it in order:

```
User message
   │
   ▼
[1] Intent classification      lib/promptTemplate.ts
   │   detect task type → build 4-part hardened system prompt
   ▼
[2] Provider abstraction       lib/providers/*  +  lib/models.ts
   │   resolve model → dispatch to the matching provider client
   ▼
[3] Telemetry capture          lib/telemetry.ts  (via app/api/chat/route.ts)
   │   record latency, tokens, success/failure into a ring buffer
   ▼
Streamed response → UI
```

Model selection today is **category-based static routing**: `lib/models.ts` maps 10 curated models to task categories, and the UI selects within them. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design and the path toward dynamic complexity/cost routing.

---

## Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| **Next.js** (App Router) | 16 | Full-stack framework — pages + API route handlers |
| **React** | 19 | UI rendering, streaming chat state |
| **TypeScript** | 5 | End-to-end type safety across API and UI |
| **Tailwind CSS** | 4 | Design system via `@theme` design tokens |
| **Bytez API** | v2 | Primary inference provider for the 10 open models |
| **Recharts** | 2.15 | MelonScope usage-timeline charting |
| **date-fns** | 4 | Relative timestamps in the telemetry trace |

---

## MelonScope

MelonScope is OptiMelon's built-in observability layer. Every request through `/api/chat` is instrumented at a single choke point and pushed into an in-memory ring buffer, then aggregated on demand.

**Access it at [`/melonscope`](https://v0-optimelon.vercel.app/melonscope).**

It tracks:
- Total requests, average / p95 / min / max latency
- Per-model breakdown (count, avg latency, p95, min/max)
- Requests-per-hour distribution over the last 24 hours
- Most-used model, text-vs-image split, composite-routing usage
- A live execution trace of the last 20 requests (model, latency, type, success/failure)

Full details in [MELONSCOPE_GUIDE.md](./MELONSCOPE_GUIDE.md).

---

## Setup

**Requirements:** Node 18+ and [pnpm](https://pnpm.io).

```bash
pnpm install
```

Create `.env.local` in the project root with at least a Bytez key (other providers are optional and only needed if you route to them):

```bash
BYTEZ_API_KEY=your_bytez_key_here
# Optional, per provider you intend to use:
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...
# GEMINI_API_KEY=...
# MOONSHOT_API_KEY=...
# DEEPSEEK_API_KEY=...
# GROQ_API_KEY=...
# TOGETHER_API_KEY=...
```

Then:

```bash
pnpm dev      # start the dev server on http://localhost:3000
pnpm build    # production build
pnpm start    # serve the production build
```

All API keys are read from `process.env` at request time and are **never hardcoded** in source.

### A note on honesty: Bytez model activation

The 10 default models all route through Bytez. A Bytez API key authenticates successfully but only resolves models that are **activated in that account's catalog** — a fresh/free-tier key returns an empty catalog, and requests fail with a `404`. OptiMelon detects this specific case and surfaces a clean, actionable message ("This model is not yet enabled in your Bytez account. Visit bytez.com to activate it.") instead of a raw error dump. If chat returns that message, activate the models on your Bytez account rather than debugging the code.

---

## Project Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, routing, provider abstraction, telemetry, prompt security
- [MELONSCOPE_GUIDE.md](./MELONSCOPE_GUIDE.md) — telemetry deep dive and extension guide
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) — engineering decisions and rationale

---

## Credits

**Created by** Athelesh Balachandran
**Built with** Next.js, React, TypeScript, Tailwind CSS
**Powered by** the open-source AI community (Qwen, DeepSeek, GLM, Llama, Kimi, Gemini, and more)

*OptiMelon is an independent project and is not affiliated with any model provider.*
