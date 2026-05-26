import { useAppStore, ActivePanel } from '../../stores/appStore'
import {
  MessageSquare, FileText, Calendar, Mail, BarChart3,
  CheckSquare, Laptop, FileSearch, X, Mic, Settings,
  Zap
} from 'lucide-react'

const navItems: { id: ActivePanel; icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string; description: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'ARIA Chat', description: 'AI assistant' },
  { id: 'notes', icon: FileText, label: 'Notes', description: 'Smart notes' },
  { id: 'calendar', icon: Calendar, label: 'Calendar', description: 'Meetings & schedule' },
  { id: 'email', icon: Mail, label: 'Email', description: 'Inbox & analysis' },
  { id: 'documents', icon: FileSearch, label: 'Documents', description: 'Tenders & RFQs' },
  { id: 'reports', icon: BarChart3, label: 'Reports', description: 'Monthly reports' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks', description: 'Task management' },
  { id: 'laptop', icon: Laptop, label: 'Laptop', description: 'Remote connection' },
]

export function Sidebar() {
  const { activePanel, setActivePanel, sidebarOpen, setSidebarOpen, laptopStatus } = useAppStore()

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-40
          flex flex-col
          bg-surface-800 border-r border-white/8
          transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center glow">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white tracking-wide">ARIA</div>
              <div className="text-xs text-slate-500">AI Assistant</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Laptop status */}
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-white/3 border border-white/8">
          <div className="flex items-center gap-2">
            <div className={laptopStatus.connected ? 'badge-online' : 'badge-offline'} />
            <span className="text-xs text-slate-400">
              {laptopStatus.connected
                ? `Connected — ${laptopStatus.ip || 'localhost'}`
                : 'Laptop offline'}
            </span>
          </div>
          {laptopStatus.connected && (
            <div className="mt-2 flex gap-3">
              {laptopStatus.cpuUsage !== undefined && (
                <div className="flex-1">
                  <div className="text-[10px] text-slate-500 mb-1">CPU</div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${laptopStatus.cpuUsage}%` }}
                    />
                  </div>
                </div>
              )}
              {laptopStatus.gpuUsage !== undefined && (
                <div className="flex-1">
                  <div className="text-[10px] text-slate-500 mb-1">GPU</div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${laptopStatus.gpuUsage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 mt-2">
          {navItems.map(({ id, icon: Icon, label, description }) => (
            <button
              key={id}
              onClick={() => { setActivePanel(id); setSidebarOpen(false) }}
              className={`sidebar-link w-full text-left ${activePanel === id ? 'active' : ''}`}
            >
              <Icon size={18} className="shrink-0" />
              <div className="min-w-0">
                <div className="text-sm">{label}</div>
                <div className="text-[11px] text-slate-500 font-normal truncate">{description}</div>
              </div>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/8">
          <button className="sidebar-link w-full">
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <div className="mt-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <Mic size={12} className="text-primary-400" />
              <span className="text-[11px] text-slate-500">Say "Hey ARIA" to activate</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
