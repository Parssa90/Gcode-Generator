import React, { useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTask, Task } from '../src/api/assistant'
import { useAppStore } from '../src/store/appStore'
import { colors, spacing, radius, typography } from '../src/theme'

const PRIORITIES: Task['priority'][] = ['low', 'medium', 'high', 'urgent']
const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: colors.textDim,
  medium: colors.primary,
  high: colors.warning,
  urgent: colors.error,
}

export default function NewTaskScreen() {
  const { laptopStatus } = useAppStore()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [laptopSync, setLaptopSync] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      createTask({
        title,
        description: description || undefined,
        priority,
        status: 'pending',
        dueDate: dueDate || undefined,
        laptopSync,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      router.back()
    },
  })

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={typography.heading3}>New Task</Text>
        <TouchableOpacity onPress={() => mutate()} disabled={!title || isPending}>
          <Text style={[styles.save, (!title || isPending) && styles.saveDisabled]}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Task title..."
          placeholderTextColor={colors.textDim}
          style={styles.titleInput}
          autoFocus
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor={colors.textDim}
          style={styles.descInput}
          multiline
          textAlignVertical="top"
        />

        {/* Priority */}
        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPriority(p)}
              style={[
                styles.priorityBtn,
                priority === p && { backgroundColor: PRIORITY_COLORS[p] + '30', borderColor: PRIORITY_COLORS[p] },
              ]}
            >
              <Text style={[styles.priorityText, priority === p && { color: PRIORITY_COLORS[p] }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Due date */}
        <Text style={styles.sectionLabel}>Due Date (optional)</Text>
        <TextInput
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          autoCapitalize="none"
        />

        {/* Laptop sync */}
        {laptopStatus.connected && (
          <View style={styles.syncRow}>
            <View>
              <Text style={typography.body}>Sync to Laptop</Text>
              <Text style={typography.caption}>Send this task to your laptop agent</Text>
            </View>
            <Switch
              value={laptopSync}
              onValueChange={setLaptopSync}
              trackColor={{ false: colors.surface3, true: colors.primaryDark }}
              thumbColor={laptopSync ? colors.primary : colors.textDim}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={() => mutate()}
          disabled={!title || isPending}
          style={[styles.btn, (!title || isPending) && styles.btnDisabled]}
        >
          {isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>Create Task</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancel: { color: colors.textMuted, fontSize: 16 },
  save: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  saveDisabled: { opacity: 0.4 },
  form: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 },
  titleInput: {
    fontSize: 20, fontWeight: '600', color: colors.text,
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12,
  },
  descInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
  },
  sectionLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  priorityText: { fontSize: 13, color: colors.textDim, fontWeight: '500' },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.text,
    fontSize: 14,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
})
