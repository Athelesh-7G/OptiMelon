"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { ChevronDown, Search } from "lucide-react"
import {
  AVAILABLE_MODELS,
  MODEL_CATEGORIES,
  getModelById,
  type ModelInfo,
} from "@/lib/models"

interface ChatModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  provider?: string
}

export function ChatModelSelector({ selectedModel, onModelChange, provider }: ChatModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const current = getModelById(selectedModel)
  const displayProvider = provider || current?.provider || ""

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return AVAILABLE_MODELS
    return AVAILABLE_MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    )
  }, [query])

  // Group filtered models by category (in MODEL_CATEGORIES order)
  const grouped = useMemo(() => {
    return MODEL_CATEGORIES.map((cat) => ({
      category: cat,
      models: filtered.filter((m) => m.category === cat.id),
    })).filter((g) => g.models.length > 0)
  }, [filtered])

  const handleSelect = (modelId: string) => {
    onModelChange(modelId)
    setIsOpen(false)
    setQuery("")
  }

  if (!mounted) {
    return <div style={{ width: "160px", height: "32px" }} className="rounded-[10px] animate-pulse" />
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 transition-colors"
        style={{
          height: "32px",
          padding: "0 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          fontSize: "13px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
      >
        {displayProvider && (
          <span
            className="uppercase"
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              padding: "2px 6px",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
            }}
          >
            {displayProvider}
          </span>
        )}
        <span className="truncate max-w-[160px]">{current?.name ?? selectedModel}</span>
        <ChevronDown
          size={14}
          style={{ color: "var(--text-secondary)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 z-50"
          style={{
            width: "280px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: "8px",
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 mb-2 px-2.5"
            style={{
              height: "34px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models..."
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto scrollbar-melon">
            {grouped.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
                No models found
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.category.id} className="mb-1">
                  <p
                    className="px-2.5 pt-2 pb-1"
                    style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}
                  >
                    {group.category.label}
                  </p>
                  {group.models.map((model: ModelInfo) => {
                    const isSelected = model.id === selectedModel
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className="w-full flex items-center gap-2 text-left transition-colors"
                        style={{
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          background: isSelected ? "var(--accent-subtle)" : "transparent",
                          borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "var(--bg-elevated)"
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "transparent"
                        }}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-[14px]" style={{ color: "var(--text-primary)" }}>
                            {model.name}
                          </span>
                          <span className="block truncate text-[12px]" style={{ color: "var(--text-muted)" }}>
                            {model.provider}
                          </span>
                        </span>
                        <span
                          className="flex-shrink-0"
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "var(--accent-subtle)",
                            color: "var(--accent)",
                          }}
                        >
                          {group.category.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
