export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatParams {
  temperature?: number
  max_tokens?: number
}

export interface GeminiClient {
  apiKey: string
}

export function createGeminiClient(apiKey: string): GeminiClient {
  return { apiKey }
}

export async function sendGeminiMessage(
  client: GeminiClient,
  model: string,
  messages: Message[],
  params: ChatParams,
  stream: boolean
): Promise<string | ReadableStream<Uint8Array>> {
  // Convert messages to Gemini format
  const systemMessage = messages.find((m) => m.role === "system")
  const chatMessages = messages.filter((m) => m.role !== "system")

  const contents = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const endpoint = stream ? "streamGenerateContent" : "generateContent"
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${client.apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.max_tokens ?? 4096,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  if (stream && response.body) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    return new ReadableStream({
      async start(controller) {
        let buffer = ""
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            
            // Gemini returns JSON array chunks
            try {
              // Try to parse complete JSON objects
              const jsonMatch = buffer.match(/\{[^{}]*"text"[^{}]*\}/g)
              if (jsonMatch) {
                for (const match of jsonMatch) {
                  try {
                    const parsed = JSON.parse(match)
                    if (parsed.text) {
                      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: parsed.text } }] })}\n\n`
                      controller.enqueue(encoder.encode(sseData))
                    }
                  } catch {
                    // Continue
                  }
                }
                buffer = ""
              }
            } catch {
              // Continue accumulating
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
}
