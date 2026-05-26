import React, { useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { generateDocument, Document } from '../src/api/assistant'
import { colors, spacing, radius, typography } from '../src/theme'

const DOC_TYPES: { value: Document['type']; label: string; hint: string }[] = [
  { value: 'rfq', label: 'RFQ', hint: 'Items, specs, quantities, delivery timeline' },
  { value: 'tender', label: 'Tender', hint: 'Project scope, requirements, evaluation criteria' },
  { value: 'memo', label: 'Memo', hint: 'Subject, key points, action items, deadline' },
  { value: 'report', label: 'Report', hint: 'Period, achievements, issues, next steps' },
]

export default function GenerateDocScreen() {
  const [type, setType] = useState<Document['type']>('rfq')
  const [title, setTitle] = useState('')
  const [recipient, setRecipient] = useState('')
  const [context, setContext] = useState('')

  const { mutate: generate, isPending, isSuccess, data: result } = useMutation({
    mutationFn: () => generateDocument({ type, title, context, recipient }),
  })

  const selectedType = DOC_TYPES.find((t) => t.value === type)!

  if (isSuccess && result) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Done</Text>
          </TouchableOpacity>
          <Text style={typography.heading3}>{result.title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.resultContent}>
          <Text style={styles.resultText}>{result.content}</Text>
        </ScrollView>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={typography.heading3}>Generate Document</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {/* Type selector */}
        <Text style={styles.label}>Document Type</Text>
        <View style={styles.typeRow}>
          {DOC_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setType(t.value)}
              style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.hintBox}>
          <Text style={styles.hintText}>Hint: {selectedType.hint}</Text>
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={`${type.toUpperCase()} title...`}
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />

        <Text style={styles.label}>Recipient / Company (optional)</Text>
        <TextInput
          value={recipient}
          onChangeText={setRecipient}
          placeholder="Company name or contact..."
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />

        <Text style={styles.label}>Requirements & Context</Text>
        <TextInput
          value={context}
          onChangeText={setContext}
          placeholder={`Describe the ${type} requirements in detail...`}
          placeholderTextColor={colors.textDim}
          style={styles.textArea}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          onPress={() => generate()}
          disabled={!title || !context || isPending}
          style={[styles.generateBtn, (!title || !context || isPending) && styles.generateBtnDisabled]}
        >
          {isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateBtnText}>Generate {type.toUpperCase()} with AI</Text>
          )}
        </TouchableOpacity>
        {isPending && (
          <Text style={styles.generatingText}>Generating with Claude AI...</Text>
        )}
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
  cancelText: { color: colors.textMuted, fontSize: 16 },
  backText: { color: colors.primary, fontSize: 16 },
  form: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  label: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.lg,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { fontSize: 13, color: colors.textDim, fontWeight: '600' },
  typeBtnTextActive: { color: 'white' },
  hintBox: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  hintText: { fontSize: 12, color: colors.primaryLight, lineHeight: 18 },
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
    minHeight: 160,
    lineHeight: 22,
  },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  generatingText: { textAlign: 'center', color: colors.textDim, fontSize: 13 },
  resultContent: { padding: spacing.lg, paddingBottom: 40 },
  resultText: { color: colors.text, fontSize: 14, lineHeight: 24 },
})
