import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getEmails, getEmailAnalysis, EmailSummary } from '../../src/api/assistant'
import { Card } from '../../src/components/Card'
import { colors, spacing, radius, typography } from '../../src/theme'

const PRIORITY_COLORS: Record<EmailSummary['priority'], string> = {
  low: colors.textDim,
  normal: colors.primary,
  high: colors.warning,
  critical: colors.error,
}

const CATEGORY_BG: Record<EmailSummary['category'], string> = {
  tender: colors.violetBg,
  rfq: colors.cyanBg,
  meeting: colors.successBg,
  general: colors.surface2,
  urgent: colors.errorBg,
}

const CATEGORY_TEXT: Record<EmailSummary['category'], string> = {
  tender: colors.violet,
  rfq: colors.cyan,
  meeting: colors.success,
  general: colors.textDim,
  urgent: colors.error,
}

type Tab = 'inbox' | 'analysis'

export default function EmailScreen() {
  const [tab, setTab] = useState<Tab>('inbox')
  const [selected, setSelected] = useState<EmailSummary | null>(null)

  const {
    data: emails = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({ queryKey: ['emails'], queryFn: getEmails })

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['email-analysis'],
    queryFn: getEmailAnalysis,
    enabled: tab === 'analysis',
  })

  if (selected) {
    return <EmailDetail email={selected} onBack={() => setSelected(null)} />
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(['inbox', 'analysis'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            {t === 'analysis' && <Ionicons name="flash" size={14} color={tab === t ? colors.primary : colors.textDim} />}
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'analysis' ? 'AI Analysis' : 'Inbox'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'inbox' ? (
        <FlatList
          data={emails}
          keyExtractor={(e) => e.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="mail-outline" size={40} color={colors.textDim} />
                <Text style={[typography.bodyMuted, { marginTop: 12 }]}>No emails loaded</Text>
                <Text style={typography.caption}>Connect your email in Settings</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.7}>
              <View style={[styles.emailRow, !item.read && styles.emailRowUnread]}>
                <View style={styles.emailLeft}>
                  {!item.read && <View style={styles.unreadDot} />}
                  <View style={styles.emailAvatar}>
                    <Text style={styles.emailAvatarText}>{item.from[0].toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.emailBody}>
                  <View style={styles.emailTopRow}>
                    <Text style={[styles.emailFrom, !item.read && styles.emailFromUnread]} numberOfLines={1}>
                      {item.from}
                    </Text>
                    <Text style={styles.emailDate}>{format(new Date(item.receivedAt), 'MMM d')}</Text>
                  </View>
                  <Text style={[typography.heading3, styles.emailSubject]} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <Text style={[typography.caption, styles.emailPreview]} numberOfLines={1}>
                    {item.preview}
                  </Text>
                  <View style={styles.emailBadges}>
                    <View style={[styles.badge, { backgroundColor: CATEGORY_BG[item.category] }]}>
                      <Text style={[styles.badgeText, { color: CATEGORY_TEXT[item.category] }]}>
                        {item.category.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.analysisContent}>
          {analysisLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
          ) : analysis ? (
            <>
              <Card style={styles.analysisCard}>
                <View style={styles.analysisHeader}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={typography.heading3}>Critical Emails</Text>
                </View>
                {analysis.critical.length === 0 ? (
                  <Text style={typography.bodyMuted}>No critical emails detected</Text>
                ) : (
                  analysis.critical.map((email) => (
                    <TouchableOpacity
                      key={email.id}
                      onPress={() => { setSelected(email); setTab('inbox') }}
                      style={styles.criticalRow}
                    >
                      <View style={styles.criticalContent}>
                        <Text style={typography.body} numberOfLines={1}>{email.subject}</Text>
                        <Text style={typography.caption}>{email.from}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                    </TouchableOpacity>
                  ))
                )}
              </Card>
              <Card style={styles.analysisCard}>
                <View style={styles.analysisHeader}>
                  <Ionicons name="flash" size={18} color={colors.primary} />
                  <Text style={typography.heading3}>AI Summary</Text>
                </View>
                <Text style={typography.bodyMuted}>{analysis.summary}</Text>
              </Card>
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={40} color={colors.textDim} />
              <Text style={[typography.bodyMuted, { marginTop: 12 }]}>Connect email to analyze</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

function EmailDetail({ email, onBack }: { email: EmailSummary; onBack: () => void }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
        <Text style={styles.backText}>Inbox</Text>
      </TouchableOpacity>
      <View style={styles.detailContent}>
        <Text style={[typography.heading2, styles.detailSubject]}>{email.subject}</Text>
        <View style={styles.detailMeta}>
          <View style={styles.senderAvatar}>
            <Text style={styles.senderAvatarText}>{email.from[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={typography.body}>{email.from}</Text>
            <Text style={typography.caption}>{format(new Date(email.receivedAt), 'MMMM d, yyyy HH:mm')}</Text>
          </View>
        </View>
        <Text style={[typography.bodyMuted, styles.detailBody]}>{email.preview}</Text>
        <Text style={styles.detailNote}>
          [Full email body loads from connected email provider]
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textDim, fontWeight: '500' },
  tabTextActive: { color: colors.primary },
  list: { paddingBottom: 40 },
  emailRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  emailRowUnread: { backgroundColor: colors.surface + '80' },
  emailLeft: { alignItems: 'center', gap: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  emailAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  emailAvatarText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  emailBody: { flex: 1 },
  emailTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  emailFrom: { fontSize: 13, color: colors.textMuted, flex: 1 },
  emailFromUnread: { color: colors.text, fontWeight: '600' },
  emailDate: { fontSize: 11, color: colors.textDim },
  emailSubject: { marginBottom: 2 },
  emailPreview: { marginBottom: 6 },
  emailBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: '600' },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  analysisContent: { padding: spacing.lg, gap: spacing.lg },
  analysisCard: { marginBottom: 0 },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  criticalContent: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: { color: colors.primary, fontSize: 16 },
  detailContent: { padding: spacing.xl },
  detailSubject: { marginBottom: 16 },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  senderAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  senderAvatarText: { color: 'white', fontWeight: '700' },
  detailBody: { lineHeight: 24 },
  detailNote: { marginTop: 24, fontSize: 12, color: colors.textDim, fontStyle: 'italic' },
})
