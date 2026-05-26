import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme'
import { useChatStore } from '../store/chatStore'

interface Props {
  onPressIn: () => void
  onPressOut: () => void
  audioLevel?: number
}

export function VoiceButton({ onPressIn, onPressOut, audioLevel = 0 }: Props) {
  const { isListening, isProcessing } = useChatStore()
  const ring1 = useRef(new Animated.Value(0)).current
  const ring2 = useRef(new Animated.Value(0)).current
  const spin = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isListening) {
      const animateRing = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        )
      const a1 = animateRing(ring1, 0)
      const a2 = animateRing(ring2, 400)
      a1.start()
      a2.start()
      Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, bounciness: 8 }).start()
      return () => { a1.stop(); a2.stop() }
    } else {
      ring1.setValue(0)
      ring2.setValue(0)
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
    }
  }, [isListening, ring1, ring2, scale])

  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start()
    } else {
      spin.setValue(0)
    }
  }, [isProcessing, spin])

  const ringStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
  })

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  const buttonBg = isListening ? colors.error : colors.primary
  const audioRingSize = 64 + audioLevel * 28

  return (
    <View style={styles.container}>
      {/* Pulse rings */}
      {isListening && (
        <>
          <Animated.View style={[styles.ring, ringStyle(ring1)]} />
          <Animated.View style={[styles.ring, ringStyle(ring2)]} />
          {/* Audio level ring */}
          <View
            style={[
              styles.audioRing,
              {
                width: audioRingSize,
                height: audioRingSize,
                borderRadius: audioRingSize / 2,
                borderColor: colors.error + '60',
              },
            ]}
          />
        </>
      )}

      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isProcessing}
          style={[
            styles.button,
            { backgroundColor: buttonBg },
            isListening && styles.buttonActive,
            isProcessing && styles.buttonProcessing,
          ]}
        >
          {isProcessing ? (
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons name="refresh" size={26} color="white" />
            </Animated.View>
          ) : isListening ? (
            <View style={styles.waveContainer}>
              {[0, 1, 2, 3, 4].map((i) => (
                <WaveBar key={i} index={i} audioLevel={audioLevel} />
              ))}
            </View>
          ) : (
            <Ionicons name="mic" size={26} color="white" />
          )}
        </Pressable>
      </Animated.View>
    </View>
  )
}

function WaveBar({ index, audioLevel }: { index: number; audioLevel: number }) {
  const anim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const delay = index * 80
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 0.4 + audioLevel * 0.6, duration: 200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [anim, index, audioLevel])

  return (
    <Animated.View
      style={[styles.waveBar, { transform: [{ scaleY: anim }] }]}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error + '40',
  },
  audioRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonActive: {
    shadowColor: colors.error,
    shadowOpacity: 0.6,
  },
  buttonProcessing: {
    opacity: 0.7,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveBar: {
    width: 3,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 2,
  },
})
