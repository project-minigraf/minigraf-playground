import type { Tutorial } from '@/lib/types'

export const tutorialOrgChart: Tutorial = {
  id: 'org-chart',
  title: 'Company Org Chart',
  description: 'Model employees, departments, and reporting lines with retroactive salary corrections.',
  goals: 'recursive management-chain rules, retroactive salary corrections, and bi-temporal audit queries',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [], // content added in issue #29
}
