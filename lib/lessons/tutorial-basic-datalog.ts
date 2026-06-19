import type { Tutorial } from '@/lib/types'
import { lesson1 } from './lesson-1'
import { lesson2 } from './lesson-2'
import { lesson3 } from './lesson-3'
import { lesson4 } from './lesson-4'

export const tutorialBasicDatalog: Tutorial = {
  id: 'basic-datalog',
  title: 'Basic Datalog',
  description: 'Learn the fundamentals of Minigraf: facts, queries, rules, and bi-temporal time travel.',
  goals: 'asserting and retracting facts, running Datalog queries, defining rules, recursive traversal, and bi-temporal time travel',
  lessons: [lesson1, lesson2, lesson3, lesson4],
}
