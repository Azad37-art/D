'use client'

import { useState, useCallback, useEffect } from 'react'
import type { UploadedFile, Message, SearchScope, Reference } from '@/lib/types'
import {
  uploadDocument,
  askQuestionStream,
  deleteDocument,
  getDocuments,
  getDocumentMessages,
} from '@/lib/api'


const generateId = () => Math.random().toString(36).substring(2, 15)

function getFileType(filename: string) {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (lower.endsWith('.txt')) return 'text/plain'

  return 'application/octet-stream'
}

export function useDocumentStore() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [messagesByFile, setMessagesByFile] = useState<Record<string, Message[]>>({})
  const [searchScope, setSearchScope] = useState<SearchScope>('current')
  const [isStreaming, setIsStreaming] = useState(false)

  const activeFile = files.find(f => f.id === activeFileId) ?? null
  const messages = activeFileId ? messagesByFile[activeFileId] ?? [] : []

  useEffect(() => {
  async function loadSavedDocuments() {
    try {
      const result = await getDocuments()

      const savedFiles: UploadedFile[] = result.documents.map((doc: any) => ({
        id: doc.document_id,
        name: doc.filename,
        size: doc.file_size ?? 0,
        type: getFileType(doc.filename),
        uploadDate: new Date(doc.upload_date ?? Date.now()),
        status: 'ready' as const,
        progress: 100,
        chunks: doc.chunks,
        chunkSize: doc.chunk_size,
        chunkOverlap: doc.chunk_overlap,
      }))

      setFiles(savedFiles)

      const loadedMessagesByFile: Record<string, Message[]> = {}

      for (const file of savedFiles) {
        try {
          const messageResult = await getDocumentMessages(file.id)

          loadedMessagesByFile[file.id] = messageResult.messages.map(
            (message: any) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              timestamp: new Date(message.timestamp),
              isStreaming: false,
              references: (message.references ?? []).map((source: any) => ({
                id: generateId(),
                content: source.snippet,
                pageNumber: source.page,
                chunkIndex: source.chunk_id,
              })),
            })
          )
        } catch (error) {
          console.error(`Failed to load messages for ${file.name}:`, error)
          loadedMessagesByFile[file.id] = []
        }
      }

      setMessagesByFile(loadedMessagesByFile)

      if (savedFiles.length > 0) {
        setActiveFileId(savedFiles[0].id)
      }
    } catch (error) {
      console.error('Failed to load saved documents:', error)
    }
  }

  loadSavedDocuments()
}, [])
  const uploadFile = useCallback(async (file: File) => {
    const tempId = generateId()

    const newFile: UploadedFile = {
      id: tempId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date(),
      status: 'uploading',
      progress: 25,
    }

    setFiles(prev => [...prev, newFile])
    setMessagesByFile(prev => ({ ...prev, [tempId]: [] }))

    try {
      setFiles(prev =>
        prev.map(f =>
          f.id === tempId
            ? { ...f, status: 'processing' as const, progress: 60 }
            : f
        )
      )

      const result = await uploadDocument(file)

      setFiles(prev =>
        prev.map(f =>
          f.id === tempId
            ? {
                ...f,
                id: result.document_id,
                name: result.filename,
                status: 'ready' as const,
                progress: 100,
                chunks: result.chunks,
                chunkSize: result.chunk_size,
                chunkOverlap: result.chunk_overlap,
              }
            : f
        )
      )

      setMessagesByFile(prev => {
        const oldMessages = prev[tempId] ?? []
        const updated = { ...prev }
        delete updated[tempId]
        updated[result.document_id] = oldMessages
        return updated
      })

      setActiveFileId(result.document_id)
      return result.document_id
    } catch (error) {
      console.error(error)

      setFiles(prev =>
        prev.map(f =>
          f.id === tempId
            ? { ...f, status: 'error' as const, progress: 0 }
            : f
        )
      )

      return tempId
    }
  }, [])

  const deleteFile = useCallback(async (id: string) => {
    try {
      await deleteDocument(id)
    } catch (error) {
      console.error('Backend delete failed:', error)
    }

    setFiles(prev => prev.filter(f => f.id !== id))

    setMessagesByFile(prev => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })

    if (activeFileId === id) {
      const remainingFiles = files.filter(f => f.id !== id)
      setActiveFileId(remainingFiles.length > 0 ? remainingFiles[0].id : null)
    }
  }, [activeFileId, files])

  const selectFile = useCallback(async (id: string) => {
  setActiveFileId(id)

  try {
    const result = await getDocumentMessages(id)

    const loadedMessages: Message[] = result.messages.map((message: any) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.timestamp),
      isStreaming: false,
      references: (message.references ?? []).map((source: any) => ({
        id: generateId(),
        content: source.snippet,
        pageNumber: source.page,
        chunkIndex: source.chunk_id,
      })),
    }))

    setMessagesByFile(prev => ({
      ...prev,
      [id]: loadedMessages,
    }))
  } catch (error) {
    console.error('Failed to load chat history:', error)
  }
}, [])


const sendMessage = useCallback(async (content: string) => {
  if (!activeFile) return

  const documentId = activeFile.id

  const userMessage: Message = {
    id: generateId(),
    role: 'user',
    content,
    timestamp: new Date(),
  }

  const assistantMessageId = generateId()

  const assistantMessage: Message = {
    id: assistantMessageId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isStreaming: true,
    references: [],
  }

  setMessagesByFile(prev => ({
    ...prev,
    [documentId]: [
      ...(prev[documentId] ?? []),
      userMessage,
      assistantMessage,
    ],
  }))

    setIsStreaming(true)

    try {
      let finalSources: any[] = []

      await askQuestionStream(
        documentId,
        content,
        searchScope,
        (token) => {
          setMessagesByFile(prev => ({
            ...prev,
            [documentId]: (prev[documentId] ?? []).map(m =>
              m.id === assistantMessageId
                ? { ...m, content: m.content + token }
                : m
            ),
          }))
        },
        (sources) => {
          finalSources = sources
        }
      )

      const references: Reference[] = finalSources.map((source: any) => ({
        id: generateId(),
        content: source.snippet,
        pageNumber: source.page,
        chunkIndex: source.chunk_id,
      }))

      setMessagesByFile(prev => ({
        ...prev,
        [documentId]: (prev[documentId] ?? []).map(m =>
          m.id === assistantMessageId
            ? { ...m, isStreaming: false, references }
            : m
        ),
      }))
    } catch (error) {
      console.error(error)

      setMessagesByFile(prev => ({
        ...prev,
        [documentId]: (prev[documentId] ?? []).map(m =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: 'Sorry, something went wrong while streaming the answer.',
                isStreaming: false,
                references: [],
              }
            : m
        ),
      }))
    } finally {
      setIsStreaming(false)
    }
  }, [activeFile, searchScope])

  return {
    files,
    activeFile,
    activeFileId,
    messages,
    searchScope,
    isStreaming,
    uploadFile,
    deleteFile,
    selectFile,
    setActiveFileId,
    sendMessage,
    setSearchScope,
  }
}