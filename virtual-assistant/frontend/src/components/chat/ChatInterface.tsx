import { useEffect, useRef, useState } from 'react'
import { Send, Mic } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatStore } from '../../stores/chatStore'
import { useAppStore } from '../../stores/appStore'
import { chatWithAssistant } from '../../api/assistant'
import { VoiceButton } from '../voice/VoiceButton'
import { format } from 'date-fns'

export function ChatInterface() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { messages, isLoading, addMessage, setLoading, conversationId } = useChatStore()
  const { laptopStatus } = useAppStore()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')

    addMessage({ role: 'user', content: text })
    setLoading(true)

    try {
      const response = await chatWithAssistant({
        message: text,
        conversationId: conversationId ?? undefined,
        context: { laptopConnected: laptopStatus.connected },
      })
      addMessage({ role: 'assistant', content: response.reply })
    } catch {
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your connection and try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-fade-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gradient-to-br from-violet-500 to-primary-600 text-white'
              }`}
            >
              {msg.role === 'user' ? 'U' : 'A'}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary-600/20 border border-primary-500/30 text-slate-100 rounded-tr-sm'
                  : 'bg-surface-700/60 border border-white/8 text-slate-200 rounded-tl-sm'
              }`}
            >
              {msg.isVoice && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                  <Mic size={10} />
                  <span>Voice</span>
                </div>
              )}
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
              <div className="text-[10px] text-slate-600 mt-1.5 text-right">
                {format(msg.timestamp, 'HH:mm')}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 animate-fade-up">
            <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
            <div className="bg-surface-700/60 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5 h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"
                    style={{ '--i': i } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
        {[
          'Read my emails',
          'Schedule a meeting',
          'Write a note',
          'Generate RFQ',
          'Monthly report',
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setInput(suggestion)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10
                       border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-4 border-t border-white/8 safe-bottom">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message ARIA..."
              rows={1}
              className="input resize-none leading-5 pr-12 min-h-[44px]"
              style={{ overflow: 'hidden' }}
            />
          </div>

          <VoiceButton />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40
                       disabled:cursor-not-allowed flex items-center justify-center transition-all
                       active:scale-95 shrink-0"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
