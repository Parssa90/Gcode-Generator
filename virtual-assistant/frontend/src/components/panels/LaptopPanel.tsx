import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Laptop, Folder, File, ChevronRight, Cpu, HardDrive, Wifi, WifiOff, Upload, Download, RefreshCw, Loader2, Terminal } from 'lucide-react'
import { getLaptopStatus, listLaptopFiles, readLaptopFile, writeLaptopFile } from '../../api/assistant'
import { useAppStore } from '../../stores/appStore'
import toast from 'react-hot-toast'

export function LaptopPanel() {
  const { laptopStatus, setLaptopStatus } = useAppStore()
  const [currentDir, setCurrentDir] = useState('~')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [connectionIP, setConnectionIP] = useState('')
  const [connectionPort, setConnectionPort] = useState('8765')
  const [logs, setLogs] = useState<string[]>([
    '[ARIA Agent] Waiting for laptop connection...',
    '[ARIA Agent] Configure laptop agent at ws://<laptop-ip>:8765',
  ])

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['laptop-status'],
    queryFn: getLaptopStatus,
    refetchInterval: laptopStatus.connected ? 5000 : false,
  })

  useEffect(() => {
    if (status) {
      setLaptopStatus({
        connected: status.connected,
        ip: status.ip,
        cpuUsage: status.cpuUsage,
        gpuUsage: status.gpuUsage,
        lastSeen: status.lastSeen,
      })
    }
  }, [status, setLaptopStatus])

  const { data: fileList, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['laptop-files', currentDir],
    queryFn: () => listLaptopFiles(currentDir),
    enabled: laptopStatus.connected,
  })

  const handleOpenFile = async (path: string) => {
    try {
      const { content } = await readLaptopFile(path)
      setSelectedFile(path)
      setFileContent(content)
      setIsEditing(false)
    } catch {
      toast.error('Could not read file')
    }
  }

  const handleSaveFile = async () => {
    if (!selectedFile) return
    try {
      await writeLaptopFile(selectedFile, fileContent)
      toast.success('File saved to laptop!')
      setIsEditing(false)
    } catch {
      toast.error('Could not save file')
    }
  }

  const handleConnect = () => {
    if (!connectionIP) { toast.error('Enter laptop IP address'); return }
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Connecting to ${connectionIP}:${connectionPort}...`,
    ])
    refetchStatus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="p-4 border-b border-white/8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              laptopStatus.connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'
            }`}>
              <Laptop size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className={laptopStatus.connected ? 'badge-online' : 'badge-offline'} />
                <span className="font-semibold text-white text-sm">
                  {laptopStatus.connected ? 'Laptop Connected' : 'Laptop Offline'}
                </span>
              </div>
              {laptopStatus.connected && laptopStatus.ip && (
                <div className="text-xs text-slate-500 mt-0.5">{laptopStatus.ip}:{connectionPort}</div>
              )}
            </div>
          </div>

          {laptopStatus.connected ? (
            <div className="flex gap-4">
              {[
                { label: 'CPU', value: laptopStatus.cpuUsage, color: 'bg-primary-500' },
                { label: 'GPU', value: laptopStatus.gpuUsage, color: 'bg-violet-500' },
              ].map(({ label, value, color }) =>
                value !== undefined ? (
                  <div key={label} className="text-center">
                    <div className="text-xs text-slate-500 mb-1">{label} {value}%</div>
                    <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={connectionIP}
                onChange={(e) => setConnectionIP(e.target.value)}
                placeholder="Laptop IP address"
                className="input text-sm w-44"
              />
              <input
                value={connectionPort}
                onChange={(e) => setConnectionPort(e.target.value)}
                placeholder="Port"
                className="input text-sm w-20"
              />
              <button onClick={handleConnect} className="btn-primary flex items-center gap-2 text-sm">
                <Wifi size={14} />
                Connect
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {laptopStatus.connected ? (
          <>
            {/* File browser */}
            <div className="w-64 shrink-0 border-r border-white/8 flex flex-col h-full">
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono truncate">{currentDir}</span>
                <button onClick={() => refetchFiles()} className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <RefreshCw size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-slate-500" /></div>
                ) : (
                  <>
                    {currentDir !== '~' && (
                      <button
                        onClick={() => setCurrentDir(currentDir.split('/').slice(0, -1).join('/') || '~')}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <ChevronRight size={12} className="rotate-180" />
                        ..
                      </button>
                    )}
                    {fileList?.dirs.map((dir) => (
                      <button
                        key={dir}
                        onClick={() => setCurrentDir(`${currentDir}/${dir}`)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <Folder size={12} className="text-amber-400 shrink-0" />
                        <span className="truncate">{dir}</span>
                      </button>
                    ))}
                    {fileList?.files.map((file) => (
                      <button
                        key={file}
                        onClick={() => handleOpenFile(`${currentDir}/${file}`)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 flex items-center gap-2 ${
                          selectedFile === `${currentDir}/${file}` ? 'bg-primary-600/15 text-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <File size={12} className="shrink-0" />
                        <span className="truncate">{file}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* File viewer / editor */}
            <div className="flex-1 flex flex-col h-full">
              {selectedFile ? (
                <>
                  <div className="p-3 border-b border-white/8 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 font-mono truncate">{selectedFile}</span>
                    <div className="flex gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={handleSaveFile} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                            <Upload size={12} />
                            Save to Laptop
                          </button>
                          <button onClick={() => setIsEditing(false)} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setIsEditing(true)} className="btn-ghost text-xs py-1.5 px-3">Edit</button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    readOnly={!isEditing}
                    className="flex-1 bg-transparent text-xs font-mono text-slate-300 p-4 resize-none
                               focus:outline-none leading-relaxed"
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <File size={32} className="mx-auto mb-3 text-slate-700" />
                    <div className="text-sm">Select a file to view or edit</div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Connection guide */
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: Download, title: 'Install Agent', desc: 'Download and run the ARIA laptop agent on your computer' },
                { icon: Wifi, title: 'Connect', desc: 'Enter your laptop IP above and connect from the same network' },
                { icon: Cpu, title: 'Offload Tasks', desc: 'ARIA uses your laptop GPU/CPU for heavy AI processing' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card p-4">
                  <Icon size={24} className="text-primary-400 mb-3" />
                  <div className="font-medium text-sm text-white mb-1">{title}</div>
                  <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={16} className="text-primary-400" />
                <span className="text-sm font-medium text-white">Quick Setup</span>
              </div>
              <div className="space-y-2">
                {[
                  '# On your laptop, run:',
                  'pip install aria-agent',
                  'aria-agent start --port 8765',
                  '',
                  '# Or with Docker:',
                  'docker run -p 8765:8765 parssa90/aria-agent',
                ].map((line, i) => (
                  <div key={i} className={`font-mono text-xs ${line.startsWith('#') ? 'text-slate-500' : line === '' ? 'h-2' : 'text-emerald-400'}`}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Logs */}
            <div className="card flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-300">Connection Log</span>
              </div>
              <div className="font-mono text-xs text-slate-400 space-y-1">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
