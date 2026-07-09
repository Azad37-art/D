'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Files, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { SearchScope } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  searchScope: SearchScope
  onScopeChange: (scope: SearchScope) => void
  disabled?: boolean
  isStreaming?: boolean
}

export function ChatInput({
  onSend,
  searchScope,
  onScopeChange,
  disabled = false,
  isStreaming = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSubmit = () => {
    if (value.trim() && !disabled && !isStreaming) {
      onSend(value.trim())
      setValue('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="relative mx-auto max-w-4xl">
        {/* Floating action button */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full border-border bg-card shadow-md"
              >
                {searchScope === 'current' ? (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-xs">Only this document</span>
                  </>
                ) : (
                  <>
                    <Files className="h-3.5 w-3.5" />
                    <span className="text-xs">Search all documents</span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => onScopeChange('current')}>
                <FileText className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Only this document</span>
                  <span className="text-xs text-muted-foreground">Search within the active file</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onScopeChange('all')}>
                <Files className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Search all documents</span>
                  <span className="text-xs text-muted-foreground">Query across your entire knowledge base</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Input container */}
        <div className={cn(
          'flex items-end gap-2 rounded-2xl border border-border bg-background p-2 transition-colors',
          'focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20',
          disabled && 'opacity-50'
        )}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask questions about this document..."
            disabled={disabled}
            rows={1}
            className={cn(
              'min-h-11 max-h-[200px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none',
              'scrollbar-thin scrollbar-thumb-border'
            )}
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {isStreaming && (
          <div className="mt-2 flex justify-center">
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              AI is responding...
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
