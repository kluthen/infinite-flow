/**
 * The staff's two reserved system positions as PhraseScore fills them, at Idle and during a
 * session. Each position remembers the slot it shows (a part of one phrase), its `staff-content`
 * unit, its SVG and the inputs it was engraved with, at Idle too, so a session start that shows
 * what Idle already shows redraws nothing. During a session a position whose slot changes is
 * refilled on its own: its notes fade out (`is-fading-out`) and leave once the fade has finished,
 * while the new slot is engraved off-screen, then enters as a new unit with its entrance fade; a
 * newer refill supersedes one still under way. A change of the layout inputs re-engraves every
 * shown system in place, with no fade, swapping only once all of them succeeded. A session's
 * engraving failure is reported through its own callback only and never clears the staff. After
 * every change it redraws the session's marks (./session-staff-marks.ts) and names the phrase the
 * hidden description follows.
 */
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { NotationError } from '@/notation/notation-error'
import { heldViewport } from '@/notation/notation-layout-policy'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'
import type { SystemSlot } from '@/session/rolling-display'
import { drawSessionMarks, unmarkSystem } from './session-staff-marks'
import {
  engravingKey,
  idleSlot,
  positionKey,
  STAFF_POSITIONS,
  type SessionStaff,
  type SessionSystem,
  type StaffPosition,
} from './session-staff'

/** The two system positions and the hidden host systems are engraved in before they are shown. */
export interface StaffHosts {
  readonly top: HTMLElement
  readonly bottom: HTMLElement
  readonly staging: HTMLElement
}

/** What the positions read from, and report to, the PhraseScore that holds them. */
export interface StaffPositionsEnvironment {
  /** The position elements, or null before they are mounted. */
  readonly hosts: () => StaffHosts | null
  /** The window's layout inputs now, or null before the staff is mounted. */
  readonly inputs: () => StaffLayoutInputs | null
  /** The loaded engraver module, or the typed failure of loading it. */
  readonly engraver: () => Promise<VexflowEngraverModule | NotationError>
  /** The notes acknowledged so far, any phrase. */
  readonly acknowledged: () => readonly ExpectedNoteIdentity[]
  /** The id of the hidden score description. */
  readonly descriptionId: string
  /** Show the hidden description of this phrase (null: none). */
  readonly describe: (phrase: WrittenPhrase | null) => void
  /** A session engraving landed on screen. */
  readonly shown: () => void
  /** A session engraving failed. */
  readonly failed: (error: NotationError) => void
}

/** The two positions' content, at Idle and during a session. */
export interface StaffPositions {
  /** Move an Idle engraving (top host, bottom host) into the positions, keeping their units. */
  readonly showIdle: (
    staged: readonly [HTMLElement, HTMLElement],
    svgs: readonly SVGSVGElement[],
    phrase: WrittenPhrase,
    phraseNumber: number,
    inputs: StaffLayoutInputs,
  ) => void
  /** Blank both positions and the staging host. */
  readonly clear: () => void
  /** Start showing a session; redraws nothing where the positions already show its slots. */
  readonly enter: (staff: SessionStaff) => void
  /** Follow the session's new state: refill the positions whose slot changed, redraw the marks. */
  readonly update: (staff: SessionStaff) => void
  /** Re-engrave in place every shown system the current inputs make stale. */
  readonly relayout: () => void
  /** Redraw the overlays, after the acknowledged notes changed. */
  readonly redrawMarks: () => void
  /** Stop showing the session: drop the refills under way and the units fading out. */
  readonly leave: () => void
}

/** A settled position's content: its unit, its SVG, the system and the inputs it was engraved with. */
interface ShownSystem {
  readonly unit: HTMLElement
  readonly svg: SVGSVGElement
  readonly system: SessionSystem
  readonly inputsKey: string
}

/** One position's state. */
interface PositionState {
  shown: ShownSystem | null
  /** The session slot the position is to show. */
  target: SessionSystem | null
  /** Counts the refills started, so only the latest one inserts. */
  refills: number
  refilling: boolean
  /** The units fading out, each with the promise of its removal. */
  readonly fading: Map<HTMLElement, Promise<void>>
}

/** A system engraved in the staging host, not yet shown. */
interface StagedSystem {
  readonly host: HTMLElement
  readonly svg: SVGSVGElement
  readonly inputsKey: string
}

/** Intent: tag a unit with the slot it shows. */
function tagUnit(unit: HTMLElement, slot: SystemSlot): void {
  unit.dataset.phraseNumber = String(slot.phraseNumber)
  unit.dataset.systemPart = slot.part
}

/** Intent: a new `staff-content` unit for a slot; inserting it plays its entrance fade. */
function createUnit(slot: SystemSlot): HTMLElement {
  const unit = document.createElement('div')
  unit.className = 'staff-content'
  tagUnit(unit, slot)
  return unit
}

/** Intent: whether a shown system is the given system engraved with the given inputs. */
function showsAt(shown: ShownSystem, system: SessionSystem, inputsKey: string): boolean {
  return (
    positionKey(shown.system) === positionKey(system) &&
    shown.system.phrase === system.phrase &&
    shown.inputsKey === inputsKey
  )
}

/**
 * Intent: create the positions' content keeper for one PhraseScore.
 */
// @spec-link [[module_session_staff_refill]]
export function createStaffPositions(env: StaffPositionsEnvironment): StaffPositions {
  const positions: Record<StaffPosition, PositionState> = {
    top: { shown: null, target: null, refills: 0, refilling: false, fading: new Map() },
    bottom: { shown: null, target: null, refills: 0, refilling: false, fading: new Map() },
  }
  let staff: SessionStaff | null = null
  /** Counts session entries and exits, so work begun in another one is dropped. */
  let epoch = 0
  /** Counts in-place re-engraves, so only the latest one swaps. */
  let syncs = 0

  /** Intent: the position elements, crashing before they are mounted. */
  function requireHosts(): StaffHosts {
    const hosts = env.hosts()
    if (hosts === null) throw new Error('The staff positions are not mounted.')
    return hosts
  }

  /** Intent: the running session's staff, crashing outside a session. */
  function requireStaff(): SessionStaff {
    if (staff === null) throw new Error('The staff shows no session.')
    return staff
  }

  /** Intent: the inputs key of a session engraving: the held layout in the window's budget. */
  function sessionKey(inputs: StaffLayoutInputs): string {
    return engravingKey(
      inputs.containerWidthPx,
      heldViewport(inputs.viewport, requireStaff().layout),
      inputs.systemPositionUnits,
    )
  }

  /** Intent: the settled systems on screen, top first. */
  function shownSystems(): ShownSystem[] {
    return STAFF_POSITIONS.flatMap((position) => positions[position].shown ?? [])
  }

  // ---- Idle ----

  /**
   * Intent: move an Idle engraving into the positions. A position already showing notes keeps its
   * unit and only its engraving changes, so a redraw never replays the entrance fade; a blank
   * position gets a new unit; an empty staged host blanks it.
   */
  // @spec-link [[rule_phrase_one_is_idle_phrase]]
  function showIdle(
    staged: readonly [HTMLElement, HTMLElement],
    svgs: readonly SVGSVGElement[],
    phrase: WrittenPhrase,
    phraseNumber: number,
    inputs: StaffLayoutInputs,
  ): void {
    const hosts = requireHosts()
    STAFF_POSITIONS.forEach((position, index) => {
      const element = hosts[position]
      const host = staged[index]!
      const state = positions[position]
      if (!host.hasChildNodes()) {
        element.replaceChildren()
        state.shown = null
        return
      }
      const slot = idleSlot(phraseNumber, inputs.viewport.layout, position)
      const svg = svgs[index]
      if (slot === null || svg === undefined) {
        throw new Error(`The ${position} position got an engraving its layout leaves blank.`)
      }
      let unit = element.querySelector<HTMLElement>(':scope > .staff-content')
      if (!unit) {
        unit = createUnit(slot)
        element.replaceChildren(unit)
      }
      unit.replaceChildren(...Array.from(host.childNodes))
      tagUnit(unit, slot)
      state.shown = {
        unit,
        svg,
        system: { ...slot, phrase },
        inputsKey: engravingKey(
          inputs.containerWidthPx,
          inputs.viewport,
          inputs.systemPositionUnits,
        ),
      }
    })
  }

  /** Intent: blank both positions and the staging host. */
  function clear(): void {
    const hosts = env.hosts()
    for (const position of STAFF_POSITIONS) {
      positions[position].shown = null
      hosts?.[position].replaceChildren()
    }
    hosts?.staging.replaceChildren()
  }

  // ---- Session: engraving ----

  /**
   * Intent: engrave one session system into a new host in the staging area, at the current inputs
   * (their shared system-position size included) in the held viewport. Throws the engraver's
   * typed NotationError, leaving no host behind.
   */
  function stage(
    engraver: VexflowEngraverModule,
    system: SessionSystem,
    inputs: StaffLayoutInputs,
  ): StagedSystem {
    const staging = requireHosts().staging
    const host = document.createElement('div')
    staging.style.width = `${inputs.containerWidthPx}px`
    staging.appendChild(host)
    try {
      const result = engraver.engravePhraseSystem(
        host,
        system.phrase,
        system.phraseNumber,
        system.part,
        inputs.containerWidthPx,
        heldViewport(inputs.viewport, requireStaff().layout),
        inputs.systemPositionUnits,
      )
      return { host, svg: result.svg, inputsKey: sessionKey(inputs) }
    } catch (error) {
      host.remove()
      throw error
    }
  }

  /** Intent: report a session engraving failure; anything else is a defect and propagates. */
  // @spec-link [[rule_session_ends_when_staff_too_small]]
  function reportFailure(error: unknown): void {
    if (!(error instanceof NotationError)) throw error
    env.failed(error)
  }

  /** Intent: whether a position shows something other than its slot at these inputs. */
  function isStale(state: PositionState, inputsKey: string): boolean {
    if (state.refilling) return false
    if (state.target === null) return state.shown !== null
    return state.shown === null || !showsAt(state.shown, state.target, inputsKey)
  }

  /** Intent: the positions whose content the current inputs make stale, or none before mount. */
  function stalePositions(): StaffPosition[] {
    const inputs = env.inputs()
    if (inputs === null || staff === null) return []
    const key = sessionKey(inputs)
    return STAFF_POSITIONS.filter((position) => isStale(positions[position], key))
  }

  /** Intent: put a staged system into its position in place: the same unit, no fade. */
  function swapInPlace(position: StaffPosition, staged: StagedSystem | null): void {
    const state = positions[position]
    const target = state.target
    if (staged === null || target === null) {
      state.shown?.unit.remove()
      state.shown = null
      return
    }
    const unit = state.shown?.unit ?? createUnit(target)
    if (state.shown === null) requireHosts()[position].append(unit)
    unit.replaceChildren(...Array.from(staged.host.childNodes))
    staged.host.remove()
    tagUnit(unit, target)
    state.shown = { unit, svg: staged.svg, system: target, inputsKey: staged.inputsKey }
  }

  /**
   * Intent: re-engrave in place every position that does not show its slot at the current inputs
   * (a resize, or a session start Idle had not drawn yet), all staged first and swapped only if
   * every one succeeded; a position refilling is left to its refill. With nothing stale it draws
   * nothing at all.
   */
  // @spec-link [[rule_session_ends_when_staff_too_small]]
  // @spec-link [[module_session_staff_refill]]
  async function sync(): Promise<void> {
    const ticket = ++syncs
    const atEpoch = epoch
    if (stalePositions().length === 0) return
    const engraver = await env.engraver()
    if (ticket !== syncs || atEpoch !== epoch) return
    if (engraver instanceof NotationError) {
      env.failed(engraver)
      return
    }
    const inputs = env.inputs()
    if (inputs === null) return
    const staged = new Map<StaffPosition, StagedSystem | null>()
    try {
      for (const position of stalePositions()) {
        const target = positions[position].target
        staged.set(position, target === null ? null : stage(engraver, target, inputs))
      }
    } catch (error) {
      staged.forEach((system) => system?.host.remove())
      reportFailure(error)
      return
    }
    staged.forEach((system, position) => swapInPlace(position, system))
    env.shown()
    refreshMarks()
  }

  // ---- Session: refill ----

  /**
   * Intent: start a unit's fade-out: it keeps no mark and is hidden from assistive technology,
   * and it is removed once its animations finish (at once with none, as under reduced motion).
   */
  // @spec-link [[module_session_staff_refill]]
  function fadeOut(state: PositionState, shown: ShownSystem): void {
    const { unit } = shown
    unmarkSystem(shown)
    unit.classList.add('is-fading-out')
    unit.setAttribute('aria-hidden', 'true')
    const finished = unit.getAnimations().map((animation) => animation.finished)
    const removed = Promise.allSettled(finished).then(() => {
      unit.remove()
      state.fading.delete(unit)
    })
    state.fading.set(unit, removed)
  }

  /** Intent: engrave a refill's slot off-screen now; null when it failed or was superseded. */
  async function stageRefill(
    state: PositionState,
    ticket: number,
    atEpoch: number,
    system: SessionSystem,
  ): Promise<StagedSystem | null> {
    const engraver = await env.engraver()
    if (ticket !== state.refills || atEpoch !== epoch) return null
    if (engraver instanceof NotationError) {
      env.failed(engraver)
      return null
    }
    const inputs = env.inputs()
    if (inputs === null) return null
    try {
      return stage(engraver, system, inputs)
    } catch (error) {
      reportFailure(error)
      return null
    }
  }

  /**
   * Intent: refill one position: its notes fade out at once, the new slot is engraved off-screen
   * meanwhile, and enters as a new unit once every fade there has finished. A blank slot leaves
   * the position empty. A newer refill, or the session's end, drops this one.
   */
  // @spec-link [[module_session_staff_refill]]
  async function refill(position: StaffPosition, next: SessionSystem | null): Promise<void> {
    const state = positions[position]
    const ticket = ++state.refills
    const atEpoch = epoch
    state.target = next
    state.refilling = true
    if (state.shown !== null) {
      fadeOut(state, state.shown)
      state.shown = null
    }
    const faded = Promise.all(state.fading.values())
    const staged = next === null ? null : await stageRefill(state, ticket, atEpoch, next)
    await faded
    if (ticket !== state.refills || atEpoch !== epoch) {
      staged?.host.remove()
      return
    }
    state.refilling = false
    if (staged === null || next === null) return
    const unit = createUnit(next)
    unit.replaceChildren(...Array.from(staged.host.childNodes))
    staged.host.remove()
    requireHosts()[position].append(unit)
    state.shown = { unit, svg: staged.svg, system: next, inputsKey: staged.inputsKey }
    env.shown()
    refreshMarks()
    // The inputs may have changed while it waited: a re-engrave in place catches up.
    void sync()
  }

  /** Intent: redraw what the session marks on the systems on screen, and follow its description. */
  // @spec-link [[module_notation_note_identity_overlays]]
  function refreshMarks(): void {
    const described = drawSessionMarks(
      shownSystems(),
      requireStaff(),
      env.acknowledged(),
      env.descriptionId,
    )
    env.describe(described)
  }

  // ---- Session: entry, updates and exit ----

  /**
   * Intent: start showing a session. Where both positions already show its slots at the current
   * inputs, nothing is engraved and no node changes (a session start never redraws phrase 1);
   * otherwise (an Idle engraving still under way, or inputs that moved) the stale positions are
   * re-engraved in place.
   */
  // @spec-link [[rule_phrase_one_is_idle_phrase]]
  function enter(next: SessionStaff): void {
    if (staff !== null) throw new Error('The staff already shows a session.')
    epoch += 1
    staff = next
    for (const position of STAFF_POSITIONS) positions[position].target = next[position]
    refreshMarks()
    void sync()
  }

  /**
   * Intent: follow the session's new state: refill each position whose slot changed, and redraw
   * the marks for the new playhead. The held layout never changes during a session.
   */
  // @spec-link [[module_session_staff_refill]]
  // @spec-link [[rule_session_layout_fixed_at_start]]
  function update(next: SessionStaff): void {
    if (requireStaff().layout !== next.layout) {
      throw new Error('The staff layout held for the session changed during it.')
    }
    staff = next
    for (const position of STAFF_POSITIONS) {
      if (positionKey(next[position]) !== positionKey(positions[position].target)) {
        void refill(position, next[position])
      }
    }
    refreshMarks()
  }

  /** Intent: re-engrave in place what the current inputs made stale. */
  // @spec-link [[module_session_staff_refill]]
  function relayout(): void {
    requireStaff()
    void sync()
  }

  /** Intent: redraw the marks of a session after the acknowledged notes changed. */
  function redrawMarks(): void {
    refreshMarks()
  }

  /**
   * Intent: stop showing the session: every refill and re-engrave under way is dropped, the units
   * fading out leave at once, and the settled ones lose the session's marks (the band included) at
   * once but stay until the Idle engraving replaces them.
   */
  // @spec-link [[module_session_staff_engraving_outcomes]]
  function leave(): void {
    requireStaff()
    epoch += 1
    staff = null
    for (const position of STAFF_POSITIONS) {
      const state = positions[position]
      state.target = null
      state.refilling = false
      state.fading.forEach((_removed, unit) => unit.remove())
      state.fading.clear()
      if (state.shown !== null) unmarkSystem(state.shown)
    }
    env.hosts()?.staging.replaceChildren()
  }

  return { showIdle, clear, enter, update, relayout, redrawMarks, leave }
}
