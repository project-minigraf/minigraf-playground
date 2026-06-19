import type { Tutorial } from '@/lib/types'

export const tutorialSportsLeague: Tutorial = {
  id: 'sports-league',
  title: 'Sports League',
  description: 'Track teams, player transfers, and match results across a full season.',
  goals: 'bi-temporal contract tracking, recursive head-to-head rules, and window-style aggregates',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [], // content added in issue #30
}
