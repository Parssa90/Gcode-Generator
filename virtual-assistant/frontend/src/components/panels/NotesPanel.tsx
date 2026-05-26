import { useState } from 'react'
import { Plus, Search, Pin, Trash2, Tag, Save } from 'lucide-react'
import { useNotesStore, Note } from '../../stores/notesStore'
import { format } from 'date-fns'

export function NotesPanel() {
  const { notes, selectedNoteId, addNote, updateNote, deleteNote, selectNote, searchNotes } = useNotesStore()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Partial<Note> | null>(null)

  const displayed = query ? searchNotes(query) : notes
  const selected = notes.find((n) => n.id === selectedNoteId)

  const handleNew = () => {
    setEditing({ title: '', content: '', tags: [] })
    selectNote(null)
  }

  const handleSave = () => {
    if (!editing) return
    if (selectedNoteId) {
      updateNote(selectedNoteId, editing)
    } else {
      const n = addNote({ title: editing.title || 'Untitled', content: editing.content || '', tags: editing.tags || [] })
      selectNote(n.id)
    }
    setEditing(null)
  }

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-72 shrink-0 border-r border-white/8 flex flex-col h-full">
        <div className="p-4 space-y-3 border-b border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Notes</span>
            <button onClick={handleNew} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
              <Plus size={14} />
              New
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="input pl-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayed.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              {query ? 'No results found' : 'No notes yet.\nCreate your first note!'}
            </div>
          )}
          {displayed.map((note) => (
            <button
              key={note.id}
              onClick={() => { selectNote(note.id); setEditing(null) }}
              className={`w-full text-left p-3 rounded-xl transition-colors ${
                selectedNoteId === note.id
                  ? 'bg-primary-600/20 border border-primary-500/30'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm text-white truncate">{note.title || 'Untitled'}</div>
                {note.pinned && <Pin size={12} className="text-primary-400 shrink-0 mt-0.5" />}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{note.content}</div>
              <div className="text-[10px] text-slate-600 mt-1">
                {format(new Date(note.updatedAt), 'MMM d, yyyy')}
              </div>
              {note.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag bg-primary-500/15 text-primary-400">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col h-full">
        {editing ? (
          <>
            <div className="p-4 border-b border-white/8 flex items-center justify-between gap-3">
              <input
                value={editing.title || ''}
                onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))}
                placeholder="Note title..."
                className="input text-lg font-semibold"
              />
              <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                <Save size={16} />
                Save
              </button>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              <textarea
                value={editing.content || ''}
                onChange={(e) => setEditing((p) => ({ ...p, content: e.target.value }))}
                placeholder="Write your note here... (Markdown supported)"
                className="input flex-1 resize-none font-mono text-sm leading-relaxed"
              />
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-slate-500" />
                <input
                  placeholder="Add tags (comma separated)..."
                  className="input text-sm"
                  onBlur={(e) =>
                    setEditing((p) => ({
                      ...p,
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }))
                  }
                  defaultValue={editing.tags?.join(', ')}
                />
              </div>
            </div>
          </>
        ) : selected ? (
          <>
            <div className="p-4 border-b border-white/8 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{selected.title}</h2>
                <div className="text-xs text-slate-500">
                  Last edited {format(new Date(selected.updatedAt), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing({ ...selected })}
                  className="btn-ghost text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => updateNote(selected.id, { pinned: !selected.pinned })}
                  className={`p-2 rounded-xl transition-colors ${
                    selected.pinned ? 'text-primary-400 bg-primary-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Pin size={16} />
                </button>
                <button
                  onClick={() => deleteNote(selected.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                {selected.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-2">{line || <br />}</p>
                ))}
              </div>
              {selected.tags.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="tag bg-primary-500/15 text-primary-400">
                      # {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <Plus size={28} className="text-slate-600" />
            </div>
            <div className="text-center">
              <div className="text-white font-medium mb-1">No note selected</div>
              <div className="text-sm">Select a note or create a new one</div>
            </div>
            <button onClick={handleNew} className="btn-primary">
              Create Note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
