"use client"

import React from "react"
import { useState, useCallback, useMemo, useId } from "react"
import { Check, Copy, RefreshCw, Pencil } from "lucide-react"
import { extractCodeBlocks, parseBlockMarkdown } from "@/lib/markdown"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  modelName?: string
  isStreaming?: boolean
  onCopy?: (content: string) => void
  onEdit?: (content: string) => void
  onRegenerate?: () => void
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div
      className="group/code my-3 overflow-hidden"
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-color)",
        background: "var(--bg-elevated)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-1.5"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="font-mono text-[11px] uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] opacity-0 group-hover/code:opacity-100 transition-opacity"
          style={{ color: copied ? "var(--accent)" : "var(--text-secondary)" }}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto scrollbar-melon" style={{ padding: "12px 16px" }}>
        <code className="font-mono text-[13px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {code}
        </code>
      </pre>
    </div>
  )
}

function parseSoftInlineMarkdown(text: string): string {
  const escapeHtml = (str: string): string => {
    const entities: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }
    return str.replace(/[&<>"']/g, (char) => entities[char])
  }

  let result = escapeHtml(text)
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
  result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
  result = result.replace(/`([^`]+?)`/g, '<code class="inline-code">$1</code>')
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline">$1</a>'
  )
  result = result.replace(/\*{1,2}$/, "")
  return result
}

function renderTextContent(text: string, keyPrefix: string): React.ReactNode[] {
  const blocks = parseBlockMarkdown(text)

  return blocks.map((block, i) => {
    const stableKey = `${keyPrefix}-${block.type}-${i}`

    if (block.type === "heading") {
      return (
        <p key={stableKey} className="text-[15px] font-semibold mt-3 mb-1.5" style={{ color: "var(--text-primary)" }}>
          <span dangerouslySetInnerHTML={{ __html: parseSoftInlineMarkdown(block.content) }} />
        </p>
      )
    }

    if (block.type === "ul") {
      const items = block.content.split("\n").filter((item) => item.trim())
      return (
        <ul key={stableKey} className="my-2 space-y-1 pl-5 list-disc" style={{ color: "var(--text-primary)" }}>
          {items.map((item, j) => (
            <li key={`${stableKey}-item-${j}`} className="leading-relaxed text-[15px]">
              <span dangerouslySetInnerHTML={{ __html: parseSoftInlineMarkdown(item) }} />
            </li>
          ))}
        </ul>
      )
    }

    if (block.type === "ol") {
      const items = block.content.split("\n").filter((item) => item.trim())
      return (
        <ol key={stableKey} className="my-2 space-y-1 pl-5 list-decimal" style={{ color: "var(--text-primary)" }}>
          {items.map((item, j) => (
            <li key={`${stableKey}-item-${j}`} className="leading-relaxed text-[15px]">
              <span dangerouslySetInnerHTML={{ __html: parseSoftInlineMarkdown(item) }} />
            </li>
          ))}
        </ol>
      )
    }

    return (
      <p key={stableKey} className="mb-3 last:mb-0 text-[15px]" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
        <span dangerouslySetInnerHTML={{ __html: parseSoftInlineMarkdown(block.content) }} />
      </p>
    )
  })
}

function renderContent(content: string, uniqueId: string): React.ReactNode[] {
  const codeBlocks = extractCodeBlocks(content)

  if (codeBlocks.length === 0) {
    return renderTextContent(content, `${uniqueId}-content`)
  }

  const elements: React.ReactNode[] = []
  let lastIndex = 0

  codeBlocks.forEach((block, index) => {
    if (block.startIndex > lastIndex) {
      const textBefore = content.slice(lastIndex, block.startIndex).trim()
      if (textBefore) elements.push(...renderTextContent(textBefore, `${uniqueId}-before-${index}`))
    }
    elements.push(<CodeBlock key={`${uniqueId}-code-${index}`} language={block.language} code={block.code} />)
    lastIndex = block.endIndex
  })

  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex).trim()
    if (textAfter) elements.push(...renderTextContent(textAfter, `${uniqueId}-after`))
  }

  return elements
}

function ActionButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded-md transition-colors"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

export function MessageBubble({
  role,
  content,
  modelName,
  isStreaming,
  onCopy,
  onEdit,
  onRegenerate,
}: MessageBubbleProps) {
  const id = useId()
  const renderedContent = useMemo(() => renderContent(content, id), [content, id])
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    onCopy?.(content)
    setTimeout(() => setCopied(false), 2000)
  }, [content, onCopy])

  const handleEdit = useCallback(() => onEdit?.(content), [content, onEdit])

  if (role === "user") {
    return (
      <div className="group flex flex-col items-end" style={{ animation: "messageEnter 0.3s ease-out" }}>
        <div
          className="max-w-[85%]"
          style={{
            background: "var(--bg-elevated)",
            padding: "10px 16px",
            borderRadius: "var(--radius-lg)",
            color: "var(--text-primary)",
          }}
        >
          <div className="whitespace-pre-wrap text-[15px]">{content}</div>
        </div>
        <div className="flex gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton onClick={handleCopy} label={copied ? "Copied" : "Copy message"}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </ActionButton>
          {onEdit && (
            <ActionButton onClick={handleEdit} label="Edit message">
              <Pencil size={16} />
            </ActionButton>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex flex-col items-start" style={{ animation: "messageEnter 0.3s ease-out" }}>
      {modelName && (
        <span className="mb-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
          {modelName}
        </span>
      )}
      <div className={`max-w-none w-full ${isStreaming ? "streaming-caret" : ""}`}>
        {renderedContent}
      </div>
      {/* Actions after message (DOM order for accessibility) */}
      {!isStreaming && content.trim().length > 0 && (
        <div className="flex gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton onClick={handleCopy} label={copied ? "Copied" : "Copy response"}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </ActionButton>
          {onRegenerate && (
            <ActionButton onClick={onRegenerate} label="Regenerate">
              <RefreshCw size={16} />
            </ActionButton>
          )}
        </div>
      )}
    </div>
  )
}
