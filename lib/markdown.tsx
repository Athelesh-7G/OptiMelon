export interface CodeBlock {
  language: string
  code: string
  startIndex: number
  endIndex: number
}

export function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  const blocks: CodeBlock[] = []
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || "plaintext",
      code: match[2].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return blocks
}

export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char])
}

export function parseInlineMarkdown(text: string): string {
  let result = escapeHtml(text)

  // Bold - melon tint
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium" style="color: rgba(255, 128, 128, 0.95);">$1</strong>')

  // Italic
  result = result.replace(/\*(.*?)\*/g, "<em>$1</em>")

  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80 transition-colors">$1</a>'
  )

  return result
}

// Parse block-level markdown (headers, lists)
// Safe for streaming: gracefully handles incomplete markdown
export function parseBlockMarkdown(text: string): { type: string; content: string; level?: number }[] {
  const lines = text.split('\n')
  const blocks: { type: string; content: string; level?: number }[] = []
  let currentList: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      blocks.push({
        type: listType,
        content: currentList.join('\n')
      })
      currentList = []
      listType = null
    }
  }

  for (const line of lines) {
    // Skip empty lines but flush any pending list
    if (!line.trim()) {
      flushList()
      continue
    }
    
    // Headers (h1, h2, h3) - must have space after # and content
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headerMatch) {
      flushList()
      blocks.push({
        type: 'heading',
        level: headerMatch[1].length,
        content: headerMatch[2].trim()
      })
      continue
    }
    
    // Handle incomplete header during streaming (just # without content yet)
    if (/^#{1,3}\s*$/.test(line)) {
      // Skip incomplete headers - they'll complete on next stream chunk
      continue
    }

    // Unordered lists - dash or asterisk followed by space and content
    const ulMatch = line.match(/^[\-\*]\s+(.+)$/)
    if (ulMatch) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      currentList.push(ulMatch[1].trim())
      continue
    }

    // Ordered lists - number followed by dot, space, and content
    const olMatch = line.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      currentList.push(olMatch[1].trim())
      continue
    }

    // Regular paragraph - any other non-empty line
    flushList()
    blocks.push({
      type: 'paragraph',
      content: line.trim()
    })
  }

  flushList()
  return blocks
}
