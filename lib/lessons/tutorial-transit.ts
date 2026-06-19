import type { Tutorial } from '@/lib/types'

export const tutorialTransit: Tutorial = {
  id: 'transit',
  title: 'City Transit Network',
  description: 'Model stations, lines, timetable changes, and service suspensions.',
  goals: 'recursive reachability, shortest path by hops, future-dated valid-time, and retroactive suspensions',
  prerequisiteTutorialId: 'basic-datalog',
  lessons: [], // content added in issue #31
}
