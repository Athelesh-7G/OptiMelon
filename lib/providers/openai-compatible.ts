// Generic OpenAI-compatible provider for Moonshot, DeepSeek, Groq, etc.

export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatParams {
  temperature?: number
  max_tokens?: number
}

export interface OpenAICompatibleClient {
  apiKey: string
  baseUrl: string
  name: string
}

export function createOpenAICompatibleClient(
  apiKey: string,
  baseUrl: string,
  name: string
): OpenAICompatibleClient {
  return { apiKey, baseUrl, name }
}

export async function sendOpenAICompatibleMessage(
  client: OpenAICompatibleClient,
  model: string,
  messages: Message[],
  params: ChatParams,
  stream: boolean
): Promise<string | ReadableStream<Uint8Array>> {
  const response = await fetch(`${client.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${client.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
      stream,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`${client.name} API error: ${response.status} - ${error}`)
  }

  if (stream && response.body) {
    return response.body
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ""
}
