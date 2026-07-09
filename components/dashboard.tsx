'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useDocumentStore } from '@/hooks/use-document-store'
import { DocumentSidebar } from '@/components/document-sidebar'
import { ChatWorkspace } from '@/components/chat-workspace'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    files,
    activeFile,
    activeFileId,
    messages,
    searchScope,
    isStreaming,
    uploadFile,
    deleteFile,
    selectFile,
    sendMessage,
    setSearchScope,
  } = useDocumentStore()

  const handlePromptClick = (prompt: string) => {
    if (activeFile && activeFile.status === 'ready') {
      sendMessage(prompt)
    }
  }

  const handleFileSelect = (id: string) => {
    selectFile(id)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="hidden lg:flex lg:w-[340px] lg:flex-shrink-0 lg:flex-col lg:border-r lg:border-border">
        <DocumentSidebar
          files={files}
          activeFileId={activeFileId}
          onUpload={uploadFile}
          onDelete={deleteFile}
          onSelect={selectFile}
        />
      </div>

      <div className="fixed left-4 top-4 z-50 flex lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[340px] transform transition-transform duration-300 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <DocumentSidebar
          files={files}
          activeFileId={activeFileId}
          onUpload={uploadFile}
          onDelete={deleteFile}
          onSelect={handleFileSelect}
        />
      </div>

      <main className="min-w-0 flex flex-1 flex-col overflow-hidden">
        <ChatWorkspace
          activeFile={activeFile}
          messages={messages}
          searchScope={searchScope}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onScopeChange={setSearchScope}
          onPromptClick={handlePromptClick}
        />
      </main>
    </div>
  )
}