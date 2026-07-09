'use client'

import { Bot, User, Copy, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatContent = (content: string) => {
    const parts: React.ReactNode[] = []
    let currentIndex = 0
    let keyIndex = 0

    // Match code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let match

    const tempContent = content
    const matches: { start: number; end: number; lang: string; code: string }[] = []

    while ((match = codeBlockRegex.exec(tempContent)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        lang: match[1] || 'text',
        code: match[2],
      })
    }

    matches.forEach((m) => {
      if (m.start > currentIndex) {
        parts.push(
          <span key={keyIndex++}>
            {formatInlineContent(content.slice(currentIndex, m.start))}
          </span>
        )
      }

      parts.push(
        <div key={keyIndex++} className="my-3 overflow-hidden rounded-lg border border-border bg-secondary/50">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">{m.lang}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={async () => {
                    await navigator.clipboard.writeText(m.code)
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy code</TooltipContent>
            </Tooltip>
          </div>
          <pre className="overflow-x-auto p-4">
            <code className="text-sm font-mono text-foreground">{m.code}</code>
          </pre>
        </div>
      )

      currentIndex = m.end
    })

    if (currentIndex < content.length) {
      parts.push(
        <span key={keyIndex++}>
          {formatInlineContent(content.slice(currentIndex))}
        </span>
      )
    }

    return parts.length > 0 ? parts : formatInlineContent(content)
  }

  const formatInlineContent = (text: string) => {
    const elements: React.ReactNode[] = []
    let currentIndex = 0
    let keyIndex = 0

    // Match bold, inline code, and blockquotes
    const patterns = [
      { regex: /\*\*(.*?)\*\*/g, render: (m: string) => <strong key={keyIndex++} className="font-semibold">{m}</strong> },
      { regex: /`([^`]+)`/g, render: (m: string) => <code key={keyIndex++} className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{m}</code> },
      { regex: /^> (.+)$/gm, render: (m: string) => <blockquote key={keyIndex++} className="my-2 border-l-2 border-primary/50 pl-4 italic text-muted-foreground">{m}</blockquote> },
      { regex: /^### (.+)$/gm, render: (m: string) => <h3 key={keyIndex++} className="mt-4 mb-2 font-semibold text-foreground">{m}</h3> },
      { regex: /^- (.+)$/gm, render: (m: string) => <li key={keyIndex++} className="ml-4 list-disc">{m}</li> },
      { regex: /^\d+\. \*\*(.+?)\*\*: (.+)$/gm, render: (_m: string, bold: string, rest: string) => (
        <div key={keyIndex++} className="my-1">
          <span className="font-semibold">{bold}:</span> {rest}
        </div>
      )},
    ]

    // Simple fallback - just handle bold and inline code for now
    const boldRegex = /\*\*(.*?)\*\*/g
    const codeRegex = /`([^`]+)`/g

    let result = text
    const replacements: { start: number; end: number; element: React.ReactNode }[] = []

    let boldMatch
    while ((boldMatch = boldRegex.exec(text)) !== null) {
      replacements.push({
        start: boldMatch.index,
        end: boldMatch.index + boldMatch[0].length,
        element: <strong key={`bold-${keyIndex++}`} className="font-semibold">{boldMatch[1]}</strong>,
      })
    }

    let codeMatch
    while ((codeMatch = codeRegex.exec(text)) !== null) {
      const overlaps = replacements.some(
        r => (codeMatch!.index >= r.start && codeMatch!.index < r.end) ||
             (codeMatch!.index + codeMatch![0].length > r.start && codeMatch!.index + codeMatch![0].length <= r.end)
      )
      if (!overlaps) {
        replacements.push({
          start: codeMatch.index,
          end: codeMatch.index + codeMatch[0].length,
          element: <code key={`code-${keyIndex++}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{codeMatch[1]}</code>,
        })
      }
    }

    replacements.sort((a, b) => a.start - b.start)

    replacements.forEach((r) => {
      if (r.start > currentIndex) {
        elements.push(text.slice(currentIndex, r.start))
      }
      elements.push(r.element)
      currentIndex = r.end
    })

    if (currentIndex < text.length) {
      elements.push(text.slice(currentIndex))
    }

    return elements.length > 0 ? elements : text
  }

  return (
    <div className={cn(
      'group flex gap-4 px-4 py-6',
      isUser ? 'bg-transparent' : 'bg-muted/30'
    )}>
      <Avatar className={cn(
        'h-8 w-8 shrink-0',
        isUser ? 'bg-secondary' : 'bg-primary'
      )}>
        <AvatarFallback className={cn(
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {isUser ? 'You' : 'DocuChat AI'}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-foreground">
          {formatContent(message.content)}
          {message.isStreaming && (
            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-primary" />
          )}
        </div>

        {!isUser && !message.isStreaming && message.references && message.references.length > 0 && (
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="references" className="border-border">
              <AccordionTrigger className="py-2 text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {message.references.length} References
                  </Badge>
                  <span className="text-muted-foreground">Context Used</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {message.references.map((ref, index) => (
                    <div
                      key={ref.id}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          Chunk {ref.chunkIndex}
                        </Badge>
                        {ref.pageNumber && (
                          <span>Page {ref.pageNumber}</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-foreground/80">
                        {ref.content}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-2 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? 'Copied!' : 'Copy response'}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}
