import { LESSONS } from '@/lib/lessons'

describe('lesson registry', () => {
  it('registers lessons 1 through 4 in order', () => {
    expect(LESSONS.map((lesson) => lesson.id)).toEqual([
      'lesson-1',
      'lesson-2',
      'lesson-3',
      'lesson-4',
    ])
  })

  it('includes the expected step counts for each lesson', () => {
    expect(LESSONS.map((lesson) => lesson.steps.length)).toEqual([4, 4, 4, 5])
  })

  it('keeps the final step of each added lesson open-ended', () => {
    expect(LESSONS[1].steps.at(-1)?.expectedResult).toBeUndefined()
    expect(LESSONS[2].steps.at(-1)?.expectedResult).toBeUndefined()
    expect(LESSONS[3].steps.at(-1)?.expectedResult).toBeUndefined()
  })
})
