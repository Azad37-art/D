'use client'

import { FileText, MessageSquare, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  onPromptClick: (prompt: string) => void
}

const SAMPLE_PROMPTS = [
  {
    icon: FileText,
    title: 'Summarize the document',
    description: 'Get a concise overview of the main points',
    prompt: 'Please provide a comprehensive summary of this document, highlighting the key points and main takeaways.',
  },
  {
    icon: MessageSquare,
    title: 'Extract key insights',
    description: 'Find the most important information',
    prompt: 'What are the most important insights and findings in this document?',
  },
  {
    icon: Sparkles,
    title: 'Answer specific questions',
    description: 'Ask anything about the content',
    prompt: 'What methodology or approach does this document describe?',
  },
]

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mt-6 text-balance text-center text-2xl font-semibold text-foreground">
        Upload a Document to Start
      </h2>
      <p className="mt-2 max-w-md text-balance text-center text-muted-foreground">
        Add PDF, TXT, or DOCX files to your knowledge base and start asking questions about their content.
      </p>

      <div className="mt-10 grid w-full max-w-2xl gap-4 md:grid-cols-3">
        {SAMPLE_PROMPTS.map((prompt) => (
          <Card
            key={prompt.title}
            className="cursor-pointer border-border bg-card transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
            onClick={() => onPromptClick(prompt.prompt)}
          >
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <prompt.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-medium text-foreground">{prompt.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {prompt.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
