import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Download, Send, Loader2, FileSearch, Zap } from 'lucide-react'
import { getDocuments, generateDocument, Document } from '../../api/assistant'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const typeColors: Record<Document['type'], string> = {
  tender: 'text-violet-400 bg-violet-500/15',
  rfq: 'text-cyan-400 bg-cyan-500/15',
  report: 'text-emerald-400 bg-emerald-500/15',
  memo: 'text-amber-400 bg-amber-500/15',
}

const statusColors: Record<Document['status'], string> = {
  draft: 'text-slate-400 bg-slate-500/15',
  ready: 'text-emerald-400 bg-emerald-500/15',
  sent: 'text-primary-400 bg-primary-500/15',
}

export function DocumentsPanel() {
  const [selected, setSelected] = useState<Document | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const qc = useQueryClient()

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
  })

  const { mutate: generate, isPending } = useMutation({
    mutationFn: generateDocument,
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      setSelected(doc)
      setShowGenerator(false)
      toast.success('Document generated!')
    },
    onError: () => toast.error('Failed to generate document'),
  })

  return (
    <div className="flex h-full">
      {/* Document list */}
      <div className="w-72 shrink-0 border-r border-white/8 flex flex-col h-full">
        <div className="p-4 flex items-center justify-between border-b border-white/8">
          <span className="text-sm font-semibold text-white">Documents</span>
          <button
            onClick={() => setShowGenerator(true)}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <Zap size={14} />
            Generate
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-500" /></div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm p-4">
              <FileSearch size={32} className="mx-auto mb-3 text-slate-700" />
              No documents yet.<br />Use AI to generate tenders, RFQs, and more.
            </div>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelected(doc)}
                className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                  selected?.id === doc.id ? 'bg-primary-600/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-sm font-medium text-white truncate">{doc.title}</div>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className={`tag ${typeColors[doc.type]}`}>{doc.type.toUpperCase()}</span>
                  <span className={`tag ${statusColors[doc.status]}`}>{doc.status}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5">
                  {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Document view */}
      <div className="flex-1 flex flex-col h-full">
        {selected ? (
          <>
            <div className="p-4 border-b border-white/8 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">{selected.title}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={`tag ${typeColors[selected.type]}`}>{selected.type.toUpperCase()}</span>
                  <span className={`tag ${statusColors[selected.status]}`}>{selected.status}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="btn-ghost flex items-center gap-2 text-sm">
                  <Download size={14} />
                  Export
                </button>
                <button className="btn-primary flex items-center gap-2 text-sm">
                  <Send size={14} />
                  Send
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl prose prose-invert prose-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <FileText size={28} className="text-slate-600" />
            </div>
            <div className="text-center">
              <div className="text-white font-medium mb-1">Select a document</div>
              <div className="text-sm max-w-xs text-center">
                Generate professional tenders, RFQs, memos, and reports using AI
              </div>
            </div>
            <button onClick={() => setShowGenerator(true)} className="btn-primary flex items-center gap-2">
              <Zap size={16} />
              Generate Document
            </button>
          </div>
        )}
      </div>

      {/* Generator modal */}
      {showGenerator && (
        <GeneratorModal onGenerate={generate} onClose={() => setShowGenerator(false)} isPending={isPending} />
      )}
    </div>
  )
}

function GeneratorModal({
  onGenerate,
  onClose,
  isPending,
}: {
  onGenerate: (p: { type: Document['type']; title: string; context: string; recipient?: string }) => void
  onClose: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState({
    type: 'rfq' as Document['type'],
    title: '',
    context: '',
    recipient: '',
  })

  const templates: Record<Document['type'], string> = {
    tender: 'Project scope, requirements, budget range, deadline, evaluation criteria',
    rfq: 'Items/services required, quantities, specifications, delivery timeline, submission deadline',
    report: 'Period covered, key activities, achievements, issues, financial summary, next steps',
    memo: 'Subject, background, key points, action required, deadline',
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-800 rounded-2xl border border-white/10 shadow-2xl">
        <div className="p-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Zap size={18} className="text-primary-400" />
            AI Document Generator
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Cancel</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Document Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['rfq', 'tender', 'report', 'memo'] as Document['type'][]).map((type) => (
                <button
                  key={type}
                  onClick={() => setForm((p) => ({ ...p, type }))}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors capitalize ${
                    form.type === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Document title"
            className="input"
          />

          <input
            value={form.recipient}
            onChange={(e) => setForm((p) => ({ ...p, recipient: e.target.value }))}
            placeholder="Recipient / Company (optional)"
            className="input"
          />

          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Context & Requirements
              <span className="ml-2 text-slate-600">Hint: {templates[form.type]}</span>
            </label>
            <textarea
              value={form.context}
              onChange={(e) => setForm((p) => ({ ...p, context: e.target.value }))}
              placeholder={`Describe the ${form.type} requirements in detail...`}
              rows={5}
              className="input resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={() => onGenerate(form)}
            disabled={!form.title || !form.context || isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Zap size={16} />
                Generate {form.type.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
