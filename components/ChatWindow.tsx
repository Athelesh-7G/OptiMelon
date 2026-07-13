"use client"

import React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Send, Loader2, Sparkles, Square, Code, Pen, Brain, Globe, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageBubble } from "./MessageBubble"
import { SettingsPanel } from "./SettingsPanel"
import { Sidebar } from "./Sidebar"
import { ChatModelSelector } from "./ChatModelSelector"
import { FileUpload, type UploadedFile } from "./FileUpload"
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

// Provider display names
const PROVIDER_NAMES: Record<Provider, string> = {
  bytez: "Bytez",
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
  moonshot: "Moonshot",
  deepseek: "DeepSeek",
  groq: "Groq",
  together: "Together",
}

interface Chat {
  id: string
  title: string
  updatedAt: number
  messages: StoredMessage[]
}

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
  
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Only show theme toggle after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle responsive detection after mount to avoid hydration issues
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Close sidebar on mobile by default
      if (mobile && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const storedMessages = loadMessages()
    const storedSettings = loadSettings()
    if (storedMessages.length > 0) {
      setMessages(storedMessages)
    }
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

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    // Immediately stop loading to return Send button
    setIsLoading(false)
  }, [])

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return

    // Build message content including file info
    let messageContent = input.trim()
    if (uploadedFiles.length > 0) {
      const fileDescriptions = uploadedFiles.map((f) => {
        if (f.type.startsWith("image/")) {
          return `[Image: ${f.name}]`
        }
        return `[File: ${f.name} (${f.type})]`
      }).join("\n")
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
    setUploadedFiles([]) // Clear files after sending
    setError(null)
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    
    // Create abort controller for this request
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
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantContent } : m
                    )
                  )
                }
              } catch {
                if (data.trim() && data !== "[DONE]") {
                  assistantContent += data
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantContent } : m
                    )
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
          {
            id: assistantId,
            role: "assistant",
            content: data.reply,
            timestamp: Date.now(),
          },
        ])
      }
    } catch (err) {
      // Don't show error if it was aborted
      if (err instanceof Error && err.name !== 'AbortError') {
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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Escape - Stop streaming
      if (e.key === 'Escape' && isLoading) {
        handleStop()
      }
    }
    
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isLoading, handleStop])

  const handleClearChat = useCallback(() => {
    setMessages([])
    clearMessages()
    setError(null)
  }, [])

  const handleNewChat = useCallback(() => {
    const newChatId = crypto.randomUUID()
    
    // Save current chat if it has messages
    if (currentChatId && messages.length > 0) {
      setChats((prev) => {
        const existing = prev.find((c) => c.id === currentChatId)
        if (existing) {
          return prev.map((c) =>
            c.id === currentChatId
              ? { ...c, messages, updatedAt: Date.now() }
              : c
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

  const handleSelectChat = useCallback((chatId: string) => {
    // Save current chat before switching
    if (currentChatId && messages.length > 0) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId
            ? { ...c, messages, updatedAt: Date.now() }
            : c
        )
      )
    }

    const selectedChat = chats.find((c) => c.id === chatId)
    if (selectedChat) {
      setCurrentChatId(chatId)
      setMessages(selectedChat.messages)
      setError(null)
    }
  }, [chats, currentChatId, messages])

  const handleDeleteChat = useCallback((chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId))
    if (currentChatId === chatId) {
      handleNewChat()
    }
  }, [currentChatId, handleNewChat])

  // Handle editing a user message - puts content back in input for re-submission
  const handleEditMessage = useCallback((messageContent: string) => {
    setInput(messageContent)
    // Focus the textarea
    textareaRef.current?.focus()
  }, [])

  // Initialize with a new chat
  useEffect(() => {
    if (!currentChatId && chats.length === 0) {
      setCurrentChatId(crypto.randomUUID())
    }
  }, [currentChatId, chats.length])

  return (
    <div className="flex h-screen bg-background relative">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setSettingsOpen(!settingsOpen)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Chat Panel - adjusts margin based on sidebar state (desktop only) */}
      <div 
        className="flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out"
        style={{ marginLeft: !isMobile ? (sidebarOpen ? '260px' : '40px') : '0' }}
      >
        {/* Header with glass effect */}
        <header className="flex-shrink-0 border-b border-border px-4 py-3 glass-card relative z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-label="watermelon">🍉</span>
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                OptiMelon
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-secondary/50">
                <span className="text-xs font-mono truncate max-w-[140px] text-muted-foreground">{getModelDisplayName(model)}</span>
              </div>
              {/* Theme Toggle Button */}
              {mounted && (
                <button
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-lg transition-all duration-200 hover:bg-secondary text-muted-foreground hover:text-foreground"
                  aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto scrollbar-melon relative">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="relative mb-6">
                <span className="text-7xl" role="img" aria-label="watermelon">🍉</span>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 animate-pulse" style={{ color: 'var(--melon-green)' }} />
              </div>
              <h2 className="text-3xl font-bold mb-4 tracking-tight text-foreground">
                Welcome to OptiMelon
              </h2>
              <p className="max-w-lg mb-5 leading-relaxed text-sm text-muted-foreground">
                10+ elite models &bull; Massive context &bull; Max performance
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-md">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-accent/15 text-accent">
                  <Code className="h-3 w-3" /> Coders
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-primary/15 text-primary">
                  <Pen className="h-3 w-3" /> Creators
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-accent/15 text-accent">
                  <Brain className="h-3 w-3" /> Reasoning
                </span>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-primary/15 text-primary">
                  <Globe className="h-3 w-3" /> Enterprise
                </span>
              </div>
              <p className="text-xs mb-6 max-w-sm text-muted-foreground">
                Upload files &bull; Switch instantly &bull; Chat now
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { text: "Help me code", icon: "code" },
                  { text: "Create content", icon: "pen" },
                  { text: "Analyze this", icon: "brain" },
                  { text: "Business task", icon: "globe" },
                ].map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => setInput(suggestion.text)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-border bg-card hover:bg-secondary hover:border-primary/30 transition-all duration-200 text-sm hover:scale-105 text-foreground shadow-sm"
                  >
                    {suggestion.icon === "code" && <Code className="h-3.5 w-3.5 text-primary" />}
                    {suggestion.icon === "pen" && <Pen className="h-3.5 w-3.5 text-primary" />}
                    {suggestion.icon === "brain" && <Brain className="h-3.5 w-3.5 text-primary" />}
                    {suggestion.icon === "globe" && <Globe className="h-3.5 w-3.5 text-primary" />}
                    <span className="font-medium">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  onEdit={message.role === "user" ? handleEditMessage : undefined}
                />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3" style={{ animation: 'messageEnter 0.3s ease-out' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent/15 text-accent">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="border border-border rounded-2xl px-4 py-3 shadow-sm bg-card">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/70">Generating response</span>
                      <span className="flex gap-1" aria-hidden="true">
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-primary" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-primary" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-primary" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                    <p className="text-xs mt-1 hidden sm:block text-muted-foreground">
                      Press <kbd className="px-1 py-0.5 rounded text-[10px] border border-border bg-secondary">Esc</kbd> to stop
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Error display */}
      {error && (
        <div className="flex-shrink-0 border-t px-4 py-3" style={{ background: 'var(--melon-red-muted)', borderColor: 'var(--melon-red-border)', animation: 'messageEnter 0.3s ease-out' }}>
          <div className="max-w-4xl mx-auto">
            <p className="text-sm" style={{ color: 'var(--melon-red)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Input area */}
      <footer className="flex-shrink-0 border-t border-border px-4 py-3 sticky bottom-0 bg-card/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          {/* File previews above input */}
          {uploadedFiles.length > 0 && (
            <div className="mb-2">
              <FileUpload
                files={uploadedFiles}
                onFilesChange={setUploadedFiles}
                disabled={isLoading}
              />
            </div>
          )}
          
          <div className="flex gap-2.5 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message OptiMelon..."
                className="min-h-[52px] max-h-[200px] resize-none pr-3 py-3 rounded-xl transition-all glass-input text-sm"
                disabled={isLoading}
              />
            </div>
            {isLoading ? (
              <Button
                onClick={handleStop}
                size="icon"
                className="h-[52px] w-[52px] rounded-xl transition-all duration-200 border flex-shrink-0 group"
                style={{
                  background: 'var(--melon-red-muted)',
                  borderColor: 'var(--melon-red-border)',
                  color: 'var(--melon-red)',
                  animation: 'pulseGlow 2s ease-in-out infinite'
                }}
                title="Stop generation (Esc)"
                aria-label="Stop generation"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                onClick={sendMessage}
                disabled={!input.trim() && uploadedFiles.length === 0}
                size="icon"
                className="h-[52px] w-[52px] rounded-xl melon-gradient shadow-md hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-white"
                style={{ boxShadow: '0 3px 12px var(--melon-red-muted)' }}
              >
                <Send className="h-4.5 w-4.5" />
              </Button>
            )}
          </div>
          
          {/* Bottom toolbar with file upload + model selectors (all left-aligned) */}
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
            <FileUpload
              files={[]}
              onFilesChange={(newFiles) => setUploadedFiles((prev) => [...prev, ...newFiles])}
              disabled={isLoading}
            />
            <ChatModelSelector
              selectedModel={model}
              onModelChange={setModel}
            />
          </div>
        </div>
      </footer>

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
