export type FileStatus = 'uploading' | 'processing' | 'ready' | 'error'

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadDate: Date
  status: FileStatus
  progress?: number

  // backend values
  chunks?: number
  chunkSize?: number
  chunkOverlap?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  references?: Reference[]
  isStreaming?: boolean
}

export interface Reference {
  id: string
  content: string
  pageNumber?: number
  chunkIndex: number
}

export type SearchScope = 'current' | 'all'
