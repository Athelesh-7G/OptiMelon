import { createBytezClient, sendBytezMessage, type BytezClient } from "./bytez"
import { createOpenAIClient, sendOpenAIMessage, type OpenAIClient } from "./openai"
import { createClaudeClient, sendClaudeMessage, type ClaudeClient } from "./claude"
import { createGeminiClient, sendGeminiMessage, type GeminiClient } from "./gemini"
import {
  createOpenAICompatibleClient,
  sendOpenAICompatibleMessage,
  type OpenAICompatibleClient,
} from "./openai-compatible"

export type Provider =
  | "bytez"
  | "openai"
  | "claude"
  | "gemini"
  | "moonshot"
  | "deepseek"
  | "groq"
  | "together"

export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatParams {
  temperature?: number
  max_tokens?: number
}

export type ProviderClient =
  | BytezClient
  | OpenAIClient
  | ClaudeClient
  | GeminiClient
  | OpenAICompatibleClient

// Provider configurations for OpenAI-compatible APIs
const PROVIDER_CONFIGS: Record<string, { baseUrl: string; name: string }> = {
  moonshot: { baseUrl: "https://api.moonshot.cn/v1", name: "Moonshot" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", name: "DeepSeek" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", name: "Groq" },
  together: { baseUrl: "https://api.together.xyz/v1", name: "Together AI" },
}

export function createProviderClient(
  provider: Provider,
  apiKey: string,
  baseUrl?: string
): ProviderClient {
  switch (provider) {
    case "bytez":
      return createBytezClient(apiKey)
    case "openai":
      return createOpenAIClient(apiKey, baseUrl)
    case "claude":
      return createClaudeClient(apiKey)
    case "gemini":
      return createGeminiClient(apiKey)
    case "moonshot":
    case "deepseek":
    case "groq":
    case "together": {
      const config = PROVIDER_CONFIGS[provider]
      return createOpenAICompatibleClient(apiKey, baseUrl || config.baseUrl, config.name)
    }
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

export async function sendMessage(
  provider: Provider,
  client: ProviderClient,
  model: string,
  messages: Message[],
  params: ChatParams,
  stream: boolean
): Promise<string | ReadableStream<Uint8Array>> {
  switch (provider) {
    case "bytez":
      return sendBytezMessage(client as BytezClient, model, messages, params, stream)
    case "openai":
      return sendOpenAIMessage(client as OpenAIClient, model, messages, params, stream)
    case "claude":
      return sendClaudeMessage(client as ClaudeClient, model, messages, params, stream)
    case "gemini":
      return sendGeminiMessage(client as GeminiClient, model, messages, params, stream)
    case "moonshot":
    case "deepseek":
    case "groq":
    case "together":
      return sendOpenAICompatibleMessage(
        client as OpenAICompatibleClient,
        model,
        messages,
        params,
        stream
      )
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
