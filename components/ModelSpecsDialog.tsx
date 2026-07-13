"use client"

import { Check, Cpu, Zap } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ModelInfo } from "@/lib/models"

interface ModelSpecsDialogProps {
  model: ModelInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModelSpecsDialog({
  model,
  open,
  onOpenChange,
}: ModelSpecsDialogProps) {
  if (!model) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--melon-red-muted)" }}
            >
              <Cpu className="h-5 w-5" style={{ color: "var(--melon-red)" }} />
            </div>
            <div>
              <DialogTitle className="text-lg">{model.name}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {model.id}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context Length */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(152, 216, 200, 0.1)" }}
          >
            <Zap className="h-4 w-4" style={{ color: "var(--melon-green)" }} />
            <span className="text-sm font-medium">Context Window:</span>
            <span
              className="text-sm font-mono"
              style={{ color: "var(--melon-green)" }}
            >
              {model.contextLength}
            </span>
          </div>

          {/* Description */}
          <div>
            <h4
              className="text-sm font-semibold mb-2"
              style={{ color: "rgba(255, 255, 255, 0.9)" }}
            >
              Overview
            </h4>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(255, 255, 255, 0.7)" }}
            >
              {model.description}
            </p>
          </div>

          {/* Best For */}
          <div>
            <h4
              className="text-sm font-semibold mb-2"
              style={{ color: "rgba(255, 255, 255, 0.9)" }}
            >
              Best For
            </h4>
            <ul className="space-y-1.5">
              {model.bestFor.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: "rgba(255, 255, 255, 0.7)" }}
                >
                  <Check
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: "var(--melon-green)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {model.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs font-normal"
                style={{
                  background: "var(--melon-red-muted)",
                  borderColor: "var(--melon-red-border)",
                  color: "var(--melon-red)",
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
