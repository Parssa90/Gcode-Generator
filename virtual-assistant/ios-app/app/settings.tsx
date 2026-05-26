import React, { useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useAppStore } from '../src/store/appStore'
import { useChatStore } from '../src/store/chatStore'
import { colors, spacing, radius, typography } from '../src/theme'
import { Ionicons } from '@expo/vector-icons'

export default function SettingsScreen() {
  const { serverUrl, setServerUrl, wakeWord, setWakeWord } = useAppStore()
  const { clearMessages } = useChatStore()
  const [urlInput, setUrlInput] = useState(serverUrl)
  const [wakeInput, setWakeInput] = useState(wakeWord)

  const save = () => {
    setServerUrl(urlInput.trim().replace(/\/$/, ''))
    setWakeWord(wakeInput.trim().toLowerCase())
    router.back()
  }

  const clearChat = () =>
    Alert.alert('Clear Chat History', 'This will delete all messages in the current session.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearMessages },
    ])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Server</Text>
        <Text style={styles.sectionDesc}>
          Enter the IP/URL where the ARIA backend is running.
          On the same Wi-Fi network, use your computer's local IP.
        </Text>
        <TextInput
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="http://192.168.1.x:8000"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={styles.hint}>
          Example: http://192.168.1.42:8000{'\n'}
          The backend must be running: cd backend && python main.py
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wake Word</Text>
        <Text style={styles.sectionDesc}>Phrase to activate ARIA without touching the screen.</Text>
        <TextInput
          value={wakeInput}
          onChangeText={setWakeInput}
          style={styles.input}
          autoCapitalize="none"
          placeholder="hey aria"
          placeholderTextColor={colors.textDim}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Keys</Text>
        <Text style={styles.sectionDesc}>
          API keys are configured in the backend{' '}
          <Text style={styles.code}>backend/.env</Text> file:
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeLine}>ANTHROPIC_API_KEY=sk-ant-...</Text>
          <Text style={styles.codeLine}>OPENAI_API_KEY=sk-...  # for Whisper</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity onPress={clearChat} style={styles.dangerBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.dangerText}>Clear Chat History</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={save} style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Settings</Text>
      </TouchableOpacity>

      <View style={styles.about}>
        <Text style={styles.aboutTitle}>ARIA v1.0.0</Text>
        <Text style={styles.aboutSub}>AI Remote Intelligence Assistant</Text>
        <Text style={styles.aboutSub}>Powered by Claude (Anthropic)</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: 60 },
  section: {
    backgroundColor: colors.surface2,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  sectionDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  input: {
    backgroundColor: colors.surface3,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.text,
    fontSize: 14,
  },
  hint: { fontSize: 12, color: colors.textDim, lineHeight: 18 },
  code: {
    fontFamily: 'Courier New',
    backgroundColor: colors.surface3,
    color: colors.primaryLight,
  },
  codeBlock: {
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  codeLine: { fontSize: 12, color: colors.success, fontFamily: 'Courier New' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error + '40',
    backgroundColor: colors.errorBg,
  },
  dangerText: { color: colors.error, fontWeight: '500' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  about: { alignItems: 'center', paddingTop: 8, gap: 4 },
  aboutTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  aboutSub: { fontSize: 12, color: colors.textDim },
})
