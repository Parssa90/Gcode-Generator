import React, { useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useNotesStore } from '../src/store/notesStore'
import { colors, spacing, radius, typography } from '../src/theme'

export default function NewNoteScreen() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const { addNote } = useNotesStore()

  const save = () => {
    if (!title.trim() && !content.trim()) return
    addNote({
      title: title.trim() || 'Untitled',
      content: content.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    })
    router.back()
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={typography.heading3}>New Note</Text>
        <TouchableOpacity onPress={save} style={styles.saveBtn}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title..."
          placeholderTextColor={colors.textDim}
          style={styles.titleInput}
          autoFocus
        />
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write your note here..."
          placeholderTextColor={colors.textDim}
          style={styles.contentInput}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.tagsRow}>
          <Text style={styles.tagsLabel}>Tags (comma separated)</Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="meeting, project, ideas..."
            placeholderTextColor={colors.textDim}
            style={styles.tagsInput}
            autoCapitalize="none"
          />
        </View>
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
  cancelBtn: { padding: 4 },
  cancelText: { color: colors.textMuted, fontSize: 16 },
  saveBtn: { padding: 4 },
  saveText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  form: { flex: 1 },
  formContent: { padding: spacing.lg, gap: spacing.lg },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  contentInput: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    minHeight: 240,
  },
  tagsRow: { gap: 6 },
  tagsLabel: { fontSize: 12, color: colors.textDim },
  tagsInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    color: colors.text,
    fontSize: 14,
  },
})
