export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ChatParams {
  temperature?: number
  max_tokens?: number
}

export interface BytezClient {
  apiKey: string
}

export function createBytezClient(apiKey: string): BytezClient {
  return { apiKey }
}

export async function sendBytezMessage(
  client: BytezClient,
  model: string,
  messages: Message[],
  params: ChatParams,
  stream: boolean
): Promise<string | ReadableStream<Uint8Array>> {
  // Bytez API endpoint: POST /models/v2/{modelId}
  const encodedModel = encodeURIComponent(model)
  const url = `https://api.bytez.com/models/v2/${encodedModel}`

  console.log("[v0] Bytez request URL:", url)

  // Bytez uses non-streaming by default - their SDK's model.run() is synchronous
  // We'll always get the full response, then convert to SSE stream for the frontend if needed
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: client.apiKey,
    },
    body: JSON.stringify({
      messages,
      params: {
        temperature: params.temperature ?? 0.7,
        max_length: params.max_tokens ?? 4096,
      },
    }),
  })

  console.log("[v0] Bytez response status:", response.status)

  if (!response.ok) {
    const error = await response.text()
    console.log("[v0] Bytez error response:", error)
    throw new Error(`Bytez API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  console.log("[v0] Bytez response data:", JSON.stringify(data).substring(0, 500))
  
  // Handle Bytez response format: { error: null, output: "..." }
  if (data.error) {
    throw new Error(`Bytez error: ${data.error}`)
  }
  
  // Extract output - can be string, object with content, tuple, etc.
  let output = data.output
  
  // Handle tuple format: [output, metadata]
  if (Array.isArray(output)) {
    output = output[0]
  }
  
  let text: string
  if (typeof output === "string") {
    text = output
  } else if (typeof output === "object" && output !== null) {
    if ("content" in output) text = output.content
    else if ("text" in output) text = output.text
    else text = JSON.stringify(output)
  } else {
    text = String(output ?? "No response")
  }
  
  // If streaming requested, convert the full response to SSE format
  if (stream) {
    const encoder = new TextEncoder()
    return new ReadableStream({
      start(controller) {
        // Send the full text as a single SSE event
        const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
        controller.enqueue(encoder.encode(sseData))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      }
    })
  }
  
  return text
}
