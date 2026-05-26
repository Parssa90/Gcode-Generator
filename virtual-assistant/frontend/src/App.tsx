import { useEffect } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { ChatInterface } from './components/chat/ChatInterface'
import { NotesPanel } from './components/panels/NotesPanel'
import { CalendarPanel } from './components/panels/CalendarPanel'
import { EmailPanel } from './components/panels/EmailPanel'
import { DocumentsPanel } from './components/panels/DocumentsPanel'
import { ReportsPanel } from './components/panels/ReportsPanel'
import { TasksPanel } from './components/panels/TasksPanel'
import { LaptopPanel } from './components/panels/LaptopPanel'
import { useAppStore } from './stores/appStore'
import { wsClient } from './api/websocket'
import { useVoice } from './hooks/useVoice'

function PanelRenderer() {
  const { activePanel } = useAppStore()
  switch (activePanel) {
    case 'chat': return <ChatInterface />
    case 'notes': return <NotesPanel />
    case 'calendar': return <CalendarPanel />
    case 'email': return <EmailPanel />
    case 'documents': return <DocumentsPanel />
    case 'reports': return <ReportsPanel />
    case 'tasks': return <TasksPanel />
    case 'laptop': return <LaptopPanel />
    default: return <ChatInterface />
  }
}

export default function App() {
  const { setLaptopStatus } = useAppStore()
  const { startWakeWordDetection } = useVoice()

  useEffect(() => {
    wsClient.connect()

    const unsubConnection = wsClient.on('connection', (data: unknown) => {
      const d = data as { connected: boolean }
      console.log('WS connection:', d.connected)
    })

    const unsubLaptop = wsClient.on('laptop_status', (data: unknown) => {
      const d = data as { connected: boolean; ip?: string; cpuUsage?: number; gpuUsage?: number }
      setLaptopStatus(d)
    })

    return () => {
      unsubConnection()
      unsubLaptop()
      wsClient.disconnect()
    }
  }, [setLaptopStatus])

  useEffect(() => {
    startWakeWordDetection()
  }, [startWakeWordDetection])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <PanelRenderer />
        </main>
      </div>
    </div>
  )
}
