import { openDB, type IDBPDatabase } from 'idb'
import type { Provider, SessionPrefs, ChatMessage } from './types'

const DB_NAME = 'minigraf-playground'
const DB_VERSION = 1

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('graph_state')
      db.createObjectStore('session_prefs')
      // API keys stored locally only — never sent to app servers
      db.createObjectStore('api_keys')
      db.createObjectStore('lesson_progress')
      db.createObjectStore('chat_history')
    },
  })
}

async function safeGetDB(): Promise<IDBPDatabase | null> {
  try { return await getDB() }
  catch (e) { console.warn('IndexedDB unavailable:', e); return null }
}

export async function getGraphState(): Promise<string | null> {
  const db = await safeGetDB()
  if (!db) return null
  return (await db.get('graph_state', 'current')) ?? null
}
export async function setGraphState(content: string): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('graph_state', content, 'current')
}

export async function getSessionPrefs(): Promise<SessionPrefs | null> {
  const db = await safeGetDB()
  if (!db) return null
  return (await db.get('session_prefs', 'prefs')) ?? null
}
export async function setSessionPrefs(prefs: SessionPrefs): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('session_prefs', prefs, 'prefs')
}

export async function getApiKey(provider: Provider): Promise<string | null> {
  const db = await safeGetDB()
  if (!db) return null
  return (await db.get('api_keys', provider)) ?? null
}
export async function setApiKey(provider: Provider, key: string): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('api_keys', key, provider)
}
export async function clearApiKey(provider: Provider): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.delete('api_keys', provider)
}

export async function getLessonProgress(lessonId: string): Promise<{ completedSteps: string[] } | null> {
  const db = await safeGetDB()
  if (!db) return null
  return (await db.get('lesson_progress', lessonId)) ?? null
}
export async function setLessonProgress(lessonId: string, completedSteps: string[]): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('lesson_progress', { completedSteps }, lessonId)
}

export async function getChatHistory(key: string): Promise<ChatMessage[]> {
  const db = await safeGetDB()
  if (!db) return []
  return (await db.get('chat_history', key)) ?? []
}
export async function setChatHistory(key: string, messages: ChatMessage[]): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('chat_history', messages, key)
}
export async function clearChatHistory(key: string): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  await db.put('chat_history', [], key)
}
export async function clearAllChatHistory(): Promise<void> {
  const db = await safeGetDB()
  if (!db) return
  const tx = db.transaction('chat_history', 'readwrite')
  const store = tx.objectStore('chat_history')
  const keys = await store.getAllKeys()
  for (const key of keys) {
    await store.put([], key)
  }
  await tx.done
}