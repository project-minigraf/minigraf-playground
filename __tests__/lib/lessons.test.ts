import { TUTORIALS } from '@/lib/lessons'

describe('tutorial registry', () => {
  it('exports five tutorials in order', () => {
    expect(TUTORIALS.map((t) => t.id)).toEqual([
      'basic-datalog',
      'marketplace',
      'org-chart',
      'sports-league',
      'transit',
    ])
  })

  it('basic-datalog has no prerequisite', () => {
    const basic = TUTORIALS.find((t) => t.id === 'basic-datalog')!
    expect(basic.prerequisiteTutorialId).toBeUndefined()
  })

  it('all other tutorials require basic-datalog', () => {
    const others = TUTORIALS.filter((t) => t.id !== 'basic-datalog')
    others.forEach((t) => {
      expect(t.prerequisiteTutorialId).toBe('basic-datalog')
    })
  })

  it('lesson IDs are globally unique across all tutorials', () => {
    const allLessonIds = TUTORIALS.flatMap((t) => t.lessons.map((l) => l.id))
    expect(allLessonIds.length).toBe(new Set(allLessonIds).size)
  })

  it('basic-datalog has 4 lessons with the expected step counts', () => {
    const basic = TUTORIALS.find((t) => t.id === 'basic-datalog')!
    expect(basic.lessons.map((l) => l.steps.length)).toEqual([4, 4, 4, 5])
  })

  it('final step of each non-first basic-datalog lesson is open-ended', () => {
    const basic = TUTORIALS.find((t) => t.id === 'basic-datalog')!
    basic.lessons.slice(1).forEach((lesson) => {
      expect(lesson.steps.at(-1)?.expectedResult).toBeUndefined()
    })
  })
})
