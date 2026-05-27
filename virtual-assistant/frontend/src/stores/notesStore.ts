import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
  pinned?: boolean
  synced?: boolean
}

interface NotesState {
  notes: Note[]
  selectedNoteId: string | null
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Note
  updateNote: (id: string, data: Partial<Note>) => void
  deleteNote: (id: string) => void
  selectNote: (id: string | null) => void
  searchNotes: (query: string) => Note[]
}

const uuid = () => Math.random().toString(36).slice(2)

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      selectedNoteId: null,

      addNote: (note) => {
        const now = new Date().toISOString()
        const newNote: Note = { ...note, id: uuid(), createdAt: now, updatedAt: now }
        set((s) => ({ notes: [newNote, ...s.notes] }))
        return newNote
      },

      updateNote: (id, data) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n
          ),
        })),

      deleteNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
          selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
        })),

      selectNote: (id) => set({ selectedNoteId: id }),

      searchNotes: (query) => {
        const q = query.toLowerCase()
        return get().notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q))
        )
      },
    }),
    { name: 'aria-notes' }
  )
)
