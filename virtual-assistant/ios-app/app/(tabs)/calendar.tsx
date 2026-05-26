import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, addMonths, subMonths,
} from 'date-fns'
import { getMeetings, Meeting } from '../../src/api/assistant'
import { Card } from '../../src/components/Card'
import { colors, spacing, radius, typography } from '../../src/theme'

const ACCENT = [colors.primary, colors.success, colors.violet, colors.warning]

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: getMeetings,
  })

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })
  const startPad = startOfMonth(currentMonth).getDay()
  const dayMeetings = meetings.filter((m) => isSameDay(new Date(m.startTime), selectedDay))

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => setCurrentMonth((d) => subMonths(d, 1))}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={typography.heading2}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <TouchableOpacity
          onPress={() => setCurrentMonth((d) => addMonths(d, 1))}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {Array.from({ length: startPad }).map((_, i) => (
          <View key={`pad-${i}`} style={styles.dayCell} />
        ))}
        {days.map((day) => {
          const hasEvents = meetings.some((m) => isSameDay(new Date(m.startTime), day))
          const isSelected = isSameDay(day, selectedDay)
          const today = isToday(day)
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => setSelectedDay(day)}
            >
              <View style={[styles.dayNum, today && styles.dayNumToday, isSelected && styles.dayNumSelected]}>
                <Text style={[
                  styles.dayText,
                  today && styles.dayTextToday,
                  isSelected && !today && styles.dayTextSelected,
                ]}>
                  {format(day, 'd')}
                </Text>
              </View>
              {hasEvents && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Selected day meetings */}
      <View style={styles.daySection}>
        <View style={styles.daySectionHeader}>
          <Text style={typography.heading3}>
            {format(selectedDay, 'EEEE, MMMM d')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/new-meeting')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.addBtnText}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : dayMeetings.length === 0 ? (
          <View style={styles.noMeetings}>
            <Ionicons name="calendar-outline" size={32} color={colors.textDim} />
            <Text style={[typography.bodyMuted, { marginTop: 8 }]}>No meetings today</Text>
          </View>
        ) : (
          <View style={styles.meetingList}>
            {dayMeetings.map((meeting, i) => (
              <MeetingRow key={meeting.id} meeting={meeting} accent={ACCENT[i % ACCENT.length]} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function MeetingRow({ meeting, accent }: { meeting: Meeting; accent: string }) {
  return (
    <Card accent={accent} style={styles.meetingCard}>
      <Text style={typography.heading3}>{meeting.title}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={13} color={colors.textDim} />
        <Text style={typography.caption}>
          {format(new Date(meeting.startTime), 'HH:mm')} – {format(new Date(meeting.endTime), 'HH:mm')}
        </Text>
      </View>
      {meeting.location ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textDim} />
          <Text style={typography.caption}>{meeting.location}</Text>
        </View>
      ) : null}
      {meeting.attendees.length > 0 && (
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color={colors.textDim} />
          <Text style={typography.caption} numberOfLines={1}>{meeting.attendees.join(', ')}</Text>
        </View>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  navBtn: {
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textDim,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayCellSelected: {},
  dayNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumToday: { backgroundColor: colors.primary },
  dayNumSelected: { backgroundColor: colors.primaryBg, borderWidth: 1, borderColor: colors.primaryBorder },
  dayText: { fontSize: 13, color: colors.textMuted },
  dayTextToday: { color: 'white', fontWeight: '700' },
  dayTextSelected: { color: colors.primaryLight, fontWeight: '600' },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primary, marginTop: 2,
  },
  dotSelected: { backgroundColor: colors.primaryLight },
  daySection: { paddingHorizontal: spacing.lg },
  daySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  noMeetings: { alignItems: 'center', paddingVertical: 32 },
  meetingList: { gap: spacing.md },
  meetingCard: { marginBottom: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
})
