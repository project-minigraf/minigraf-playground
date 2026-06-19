export type Provider = 'gemini' | 'anthropic' | 'openai' | 'xai' | 'groq'

export type QueryResult = {
  kind?: 'query' | 'mutation' | 'rule' | 'empty'
  columns: string[]
  rows: string[][]
  executionTimeMs: number
}

export type SessionPrefs = {
  provider: Provider
  model: string
  mode?: 'sandbox' | 'lessons'
  activeLessonId?: string
  activeTutorialId?: string
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

export type Tutorial = {
  id: string
  title: string
  description: string
  goals: string
  prerequisiteTutorialId?: string
  lessons: Lesson[]
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
