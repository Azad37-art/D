'use client'

import { useCallback } from 'react'
import { Upload, FileText, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import type { UploadedFile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DocumentSidebarProps {
  files: UploadedFile[]
  activeFileId: string | null
  onUpload: (file: File) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ACCEPTED_EXTENSIONS = '.pdf,.txt,.docx'

export function DocumentSidebar({
  files,
  activeFileId,
  onUpload,
  onDelete,
  onSelect,
}: DocumentSidebarProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFiles = Array.from(e.dataTransfer.files)
      droppedFiles.forEach(file => {
        if (ACCEPTED_TYPES.includes(file.type) || file.name.match(/\.(pdf|txt|docx)$/i)) {
          onUpload(file)
        }
      })
    },
    [onUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || [])
      selectedFiles.forEach(file => onUpload(file))
      e.target.value = ''
    },
    [onUpload]
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
    }
  }

  const getStatusLabel = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading':
        return `Uploading ${file.progress}%`
      case 'processing':
        return 'Indexing...'
      case 'ready':
        return 'Ready'
      case 'error':
        return 'Error'
    }
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-4 flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Knowledge Base</h2>
          <p className="text-xs text-muted-foreground">{files.length} document{files.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="p-4 flex-shrink-0">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="group relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 transition-all hover:border-primary/50 hover:bg-primary/5"
        >
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-transform group-hover:scale-110">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Drop files here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to browse
            </p>
          </div>
          <div className="flex gap-1.5">
            <Badge variant="secondary" className="text-[10px]">PDF</Badge>
            <Badge variant="secondary" className="text-[10px]">TXT</Badge>
            <Badge variant="secondary" className="text-[10px]">DOCX</Badge>
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-2 space-y-1">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No documents yet</p>
              <p className="text-xs text-muted-foreground/70">Upload a file to get started</p>
            </div>
          ) : (
            files.map(file => (
              <div
                key={file.id}
                onClick={() => file.status === 'ready' && onSelect(file.id)}
                className={cn(
                    'group flex items-center gap-2 rounded-lg transition-all hover:bg-muted/60',
                  activeFileId === file.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50',
                  file.status !== 'ready' && 'opacity-70'
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 p-3 cursor-pointer">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 pr-12">
                    <p className="max-w-[160px] truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(file.uploadDate)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {getStatusIcon(file.status)}
                      <span className={cn(
                        'text-xs whitespace-nowrap',
                        file.status === 'ready' ? 'text-emerald-500' : 'text-muted-foreground'
                      )}>
                        {getStatusLabel(file)}
                      </span>
                    </div>
                    {file.status === 'uploading' && (
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center pr-2 flex-shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(file.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Delete document</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}