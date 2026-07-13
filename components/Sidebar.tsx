"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Settings, Trash2, Linkedin, Instagram, Mail, PanelLeft, ChevronRight, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

interface Chat {
  id: string
  title: string
  updatedAt: number
}

interface SidebarProps {
  chats: Chat[]
  currentChatId: string | null
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onOpenSettings: () => void
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenSettings,
  isOpen,
  onToggle,
}: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false)

  // Handle responsive detection after mount to avoid hydration issues
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Initial check
    checkMobile()
    
    // Listen for resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close sidebar when selecting chat on mobile
  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId)
    if (isMobile) {
      onToggle()
    }
  }

  const handleNewChat = () => {
    onNewChat()
    if (isMobile) {
      onToggle()
    }
  }

  return (
    <>
      {/* Backdrop - only show on mobile when sidebar is open */}
      {isMobile && isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30"
          onClick={onToggle}
          aria-label="Close sidebar"
        />
      )}

      {/* Peek strip - visible when sidebar is closed (desktop only) */}
      {!isMobile && !isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-0 h-screen w-10 z-40 flex items-center justify-center bg-sidebar/50 backdrop-blur-md border-r border-sidebar-border hover:bg-sidebar/80 transition-colors group"
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
        </button>
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          w-[260px] h-screen flex flex-col border-r
          transition-transform duration-300 ease-in-out
          bg-sidebar border-sidebar-border
        `}
        style={{ 
          backdropFilter: 'blur(20px)' 
        }}
      >
        {/* Sidebar Header with Toggle */}
        <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label="watermelon">🍉</span>
            <span className="text-sm font-medium text-sidebar-foreground">Chats</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
            aria-label="Close sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
        
        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full melon-gradient hover:opacity-90 transition-all duration-200 text-sm text-white"
            style={{ boxShadow: "0 2px 6px var(--melon-red-muted)" }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

      {/* Chat History */}
      <nav className="flex-1 overflow-y-auto scrollbar-melon p-1.5">
        <div className="space-y-0.5">
          {chats.length === 0 ? (
            <div className="text-center py-6 px-3 text-muted-foreground">
              <p className="text-xs">No history</p>
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === currentChatId
              return (
                <div
                  key={chat.id}
                  className={`group relative rounded-md p-2 cursor-pointer transition-all duration-150 hover:bg-sidebar-accent ${
                    isActive ? "border-l-2 bg-primary/10 border-primary" : ""
                  }`}
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-xs font-medium truncate ${
                          isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70"
                        }`}
                      >
                        {chat.title}
                      </h4>
                      <p className="text-[10px] mt-0.5 text-muted-foreground">
                        {formatDistanceToNow(chat.updatedAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteChat(chat.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 transition-opacity"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-3">
        {/* Creator Block */}
        <div className="space-y-2">
          <div>
            <h3 className="text-xs font-semibold text-sidebar-foreground">
              Athelesh Balachandran
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Creator of OptiMelon
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.linkedin.com/in/athelesh-balachandran-60a07927a"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.instagram.com/athelesh_balachandran/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
              aria-label="Instagram"
            >
              <Instagram className="h-3.5 w-3.5" />
            </a>
            <a
              href="mailto:atheleshbalachandran14@gmail.com"
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
              aria-label="Email"
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* MelonScope Link */}
        <Button
          asChild
          variant="ghost"
          className="w-full justify-start hover:bg-sidebar-accent transition-colors text-xs text-muted-foreground"
        >
          <Link href="/melonscope">
            <BarChart2 className="h-3.5 w-3.5 mr-2" />
            MelonScope
          </Link>
        </Button>

        {/* Settings Button */}
        <Button
          onClick={onOpenSettings}
          variant="ghost"
          className="w-full justify-start hover:bg-sidebar-accent transition-colors text-xs text-muted-foreground"
        >
          <Settings className="h-3.5 w-3.5 mr-2" />
          Settings
        </Button>
      </div>
      </aside>
    </>
  )
}
