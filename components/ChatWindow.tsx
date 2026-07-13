"use client"

import React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowUp, Square } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { MessageBubble } from "./MessageBubble"
import { SettingsPanel } from "./SettingsPanel"
import { Sidebar } from "./Sidebar"
import { ChatModelSelector } from "./ChatModelSelector"
import { FileUpload, type UploadedFile } from "./FileUpload"
import { MelonIcon } from "@/components/ui/MelonIcon"
import { DEFAULT_SYSTEM_PROMPT, buildMessages } from "@/lib/promptTemplate"
import { DEFAULT_MODEL_ID, getModelDisplayName } from "@/lib/models"
import {
  saveMessages,
  loadMessages,
  clearMessages,
  saveSettings,
  loadSettings,
  type StoredMessage,
  type Provider,
} from "@/lib/storage"

interface Chat {
  id: string
  title: string
  updatedAt: number
  messages: StoredMessage[]
}

const SUGGESTIONS = [
  "Explain a concept",
  "Debug my code",
  "Write something creative",
  "Compare two ideas",
]

export function ChatWindow() {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const [provider, setProvider] = useState<Provider>("bytez")
  const [model, setModel] = useState(DEFAULT_MODEL_ID)
  const [temperature, setTemperature] = useState(0.7)
  const [streaming, setStreaming] = useState(true)
  const [systemPrompt, setSystemPrompt] = useState<string | null>(DEFAULT_SYSTEM_PROMPT)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && sidebarOpen) setSidebarOpen(false)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const storedMessages = loadMessages()
    const storedSettings = loadSettings()
    if (storedMessages.length > 0) setMessages(storedMessages)
    if (storedSettings) {
      setProvider(storedSettings.provider)
      setModel(storedSettings.model)
      setTemperature(storedSettings.temperature)
      setStreaming(storedSettings.streaming)
      setSystemPrompt(storedSettings.systemPrompt)
    }
  }, [])

  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  useEffect(() => {
    saveSettings({ provider, model, temperature, streaming, systemPrompt })
  }, [provider, model, temperature, streaming, systemPrompt])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea (max 8 rows)
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 192)}px`
  }, [input])

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
  }, [])

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return

    let messageContent = input.trim()
    if (uploadedFiles.length > 0) {
      const fileDescriptions = uploadedFiles
        .map((f) => (f.type.startsWith("image/") ? `[Image: ${f.name}]` : `[File: ${f.name} (${f.type})]`))
        .join("\n")
      messageContent = messageContent
        ? `${messageContent}\n\nAttached files:\n${fileDescriptions}`
        : `Attached files:\n${fileDescriptions}`
    }

    const userMessage: StoredMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setUploadedFiles([])
    setError(null)
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    abortControllerRef.current = new AbortController()

    try {
      const conversationMessages = [...messages, userMessage].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))

      const fullMessages = buildMessages(systemPrompt, conversationMessages, model, provider)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: fullMessages,
          provider,
          model,
          params: { temperature, max_tokens: 4096 },
          stream: streaming,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get response")
      }

      if (streaming && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let assistantContent = ""

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
        ])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  assistantContent += content
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
                  )
                }
              } catch {
                if (data.trim() && data !== "[DONE]") {
                  assistantContent += data
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
                  )
                }
              }
            }
          }
        }
      } else {
        const data = await response.json()
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: data.reply, timestamp: Date.now() },
        ])
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message)
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [input, messages, provider, model, temperature, streaming, systemPrompt, isLoading, uploadedFiles])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoading) handleStop()
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [isLoading, handleStop])

  const handleClearChat = useCallback(() => {
    setMessages([])
    clearMessages()
    setError(null)
  }, [])

  const handleNewChat = useCallback(() => {
    const newChatId = crypto.randomUUID()
    if (currentChatId && messages.length > 0) {
      setChats((prev) => {
        const existing = prev.find((c) => c.id === currentChatId)
        if (existing) {
          return prev.map((c) =>
            c.id === currentChatId ? { ...c, messages, updatedAt: Date.now() } : c
          )
        }
        return [
          ...prev,
          {
            id: currentChatId,
            title: messages[0]?.content.slice(0, 50) || "New Chat",
            messages,
            updatedAt: Date.now(),
          },
        ]
      })
    }
    setCurrentChatId(newChatId)
    setMessages([])
    setInput("")
    setError(null)
  }, [currentChatId, messages])

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (currentChatId && messages.length > 0) {
        setChats((prev) =>
          prev.map((c) => (c.id === currentChatId ? { ...c, messages, updatedAt: Date.now() } : c))
        )
      }
      const selectedChat = chats.find((c) => c.id === chatId)
      if (selectedChat) {
        setCurrentChatId(chatId)
        setMessages(selectedChat.messages)
        setError(null)
      }
    },
    [chats, currentChatId, messages]
  )

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      setChats((prev) => prev.filter((c) => c.id !== chatId))
      if (currentChatId === chatId) handleNewChat()
    },
    [currentChatId, handleNewChat]
  )

  const handleEditMessage = useCallback((messageContent: string) => {
    setInput(messageContent)
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!currentChatId && chats.length === 0) setCurrentChatId(crypto.randomUUID())
  }, [currentChatId, chats.length])

  const chatSummaries = chats.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt }))
  const hasText = input.trim().length > 0
  const showEmpty = messages.length === 0

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar
        chats={chatSummaries}
        currentChatId={currentChatId}
        selectedModel={model}
        onSelectModel={setModel}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setSettingsOpen(!settingsOpen)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div
        className="flex flex-col flex-1 min-w-0 relative transition-all duration-300 ease-in-out"
        style={{ marginLeft: !isMobile ? (sidebarOpen ? "240px" : "40px") : "0" }}
      >
        {/* Header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6"
          style={{ height: "52px", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span className="text-[14px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {getModelDisplayName(model)}
          </span>
          <ChatModelSelector selectedModel={model} onModelChange={setModel} provider={provider} />
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto scrollbar-melon">
          <div className="mx-auto" style={{ maxWidth: "720px", padding: "24px 24px 120px" }}>
            {showEmpty ? (
              <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: "60vh" }}>
                <MelonIcon variant="slice" size={48} />
                <h2 className="mt-6 text-[24px] font-medium" style={{ color: "var(--text-primary)" }}>
                  What do you want to explore?
                </h2>
                <p className="mt-2 text-[15px]" style={{ color: "var(--text-secondary)" }}>
                  Select a model and start experimenting.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s)
                        textareaRef.current?.focus()
                      }}
                      className="px-3.5 py-2 rounded-full text-[13px] transition-colors"
                      style={{
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface)",
                        color: "var(--text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)"
                        e.currentTarget.style.color = "var(--text-primary)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border-color)"
                        e.currentTarget.style.color = "var(--text-secondary)"
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, i) => {
                  const isLast = i === messages.length - 1
                  const isStreamingThis = isLoading && streaming && isLast && message.role === "assistant"
                  return (
                    <MessageBubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      modelName={message.role === "assistant" ? getModelDisplayName(model) : undefined}
                      isStreaming={isStreamingThis}
                      onEdit={message.role === "user" ? handleEditMessage : undefined}
                    />
                  )
                })}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex items-center gap-1.5" style={{ paddingLeft: "2px" }}>
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="seed-pulse inline-flex"
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        <MelonIcon variant="seed" size={5} />
                      </span>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input area */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--bg-base) 40%)",
            paddingTop: "24px",
          }}
        >
          <div className="mx-auto px-4 pb-4" style={{ maxWidth: "720px" }}>
            {error && (
              <div
                className="mb-2 px-3 py-2 rounded-[10px] text-[13px]"
                style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
              >
                {error}
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="mb-2">
                <FileUpload files={uploadedFiles} onFilesChange={setUploadedFiles} disabled={isLoading} />
              </div>
            )}

            <div
              className="flex items-end gap-2 px-3 py-2.5 transition-colors"
              style={{
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-focus)",
                background: "var(--bg-input)",
              }}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
            >
              <div className="flex-shrink-0">
                <FileUpload
                  files={[]}
                  onFilesChange={(newFiles) => setUploadedFiles((prev) => [...prev, ...newFiles])}
                  disabled={isLoading}
                />
              </div>

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message OptiMelon..."
                rows={1}
                className="flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-[15px] min-h-[24px]"
                style={{ color: "var(--text-primary)" }}
                disabled={isLoading}
              />

              {isLoading ? (
                <button
                  onClick={handleStop}
                  className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
                  style={{ width: "32px", height: "32px", background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                  title="Stop generation (Esc)"
                  aria-label="Stop generation"
                >
                  <Square size={14} className="fill-current" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!hasText && uploadedFiles.length === 0}
                  className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
                  style={{
                    width: "32px",
                    height: "32px",
                    background: hasText || uploadedFiles.length > 0 ? "var(--accent)" : "var(--bg-elevated)",
                    color: hasText || uploadedFiles.length > 0 ? "var(--text-inverse)" : "var(--text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    if (hasText || uploadedFiles.length > 0) e.currentTarget.style.background = "var(--accent-hover)"
                  }}
                  onMouseLeave={(e) => {
                    if (hasText || uploadedFiles.length > 0) e.currentTarget.style.background = "var(--accent)"
                  }}
                  aria-label="Send message"
                >
                  <ArrowUp size={16} />
                </button>
              )}
            </div>

            <p className="text-center mt-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
              OptiMelon routes across 10+ open models. Results may vary.
            </p>
          </div>
        </div>

        <SettingsPanel
          isOpen={settingsOpen}
          onToggle={() => setSettingsOpen(!settingsOpen)}
          provider={provider}
          model={model}
          temperature={temperature}
          streaming={streaming}
          systemPrompt={systemPrompt}
          onProviderChange={setProvider}
          onModelChange={setModel}
          onTemperatureChange={setTemperature}
          onStreamingChange={setStreaming}
          onSystemPromptChange={setSystemPrompt}
          onClearChat={handleClearChat}
        />
      </div>
    </div>
  )
}
