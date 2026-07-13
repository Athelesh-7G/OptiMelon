export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatParams {
  temperature?: number
  max_tokens?: number
}

export interface OpenAIClient {
  apiKey: string
  baseUrl: string
}

export function createOpenAIClient(apiKey: string, baseUrl?: string): OpenAIClient {
  return {
    apiKey,
    baseUrl: baseUrl || "https://api.openai.com/v1",
  }
}

export async function sendOpenAIMessage(
  client: OpenAIClient,
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
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  if (stream && response.body) {
    return response.body
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ""
}
