"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Code, Pen, Brain, Globe, Sparkles } from "lucide-react"
import {
  AVAILABLE_MODELS,
  MODEL_CATEGORIES,
  getModelById,
  getModelsByCategory,
  type ModelCategory,
} from "@/lib/models"

interface ChatModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
}

// Category config with icon and color - using canonical watermelon red tokens
const CATEGORY_CONFIG: Record<ModelCategory, { icon: React.ReactNode; color: string; bgColor: string }> = {
  general: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: "var(--melon-green)",
    bgColor: "color-mix(in srgb, var(--melon-green) 15%, transparent)",
  },
  coders: {
    icon: <Code className="h-3.5 w-3.5" />,
    color: "var(--melon-red)",
    bgColor: "var(--melon-red-muted)",
  },
  creators: {
    icon: <Pen className="h-3.5 w-3.5" />,
    color: "var(--melon-red)",
    bgColor: "var(--melon-red-muted)",
  },
  reasoning: {
    icon: <Brain className="h-3.5 w-3.5" />,
    color: "#7C3AED",
    bgColor: "rgba(124, 58, 237, 0.15)",
  },
  enterprise: {
    icon: <Globe className="h-3.5 w-3.5" />,
    color: "#2563EB",
    bgColor: "rgba(37, 99, 235, 0.15)",
  },
}

// Individual Category Dropdown Component
function CategoryDropdown({
  category,
  selectedModel,
  onModelChange,
}: {
  category: ModelCategory
  selectedModel: string
  onModelChange: (modelId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const config = CATEGORY_CONFIG[category]
  const models = getModelsByCategory(category)
  const categoryInfo = MODEL_CATEGORIES.find((c) => c.id === category)
  
  // Check if selected model is in this category
  const selectedInThisCategory = models.some((m) => m.id === selectedModel)
  const selectedModelInCategory = models.find((m) => m.id === selectedModel)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Category Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200 text-xs font-medium ${
          selectedInThisCategory ? "ring-1" : "hover:border-border"
        }`}
        style={{
          background: selectedInThisCategory ? config.bgColor : "var(--secondary)",
          borderColor: selectedInThisCategory ? config.color : "var(--border)",
          color: selectedInThisCategory ? config.color : "var(--muted-foreground)",
          ...({ "--tw-ring-color": selectedInThisCategory ? config.color : undefined } as React.CSSProperties),
        }}
      >
        {config.icon}
        <span>{categoryInfo?.label}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ opacity: 0.6 }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 z-50 min-w-[220px] rounded-lg border shadow-xl overflow-hidden bg-popover"
          style={{
            borderColor: "var(--border)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Category Header */}
          <div
            className="px-3 py-2 border-b flex items-center gap-2"
            style={{
              borderColor: "var(--border)",
              background: config.bgColor,
            }}
          >
            <span style={{ color: config.color }}>{config.icon}</span>
            <span className="text-xs font-semibold" style={{ color: config.color }}>
              {categoryInfo?.label}
            </span>
            <span className="text-[10px] ml-auto text-muted-foreground">
              {models.length} model{models.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Models List */}
          <div className="p-1.5 max-h-[200px] overflow-y-auto scrollbar-melon">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all duration-200 text-left ${
                  selectedModel === model.id ? "" : "hover:bg-secondary"
                }`}
                style={{
                  background: selectedModel === model.id ? config.bgColor : "transparent",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{
                      color: selectedModel === model.id ? config.color : "var(--foreground)",
                    }}
                  >
                    {model.name}
                  </div>
                  <div className="text-[10px] truncate text-muted-foreground">
                    {model.contextLength}
                  </div>
                </div>
                {selectedModel === model.id && (
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: config.color }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChatModelSelector({
  selectedModel,
  onModelChange,
}: ChatModelSelectorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5">
        {MODEL_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="h-8 w-20 rounded-lg animate-pulse bg-secondary"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {MODEL_CATEGORIES.map((category) => (
        <CategoryDropdown
          key={category.id}
          category={category.id}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
        />
      ))}
    </div>
  )
}
