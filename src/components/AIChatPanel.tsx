import { useState, useRef, useEffect, useCallback } from 'react'
import type { VaultEntry } from '../types'
import { X, Plus, PaperPlaneRight, Copy, ArrowClockwise, TextIndent } from '@phosphor-icons/react'
import { Sparkle } from '@phosphor-icons/react'
import { countWords } from '../utils/wikilinks'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  id: string
}

interface AIChatPanelProps {
  entry: VaultEntry | null
  allContent: Record<string, string>
  onClose: () => void
}

function countWikilinks(content: string): number {
  const matches = content.match(/\[\[.*?\]\]/g)
  return matches ? matches.length : 0
}

function generateMockResponse(message: string, entry: VaultEntry | null, content: string): string {
  const title = entry?.title ?? 'Untitled'
  const words = countWords(content)
  const links = countWikilinks(content)
  const lower = message.toLowerCase()

  if (lower.includes('summarize')) {
    return `This note is about **${title}**. It covers the main concepts documented in your vault. The document contains ${words} words and links to ${links} related notes.`
  }
  if (lower.includes('expand')) {
    return `Here are some ways to expand this note:\n\n1. Add more detail to the introduction\n2. Include related examples from your vault\n3. Connect it to your quarterly goals\n4. Add a summary section at the end`
  }
  if (lower.includes('fix grammar') || lower.includes('grammar')) {
    return `I reviewed the document for grammar issues. The writing looks clean overall — I found no major errors. Consider varying sentence length for better readability.`
  }

  const bodyStart = content.replace(/^---[\s\S]*?---\n?/, '').replace(/^# [^\n]*\n?/, '').trim()
  const snippet = bodyStart.slice(0, 120)
  return `Based on the content of **${title}**: ${snippet}...\n\nIs there a specific aspect you would like me to focus on?`
}

let msgIdCounter = 0
function nextId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2" style={{ padding: '8px 12px' }}>
      <div className="typing-indicator" style={{ display: 'flex', gap: 4, padding: '10px 0' }}>
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
        <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}

export function AIChatPanel({ entry, allContent, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [model, setModel] = useState('sonnet-4.6')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const content = entry ? (allContent[entry.path] ?? '') : ''
  const wikilinkCount = countWikilinks(content)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isTyping) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim(), id: nextId() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const response = generateMockResponse(text, entry, content)
      const assistantMsg: ChatMessage = { role: 'assistant', content: response, id: nextId() }
      setMessages(prev => [...prev, assistantMsg])
      setIsTyping(false)
    }, 1200)
  }, [isTyping, entry, content])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }, [input, sendMessage])

  const handleClearConversation = useCallback(() => {
    setMessages([])
    setIsTyping(false)
  }, [])

  const handleRetry = useCallback((msgIndex: number) => {
    const userMsgIndex = msgIndex - 1
    if (userMsgIndex < 0) return
    const userMsg = messages[userMsgIndex]
    if (userMsg.role !== 'user') return

    setMessages(prev => prev.slice(0, msgIndex))
    setIsTyping(true)

    setTimeout(() => {
      const response = generateMockResponse(userMsg.content, entry, content)
      const assistantMsg: ChatMessage = { role: 'assistant', content: response, id: nextId() }
      setMessages(prev => [...prev, assistantMsg])
      setIsTyping(false)
    }, 1200)
  }, [messages, entry, content])

  const quickActions = [
    { label: 'Summarize', message: 'Summarize this note' },
    { label: 'Expand', message: 'Expand this note' },
    { label: 'Fix grammar', message: 'Fix grammar in this note' },
  ]

  return (
    <aside className="flex flex-1 flex-col overflow-hidden border-l border-border bg-background text-foreground">
      {/* Header */}
      <div
        className="flex shrink-0 items-center border-b border-border"
        style={{ height: 45, padding: '0 12px', gap: 8 }}
      >
        <Sparkle size={16} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 text-muted-foreground" style={{ fontSize: 13, fontWeight: 600 }}>AI Chat</span>
        <button
          className="shrink-0 border-none bg-transparent p-1 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={handleClearConversation}
          title="New conversation"
        >
          <Plus size={16} />
        </button>
        <button
          className="shrink-0 border-none bg-transparent p-1 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={onClose}
          title="Close AI Chat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Context Bar */}
      {entry && (
        <div
          className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border"
          style={{ padding: '8px 12px' }}
        >
          <span
            style={{
              background: 'var(--accent-green-light)',
              borderRadius: 99,
              fontSize: 11,
              padding: '2px 8px',
              color: 'var(--foreground)',
            }}
          >
            {entry.title}
          </span>
          <span
            style={{
              background: 'var(--accent-green-light)',
              borderRadius: 99,
              fontSize: 11,
              padding: '2px 8px',
              color: 'var(--foreground)',
            }}
          >
            Frontmatter
          </span>
          <span
            style={{
              background: 'var(--accent-green-light)',
              borderRadius: 99,
              fontSize: 11,
              padding: '2px 8px',
              color: 'var(--foreground)',
            }}
          >
            {wikilinkCount} Links
          </span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '12px' }}>
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground" style={{ paddingTop: 40 }}>
            <Sparkle size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ fontSize: 13, margin: 0 }}>Ask anything about this document</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={msg.id} style={{ marginBottom: 12 }}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: '12px 12px 2px 12px',
                    maxWidth: '85%',
                    padding: '8px 12px',
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>'),
                  }}
                />
                <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
                  <button
                    className="border-none bg-transparent p-0 text-muted-foreground cursor-pointer hover:underline"
                    style={{ fontSize: 11 }}
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                  >
                    <Copy size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                    Copy
                  </button>
                  <button
                    className="border-none bg-transparent p-0 text-muted-foreground cursor-pointer hover:underline"
                    style={{ fontSize: 11 }}
                    onClick={() => handleRetry(idx)}
                  >
                    <ArrowClockwise size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                    Retry
                  </button>
                  <button
                    className="border-none bg-transparent p-0 text-muted-foreground cursor-pointer hover:underline"
                    style={{ fontSize: 11 }}
                  >
                    <TextIndent size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                    Insert
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions Bar */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border"
        style={{ padding: '8px 12px' }}
      >
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="cursor-pointer bg-transparent text-foreground hover:bg-accent transition-colors"
            style={{
              fontSize: 11,
              border: '1px solid var(--border)',
              borderRadius: 99,
              padding: '3px 10px',
            }}
            onClick={() => sendMessage(action.message)}
            disabled={isTyping}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex shrink-0 flex-col border-t border-border" style={{ padding: '8px 12px' }}>
        {/* Model selector */}
        <div style={{ marginBottom: 6 }}>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border border-border bg-transparent text-muted-foreground"
            style={{ fontSize: 11, borderRadius: 4, padding: '2px 6px', outline: 'none' }}
          >
            <option value="sonnet-4.6">Sonnet 4.6</option>
            <option value="opus-4.6">Opus 4.6</option>
            <option value="haiku-4.5">Haiku 4.5</option>
          </select>
        </div>
        {/* Input row */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this document..."
            rows={1}
            className="flex-1 resize-none border border-border bg-transparent text-foreground"
            style={{
              fontSize: 13,
              borderRadius: 8,
              padding: '8px 10px',
              outline: 'none',
              lineHeight: 1.4,
              maxHeight: 100,
              fontFamily: 'inherit',
            }}
          />
          <button
            className="shrink-0 flex items-center justify-center border-none cursor-pointer transition-colors"
            style={{
              background: 'var(--primary)',
              color: 'white',
              borderRadius: 8,
              width: 32,
              height: 34,
            }}
            onClick={() => sendMessage(input)}
            disabled={isTyping || !input.trim()}
            title="Send message"
          >
            <PaperPlaneRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--muted-foreground);
          animation: typing-bounce 1.2s infinite ease-in-out;
        }
        @keyframes typing-bounce {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </aside>
  )
}
