import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export interface ChatRequest {
  message: string
  conversationId?: string
  context?: Record<string, unknown>
  isVoice?: boolean
}

export interface ChatResponse {
  reply: string
  conversationId: string
  action?: {
    type: 'create_note' | 'schedule_meeting' | 'create_document' | 'send_email' | 'create_task' | 'generate_report' | 'read_emails' | 'sync_laptop'
    payload?: Record<string, unknown>
  }
}

export interface Meeting {
  id: string
  title: string
  startTime: string
  endTime: string
  attendees: string[]
  location?: string
  description?: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  dueDate?: string
  laptopSync?: boolean
  createdAt: string
}

export interface EmailSummary {
  id: string
  from: string
  subject: string
  preview: string
  receivedAt: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  category: 'tender' | 'rfq' | 'meeting' | 'general' | 'urgent'
  read: boolean
}

export interface Document {
  id: string
  type: 'tender' | 'rfq' | 'report' | 'memo'
  title: string
  content: string
  createdAt: string
  status: 'draft' | 'ready' | 'sent'
}

export const chatWithAssistant = async (req: ChatRequest): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>('/chat', req)
  return data
}

export const transcribeAudio = async (blob: Blob): Promise<{ text: string }> => {
  const form = new FormData()
  form.append('audio', blob, 'audio.webm')
  const { data } = await api.post<{ text: string }>('/voice/transcribe', form)
  return data
}

export const getMeetings = async (): Promise<Meeting[]> => {
  const { data } = await api.get<Meeting[]>('/calendar/meetings')
  return data
}

export const createMeeting = async (meeting: Omit<Meeting, 'id' | 'status'>): Promise<Meeting> => {
  const { data } = await api.post<Meeting>('/calendar/meetings', meeting)
  return data
}

export const getEmails = async (folder = 'inbox', limit = 20): Promise<EmailSummary[]> => {
  const { data } = await api.get<EmailSummary[]>('/email/list', { params: { folder, limit } })
  return data
}

export const getEmailAnalysis = async (): Promise<{ critical: EmailSummary[]; summary: string }> => {
  const { data } = await api.get('/email/analyze')
  return data
}

export const sendEmail = async (params: {
  to: string[]
  subject: string
  body: string
  attachments?: string[]
}): Promise<{ sent: boolean; messageId: string }> => {
  const { data } = await api.post('/email/send', params)
  return data
}

export const getTasks = async (): Promise<Task[]> => {
  const { data } = await api.get<Task[]>('/tasks')
  return data
}

export const createTask = async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
  const { data } = await api.post<Task>('/tasks', task)
  return data
}

export const syncTaskToLaptop = async (taskId: string): Promise<{ synced: boolean }> => {
  const { data } = await api.post(`/tasks/${taskId}/sync-laptop`)
  return data
}

export const getDocuments = async (): Promise<Document[]> => {
  const { data } = await api.get<Document[]>('/documents')
  return data
}

export const generateDocument = async (params: {
  type: Document['type']
  title: string
  context: string
  recipient?: string
}): Promise<Document> => {
  const { data } = await api.post<Document>('/documents/generate', params)
  return data
}

export const generateMonthlyReport = async (month?: string): Promise<Document> => {
  const { data } = await api.post<Document>('/reports/monthly', { month })
  return data
}

export const getLaptopStatus = async (): Promise<{
  connected: boolean
  ip?: string
  cpuUsage?: number
  gpuUsage?: number
  diskFree?: number
  lastSeen?: string
}> => {
  const { data } = await api.get('/laptop/status')
  return data
}

export const readLaptopFile = async (path: string): Promise<{ content: string; size: number }> => {
  const { data } = await api.post('/laptop/files/read', { path })
  return data
}

export const writeLaptopFile = async (path: string, content: string): Promise<{ success: boolean }> => {
  const { data } = await api.post('/laptop/files/write', { path, content })
  return data
}

export const listLaptopFiles = async (dir: string): Promise<{ files: string[]; dirs: string[] }> => {
  const { data } = await api.post('/laptop/files/list', { dir })
  return data
}
