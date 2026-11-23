import { createClickPlan } from '../audio/click-track'

/** A click plan, built through a relative value import that leaves session and the library set. */
export function clickPlan(startAt: number, tempo: number): unknown {
  return createClickPlan(startAt, tempo)
}
