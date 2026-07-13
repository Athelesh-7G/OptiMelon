"use client"

import { useState } from "react"
import { Settings, X, ChevronDown, ChevronUp, Trash2, Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ModelSelector } from "./ModelSelector"
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/promptTemplate"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { Provider } from "@/lib/storage"

interface SettingsPanelProps {
  isOpen: boolean
  onToggle: () => void
  provider: Provider
  model: string
  temperature: number
  streaming: boolean
  systemPrompt: string | null
  onProviderChange: (provider: Provider) => void
  onModelChange: (model: string) => void
  onTemperatureChange: (temp: number) => void
  onStreamingChange: (enabled: boolean) => void
  onSystemPromptChange: (prompt: string | null) => void
  onClearChat: () => void
}

export function SettingsPanel({
  isOpen,
  onToggle,
  provider,
  model,
  temperature,
  streaming,
  systemPrompt,
  onProviderChange,
  onModelChange,
  onTemperatureChange,
  onStreamingChange,
  onSystemPromptChange,
  onClearChat,
}: SettingsPanelProps) {
  const [promptOpen, setPromptOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-card border border-border hover:bg-secondary hover:border-primary/30 transition-all duration-200 shadow-sm"
        aria-label={isOpen ? "Close settings" : "Open settings"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
            onClick={onToggle}
            aria-label="Close settings"
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-background border-l border-border z-40 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="p-6 pt-16">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Settings</h2>
                  <p className="text-xs text-muted-foreground">Configure your AI assistant</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Theme Selection */}
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Theme</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                        theme === "light"
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Sun className="h-4 w-4" />
                      <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                        theme === "dark"
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Moon className="h-4 w-4" />
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                        theme === "system"
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Monitor className="h-4 w-4" />
                      <span className="text-sm font-medium">System</span>
                    </button>
                  </div>
                </div>

                {/* Model Selection */}
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Model</h3>
                  <ModelSelector
                    provider={provider}
                    model={model}
                    onProviderChange={onProviderChange}
                    onModelChange={onModelChange}
                  />
                </div>

                {/* Parameters */}
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Parameters</h3>
                  
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="temperature" className="text-sm">Temperature</Label>
                        <span className="text-sm text-primary font-mono font-medium px-2 py-0.5 rounded-md bg-primary/10">
                          {temperature.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        id="temperature"
                        value={[temperature]}
                        onValueChange={([v]) => onTemperatureChange(v)}
                        min={0}
                        max={2}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Lower = more focused, Higher = more creative
                      </p>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label htmlFor="streaming" className="text-sm">Streaming</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Show response as it generates</p>
                      </div>
                      <Switch
                        id="streaming"
                        checked={streaming}
                        onCheckedChange={onStreamingChange}
                      />
                    </div>
                  </div>
                </div>

                {/* System Prompt */}
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
                  <Collapsible open={promptOpen} onOpenChange={setPromptOpen}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center justify-between w-full text-left">
                        <div>
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">System Prompt</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">Customize assistant behavior</p>
                        </div>
                        {promptOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <Textarea
                        value={systemPrompt ?? ""}
                        onChange={(e) => onSystemPromptChange(e.target.value || null)}
                        placeholder="Enter a custom system prompt..."
                        className="min-h-[180px] font-mono text-sm rounded-xl bg-card"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSystemPromptChange(DEFAULT_SYSTEM_PROMPT)}
                          className="rounded-lg"
                        >
                          Reset Default
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSystemPromptChange(null)}
                          className="rounded-lg"
                        >
                          Disable
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* Danger Zone */}
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="destructive"
                    onClick={onClearChat}
                    className="w-full rounded-xl gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Chat History
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
