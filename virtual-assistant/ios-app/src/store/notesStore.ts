import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
  pinned?: boolean
}

interface NotesState {
  notes: Note[]
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Note
  updateNote: (id: string, data: Partial<Note>) => void
  deleteNote: (id: string) => void
  searchNotes: (q: string) => Note[]
}

const uid = () => Math.random().toString(36).slice(2)

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      addNote: (note) => {
        const now = new Date().toISOString()
        const n: Note = { ...note, id: uid(), createdAt: now, updatedAt: now }
        set((s) => ({ notes: [n, ...s.notes] }))
        return n
      },
      updateNote: (id, data) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n
          ),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      searchNotes: (q) => {
        const ql = q.toLowerCase()
        return get().notes.filter(
          (n) =>
            n.title.toLowerCase().includes(ql) ||
            n.content.toLowerCase().includes(ql) ||
            n.tags.some((t) => t.toLowerCase().includes(ql))
        )
      },
    }),
    { name: 'aria-notes', storage: createJSONStorage(() => AsyncStorage) }
  )
)
