import React, { useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { getLaptopStatus } from '../../src/api/assistant'
import { useAppStore } from '../../src/store/appStore'
import { Card } from '../../src/components/Card'
import { colors, spacing, radius, typography } from '../../src/theme'

export default function LaptopScreen() {
  const { laptopStatus, setLaptopStatus, serverUrl, setServerUrl } = useAppStore()
  const [editingUrl, setEditingUrl] = React.useState(false)
  const [urlInput, setUrlInput] = React.useState(serverUrl)

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['laptop-status'],
    queryFn: getLaptopStatus,
    refetchInterval: laptopStatus.connected ? 8000 : false,
  })

  useEffect(() => {
    if (status) setLaptopStatus(status)
  }, [status, setLaptopStatus])

  const saveUrl = () => {
    setServerUrl(urlInput.trim().replace(/\/$/, ''))
    setEditingUrl(false)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection status */}
      <Card
        style={styles.statusCard}
        accent={laptopStatus.connected ? colors.success : colors.textDim}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusIcon}>
            <Ionicons
              name="laptop"
              size={28}
              color={laptopStatus.connected ? colors.success : colors.textDim}
            />
          </View>
          <View style={styles.statusText}>
            <View style={styles.statusTitleRow}>
              <View style={[styles.dot, laptopStatus.connected ? styles.dotOnline : styles.dotOffline]} />
              <Text style={typography.heading2}>
                {laptopStatus.connected ? 'Connected' : 'Offline'}
              </Text>
            </View>
            {laptopStatus.connected && laptopStatus.ip && (
              <Text style={typography.caption}>{laptopStatus.ip}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        {/* Resource bars */}
        {laptopStatus.connected && (
          <View style={styles.resourceBars}>
            {[
              { label: 'CPU', value: laptopStatus.cpuUsage, color: colors.primary },
              { label: 'GPU', value: laptopStatus.gpuUsage, color: colors.violet },
            ].map(({ label, value, color }) =>
              value !== undefined ? (
                <View key={label} style={styles.resourceBar}>
                  <Text style={styles.resourceLabel}>{label} {value}%</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: color }]} />
                  </View>
                </View>
              ) : null
            )}
          </View>
        )}
      </Card>

      {/* Server URL */}
      <Card style={styles.card}>
        <Text style={[typography.heading3, styles.sectionTitle]}>Server URL</Text>
        <Text style={[typography.caption, styles.sectionDesc]}>
          Point to your ARIA backend server
        </Text>
        {editingUrl ? (
          <View style={styles.urlEdit}>
            <TextInput
              value={urlInput}
              onChangeText={setUrlInput}
              style={styles.urlInput}
              placeholder="http://192.168.1.x:8000"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={saveUrl}
            />
            <TouchableOpacity onPress={saveUrl} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingUrl(true)} style={styles.urlDisplay}>
            <Text style={styles.urlText}>{serverUrl}</Text>
            <Ionicons name="pencil" size={16} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </Card>

      {/* Laptop agent setup */}
      <Card style={styles.card}>
        <Text style={[typography.heading3, styles.sectionTitle]}>Laptop Agent Setup</Text>
        <Text style={[typography.bodyMuted, styles.sectionDesc]}>
          Run this on your laptop to enable file access and GPU offload:
        </Text>
        <View style={styles.codeBlock}>
          {[
            '# Install',
            'pip install psutil websockets',
            '',
            '# Run agent',
            'cd virtual-assistant/laptop-agent',
            'python agent.py',
          ].map((line, i) => (
            <Text
              key={i}
              style={[
                styles.codeLine,
                line.startsWith('#') && styles.codeComment,
                line === '' && { height: 8 },
              ]}
            >
              {line}
            </Text>
          ))}
        </View>
        <Text style={[typography.caption, styles.sectionDesc]}>
          The agent prints your laptop IP — enter it above.
        </Text>
      </Card>

      {/* GPU offload info */}
      <Card style={styles.card}>
        <View style={styles.featureHeader}>
          <Ionicons name="hardware-chip" size={20} color={colors.violet} />
          <Text style={typography.heading3}>GPU Offload</Text>
        </View>
        <Text style={[typography.bodyMuted, styles.sectionDesc]}>
          When connected, ARIA uses your laptop's GPU for:
        </Text>
        {[
          { icon: 'mic-outline', label: 'Whisper voice transcription (faster)' },
          { icon: 'chatbubbles-outline', label: 'Local LLM inference via Ollama' },
          { icon: 'document-outline', label: 'Large document processing' },
        ].map(({ icon, label }) => (
          <View key={label} style={styles.featureRow}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.violet} />
            <Text style={typography.bodyMuted}>{label}</Text>
          </View>
        ))}
      </Card>

      {/* Documents & Reports shortcuts */}
      <View style={styles.shortcuts}>
        <Text style={[typography.heading3, styles.shortcutsTitle]}>Quick Access</Text>
        {[
          { label: 'Generate Document', icon: 'document-text', route: '/generate-doc', color: colors.violet },
          { label: 'Monthly Report', icon: 'bar-chart', route: '/generate-doc', color: colors.success },
        ].map(({ label, icon, route, color }) => (
          <TouchableOpacity
            key={label}
            onPress={() => router.push(route as '/generate-doc')}
            style={styles.shortcutBtn}
          >
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
            <Text style={typography.body}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} style={styles.chevron} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  statusCard: {},
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusIcon: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  statusText: { flex: 1 },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: colors.success },
  dotOffline: { backgroundColor: colors.textDim },
  refreshBtn: { padding: 8 },
  resourceBars: { marginTop: spacing.md, gap: spacing.sm },
  resourceBar: { gap: 4 },
  resourceLabel: { fontSize: 12, color: colors.textDim },
  progressBg: {
    height: 4, backgroundColor: colors.surface3, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  card: {},
  sectionTitle: { marginBottom: 4 },
  sectionDesc: { marginBottom: 12 },
  urlDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urlText: { fontSize: 13, color: colors.primaryLight, fontFamily: 'Courier New' },
  urlEdit: { flexDirection: 'row', gap: spacing.sm },
  urlInput: {
    flex: 1,
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    padding: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '600' },
  codeBlock: {
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeLine: { fontSize: 12, color: colors.success, fontFamily: 'Courier New', lineHeight: 20 },
  codeComment: { color: colors.textDim },
  featureHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  shortcuts: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  shortcutsTitle: { padding: spacing.lg, paddingBottom: spacing.md },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chevron: { marginLeft: 'auto' },
})
