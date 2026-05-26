import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: 'text' | 'note' | 'meeting' | 'report' | 'document' | 'task' | 'email_summary'
  metadata?: Record<string, unknown>
  isVoice?: boolean
}

interface ChatState {
  messages: Message[]
  isLoading: boolean
  isListening: boolean
  isProcessing: boolean
  conversationId: string | null
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => Message
  setLoading: (v: boolean) => void
  setListening: (v: boolean) => void
  setProcessing: (v: boolean) => void
  setConversationId: (id: string) => void
  clearMessages: () => void
  updateLastMessage: (content: string) => void
}

const uuid = () => Math.random().toString(36).slice(2)

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm **ARIA** — your AI Remote Intelligence Assistant. I'm ready to help you with notes, meetings, emails, reports, tenders, and more.\n\nSay **\"Hey ARIA\"** or tap the mic to get started.",
      timestamp: new Date(),
      type: 'text',
    },
  ],
  isLoading: false,
  isListening: false,
  isProcessing: false,
  conversationId: null,

  addMessage: (msg) => {
    const message: Message = { ...msg, id: uuid(), timestamp: new Date() }
    set((s) => ({ messages: [...s.messages, message] }))
    return message
  },

  setLoading: (v) => set({ isLoading: v }),
  setListening: (v) => set({ isListening: v }),
  setProcessing: (v) => set({ isProcessing: v }),
  setConversationId: (id) => set({ conversationId: id }),
  clearMessages: () => set({ messages: [] }),

  updateLastMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
      return { messages: msgs }
    }),
}))
