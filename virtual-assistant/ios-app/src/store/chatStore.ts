import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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
}

const uid = () => Math.random().toString(36).slice(2)

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm **ARIA** — your AI assistant. Hold the mic button to speak, or type below.\n\nI can help with notes, meetings, emails, tenders, reports, and more.",
      timestamp: new Date(),
    },
  ],
  isLoading: false,
  isListening: false,
  isProcessing: false,
  conversationId: null,

  addMessage: (msg) => {
    const message: Message = { ...msg, id: uid(), timestamp: new Date() }
    set((s) => ({ messages: [...s.messages, message] }))
    return message
  },
  setLoading: (v) => set({ isLoading: v }),
  setListening: (v) => set({ isListening: v }),
  setProcessing: (v) => set({ isProcessing: v }),
  setConversationId: (id) => set({ conversationId: id }),
  clearMessages: () => set({ messages: [] }),
}))
