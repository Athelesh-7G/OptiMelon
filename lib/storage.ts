export interface StoredMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export type Provider =
  | "bytez"
  | "openai"
  | "claude"
  | "gemini"
  | "moonshot"
  | "deepseek"
  | "groq"
  | "together"

export interface StoredSettings {
  provider: Provider
  model: string
  temperature: number
  streaming: boolean
  systemPrompt: string | null
}

const MESSAGES_KEY = "optimel-messages"
const SETTINGS_KEY = "optimel-settings"

export function saveMessages(messages: StoredMessage[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages))
  } catch (e) {
    console.error("Failed to save messages:", e)
  }
}

export function loadMessages(): StoredMessage[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(MESSAGES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    console.error("Failed to load messages:", e)
    return []
  }
}

export function clearMessages(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(MESSAGES_KEY)
  } catch (e) {
    console.error("Failed to clear messages:", e)
  }
}

export function saveSettings(settings: StoredSettings): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error("Failed to save settings:", e)
  }
}

export function loadSettings(): StoredSettings | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (e) {
    console.error("Failed to load settings:", e)
    return null
  }
}
