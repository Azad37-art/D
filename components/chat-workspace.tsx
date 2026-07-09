'use client'

import { useRef, useEffect, useState } from 'react'
import { FileText, Info, BarChart3, Clock, FileCheck } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import type { UploadedFile, Message, SearchScope } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatWorkspaceProps {
  activeFile: UploadedFile | null
  messages: Message[]
  searchScope: SearchScope
  isStreaming: boolean
  onSend: (message: string) => void
  onScopeChange: (scope: SearchScope) => void
  onPromptClick: (prompt: string) => void
}

export function ChatWorkspace({
  activeFile,
  messages,
  searchScope,
  isStreaming,
  onSend,
  onScopeChange,
  onPromptClick,
}: ChatWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('chat')
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!activeFile) {
    return <EmptyState onPromptClick={onPromptClick} />
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header with document info and tabs */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{activeFile.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {activeFile.type.split('/').pop()?.toUpperCase() || 'DOC'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(activeFile.size)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Uploaded {activeFile.uploadDate.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="chat" className="gap-2">
                <FileText className="h-3.5 w-3.5" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="overview" className="gap-2">
                <Info className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                Stats
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content area with proper scrolling */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1 h-full overflow-y-auto" ref={scrollRef}>
          <div className="mx-auto max-w-4xl w-full px-4 py-6">
            {activeTab === 'chat' && (
              <>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-8 py-16">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <FileText className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold text-foreground">
                      Start a conversation
                    </h2>
                    <p className="mt-2 text-center text-muted-foreground">
                      Ask questions about <span className="font-medium text-foreground">{activeFile.name}</span>
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {['Summarize this document', 'What are the key points?', 'Explain the methodology'].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => onSend(prompt)}
                          className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Document Overview</h2>
                </div>
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <FileCheck className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground">Document Name</h3>
                        <p className="text-sm text-muted-foreground mt-1">{activeFile.name}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-start gap-4">
                      <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground">File Type</h3>
                        <p className="text-sm text-muted-foreground mt-1">{activeFile.type}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-start gap-4">
                      <Clock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground">Upload Date</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(activeFile.uploadDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })} at {new Date(activeFile.uploadDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-start gap-4">
                      <BarChart3 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground">File Size</h3>
                        <p className="text-sm text-muted-foreground mt-1">{formatFileSize(activeFile.size)}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-start gap-4">
                      <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground">Processing Status</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Badge variant={activeFile.status === 'ready' ? 'default' : 'secondary'}>
                            {activeFile.status === 'ready' ? 'Ready for Q&A' : 'Processing...'}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Document Statistics</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground">Total Chunks</span>
                      <span className="text-3xl font-bold text-primary mt-2">{activeFile.chunks ?? 0}</span>
                      <p className="text-xs text-muted-foreground mt-2">Document indexed into chunks for retrieval</p>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground">Total Questions</span>
                      <span className="text-3xl font-bold text-primary mt-2">{messages.filter(m => m.role === 'user').length}</span>
                      <p className="text-xs text-muted-foreground mt-2">Questions asked about this document</p>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground">Average Response</span>
                      <span className="text-3xl font-bold text-primary mt-2">
                        {messages.length > 0
                          ? Math.round(messages.filter(m => m.role === 'assistant').reduce((acc, m) => acc + (m.content?.length || 0), 0) / Math.max(messages.filter(m => m.role === 'user').length, 1))
                          : 0}
                      </span>
                      <p className="text-xs text-muted-foreground mt-2">Characters per response</p>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground">Indexed</span>
                      <span className="text-3xl font-bold text-primary mt-2">100%</span>
                      <p className="text-xs text-muted-foreground mt-2">Document fully indexed and ready</p>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat input */}
      <div className="flex-shrink-0 border-t border-border">
        <ChatInput
          onSend={onSend}
          searchScope={searchScope}
          onScopeChange={onScopeChange}
          disabled={activeFile.status !== 'ready'}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}