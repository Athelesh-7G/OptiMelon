import { NextRequest } from "next/server"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  // Code files
  "text/javascript",
  "text/typescript",
  "text/html",
  "text/css",
  "application/json",
  "text/x-python",
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      )
    }

    // Validate file type
    const isAllowedType =
      ALLOWED_TYPES.includes(file.type) || file.type.startsWith("text/")
    if (!isAllowedType) {
      return Response.json(
        { error: `File type "${file.type}" is not supported` },
        { status: 400 }
      )
    }

    // Read file content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // For text-based files, we can extract the content directly
    let textContent: string | null = null
    if (
      file.type.startsWith("text/") ||
      file.type === "application/json" ||
      file.type === "text/markdown"
    ) {
      textContent = buffer.toString("utf-8")
    }

    // Generate a unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `${timestamp}-${sanitizedName}`

    // In a production app, you would upload to a storage service like:
    // - Vercel Blob
    // - AWS S3
    // - Cloudflare R2
    // For this demo, we'll store the content in memory and return a data URL for images
    // or return the text content directly for text files

    let url: string
    let content: string | null = null

    if (file.type.startsWith("image/")) {
      // For images, create a base64 data URL
      const base64 = buffer.toString("base64")
      url = `data:${file.type};base64,${base64}`
    } else if (textContent) {
      // For text files, we'll use a placeholder URL and include content
      url = `/uploads/${filename}`
      content = textContent
    } else {
      // For other files (PDF, Word docs), use a placeholder
      // In production, these would be uploaded to cloud storage
      url = `/uploads/${filename}`
    }

    return Response.json({
      success: true,
      url,
      filename,
      originalName: file.name,
      type: file.type,
      size: file.size,
      content, // Text content if available
    })
  } catch (error) {
    console.error("Upload error:", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    return Response.json({ error: message }, { status: 500 })
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
