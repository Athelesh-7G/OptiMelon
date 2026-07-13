"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AVAILABLE_MODELS, MODEL_CATEGORIES, getModelsByCategory } from "@/lib/models"
import type { Provider } from "@/lib/storage"

interface ModelSelectorProps {
  provider: Provider
  model: string
  onProviderChange: (provider: Provider) => void
  onModelChange: (model: string) => void
}

export function ModelSelector({
  model,
  onModelChange,
}: ModelSelectorProps) {
  // Find current model info
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === model)

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger id="model" className="bg-card">
            <SelectValue placeholder="Select model">
              {currentModel?.name || model}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MODEL_CATEGORIES.map((category) => {
              const categoryModels = getModelsByCategory(category.id)
              if (categoryModels.length === 0) return null
              
              return (
                <div key={category.id}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {category.label} {category.icon}
                  </div>
                  {categoryModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </div>
              )
            })}
          </SelectContent>
        </Select>
        {currentModel && (
          <p className="text-xs text-muted-foreground">
            Context: {currentModel.contextLength}
          </p>
        )}
      </div>
    </div>
  )
}
