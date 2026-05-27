import React, { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Pressable, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { ChatBubble } from '../../src/components/ChatBubble'
import { VoiceButton } from '../../src/components/VoiceButton'
import { useChatStore } from '../../src/store/chatStore'
import { useAppStore } from '../../src/store/appStore'
import { useVoice } from '../../src/hooks/useVoice'
import { chatWithAssistant } from '../../src/api/assistant'
import { colors, spacing, radius, typography } from '../../src/theme'

const QUICK_ACTIONS = [
  'Read my emails',
  'Schedule meeting',
  'Write a note',
  'Generate RFQ',
  'Monthly report',
  'New task',
]

export default function ChatScreen() {
  const [input, setInput] = useState('')
  const listRef = useRef<FlatList>(null)
  const { messages, isLoading, addMessage, setLoading, conversationId } = useChatStore()
  const { laptopStatus } = useAppStore()
  const { audioLevel, startRecording, stopRecording } = useVoice()

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || isLoading) return
    setInput('')
    addMessage({ role: 'user', content: msg })
    setLoading(true)
    try {
      const response = await chatWithAssistant(
        msg,
        conversationId ?? undefined,
        false,
        { laptopConnected: laptopStatus.connected }
      )
      addMessage({ role: 'assistant', content: response.reply })
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    } catch {
      addMessage({ role: 'assistant', content: 'Connection error. Check server URL in Settings.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.typingRow}>
              <View style={styles.typingAvatar}>
                <Text style={styles.avatarText}>A</Text>
              </View>
              <View style={styles.typingBubble}>
                {[0, 1, 2].map((i) => (
                  <TypingDot key={i} delay={i * 150} />
                ))}
              </View>
            </View>
          ) : null
        }
      />

      {/* Quick actions */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActions}
      >
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action}
            onPress={() => sendMessage(action)}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{action}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrapper}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message ARIA..."
            placeholderTextColor={colors.textDim}
            style={styles.input}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
        </View>

        <VoiceButton
          onPressIn={startRecording}
          onPressOut={stopRecording}
          audioLevel={audioLevel}
        />

        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function TypingDot({ delay }: { delay: number }) {
  const [visible, setVisible] = useState(true)
  React.useEffect(() => {
    const t = setInterval(() => setVisible((v) => !v), 600)
    const d = setTimeout(() => {}, delay)
    return () => { clearInterval(t); clearTimeout(d) }
  }, [delay])
  return (
    <View style={[styles.typingDot, !visible && styles.typingDotFade]} />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  messageList: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  quickActions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipText: { fontSize: 12, color: colors.textMuted },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingBottom: 28,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  typingAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.violet,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: 'white', fontSize: 12, fontWeight: '700' },
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
  },
  typingDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted,
  },
  typingDotFade: { opacity: 0.3 },
})
