import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Clock, Users, MapPin, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { getMeetings, createMeeting, Meeting } from '../../api/assistant'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import toast from 'react-hot-toast'

const priorityColors = ['bg-primary-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500']

export function CalendarPanel() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [showForm, setShowForm] = useState(false)
  const qc = useQueryClient()

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: getMeetings,
  })

  const { mutate: addMeeting, isPending } = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      setShowForm(false)
      toast.success('Meeting scheduled!')
    },
    onError: () => toast.error('Failed to schedule meeting'),
  })

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = startOfMonth(currentMonth).getDay()

  const dayMeetings = selectedDay
    ? meetings.filter((m) => isSameDay(new Date(m.startTime), selectedDay))
    : []

  return (
    <div className="flex h-full gap-0">
      {/* Calendar grid */}
      <div className="flex-1 p-5 flex flex-col">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="btn-ghost text-sm py-1.5"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs text-slate-500 font-medium py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {/* Padding */}
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

          {days.map((day) => {
            const dayMtgs = meetings.filter((m) => isSameDay(new Date(m.startTime), day))
            const isSelected = selectedDay && isSameDay(day, selectedDay)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`
                  rounded-xl p-1.5 flex flex-col items-center transition-all text-sm
                  min-h-[60px] relative
                  ${isSelected ? 'bg-primary-600/30 border border-primary-500/50' : 'hover:bg-white/5 border border-transparent'}
                  ${isToday(day) ? 'ring-1 ring-primary-400/50' : ''}
                `}
              >
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                    isToday(day)
                      ? 'bg-primary-500 text-white'
                      : isSelected
                      ? 'text-white'
                      : 'text-slate-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {dayMtgs.slice(0, 3).map((m, i) => (
                    <div
                      key={m.id}
                      className={`w-1.5 h-1.5 rounded-full ${priorityColors[i % priorityColors.length]}`}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <div className="w-80 shrink-0 border-l border-white/8 flex flex-col h-full">
        <div className="p-4 border-b border-white/8 flex items-center justify-between">
          <div>
            <div className="font-semibold text-white text-sm">
              {selectedDay ? format(selectedDay, 'EEEE') : 'Select a day'}
            </div>
            {selectedDay && (
              <div className="text-xs text-slate-500">{format(selectedDay, 'MMMM d, yyyy')}</div>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <Plus size={14} />
            Schedule
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-500" /></div>
          ) : dayMeetings.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              <Calendar size={28} className="mx-auto mb-2 text-slate-700" />
              No meetings scheduled
            </div>
          ) : (
            dayMeetings.map((meeting, i) => (
              <MeetingCard key={meeting.id} meeting={meeting} colorIndex={i} />
            ))
          )}
        </div>
      </div>

      {/* New meeting modal */}
      {showForm && (
        <MeetingForm
          defaultDate={selectedDay ?? new Date()}
          onSave={addMeeting}
          onClose={() => setShowForm(false)}
          isPending={isPending}
        />
      )}
    </div>
  )
}

function MeetingCard({ meeting, colorIndex }: { meeting: Meeting; colorIndex: number }) {
  return (
    <div className={`p-3 rounded-xl border border-white/8 bg-white/3 border-l-2 ${
      colorIndex === 0 ? 'border-l-primary-500' :
      colorIndex === 1 ? 'border-l-emerald-500' :
      colorIndex === 2 ? 'border-l-violet-500' : 'border-l-amber-500'
    }`}>
      <div className="font-medium text-sm text-white mb-2">{meeting.title}</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock size={11} />
          <span>
            {format(new Date(meeting.startTime), 'HH:mm')} –{' '}
            {format(new Date(meeting.endTime), 'HH:mm')}
          </span>
        </div>
        {meeting.location && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin size={11} />
            <span>{meeting.location}</span>
          </div>
        )}
        {meeting.attendees.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users size={11} />
            <span>{meeting.attendees.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MeetingForm({
  defaultDate,
  onSave,
  onClose,
  isPending,
}: {
  defaultDate: Date
  onSave: (m: Omit<Meeting, 'id' | 'status'>) => void
  onClose: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState({
    title: '',
    startTime: format(defaultDate, "yyyy-MM-dd'T'09:00"),
    endTime: format(defaultDate, "yyyy-MM-dd'T'10:00"),
    attendees: '',
    location: '',
    description: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      title: form.title,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      attendees: form.attendees.split(',').map((a) => a.trim()).filter(Boolean),
      location: form.location || undefined,
      description: form.description || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-800 rounded-2xl border border-white/10 shadow-2xl">
        <div className="p-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="font-semibold text-white">Schedule Meeting</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Cancel</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Meeting title" className="input" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Start</label>
              <input type="datetime-local" value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} className="input text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">End</label>
              <input type="datetime-local" value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} className="input text-sm" />
            </div>
          </div>
          <input value={form.attendees} onChange={(e) => setForm((p) => ({ ...p, attendees: e.target.value }))}
            placeholder="Attendees (comma separated emails)" className="input" />
          <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            placeholder="Location (optional)" className="input" />
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)" rows={3} className="input resize-none" />
          <button type="submit" disabled={isPending} className="btn-primary w-full flex items-center justify-center gap-2">
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
            Schedule Meeting
          </button>
        </form>
      </div>
    </div>
  )
}
