import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { colors, radius, spacing } from '../theme'
import { Message } from '../store/chatStore'

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {/* Avatar */}
      <View style={[styles.avatar, isUser ? styles.avatarUser : styles.avatarAssistant]}>
        <Text style={styles.avatarText}>{isUser ? 'U' : 'A'}</Text>
      </View>

      {/* Bubble */}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {message.isVoice && (
          <View style={styles.voiceTag}>
            <Ionicons name="mic" size={10} color={colors.textDim} />
            <Text style={styles.voiceText}>Voice</Text>
          </View>
        )}
        <Text style={[styles.content, isUser && styles.contentUser]}>
          {/* Simple bold markdown rendering */}
          {renderMarkdown(message.content)}
        </Text>
        <Text style={styles.timestamp}>{format(message.timestamp, 'HH:mm')}</Text>
      </View>
    </View>
  )
}

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '700', color: colors.text }}>
          {part.slice(2, -2)}
        </Text>
      )
    }
    return <Text key={i}>{part}</Text>
  })
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  rowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarUser: {
    backgroundColor: colors.primaryDark,
  },
  avatarAssistant: {
    backgroundColor: colors.violet,
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  voiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  voiceText: {
    fontSize: 10,
    color: colors.textDim,
  },
  content: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
  },
  contentUser: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textDim,
    marginTop: 4,
    textAlign: 'right',
  },
})
