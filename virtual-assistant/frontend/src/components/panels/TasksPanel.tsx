import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckSquare, Square, Laptop, Clock, AlertCircle, Loader2, Send } from 'lucide-react'
import { getTasks, createTask, syncTaskToLaptop, Task } from '../../api/assistant'
import { format } from 'date-fns'
import { useAppStore } from '../../stores/appStore'
import toast from 'react-hot-toast'

const priorityConfig: Record<Task['priority'], { color: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }> = {
  low: { color: 'text-slate-400 bg-slate-500/15', icon: () => null },
  medium: { color: 'text-blue-400 bg-blue-500/15', icon: Clock },
  high: { color: 'text-amber-400 bg-amber-500/15', icon: AlertCircle },
  urgent: { color: 'text-red-400 bg-red-500/15', icon: AlertCircle },
}

export function TasksPanel() {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<Task['status'] | 'all'>('all')
  const { laptopStatus } = useAppStore()
  const qc = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  })

  const { mutate: addTask, isPending: creating } = useMutation({
    mutationFn: createTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); toast.success('Task created!') },
    onError: () => toast.error('Failed to create task'),
  })

  const { mutate: syncToLaptop } = useMutation({
    mutationFn: syncTaskToLaptop,
    onSuccess: () => toast.success('Task synced to laptop!'),
    onError: () => toast.error('Laptop not connected'),
  })

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    urgent: tasks.filter((t) => t.priority === 'urgent').length,
  }

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
          { label: 'Done', value: stats.completed, color: 'text-emerald-400' },
          { label: 'Urgent', value: stats.urgent, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors capitalize ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          New Task
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckSquare size={32} className="mx-auto mb-3 text-slate-700" />
            <div className="text-sm">No tasks found</div>
          </div>
        ) : (
          filtered.map((task) => <TaskCard key={task.id} task={task} onSync={() => syncToLaptop(task.id)} laptopConnected={laptopStatus.connected} />)
        )}
      </div>

      {/* Create task modal */}
      {showForm && (
        <CreateTaskModal onSave={addTask} onClose={() => setShowForm(false)} isPending={creating} />
      )}
    </div>
  )
}

function TaskCard({ task, onSync, laptopConnected }: { task: Task; onSync: () => void; laptopConnected: boolean }) {
  const { color } = priorityConfig[task.priority]

  return (
    <div className="card flex items-start gap-3">
      <button className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors">
        {task.status === 'completed' ? (
          <CheckSquare size={20} className="text-emerald-400" />
        ) : (
          <Square size={20} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>
          {task.title}
        </div>
        {task.description && (
          <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`tag ${color}`}>{task.priority}</span>
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock size={10} />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {task.laptopSync && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <Laptop size={10} />
              Laptop synced
            </span>
          )}
        </div>
      </div>

      {laptopConnected && !task.laptopSync && (
        <button
          onClick={onSync}
          title="Send to laptop"
          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
        >
          <Send size={14} />
        </button>
      )}
    </div>
  )
}

function CreateTaskModal({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (t: Omit<Task, 'id' | 'createdAt'>) => void
  onClose: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'pending' as Task['status'],
    dueDate: '',
    laptopSync: false,
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-800 rounded-2xl border border-white/10 shadow-2xl">
        <div className="p-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="font-semibold text-white">New Task</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Cancel</button>
        </div>
        <div className="p-4 space-y-3">
          <input
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Task title"
            className="input"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="input resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Task['priority'] }))}
                className="input text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                className="input text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.laptopSync}
              onChange={(e) => setForm((p) => ({ ...p, laptopSync: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Laptop size={14} className="text-slate-400" />
              Sync to laptop immediately
            </span>
          </label>
          <button
            onClick={() => onSave(form)}
            disabled={!form.title || isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create Task
          </button>
        </div>
      </div>
    </div>
  )
}
