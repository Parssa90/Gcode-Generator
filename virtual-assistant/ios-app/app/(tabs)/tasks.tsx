import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getTasks, syncTaskToLaptop, Task } from '../../src/api/assistant'
import { Card } from '../../src/components/Card'
import { useAppStore } from '../../src/store/appStore'
import { colors, spacing, radius, typography } from '../../src/theme'
import Toast from 'react-native'

const PRIORITY: Record<Task['priority'], { color: string; bg: string; label: string }> = {
  low: { color: colors.textDim, bg: colors.surface3, label: 'Low' },
  medium: { color: colors.primary, bg: colors.primaryBg, label: 'Medium' },
  high: { color: colors.warning, bg: colors.warningBg, label: 'High' },
  urgent: { color: colors.error, bg: colors.errorBg, label: 'Urgent' },
}

type Filter = Task['status'] | 'all'

export default function TasksScreen() {
  const [filter, setFilter] = useState<Filter>('all')
  const { laptopStatus } = useAppStore()
  const qc = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })

  const { mutate: syncLaptop } = useMutation({
    mutationFn: syncTaskToLaptop,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)
  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }

  return (
    <View style={styles.container}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', val: tasks.length, color: colors.text },
          { label: 'Pending', val: counts.pending, color: colors.warning },
          { label: 'Done', val: counts.completed, color: colors.success },
          { label: 'Urgent', val: tasks.filter((t) => t.priority === 'urgent').length, color: colors.error },
        ].map(({ label, val, color }) => (
          <View key={label} style={styles.stat}>
            <Text style={[styles.statNum, { color }]}>{val}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'in_progress', 'completed'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* New task button */}
      <TouchableOpacity onPress={() => router.push('/new-task')} style={styles.newBtn}>
        <Ionicons name="add-circle" size={18} color="white" />
        <Text style={styles.newBtnText}>New Task</Text>
      </TouchableOpacity>

      {/* Task list */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.textDim} />
              <Text style={[typography.bodyMuted, { marginTop: 12 }]}>No tasks</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card
              accent={PRIORITY[item.priority].color}
              style={[styles.taskCard, item.status === 'completed' && styles.taskDone]}
            >
              <View style={styles.taskRow}>
                <TouchableOpacity style={styles.checkbox}>
                  <Ionicons
                    name={item.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={item.status === 'completed' ? colors.success : colors.textDim}
                  />
                </TouchableOpacity>
                <View style={styles.taskContent}>
                  <Text style={[
                    typography.heading3,
                    item.status === 'completed' && styles.taskDoneText,
                  ]}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={[typography.caption, styles.taskDesc]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.taskMeta}>
                    <View style={[styles.priorityBadge, { backgroundColor: PRIORITY[item.priority].bg }]}>
                      <Text style={[styles.priorityText, { color: PRIORITY[item.priority].color }]}>
                        {PRIORITY[item.priority].label}
                      </Text>
                    </View>
                    {item.dueDate && (
                      <Text style={typography.caption}>
                        <Ionicons name="alarm-outline" size={11} color={colors.textDim} />{' '}
                        {format(new Date(item.dueDate), 'MMM d')}
                      </Text>
                    )}
                    {item.laptopSync && (
                      <View style={styles.syncBadge}>
                        <Ionicons name="laptop-outline" size={11} color={colors.success} />
                        <Text style={styles.syncText}>Synced</Text>
                      </View>
                    )}
                  </View>
                </View>
                {laptopStatus.connected && !item.laptopSync && (
                  <TouchableOpacity
                    onPress={() => syncLaptop(item.id)}
                    style={styles.syncBtn}
                  >
                    <Ionicons name="send-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.textDim, marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, color: colors.textDim },
  filterTextActive: { color: 'white', fontWeight: '600' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  taskCard: { marginBottom: 0 },
  taskDone: { opacity: 0.6 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  checkbox: { marginTop: 1 },
  taskContent: { flex: 1 },
  taskDoneText: { textDecorationLine: 'line-through', color: colors.textDim },
  taskDesc: { marginTop: 2, marginBottom: 6 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  priorityText: { fontSize: 11, fontWeight: '600' },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  syncText: { fontSize: 11, color: colors.success },
  syncBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
})
