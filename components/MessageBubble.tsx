"use client"

import React from "react"
import { useState, useCallback, useMemo, useId } from "react"
import { Check, Copy, User, Pencil } from "lucide-react"
import { extractCodeBlocks, parseBlockMarkdown } from "@/lib/markdown"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  onCopy?: (content: string) => void
  onEdit?: (content: string) => void
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="my-3 rounded-xl border border-border overflow-hidden shadow-sm bg-muted dark:bg-[rgba(10,10,11,0.8)]">
      <div className="flex items-center justify-between px-4 py-2 text-sm border-b border-border bg-secondary/50">
        <span className="font-mono text-xs uppercase font-medium text-primary">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-200 border ${
            copied ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'
          }`}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto bg-secondary/30 p-4 scrollbar-melon">
        <code className="text-sm font-mono leading-relaxed text-foreground">{code}</code>
      </pre>
    </div>
  )
}

// Parse inline markdown with soft styling - clean rendering without artifacts
// Safe for streaming: handles incomplete markdown gracefully
function parseSoftInlineMarkdown(text: string, isUser: boolean = false): string {
  // Escape HTML first to prevent XSS
  const escapeHtml = (str: string): string => {
    const entities: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }
    return str.replace(/[&<>"']/g, (char) => entities[char])
  }
  
  let result = escapeHtml(text)
  
  // Bold - only match complete ** pairs (non-greedy, requires closing **)
  // Use white for user messages (on coral bg), inherit for assistant (theme-aware)
  if (isUser) {
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-medium text-white">$1</strong>')
  } else {
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-medium text-foreground">$1</strong>')
  }
  
  // Italic - only match complete single * pairs (not part of **)
  result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
  
  // Inline code - only match complete backtick pairs
  result = result.replace(/`([^`]+?)`/g, '<code class="inline-code">$1</code>')
  
  // Links - only match complete [text](url) patterns
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 transition-colors">$1</a>'
  )
  
  // Clean up any stray markdown characters that appear at line boundaries during streaming
  // This removes isolated ** or * that appear at the end (incomplete markdown)
  result = result.replace(/\*{1,2}$/, '')
  
  return result
}

function renderTextContent(text: string, keyPrefix: string, role: "user" | "assistant" = "assistant"): React.ReactNode[] {
  const blocks = parseBlockMarkdown(text)
  
  // Use black/dark text for user messages, inherit foreground for assistant (works with themes)
  const isUser = role === "user"
  
  return blocks.map((block, i) => {
    // Generate stable keys using index - no randomness
    const stableKey = `${keyPrefix}-${block.type}-${i}`
    
    if (block.type === 'heading') {
      // Soften headers - minimal visual distinction, natural text hierarchy
      // Render as styled text, not raw markdown (no "###" visible)
      const headingStyles: Record<number, string> = {
        1: "text-base font-semibold mt-3 mb-1.5",
        2: "text-base font-medium mt-2 mb-1",
        3: "text-base font-medium mt-2 mb-1"
      }
      const level = block.level ?? 1
      return (
        <p 
          key={stableKey} 
          className={`${headingStyles[level] ?? headingStyles[1]} ${isUser ? 'text-white' : 'text-foreground'}`}
        >
          <span dangerouslySetInnerHTML={{ __html: parseSoftInlineMarkdown(block.content, isUser) }} />
        </p>
      )
    }
    
    if (block.type === 'ul') {
      // Clean unordered list - no raw "-" or "*" visible
      const items = block.content.split('\n').filter(item => item.trim())
      return (
        <ul 
          key={stableKey} 
          className={`my-2 space-y-1 pl-5 list-disc ${isUser ? 'text-white' : 'text-foreground/80'}`}
        >
          {items.map((item, j) => (
            <li key={`${stableKey}-item-${j}`} className="leading-relaxed text-sm">
              <span dangerouslySetInnerHTML={{ __html: parseSoftInlineMarkdown(item, isUser) }} />
            </li>
          ))}
        </ul>
      )
    }
    
    if (block.type === 'ol') {
      // Clean ordered list - no raw "1." visible
      const items = block.content.split('\n').filter(item => item.trim())
      return (
        <ol 
          key={stableKey} 
          className={`my-2 space-y-1 pl-5 list-decimal ${isUser ? 'text-white' : 'text-foreground/80'}`}
        >
          {items.map((item, j) => (
            <li key={`${stableKey}-item-${j}`} className="leading-relaxed text-sm">
              <span dangerouslySetInnerHTML={{ __html: parseSoftInlineMarkdown(item, isUser) }} />
            </li>
          ))}
        </ol>
      )
    }
    
    // Regular paragraph - clean text without markdown artifacts
    return (
      <p 
        key={stableKey} 
        className={`mb-3 last:mb-0 leading-relaxed ${isUser ? 'text-white' : 'text-foreground/85'}`}
      >
        <span dangerouslySetInnerHTML={{ __html: parseSoftInlineMarkdown(block.content, isUser) }} />
      </p>
    )
  })
}

function renderContent(content: string, uniqueId: string, role: "user" | "assistant" = "assistant"): React.ReactNode[] {
  const codeBlocks = extractCodeBlocks(content)

  if (codeBlocks.length === 0) {
    return renderTextContent(content, `${uniqueId}-content`, role)
  }

  const elements: React.ReactNode[] = []
  let lastIndex = 0

  codeBlocks.forEach((block, index) => {
    if (block.startIndex > lastIndex) {
      const textBefore = content.slice(lastIndex, block.startIndex).trim()
      if (textBefore) {
        elements.push(...renderTextContent(textBefore, `${uniqueId}-before-${index}`, role))
      }
    }

    elements.push(<CodeBlock key={`${uniqueId}-code-${index}`} language={block.language} code={block.code} />)
    lastIndex = block.endIndex
  })

  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex).trim()
    if (textAfter) {
      elements.push(...renderTextContent(textAfter, `${uniqueId}-after`, role))
    }
  }

  return elements
}

export function MessageBubble({ role, content, onCopy, onEdit }: MessageBubbleProps) {
  // Use stable ID for hydration safety
  const id = useId()
  const renderedContent = useMemo(() => renderContent(content, id, role), [content, id, role])
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    onCopy?.(content)
    setTimeout(() => setCopied(false), 2000)
  }, [content, onCopy])

  const handleEdit = useCallback(() => {
    onEdit?.(content)
  }, [content, onEdit])

  return (
    <div
      className={`group flex gap-3 ${
        role === "user" ? "flex-row-reverse" : ""
      }`}
      style={{ animation: 'messageEnter 0.3s ease-out' }}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
          role === "user"
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "text-accent bg-accent/15"
        }`}
      >
        {role === "user" ? (
          <User className="h-4 w-4" />
        ) : (
          <span className="text-sm" role="img" aria-label="assistant">🍉</span>
        )}
      </div>
      <div className={`flex-1 max-w-[85%] ${role === "user" ? "ml-auto" : ""}`}>
        <div
          className={`rounded-2xl px-5 py-3.5 shadow-sm ${
            role === "user"
              ? "bg-gradient-to-br from-primary to-primary/90 border-l-2 border-l-primary"
              : "border border-border bg-card"
          }`}
        >
          <div className="max-w-none">
            {renderedContent}
          </div>
        </div>
        
        {/* Action buttons - ALWAYS visible for user messages */}
        {role === "user" && (
          <div className="flex justify-end gap-1.5 mt-2">
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-md transition-all duration-200 hover:scale-105 bg-secondary hover:bg-secondary/80 ${
                copied ? 'text-accent' : 'text-muted-foreground'
              }`}
              aria-label={copied ? "Copied" : "Copy message"}
              title="Copy message"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {onEdit && (
              <button
                onClick={handleEdit}
                className="p-1.5 rounded-md transition-all duration-200 hover:scale-105 bg-secondary hover:bg-secondary/80 text-muted-foreground"
                aria-label="Edit message"
                title="Edit message"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        
        {/* Copy button - ALWAYS visible for assistant messages */}
        {role === "assistant" && (
          <div className="flex justify-start gap-1.5 mt-2">
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-md transition-all duration-200 hover:scale-105 bg-secondary hover:bg-secondary/80 ${
                copied ? 'text-accent' : 'text-muted-foreground'
              }`}
              aria-label={copied ? "Copied" : "Copy response"}
              title="Copy response"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
