import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ActivePanel = 'chat' | 'notes' | 'calendar' | 'email' | 'reports' | 'tasks' | 'laptop' | 'documents'

export interface LaptopStatus {
  connected: boolean
  ip?: string
  cpuUsage?: number
  gpuUsage?: number
  lastSeen?: string
}

interface AppState {
  activePanel: ActivePanel
  sidebarOpen: boolean
  laptopStatus: LaptopStatus
  wakeWord: string
  theme: 'dark' | 'light'
  setActivePanel: (panel: ActivePanel) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setLaptopStatus: (status: Partial<LaptopStatus>) => void
  setWakeWord: (word: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activePanel: 'chat',
      sidebarOpen: true,
      laptopStatus: { connected: false },
      wakeWord: 'hey aria',
      theme: 'dark',
      setActivePanel: (panel) => set({ activePanel: panel }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setLaptopStatus: (status) =>
        set((s) => ({ laptopStatus: { ...s.laptopStatus, ...status } })),
      setWakeWord: (word) => set({ wakeWord: word }),
    }),
    { name: 'aria-app-store' }
  )
)
