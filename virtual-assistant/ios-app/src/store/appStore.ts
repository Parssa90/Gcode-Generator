import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface LaptopStatus {
  connected: boolean
  ip?: string
  cpuUsage?: number
  gpuUsage?: number
  lastSeen?: string
}

interface AppState {
  serverUrl: string
  wakeWord: string
  laptopStatus: LaptopStatus
  setServerUrl: (url: string) => void
  setWakeWord: (word: string) => void
  setLaptopStatus: (status: Partial<LaptopStatus>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      serverUrl: 'http://localhost:8000',
      wakeWord: 'hey aria',
      laptopStatus: { connected: false },
      setServerUrl: (url) => set({ serverUrl: url }),
      setWakeWord: (word) => set({ wakeWord: word }),
      setLaptopStatus: (status) =>
        set((s) => ({ laptopStatus: { ...s.laptopStatus, ...status } })),
    }),
    {
      name: 'aria-app',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
