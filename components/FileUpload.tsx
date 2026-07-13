"use client"

import { useRef, useState } from "react"
import {
  Paperclip,
  Image,
  FileText,
  File,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  url: string
  preview?: string
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void
  files: UploadedFile[]
  disabled?: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
  code: [
    "text/javascript",
    "text/typescript",
    "text/html",
    "text/css",
    "application/json",
    "text/x-python",
  ],
}

const ALL_ACCEPTED_TYPES = [
  ...ACCEPTED_FILE_TYPES.image,
  ...ACCEPTED_FILE_TYPES.document,
  ...ACCEPTED_FILE_TYPES.code,
]

function getFileIcon(type: string) {
  if (ACCEPTED_FILE_TYPES.image.includes(type)) {
    return <Image className="h-4 w-4" />
  }
  if (ACCEPTED_FILE_TYPES.document.includes(type)) {
    return <FileText className="h-4 w-4" />
  }
  return <File className="h-4 w-4" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

export function FileUpload({ onFilesChange, files, disabled }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setError(null)
    setIsUploading(true)

    try {
      const newFiles: UploadedFile[] = []

      for (const file of Array.from(selectedFiles)) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          setError(`File "${file.name}" is too large. Max size is 10MB.`)
          continue
        }

        // Validate file type
        if (!ALL_ACCEPTED_TYPES.includes(file.type) && !file.type.startsWith("text/")) {
          setError(`File type "${file.type}" is not supported.`)
          continue
        }

        // Create a preview for images
        let preview: string | undefined
        if (ACCEPTED_FILE_TYPES.image.includes(file.type)) {
          preview = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        }

        // Upload to server
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Upload failed")
        }

        const data = await response.json()

        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: data.url,
          preview,
        })
      }

      onFilesChange([...files, ...newFiles])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
      // Reset inputs
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (imageInputRef.current) imageInputRef.current.value = ""
      if (documentInputRef.current) documentInputRef.current.value = ""
    }
  }

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Upload buttons */}
      <div className="flex items-center gap-1">
        {/* General file upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALL_ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg transition-all hover:scale-105 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          title="Attach file"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        {/* Image upload */}
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES.image.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg transition-all hover:scale-105 text-muted-foreground hover:text-foreground"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled || isUploading}
          title="Upload image"
        >
          <Image className="h-4 w-4" />
        </Button>

        {/* Document upload */}
        <input
          ref={documentInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES.document.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg transition-all hover:scale-105 text-muted-foreground hover:text-foreground"
          onClick={() => documentInputRef.current?.click()}
          disabled={disabled || isUploading}
          title="Upload document"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <p
          className="text-xs px-2"
          style={{ color: "var(--melon-red)" }}
        >
          {error}
        </p>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border max-w-[200px] group bg-card"
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <span className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                  {getFileIcon(file.type)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate text-foreground">
                  {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
