import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, AlertTriangle, Star, RefreshCw, Send, Loader2, ChevronRight, Zap } from 'lucide-react'
import { getEmails, getEmailAnalysis, EmailSummary } from '../../api/assistant'
import { format } from 'date-fns'

const priorityColors: Record<EmailSummary['priority'], string> = {
  low: 'text-slate-400 bg-slate-500/10',
  normal: 'text-blue-400 bg-blue-500/10',
  high: 'text-amber-400 bg-amber-500/10',
  critical: 'text-red-400 bg-red-500/10',
}

const categoryColors: Record<EmailSummary['category'], string> = {
  tender: 'text-violet-400 bg-violet-500/10',
  rfq: 'text-cyan-400 bg-cyan-500/10',
  meeting: 'text-emerald-400 bg-emerald-500/10',
  general: 'text-slate-400 bg-slate-500/10',
  urgent: 'text-red-400 bg-red-500/10',
}

function EmailCard({ email, onClick, selected }: { email: EmailSummary; onClick: () => void; selected: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
        selected ? 'bg-primary-600/10 border-l-2 border-l-primary-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {!email.read && <div className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />}
          <div className={`font-medium text-sm ${email.read ? 'text-slate-400' : 'text-white'}`}>
            {email.from}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 shrink-0">
          {format(new Date(email.receivedAt), 'MMM d')}
        </div>
      </div>
      <div className="text-sm text-slate-300 mb-1">{email.subject}</div>
      <div className="text-xs text-slate-500 line-clamp-1">{email.preview}</div>
      <div className="flex gap-2 mt-2">
        <span className={`tag ${priorityColors[email.priority]}`}>{email.priority}</span>
        <span className={`tag ${categoryColors[email.category]}`}>{email.category}</span>
      </div>
    </button>
  )
}

export function EmailPanel() {
  const [selected, setSelected] = useState<EmailSummary | null>(null)
  const [composing, setComposing] = useState(false)
  const [activeTab, setActiveTab] = useState<'inbox' | 'analysis'>('inbox')

  const { data: emails = [], isLoading, refetch } = useQuery({
    queryKey: ['emails'],
    queryFn: () => getEmails('inbox', 30),
  })

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['email-analysis'],
    queryFn: getEmailAnalysis,
    enabled: activeTab === 'analysis',
  })

  return (
    <div className="flex h-full">
      {/* Email list */}
      <div className="w-80 shrink-0 border-r border-white/8 flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b border-white/8">
          {(['inbox', 'analysis'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'analysis' ? (
                <span className="flex items-center justify-center gap-1">
                  <Zap size={14} />
                  AI Analysis
                </span>
              ) : (
                tab
              )}
            </button>
          ))}
        </div>

        {activeTab === 'inbox' ? (
          <>
            <div className="p-3 flex items-center justify-between border-b border-white/5">
              <span className="text-xs text-slate-500">{emails.length} messages</span>
              <div className="flex gap-2">
                <button onClick={() => refetch()} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => setComposing(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Send size={12} />
                  Compose
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-slate-500" />
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <Mail size={32} className="mx-auto mb-3 text-slate-700" />
                  No emails loaded.<br />Connect your email account in settings.
                </div>
              ) : (
                emails.map((email) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    onClick={() => setSelected(email)}
                    selected={selected?.id === email.id}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {analysisLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-slate-500" />
              </div>
            ) : analysis ? (
              <>
                <div className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-sm font-semibold text-white">Critical Messages</span>
                  </div>
                  {analysis.critical.length === 0 ? (
                    <p className="text-xs text-slate-500">No critical emails</p>
                  ) : (
                    analysis.critical.map((email) => (
                      <button
                        key={email.id}
                        onClick={() => { setSelected(email); setActiveTab('inbox') }}
                        className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{email.subject}</div>
                          <div className="text-xs text-slate-500">{email.from}</div>
                        </div>
                        <ChevronRight size={14} className="text-slate-500 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
                <div className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-primary-400" />
                    <span className="text-sm font-semibold text-white">AI Summary</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                Connect email to get AI analysis
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email detail / Compose */}
      <div className="flex-1 flex flex-col h-full">
        {composing ? (
          <ComposePanel onClose={() => setComposing(false)} />
        ) : selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">{selected.subject}</h2>
                <div className="flex gap-2">
                  <span className={`tag ${priorityColors[selected.priority]}`}>{selected.priority}</span>
                  <span className={`tag ${categoryColors[selected.category]}`}>{selected.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/8">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white">
                  {selected.from[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{selected.from}</div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(selected.receivedAt), 'MMMM d, yyyy HH:mm')}
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed bg-white/3 rounded-xl p-4 border border-white/8">
                {selected.preview}
                <div className="mt-4 text-slate-500 italic">
                  [Full email content would load here from the connected email provider]
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button className="btn-primary flex items-center gap-2" onClick={() => setComposing(true)}>
                  <Send size={14} />
                  Reply
                </button>
                <button className="btn-ghost">Forward</button>
                <button className="btn-ghost">Archive</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Mail size={40} className="mx-auto mb-3 text-slate-700" />
              <div className="text-white font-medium mb-1">Select an email to read</div>
              <div className="text-sm">Or ask ARIA to analyze your inbox</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ComposePanel({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ to: '', subject: '', body: '' })

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/8 flex items-center justify-between">
        <h3 className="font-semibold text-white">New Message</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Cancel</button>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3">
        <input
          value={form.to}
          onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
          placeholder="To: email@example.com"
          className="input"
        />
        <input
          value={form.subject}
          onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
          placeholder="Subject"
          className="input"
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          placeholder="Write your message..."
          className="input flex-1 resize-none leading-relaxed"
        />
      </div>
      <div className="p-4 border-t border-white/8 flex gap-3">
        <button className="btn-primary flex items-center gap-2">
          <Send size={14} />
          Send
        </button>
        <button onClick={onClose} className="btn-ghost">Discard</button>
      </div>
    </div>
  )
}
