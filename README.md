# 🍉 OptiMelon

[![Live Demo](https://img.shields.io/badge/Live_Demo-optimelon.vercel.app-ff4d6d?style=flat-square)](https://v0-optimelon.vercel.app/)
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

It tracks:
- Total requests, average / p95 / min / max latency
- Per-model breakdown (count, avg latency, p95, min/max)
- Requests-per-hour distribution over the last 24 hours
- Most-used model, text-vs-image split, composite-routing usage
- A live execution trace of the last 20 requests (model, latency, type, success/failure)

---

## Project Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, routing, provider abstraction, telemetry, prompt security

---

## Credits

**Created by** Athelesh Balachandran
**Built with** Next.js, React, TypeScript, Tailwind CSS
**Powered by** the open-source AI community (Qwen, DeepSeek, GLM, Llama, Kimi, Gemini, and more)

*OptiMelon is an independent project and is not affiliated with any model provider.*
