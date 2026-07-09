const API_BASE_URL = "http://127.0.0.1:8000/api"

export type ChatScope = "current" | "all"

export async function uploadDocument(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Upload error:", errorText)
    throw new Error(errorText || "File upload failed")
  }

  return response.json()
}

export async function askQuestionStream(
  documentId: string,
  question: string,
  scope: ChatScope,
  onToken: (token: string) => void,
  onSources: (sources: any[]) => void
) {
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_id: documentId,
      question,
      scope,
    }),
  })

  if (!response.ok || !response.body) {
    const errorText = await response.text()
    console.error("Streaming error:", errorText)
    throw new Error(errorText || "Streaming request failed")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue

      const data = line.replace("data: ", "").trim()

      if (data === "[DONE]") return

      try {
        const parsed = JSON.parse(data)

        if (parsed.type === "token") {
          onToken(parsed.content)
        }

        if (parsed.type === "sources") {
          onSources(parsed.sources)
        }

        if (parsed.type === "error") {
          console.error("Stream error:", parsed.content)
          throw new Error(parsed.content)
        }
      } catch (error) {
        console.error("Failed to parse stream data:", data)
        throw error
      }
    }
  }
}
export async function deleteDocument(documentId: string) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Delete error:", errorText)
    throw new Error(errorText || "Document delete failed")
  }

  return response.json()
}

export async function getDocuments() {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: "GET",
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Get documents error:", errorText)
    throw new Error(errorText || "Failed to load documents")
  }

  return response.json()
}

export async function getDocumentMessages(documentId: string) {
  const response = await fetch(
    `${API_BASE_URL}/documents/${documentId}/messages`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Get messages error:", errorText)
    throw new Error(errorText || "Failed to load chat history")
  }

  return response.json()
}


export async function clearDocumentMessages(documentId: string) {
  const response = await fetch(
    `${API_BASE_URL}/documents/${documentId}/messages`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || "Failed to clear chat history")
  }

  return response.json()
}