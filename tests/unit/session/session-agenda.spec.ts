/**
 * The audio-time agenda a running session's transport keeps: actions due at audio times, fired in
 * time order (ties in scheduling order) once the clock reaches them, including actions a fired
 * action schedules for a time already reached, and none after the agenda is cleared.
 */
import { describe, expect, it } from 'vitest'

import { createAudioTimeAgenda } from '@/session/session-agenda'

// @test-link [[service_session_controller]]
describe('createAudioTimeAgenda', () => {
  // @test-link [[service_session_controller]]
  it('fires only the actions due by now, in time order, ties in scheduling order', () => {
    const agenda = createAudioTimeAgenda()
    const fired: string[] = []
    agenda.schedule(2, () => fired.push('b'))
    agenda.schedule(1, () => fired.push('a'))
    agenda.schedule(2, () => fired.push('c'))
    agenda.schedule(3, () => fired.push('d'))

    agenda.fireDue(0.5)
    expect(fired).toEqual([])
    agenda.fireDue(2)
    expect(fired).toEqual(['a', 'b', 'c'])
    expect(agenda.size()).toBe(1)
    agenda.fireDue(10)
    expect(fired).toEqual(['a', 'b', 'c', 'd'])
    expect(agenda.size()).toBe(0)
  })

  // @test-link [[service_session_controller]]
  it('fires, in the same call, an action a fired action schedules for a time already reached', () => {
    const agenda = createAudioTimeAgenda()
    const fired: number[] = []
    agenda.schedule(1, () => {
      fired.push(1)
      agenda.schedule(1.5, () => fired.push(1.5))
      agenda.schedule(4, () => fired.push(4))
    })

    agenda.fireDue(2)

    expect(fired).toEqual([1, 1.5])
    expect(agenda.size()).toBe(1)
  })

  // @test-link [[service_session_controller]]
  it('fires nothing more once cleared, even from inside a fired action', () => {
    const agenda = createAudioTimeAgenda()
    const fired: number[] = []
    agenda.schedule(1, () => {
      fired.push(1)
      agenda.clear()
    })
    agenda.schedule(1, () => fired.push(2))

    agenda.fireDue(5)

    expect(fired).toEqual([1])
    expect(agenda.size()).toBe(0)
  })

  // @test-link [[service_session_controller]]
  it('refuses a time that is not finite', () => {
    const agenda = createAudioTimeAgenda()

    expect(() => agenda.schedule(Number.NaN, () => undefined)).toThrow(/not finite/)
    expect(() => agenda.fireDue(Number.POSITIVE_INFINITY)).toThrow(/not finite/)
  })
})
