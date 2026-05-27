import { useCallback, useRef, useState } from 'react'
import { Audio } from 'expo-av'
import * as Haptics from 'expo-haptics'
import { transcribeAudio, chatWithAssistant } from '../api/assistant'
import { useChatStore } from '../store/chatStore'
import { useAppStore } from '../store/appStore'

export function useVoice() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const recording = useRef<Audio.Recording | null>(null)
  const levelTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const { addMessage, setLoading, setListening, setProcessing, conversationId } = useChatStore()
  const { laptopStatus } = useAppStore()

  const requestPermission = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync()
    setHasPermission(granted)
    return granted
  }, [])

  const startRecording = useCallback(async () => {
    let permitted = hasPermission
    if (permitted === null) {
      permitted = await requestPermission()
    }
    if (!permitted) return false

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const rec = new Audio.Recording()
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          sampleRate: 16000,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          sampleRate: 16000,
        },
      })

      rec.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          const normalized = Math.min(1, Math.max(0, (status.metering + 60) / 60))
          setAudioLevel(normalized)
        }
      })

      await rec.startAsync()
      recording.current = rec
      setListening(true)

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      return true
    } catch {
      return false
    }
  }, [hasPermission, requestPermission, setListening])

  const stopRecording = useCallback(async () => {
    if (!recording.current) return
    setListening(false)
    setAudioLevel(0)

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      await recording.current.stopAndUnloadAsync()
      const uri = recording.current.getURI()
      recording.current = null

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })

      if (!uri) return
      setProcessing(true)

      const text = await transcribeAudio(uri)
      if (!text.trim()) {
        setProcessing(false)
        return
      }

      addMessage({ role: 'user', content: text, isVoice: true })
      setProcessing(false)
      setLoading(true)

      const response = await chatWithAssistant(
        text,
        conversationId ?? undefined,
        true,
        { laptopConnected: laptopStatus.connected }
      )
      addMessage({ role: 'assistant', content: response.reply })
    } catch (err) {
      setProcessing(false)
    } finally {
      setLoading(false)
    }
  }, [addMessage, conversationId, laptopStatus.connected, setListening, setLoading, setProcessing])

  return { hasPermission, audioLevel, startRecording, stopRecording, requestPermission }
}
