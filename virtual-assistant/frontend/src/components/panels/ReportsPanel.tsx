import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BarChart3, Download, Loader2, Zap, Calendar, FileText } from 'lucide-react'
import { generateMonthlyReport, Document } from '../../api/assistant'
import { format, subMonths } from 'date-fns'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function ReportsPanel() {
  const [report, setReport] = useState<Document | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => generateMonthlyReport(selectedMonth),
    onSuccess: (doc) => { setReport(doc); toast.success('Report generated!') },
    onError: () => toast.error('Failed to generate report'),
  })

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') }
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-white/8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-primary-400" />
              Monthly Reports
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">AI-generated reports from your conversations and activities</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input text-sm w-48"
            >
              {months.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => generate()}
              disabled={isPending}
              className="btn-primary flex items-center gap-2"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {!report && !isPending ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
            {[
              { icon: FileText, label: 'Meeting Summary', desc: 'All meetings attended and outcomes' },
              { icon: Calendar, label: 'Activities Log', desc: 'Tasks completed and notes created' },
              { icon: BarChart3, label: 'Email Analysis', desc: 'Email patterns and important threads' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="card text-center p-4">
                <Icon size={24} className="text-primary-400 mx-auto mb-2" />
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-slate-500 mt-1">{desc}</div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">Select a month and generate your report</p>
            <p className="text-slate-500 text-xs">ARIA analyzes all your conversations, meetings, emails, and tasks</p>
          </div>
          <button onClick={() => generate()} className="btn-primary flex items-center gap-2">
            <Zap size={16} />
            Generate {format(new Date(selectedMonth + '-01'), 'MMMM')} Report
          </button>
        </div>
      ) : isPending ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
          <div className="text-white font-medium">Generating report...</div>
          <div className="text-sm text-slate-500">Analyzing conversations, meetings, emails, and tasks</div>
        </div>
      ) : report ? (
        <>
          <div className="p-4 border-b border-white/8 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{report.title}</h3>
              <div className="text-xs text-slate-500 mt-0.5">
                Generated {format(new Date(report.createdAt), 'MMMM d, yyyy HH:mm')}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => generate()}
                disabled={isPending}
                className="btn-ghost flex items-center gap-2 text-sm"
              >
                <Zap size={14} />
                Regenerate
              </button>
              <button className="btn-primary flex items-center gap-2 text-sm">
                <Download size={14} />
                Export PDF
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto prose prose-invert prose-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
