import { Menu, Bell, Wifi, WifiOff, Cpu } from 'lucide-react'
import { useAppStore, ActivePanel } from '../../stores/appStore'

const panelTitles: Record<ActivePanel, string> = {
  chat: 'ARIA Chat',
  notes: 'Smart Notes',
  calendar: 'Calendar & Meetings',
  email: 'Email Intelligence',
  documents: 'Documents & Tenders',
  reports: 'Monthly Reports',
  tasks: 'Task Manager',
  laptop: 'Laptop Connection',
}

export function Header() {
  const { activePanel, toggleSidebar, laptopStatus } = useAppStore()

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-white/8 shrink-0 bg-surface-800/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-white">{panelTitles[activePanel]}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Laptop indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            laptopStatus.connected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-white/5 text-slate-500 border border-white/8'
          }`}
        >
          {laptopStatus.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="hidden sm:inline">
            {laptopStatus.connected ? 'Laptop Online' : 'Laptop Offline'}
          </span>
        </div>

        {/* GPU indicator */}
        {laptopStatus.connected && laptopStatus.gpuUsage !== undefined && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Cpu size={12} />
            <span className="hidden sm:inline">GPU {laptopStatus.gpuUsage}%</span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
