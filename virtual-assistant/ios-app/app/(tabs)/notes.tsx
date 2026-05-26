import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { useNotesStore } from '../../src/store/notesStore'
import { Card } from '../../src/components/Card'
import { colors, spacing, radius, typography } from '../../src/theme'

export default function NotesScreen() {
  const [query, setQuery] = useState('')
  const { notes, deleteNote, updateNote, searchNotes } = useNotesStore()
  const displayed = query ? searchNotes(query) : notes

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Delete Note', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(id) },
    ])
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textDim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes..."
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => router.push('/new-note')}
          style={styles.newBtn}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {displayed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.textDim} />
          <Text style={[typography.heading3, styles.emptyTitle]}>
            {query ? 'No results' : 'No notes yet'}
          </Text>
          <Text style={typography.bodyMuted}>
            {query ? 'Try a different search' : 'Tap + to create your first note'}
          </Text>
          {!query && (
            <TouchableOpacity
              onPress={() => router.push('/new-note')}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Create Note</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/note/${item.id}`)}
              onLongPress={() => confirmDelete(item.id, item.title)}
              activeOpacity={0.7}
            >
              <Card style={styles.noteCard} accent={item.pinned ? colors.primary : undefined}>
                <View style={styles.noteHeader}>
                  <Text style={[typography.heading3, styles.noteTitle]} numberOfLines={1}>
                    {item.title || 'Untitled'}
                  </Text>
                  <View style={styles.noteActions}>
                    {item.pinned && (
                      <Ionicons name="pin" size={14} color={colors.primaryLight} />
                    )}
                    <TouchableOpacity onPress={() => updateNote(item.id, { pinned: !item.pinned })}>
                      <Ionicons
                        name={item.pinned ? 'pin' : 'pin-outline'}
                        size={16}
                        color={colors.textDim}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[typography.bodyMuted, styles.notePreview]} numberOfLines={2}>
                  {item.content}
                </Text>
                <View style={styles.noteMeta}>
                  <Text style={typography.caption}>
                    {format(new Date(item.updatedAt), 'MMM d, yyyy')}
                  </Text>
                  {item.tags.length > 0 && (
                    <View style={styles.tags}>
                      {item.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  newBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  noteCard: { marginBottom: 0 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  noteTitle: { flex: 1, marginRight: 8 },
  noteActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notePreview: { marginBottom: 8 },
  noteMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', gap: 4 },
  tag: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, color: colors.primaryLight },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 },
  emptyTitle: { marginTop: 12 },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  emptyBtnText: { color: 'white', fontWeight: '600' },
})
