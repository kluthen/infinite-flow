/**
 * The workspace's hold on Jam mode's own pre-generation queue (./jam-pregeneration.ts): loaded,
 * with the session controller's chunk, the first time Jam's code has loaded in the visit, and built
 * over Jam's phrase 1 at Idle written from the kept doodle (./use-kept-doodle-phrase.ts), the kept
 * doodle, what that phrase 1 is written from (every Jam setting but the tempo, and the shared
 * instrument), Jam's tempo and the workspace's facts. A Jam started on the kept doodle takes its
 * ready phrases from it; nothing of it reaches session mode's queue. Jam's queue is stopped with
 * the effect scope the hold is made in (the shell's). Part of the entry chunk: it holds no queue
 * logic.
 */
import { onScopeDispose, watch } from 'vue'

import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import type { JamKeptDoodle } from '@/jam/use-kept-doodle'
import type { JamPregenerationFacts, JamPregenerationLoader } from './jam-pregeneration'
import type { JamModeModule } from './load-jam-mode'
import {
  writtenFrom,
  type KeptDoodlePhraseSeams,
  type WorkspaceKeptDoodlePhrase,
} from './use-kept-doodle-phrase'
import type { WorkspacePregeneration } from './workspace-pregeneration-queue'

/** What the workspace's hold on Jam's queue reads, every reading current (reactive in the shell). */
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
export interface JamPregenerationHostSeams {
  /** How Jam's queue is loaded and built; null (a test's workspace) builds none. */
  readonly load: JamPregenerationLoader | null
  /** Jam's code, once loaded in this visit; null before. */
  readonly jamModule: () => JamModeModule | null
  /** Jam's phrase 1 at Idle written from the kept doodle. */
  readonly phrase: Pick<WorkspaceKeptDoodlePhrase, 'state'>
  /** The doodle Jam mode keeps; null when none is. */
  readonly kept: () => JamKeptDoodle | null
  /** Jam's settings, controls and figure levels; null before Jam's settings exist. */
  readonly settings: KeptDoodlePhraseSeams['settings']
  /** The shared instrument: the selected profile, and my instrument when one is saved. */
  readonly instrument: KeptDoodlePhraseSeams['instrument']
  /** The workspace's facts Jam's queue runs under. */
  readonly facts: () => JamPregenerationFacts
}

/** The workspace's hold on Jam's queue. */
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
export interface JamPregenerationHost {
  /**
   * The take of a Jam started on the kept doodle, as session mode's Start takes its own queue's:
   * the attempt in flight aborted and the ready phrases, from phrase 2, up to the first that does
   * not fit `heldLayout`; none while Jam's queue has not loaded.
   */
  readonly take: (heldLayout: StaffLayout) => readonly ReadyPhrase[]
}

/**
 * Intent: hold Jam's queue over `seams`, inside an effect scope; see the module comment. Jam's
 * tempo is read only once Jam's settings exist, as the queue reads it only to plan from or take a
 * phrase 1 written under them. The scope's end stops the queue, or the queue still loading once it
 * has loaded. A load that fails is not caught: it rejects out of band, the programming error it is.
 */
// @spec-link [[rule_jam_pregeneration_only_for_kept_doodle]]
// @spec-link [[module_kept_doodle]]
export function useJamPregeneration(seams: JamPregenerationHostSeams): JamPregenerationHost {
  let queue: WorkspacePregeneration | null = null
  let loading = false
  let disposed = false

  /** Intent: Jam's tempo now; Jam's settings must exist. */
  function tempo(): number {
    const source = seams.settings()
    if (source === null) throw new Error("Jam's pre-generation: no tempo before Jam's settings")
    return source.controls.tempo
  }

  /** Intent: load and build Jam's queue once, keeping it unless disposed meanwhile. */
  function load(load: JamPregenerationLoader): void {
    loading = true
    void load({
      phrase: seams.phrase.state,
      doodle: () => seams.kept()?.doodle ?? null,
      writtenFrom: () => writtenFrom(seams),
      tempo,
      facts: seams.facts,
    }).then((loaded) => {
      if (disposed) loaded.dispose()
      else queue = loaded
    })
  }

  const stopLoading = watch(
    seams.jamModule,
    (loaded) => {
      if (loaded !== null && seams.load !== null && !loading) load(seams.load)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    disposed = true
    stopLoading()
    queue?.dispose()
  })

  return { take: (heldLayout) => queue?.take(heldLayout) ?? [] }
}
