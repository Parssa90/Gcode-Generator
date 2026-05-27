import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SERVER_URL_KEY = 'aria_server_url'
const DEFAULT_SERVER = 'http://localhost:8000'

export async function getServerUrl(): Promise<string> {
  return (await AsyncStorage.getItem(SERVER_URL_KEY)) ?? DEFAULT_SERVER
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url)
}

async function api() {
  const base = await getServerUrl()
  return axios.create({ baseURL: base, timeout: 30000 })
}

export interface ChatResponse {
  reply: string
  conversationId: string
  action?: { type: string; payload?: Record<string, unknown> }
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

export const chatWithAssistant = async (
  message: string,
  conversationId?: string,
  isVoice = false,
  context?: Record<string, unknown>
): Promise<ChatResponse> => {
  const client = await api()
  const { data } = await client.post<ChatResponse>('/api/chat', {
    message,
    conversationId,
    isVoice,
    context,
  })
  return data
}

export const transcribeAudio = async (uri: string): Promise<string> => {
  const client = await api()
  const form = new FormData()
  form.append('audio', { uri, type: 'audio/m4a', name: 'audio.m4a' } as unknown as Blob)
  const { data } = await client.post<{ text: string }>('/api/voice/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.text || ''
}

export const getMeetings = async (): Promise<Meeting[]> => {
  const client = await api()
  const { data } = await client.get<Meeting[]>('/api/calendar/meetings')
  return data
}

export const createMeeting = async (meeting: Omit<Meeting, 'id' | 'status'>): Promise<Meeting> => {
  const client = await api()
  const { data } = await client.post<Meeting>('/api/calendar/meetings', meeting)
  return data
}

export const getEmails = async (): Promise<EmailSummary[]> => {
  const client = await api()
  const { data } = await client.get<EmailSummary[]>('/api/email/list')
  return data
}

export const getEmailAnalysis = async (): Promise<{ critical: EmailSummary[]; summary: string }> => {
  const client = await api()
  const { data } = await client.get('/api/email/analyze')
  return data
}

export const getTasks = async (): Promise<Task[]> => {
  const client = await api()
  const { data } = await client.get<Task[]>('/api/tasks')
  return data
}

export const createTask = async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
  const client = await api()
  const { data } = await client.post<Task>('/api/tasks', task)
  return data
}

export const syncTaskToLaptop = async (taskId: string): Promise<void> => {
  const client = await api()
  await client.post(`/api/tasks/${taskId}/sync-laptop`)
}

export const getDocuments = async (): Promise<Document[]> => {
  const client = await api()
  const { data } = await client.get<Document[]>('/api/documents')
  return data
}

export const generateDocument = async (params: {
  type: Document['type']
  title: string
  context: string
  recipient?: string
}): Promise<Document> => {
  const client = await api()
  const { data } = await client.post<Document>('/api/documents/generate', params)
  return data
}

export const generateMonthlyReport = async (month?: string): Promise<Document> => {
  const client = await api()
  const { data } = await client.post<Document>('/api/reports/monthly', { month })
  return data
}

export const getLaptopStatus = async () => {
  const client = await api()
  const { data } = await client.get('/api/laptop/status')
  return data
}
