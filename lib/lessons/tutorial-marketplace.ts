import type { Tutorial } from '@/lib/types'

export const tutorialMarketplace: Tutorial = {
  id: 'marketplace',
  title: 'Corestore Marketplace',
  description: 'Model a multi-seller e-commerce platform with temporal price tracking.',
  goals: 'multi-seller joins, temporal price comparison, aggregates per seller, negation, and disjunction',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [], // content added in issue #28
}
