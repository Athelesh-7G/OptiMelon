import { NextRequest } from "next/server"
import {
  createProviderClient,
  sendMessage,
  type Provider,
  type Message,
  type ChatParams,
} from "@/lib/providers"
import { buildSystemPrompt } from "@/lib/promptTemplate"
import { recordTelemetryEvent } from "@/lib/telemetry"

interface ChatRequest {
  messages: Message[]
  provider: Provider
  model: string
  params: ChatParams
  stream?: boolean
}

const VALID_PROVIDERS = [
  "bytez",
  "openai",
  "claude",
  "gemini",
  "moonshot",
  "deepseek",
  "groq",
  "together",
]

// Map provider to env var names
const PROVIDER_ENV_KEYS: Record<string, string> = {
  bytez: "BYTEZ_API_KEY",
  openai: "OPENAI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  groq: "GROQ_API_KEY",
  together: "TOGETHER_API_KEY",
}

export async function POST(request: NextRequest) {
  let requestProvider: Provider | undefined

  try {
    const body: ChatRequest = await request.json()
    const { messages, provider, model, params, stream = false } = body
    requestProvider = provider

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required" }, { status: 400 })
    }

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return Response.json({ error: "Invalid provider" }, { status: 400 })
    }

    if (!model || typeof model !== "string") {
      return Response.json({ error: "Model is required" }, { status: 400 })
    }

    const envKey = PROVIDER_ENV_KEYS[provider]
    const apiKey = process.env[envKey]

    if (!apiKey) {
      return Response.json(
        { error: `${envKey} not configured. Add your API key in the Vars section.` },
        { status: 500 }
      )
    }

    const baseUrl = provider === "openai" ? process.env.OPENAI_BASE_URL : undefined
    const client = createProviderClient(provider, apiKey, baseUrl)

    // Build intelligent system prompt based on user intent and model context
    const systemPrompt = buildSystemPrompt(messages, model, provider)

    // Check if messages already have a system message
    const hasSystemMessage = messages.some((m) => m.role === "system")

    // Prepare final messages with injected system prompt
    const finalMessages: Message[] = hasSystemMessage
      ? messages // User provided their own system message, respect it
      : [{ role: "system", content: systemPrompt }, ...messages]

    const startTime = Date.now()
    let success = false
    let responseText: string | null = null
    let telemetryErrorMessage: string | undefined

    try {
      if (stream) {
        const result = await sendMessage(provider, client, model, finalMessages, params, true)

        if (result instanceof ReadableStream) {
          success = true
          return new Response(result, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          })
        }

        responseText = result
        success = true
        return Response.json({ reply: result })
      }

      const reply = await sendMessage(provider, client, model, finalMessages, params, false)
      responseText = typeof reply === "string" ? reply : null
      success = true
      return Response.json({ reply })
    } catch (err) {
      telemetryErrorMessage = err instanceof Error ? err.message : "Unknown error"
      throw err
    } finally {
      // Fire and forget - telemetry must never affect the response path
      recordTelemetryEvent({
        id: crypto.randomUUID(),
        timestamp: startTime,
        provider,
        model,
        latencyMs: Date.now() - startTime,
        requestType: "text",
        estimatedTokens: responseText ? Math.ceil(responseText.length / 4) : 0,
        tokensEstimated: true,
        isComposite: false,
        streamed: stream,
        success,
        errorMessage: telemetryErrorMessage,
      })
    }
  } catch (error) {
    console.error("Chat API error:", error)
    const rawMessage = error instanceof Error ? error.message : "Unknown error"

    // Give a clean, actionable message for the common "model not in catalog" case
    // instead of dumping Bytez's raw JSON error body to the frontend.
    const isBytezModelNotFound =
      requestProvider === "bytez" && rawMessage.includes("Bytez API error: 404")

    const errorMessage = isBytezModelNotFound
      ? "This model is not yet enabled in your Bytez account. Visit bytez.com to activate it."
      : rawMessage

    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
