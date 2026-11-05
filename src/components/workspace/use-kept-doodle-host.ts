/**
 * Where the workspace holds Jam mode's kept doodle (master spec C5.11; module_kept_doodle): the
 * one kept doodle of Jam's code (src/jam/use-kept-doodle.ts), made once Jam's code has loaded in
 * the visit, for the selected instrument and Jam's key and mode, and held for the rest of the
 * visit in memory only. What keeps a doodle reaches it here (the fresh Jam's end, through
 * ./use-fresh-jam.ts, and `Jam again on this doodle`, through ./review-jam-ports.ts); here it is let
 * go on leaving Jam mode, and on the player's deletion of the session it comes from, one session,
 * every session, or my instrument's sessions erased with its deletion or a change of its range or
 * transposition (spec D503), which the session controller records (`lastDeletion`); `New doodle`
 * calls `letGo`. Nothing else lets it go: a session's own save deleting the earlier unpinned sessions
 * records no deletion. Its suggestion is declined here too (`Keep {key} {mode}`, at Jam's Idle or
 * in the review of the session it comes from). Jam's code is reached through its loaded module
 * only.
 */
import { computed, shallowRef, watch, type ComputedRef, type Ref } from 'vue'

import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import type { JamKeyAndMode } from '@/jam/key-suggestion/key-suggestion'
import type { JamKeptDoodle, KeptDoodleState } from '@/jam/use-kept-doodle'
import type { JamModeModule } from './load-jam-mode'
import type { JamSettingsCode } from './review-jam-ports'
import type { ReviewedJamPart } from './session-jam-part'
import type { PlayerSessionDeletion } from './workspace-session-controller-types'

/** What the workspace's kept doodle reads, every reading current when called. */
// @spec-link [[module_kept_doodle]]
export interface KeptDoodleHostSeams {
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  /** Jam mode shows (its code loaded, not while it opens). */
  readonly jamShowing: () => boolean
  /** The player's last deletion of kept sessions; null before any (and before the controller). */
  readonly lastDeletion: () => PlayerSessionDeletion | null
  /** The selected instrument, shared by both modes (my instrument's profile when it is the one). */
  readonly instrument: () => InstrumentProfile
  /** Jam's written key and Collection now (session mode's before Jam's settings exist). */
  readonly keyAndMode: (jam: JamSettingsCode) => JamKeyAndMode
}

/** The workspace's kept doodle: Jam's holder of it, the doodle kept now, and its keep and let go. */
// @spec-link [[module_kept_doodle]]
export interface WorkspaceKeptDoodle {
  /** Jam's kept doodle, once Jam's code has loaded in this visit; null before. */
  readonly holder: Readonly<Ref<KeptDoodleState | null>>
  /** The doodle kept now; null when none is (always before Jam's code loads). */
  readonly kept: ComputedRef<JamKeptDoodle | null>
  /** Keep `jam`'s doodle, from the session under `sessionKey`; before Jam's code loads, throws. */
  readonly keep: (jam: ReviewedJamPart, sessionKey: string) => void
  /** Let the kept doodle go (`New doodle`); with none kept, nothing changes. */
  readonly letGo: () => void
  /** Decline the kept doodle's suggestion for good; with none kept, nothing changes. */
  readonly decline: () => void
}

/** Intent: whether the player's `deletion` takes the session under `sessionKey`. */
function takesSession(deletion: PlayerSessionDeletion, sessionKey: string): boolean {
  if (deletion.kind === 'every-session') return true
  if (deletion.kind === 'session') return deletion.key === sessionKey
  return deletion.keys.includes(sessionKey)
}

/**
 * Intent: the workspace's kept doodle over its seams: Jam's holder made once, as Jam's code loads;
 * the doodle let go as Jam mode stops showing, and as the player deletes the session it comes from
 * or every session, or my instrument's erased sessions take it; every other change keeps it.
 */
// @spec-link [[module_kept_doodle]]
// @spec-link [[rule_held_doodle_dropped_on_change]]
// @spec-link [[rule_held_doodle_in_memory_only]]
export function useKeptDoodleHost(seams: KeptDoodleHostSeams): WorkspaceKeptDoodle {
  const holder = shallowRef<KeptDoodleState | null>(null)

  watch(
    seams.jamModule,
    (loaded) => {
      if (loaded === null || holder.value !== null) return
      holder.value = loaded.useKeptDoodle({
        instrument: seams.instrument,
        keyAndMode: () => seams.keyAndMode(loaded),
      })
    },
    { flush: 'sync', immediate: true },
  )

  /** Intent: let the kept doodle go, if one can be kept yet. */
  function letGo(): void {
    holder.value?.letGo()
  }

  // Leaving Jam mode lets it go.
  watch(
    seams.jamShowing,
    (showing) => {
      if (!showing) letGo()
    },
    { flush: 'sync' },
  )

  // The player's deletion of the session it comes from, or of every session, lets it go.
  watch(
    seams.lastDeletion,
    (deletion) => {
      const kept = holder.value?.kept.value ?? null
      if (deletion === null || kept === null) return
      if (takesSession(deletion, kept.sessionKey)) letGo()
    },
    { flush: 'sync' },
  )

  return {
    holder,
    kept: computed(() => holder.value?.kept.value ?? null),
    keep: (jam, sessionKey) => {
      if (holder.value === null)
        throw new Error("workspace kept doodle: a doodle kept before Jam's code loaded")
      holder.value.keep(jam, sessionKey)
    },
    letGo,
    decline: () => {
      const doodle = holder.value
      if (doodle !== null && doodle.kept.value !== null) doodle.decline()
    },
  }
}
