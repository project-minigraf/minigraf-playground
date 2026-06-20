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

describe('marketplace tutorial', () => {
  const marketplace = TUTORIALS.find((t) => t.id === 'marketplace')!

  describe('lesson 1 — multi-seller joins', () => {
    it('exists with correct id', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-1')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-1')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      marketplace.lessons.find((l) => l.id === 'marketplace-1')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-1')!.steps[3].expectedResult).toBeUndefined()
    })
  })

  describe('lesson 2 — temporal price queries', () => {
    it('exists with correct id', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-2')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-2')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      marketplace.lessons.find((l) => l.id === 'marketplace-2')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-2')!.steps[3].expectedResult).toBeUndefined()
    })
  })

  describe('lesson 3 — aggregates per seller', () => {
    it('exists with correct id', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-3')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-3')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      marketplace.lessons.find((l) => l.id === 'marketplace-3')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-3')!.steps[3].expectedResult).toBeUndefined()
    })
  })

  describe('lesson 4 — negation across sellers', () => {
    it('exists with correct id', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-4')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-4')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      marketplace.lessons.find((l) => l.id === 'marketplace-4')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-4')!.steps[3].expectedResult).toBeUndefined()
    })
  })

  describe('lesson 5 — disjunction and synthesis', () => {
    it('exists with correct id', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-5')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-5')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      marketplace.lessons.find((l) => l.id === 'marketplace-5')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(marketplace.lessons.find((l) => l.id === 'marketplace-5')!.steps[3].expectedResult).toBeUndefined()
    })
  })

  // Final structural tests — pass only once all 5 lessons are present
  it('has exactly 5 lessons', () => {
    expect(marketplace.lessons).toHaveLength(5)
  })

  it('step IDs are unique within marketplace tutorial', () => {
    const ids = marketplace.lessons.flatMap((l) => l.steps.map((s) => s.id))
    expect(ids.length).toBe(new Set(ids).size)
  })
})

describe('org chart tutorial', () => {
  const orgChart = TUTORIALS.find((t) => t.id === 'org-chart')!

  describe('lesson 1 — employee facts and joins', () => {
    it('exists with correct id', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-1')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-1')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      orgChart.lessons.find((l) => l.id === 'org-chart-1')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-1')!.steps[3].expectedResult).toBeUndefined()
    })
  })

  describe('lesson 2 — bi-temporal history', () => {
    it('exists with correct id', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-2')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-2')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      orgChart.lessons.find((l) => l.id === 'org-chart-2')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-2')!.steps[3].expectedResult).toBeUndefined()
    })
  })

  describe('lesson 3 — recursive management chains', () => {
    it('exists with correct id', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-3')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-3')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      orgChart.lessons.find((l) => l.id === 'org-chart-3')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-3')!.steps[3].expectedResult).toBeUndefined()
    })
  })

  describe('lesson 4 — negation', () => {
    it('exists with correct id', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-4')).toBeDefined()
    })
    it('has 4 steps', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-4')!.steps).toHaveLength(4)
    })
    it('steps 1-3 have expectedResult', () => {
      orgChart.lessons.find((l) => l.id === 'org-chart-4')!.steps.slice(0, 3).forEach((s) => {
        expect(s.expectedResult).toBeDefined()
      })
    })
    it('step 4 is open-ended', () => {
      expect(orgChart.lessons.find((l) => l.id === 'org-chart-4')!.steps[3].expectedResult).toBeUndefined()
    })
  })
})
