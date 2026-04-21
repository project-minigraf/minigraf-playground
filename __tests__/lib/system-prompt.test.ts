import { buildSystemPrompt } from '@/lib/system-prompt'

describe('buildSystemPrompt', () => {
  it('includes stable Datalog syntax reference', () => {
    const p = buildSystemPrompt({ lessonStepGoal: null, progress: [] })
    expect(p).toContain('transact')
    expect(p).toContain(':find')
  })
  it('includes step goal when provided', () => {
    const p = buildSystemPrompt({ lessonStepGoal: 'Write a rule for mortal', progress: [] })
    expect(p).toContain('mortal')
  })
  it('includes hints-not-solutions policy', () => {
    const p = buildSystemPrompt({ lessonStepGoal: null, progress: [] })
    expect(p.toLowerCase()).toContain('hint')
  })
  it('includes code formatting instruction', () => {
    const p = buildSystemPrompt({ lessonStepGoal: null, progress: [] })
    expect(p).toContain('```datalog')
  })
})
