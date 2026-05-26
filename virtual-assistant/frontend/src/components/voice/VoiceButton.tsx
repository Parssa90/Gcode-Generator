import { useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useVoice } from '../../hooks/useVoice'

export function VoiceButton() {
  const { isListening, isProcessing } = useChatStore()
  const { isSupported, audioLevel, startRecording, stopRecording, requestPermission } = useVoice()
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePointerDown = () => {
    if (!isSupported || isProcessing) return
    holdTimer.current = setTimeout(() => {
      startRecording()
    }, 150)
  }

  const handlePointerUp = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    if (isListening) stopRecording()
  }

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current)
    }
  }, [])

  if (!isSupported) return null

  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple rings when listening */}
      {isListening && (
        <>
          <div
            className="absolute rounded-full bg-primary-500/20 voice-ring"
            style={{ width: 80, height: 80 }}
          />
          <div
            className="absolute rounded-full bg-primary-500/15 voice-ring"
            style={{ width: 80, height: 80, animationDelay: '0.4s' }}
          />
        </>
      )}

      {/* Audio level ring */}
      {isListening && (
        <div
          className="absolute rounded-full border-2 border-primary-400/60 transition-all duration-75"
          style={{
            width: 56 + audioLevel * 30,
            height: 56 + audioLevel * 30,
          }}
        />
      )}

      {/* Main button */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={isProcessing}
        onClick={!isListening ? requestPermission : undefined}
        className={`
          relative z-10 w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-200 active:scale-95 select-none touch-none
          ${isListening
            ? 'bg-red-500 glow-red shadow-lg shadow-red-500/30'
            : isProcessing
            ? 'bg-slate-600 cursor-wait'
            : 'bg-primary-600 hover:bg-primary-500 glow shadow-lg shadow-primary-500/30'
          }
        `}
      >
        {isProcessing ? (
          <Loader2 size={22} className="text-white animate-spin" />
        ) : isListening ? (
          <div className="flex items-end gap-0.5 h-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1 bg-white rounded-full wave-bar"
                style={{ height: '100%', '--i': i } as React.CSSProperties}
              />
            ))}
          </div>
        ) : (
          <Mic size={22} className="text-white" />
        )}
      </button>

      {/* Tooltip */}
      <div className="absolute -bottom-6 whitespace-nowrap text-[11px] text-slate-500">
        {isListening ? 'Release to send' : isProcessing ? 'Processing...' : 'Hold to speak'}
      </div>
    </div>
  )
}
