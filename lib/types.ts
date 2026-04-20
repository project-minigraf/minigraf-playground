export type Provider = 'gemini' | 'anthropic' | 'openai' | 'xai'

export type QueryResult = {
  columns: string[]
  rows: string[][]
  executionTimeMs: number
}

export type SessionPrefs = {
  provider: Provider
  model: string
  mode?: 'sandbox' | 'lessons'
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type LessonStep = {
  id: string
  instruction: string
  starterCode: string
  expectedResult?: { columns: string[]; rows: string[][] }
  hints: string[]
  successMessage: string
}

export type Lesson = {
  id: string
  title: string
  description: string
  steps: LessonStep[]
}

export type TutorDiff = {
  missing: string[][]
  unexpected: string[][]
}

export interface MinigrafResult {
  variables?: string[];
  results?: string[][];
  transacted?: number;
  retracted?: number;
  ok?: boolean;
}

export interface UseMinigrafReturn {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  query: (datalog: string) => Promise<QueryResult>
}