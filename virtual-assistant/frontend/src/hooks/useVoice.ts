import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useAppStore } from '../stores/appStore'
import { transcribeAudio, chatWithAssistant } from '../api/assistant'
import toast from 'react-hot-toast'

export function useVoice() {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const analyser = useRef<AnalyserNode | null>(null)
  const animFrame = useRef<number>(0)
  const wakeWordDetector = useRef<SpeechRecognition | null>(null)
  const stream = useRef<MediaStream | null>(null)

  const { setListening, setProcessing, addMessage, setLoading } = useChatStore()
  const { wakeWord, laptopStatus } = useAppStore()

  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
        (typeof window.SpeechRecognition !== 'undefined' ||
          typeof (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition !== 'undefined') &&
        typeof navigator.mediaDevices?.getUserMedia === 'function'
    )
  }, [])

  const requestPermission = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      s.getTracks().forEach((t) => t.stop())
      setPermissionGranted(true)
      return true
    } catch {
      toast.error('Microphone permission denied')
      return false
    }
  }, [])

  const trackAudioLevel = useCallback(() => {
    if (!analyser.current) return
    const data = new Uint8Array(analyser.current.frequencyBinCount)
    analyser.current.getByteFrequencyData(data)
    const level = data.reduce((a, b) => a + b, 0) / data.length / 255
    setAudioLevel(level)
    animFrame.current = requestAnimationFrame(trackAudioLevel)
  }, [])

  const startRecording = useCallback(async () => {
    if (!permissionGranted) {
      const ok = await requestPermission()
      if (!ok) return
    }

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })

      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream.current)
      analyser.current = ctx.createAnalyser()
      analyser.current.fftSize = 256
      src.connect(analyser.current)
      trackAudioLevel()

      audioChunks.current = []
      mediaRecorder.current = new MediaRecorder(stream.current)
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }
      mediaRecorder.current.start(100)
      setListening(true)
    } catch (err) {
      toast.error('Could not access microphone')
    }
  }, [permissionGranted, requestPermission, setListening, trackAudioLevel])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') return

    cancelAnimationFrame(animFrame.current)
    setAudioLevel(0)
    setListening(false)
    setProcessing(true)

    return new Promise<void>((resolve) => {
      mediaRecorder.current!.onstop = async () => {
        stream.current?.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })

        if (blob.size < 1000) {
          setProcessing(false)
          resolve()
          return
        }

        try {
          const { text } = await transcribeAudio(blob)
          if (!text.trim()) {
            setProcessing(false)
            resolve()
            return
          }

          addMessage({ role: 'user', content: text, isVoice: true })
          setLoading(true)
          setProcessing(false)

          const response = await chatWithAssistant({
            message: text,
            isVoice: true,
            context: { laptopConnected: laptopStatus.connected },
          })

          addMessage({ role: 'assistant', content: response.reply, type: response.action?.type as Message['type'] })
          handleAction(response.action)
        } catch {
          toast.error('Could not process voice input')
          setProcessing(false)
        } finally {
          setLoading(false)
          resolve()
        }
      }
      mediaRecorder.current!.stop()
    })
  }, [addMessage, laptopStatus.connected, setListening, setLoading, setProcessing])

  const handleAction = (action?: { type: string; payload?: Record<string, unknown> }) => {
    if (!action) return
  }

  const startWakeWordDetection = useCallback(() => {
    if (!isSupported) return

    const SpeechRecognition =
      window.SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognition) return

    wakeWordDetector.current = new SpeechRecognition()
    wakeWordDetector.current.continuous = true
    wakeWordDetector.current.interimResults = true
    wakeWordDetector.current.lang = 'en-US'

    wakeWordDetector.current.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('')
        .toLowerCase()

      if (transcript.includes(wakeWord.toLowerCase())) {
        wakeWordDetector.current?.stop()
        startRecording()
      }
    }

    wakeWordDetector.current.onend = () => {
      if (!useChatStore.getState().isListening) {
        setTimeout(() => wakeWordDetector.current?.start(), 500)
      }
    }

    wakeWordDetector.current.start()
  }, [isSupported, wakeWord, startRecording])

  const stopWakeWordDetection = useCallback(() => {
    wakeWordDetector.current?.stop()
    wakeWordDetector.current = null
  }, [])

  return {
    isSupported,
    permissionGranted,
    audioLevel,
    requestPermission,
    startRecording,
    stopRecording,
    startWakeWordDetection,
    stopWakeWordDetection,
  }
}

interface Message {
  type?: 'text' | 'note' | 'meeting' | 'report' | 'document' | 'task' | 'email_summary'
}
