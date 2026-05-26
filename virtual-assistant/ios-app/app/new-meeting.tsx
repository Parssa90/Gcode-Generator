import React, { useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMeeting } from '../src/api/assistant'
import { colors, spacing, radius, typography } from '../src/theme'
import { format, addHours } from 'date-fns'

export default function NewMeetingScreen() {
  const qc = useQueryClient()
  const now = new Date()
  const [title, setTitle] = useState('')
  const [attendees, setAttendees] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(format(now, "yyyy-MM-dd'T'HH:mm"))
  const [endDate, setEndDate] = useState(format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"))

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      createMeeting({
        title,
        startTime: new Date(startDate).toISOString(),
        endTime: new Date(endDate).toISOString(),
        attendees: attendees.split(',').map((a) => a.trim()).filter(Boolean),
        location: location || undefined,
        description: description || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
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
        <Text style={typography.heading3}>Schedule Meeting</Text>
        <TouchableOpacity onPress={() => mutate()} disabled={!title || isPending}>
          <Text style={[styles.save, (!title || isPending) && styles.saveDisabled]}>Save</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.form}>
        <Field label="Meeting Title *">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What's this meeting about?"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            autoFocus
          />
        </Field>
        <View style={styles.timeRow}>
          <Field label="Start" style={styles.flex1}>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              style={styles.input}
              autoCapitalize="none"
            />
          </Field>
          <Field label="End" style={styles.flex1}>
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              style={styles.input}
              autoCapitalize="none"
            />
          </Field>
        </View>
        <Field label="Attendees (comma separated emails)">
          <TextInput
            value={attendees}
            onChangeText={setAttendees}
            placeholder="john@co.com, jane@co.com"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </Field>
        <Field label="Location (optional)">
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Conference room or Zoom link"
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
        </Field>
        <Field label="Description (optional)">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Agenda or notes..."
            placeholderTextColor={colors.textDim}
            style={styles.textArea}
            multiline
            textAlignVertical="top"
          />
        </Field>
        <TouchableOpacity
          onPress={() => mutate()}
          disabled={!title || isPending}
          style={[styles.btn, (!title || isPending) && styles.btnDisabled]}
        >
          {isPending ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Schedule Meeting</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
  form: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 13, color: colors.textMuted },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.text,
    fontSize: 14,
  },
  textArea: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 100,
  },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
})
