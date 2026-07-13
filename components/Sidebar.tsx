"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Plus,
  Settings,
  Trash2,
  PanelLeft,
  ChevronRight,
  BarChart2,
  Layers,
  Sparkles,
  Code,
  Pen,
  Brain,
  Globe,
} from "lucide-react"
import { MelonIcon } from "@/components/ui/MelonIcon"
import {
  MODEL_CATEGORIES,
  getModelsByCategory,
  getModelById,
  DEFAULT_MODEL_ID,
  type ModelCategory,
} from "@/lib/models"

interface Chat {
  id: string
  title: string
  updatedAt: number
}

interface SidebarProps {
  chats: Chat[]
  currentChatId: string | null
  selectedModel: string
  onSelectModel: (modelId: string) => void
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onOpenSettings: () => void
  isOpen: boolean
  onToggle: () => void
}

const CATEGORY_ICONS: Record<ModelCategory, React.ReactNode> = {
  general: <Sparkles size={16} />,
  coders: <Code size={16} />,
  creators: <Pen size={16} />,
  reasoning: <Brain size={16} />,
  enterprise: <Globe size={16} />,
}

const labelStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

export function Sidebar({
  chats,
  currentChatId,
  selectedModel,
  onSelectModel,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenSettings,
  isOpen,
  onToggle,
}: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const activeCategory = getModelById(selectedModel)?.category

  const handleCategoryClick = (categoryId: ModelCategory | "all") => {
    if (categoryId === "all") {
      onSelectModel(DEFAULT_MODEL_ID)
      return
    }
    const models = getModelsByCategory(categoryId)
    if (models.length > 0) onSelectModel(models[0].id)
  }

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId)
    if (isMobile) onToggle()
  }

  const handleNewChat = () => {
    onNewChat()
    if (isMobile) onToggle()
  }

  const recentChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

  const pillBase =
    "w-full flex items-center gap-2.5 h-9 px-3 rounded-[10px] text-[13px] transition-colors duration-150 text-left"

  const categories: Array<{ id: ModelCategory | "all"; label: string; icon: React.ReactNode }> = [
    { id: "all", label: "All", icon: <Layers size={16} /> },
    ...MODEL_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: CATEGORY_ICONS[c.id] })),
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onToggle}
          aria-label="Close sidebar"
        />
      )}

      {/* Peek strip when closed (desktop) */}
      {!isMobile && !isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-0 h-screen w-10 z-40 flex items-center justify-center transition-colors"
          style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)" }}
          aria-label="Open sidebar"
        >
          <ChevronRight size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
      )}

      <aside
        className="fixed inset-y-0 left-0 z-40 h-screen flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: "240px",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between" style={{ padding: "20px 16px" }}>
          <div className="flex items-center gap-2">
            <MelonIcon variant="slice" size={28} />
            <span className="text-[15px] font-semibold" style={{ color: "var(--accent)" }}>
              OptiMelon
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close sidebar"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        {/* Models */}
        <div className="px-3 pb-2">
          <p style={labelStyle} className="px-3 mb-2">
            Models
          </p>
          <div className="space-y-0.5">
            {categories.map((cat) => {
              const isActive =
                cat.id === "all" ? activeCategory === undefined : activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={pillBase}
                  style={{
                    background: isActive ? "var(--accent-subtle)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--bg-elevated)"
                      e.currentTarget.style.color = "var(--text-primary)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "var(--text-secondary)"
                    }
                  }}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent */}
        <div className="flex-1 min-h-0 flex flex-col px-3 pt-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 h-9 px-3 rounded-[10px] text-[13px] mb-3 transition-colors"
            style={{
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              background: "transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>

          <p style={labelStyle} className="px-3 mb-2">
            Recent
          </p>
          <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-melon">
            {recentChats.length === 0 ? (
              <p className="px-3 py-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
                No conversations yet
              </p>
            ) : (
              <div className="space-y-0.5">
                {recentChats.map((chat) => {
                  const isActive = chat.id === currentChatId
                  return (
                    <div
                      key={chat.id}
                      className="group flex items-center gap-1.5 h-9 px-3 rounded-[10px] cursor-pointer transition-colors"
                      style={{
                        background: isActive ? "var(--bg-elevated)" : "transparent",
                      }}
                      onClick={() => handleSelectChat(chat.id)}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "var(--bg-elevated)"
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent"
                      }}
                    >
                      <span
                        className="flex-1 truncate text-[13px]"
                        style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
                      >
                        {chat.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteChat(chat.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
                        style={{ color: "var(--text-muted)" }}
                        aria-label="Delete chat"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Bottom nav */}
        <div className="px-3 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <Link
            href="/melonscope"
            className={pillBase}
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-elevated)"
              e.currentTarget.style.color = "var(--text-primary)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--text-secondary)"
            }}
          >
            <BarChart2 size={16} />
            <span>MelonScope</span>
          </Link>
          <button
            onClick={onOpenSettings}
            className={pillBase}
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-elevated)"
              e.currentTarget.style.color = "var(--text-primary)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--text-secondary)"
            }}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  )
}
