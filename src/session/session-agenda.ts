/**
 * The audio-time agenda of a running session: the actions its transport must take at given audio
 * times (a count-in display change, the count-in's end, a phrase starting to sound, an engine
 * deadline). It reads no clock: its owner wakes it with the audio clock's time, and it fires every
 * action due by then, in time order.
 */
import type { AudioTime } from './session-types'

/** Actions due at audio times, fired once the clock reaches them. */
// @spec-link [[service_session_controller]]
export interface AudioTimeAgenda {
  /** Add `action`, due at audio time `at`. Throws on a time that is not finite. */
  readonly schedule: (at: AudioTime, action: () => void) => void
  /**
   * Fire every action due at or before `now`, earliest first, ties in scheduling order, removing
   * each before it runs, so an action a fired one schedules for a time already reached fires in
   * the same call. Throws on a time that is not finite.
   */
  readonly fireDue: (now: AudioTime) => void
  /** Drop every action not fired yet; one cleared from inside a fired action never fires. */
  readonly clear: () => void
  /** How many actions are waiting. */
  readonly size: () => number
}

/** One waiting action, with its scheduling order for ties. */
interface AgendaEntry {
  readonly at: AudioTime
  readonly order: number
  readonly action: () => void
}

/** Intent: guard an audio time is finite, naming the agenda in the error. */
function assertFinite(at: AudioTime): void {
  if (!Number.isFinite(at)) throw new Error(`session agenda: time ${at} is not finite`)
}

/** Intent: whether entry `a` fires before entry `b`: earlier time, or the same time scheduled earlier. */
function firesBefore(a: AgendaEntry, b: AgendaEntry): boolean {
  return a.at < b.at || (a.at === b.at && a.order < b.order)
}

/** Intent: an empty agenda. */
// @spec-link [[service_session_controller]]
export function createAudioTimeAgenda(): AudioTimeAgenda {
  let entries: AgendaEntry[] = []
  let scheduled = 0

  /** Intent: the index of the first entry due by `now`, or -1 when none is due. */
  function nextDue(now: AudioTime): number {
    let found = -1
    entries.forEach((entry, index) => {
      if (entry.at > now) return
      if (found === -1 || firesBefore(entry, entries[found]!)) found = index
    })
    return found
  }

  return {
    schedule: (at, action) => {
      assertFinite(at)
      scheduled += 1
      entries.push({ at, order: scheduled, action })
    },
    fireDue: (now) => {
      assertFinite(now)
      for (let index = nextDue(now); index !== -1; index = nextDue(now)) {
        const [entry] = entries.splice(index, 1)
        entry!.action()
      }
    },
    clear: () => {
      entries = []
    },
    size: () => entries.length,
  }
}
