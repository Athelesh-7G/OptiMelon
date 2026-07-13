export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatParams {
  temperature?: number
  max_tokens?: number
}

export interface ClaudeClient {
  apiKey: string
}

export function createClaudeClient(apiKey: string): ClaudeClient {
  return { apiKey }
}

export async function sendClaudeMessage(
  client: ClaudeClient,
  model: string,
  messages: Message[],
  params: ChatParams,
  stream: boolean
): Promise<string | ReadableStream<Uint8Array>> {
  // Extract system message if present
  const systemMessage = messages.find((m) => m.role === "system")
  const chatMessages = messages.filter((m) => m.role !== "system")

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": client.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: params.max_tokens ?? 4096,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  if (stream && response.body) {
    // Convert Claude's SSE format to OpenAI-compatible format
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
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") continue

                try {
                  const parsed = JSON.parse(data)
                  if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                    const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: parsed.delta.text } }] })}\n\n`
                    controller.enqueue(encoder.encode(sseData))
                  }
                } catch {
                  // Ignore parse errors
                }
              }
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
  return data.content?.[0]?.text ?? ""
}
