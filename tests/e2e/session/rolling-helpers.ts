/**
 * Shared helpers for the rolling display specs: the session's barlines on the fake audio clock,
 * the expected content of the two system positions at a barline, and a reading of what the staff
 * shows (each position's settled unit, its notes and measures, the playhead band) together with
 * the controller's state, taken in one task so the two always agree on the moment.
 */
import { expect, type Page } from '@playwright/test'

import { audioNow } from '../audio/audio-harness-helpers'
import { settleFrames } from '../release/harness-helpers'
import { BEAT, advanceAudioBy, sessionState, sessionTimeline } from './session-helpers'

/** One 4/4 measure at the default 90 BPM, in seconds. */
export const MEASURE = 4 * BEAT

/** How far past a barline the clock is moved, so the barline is surely heard. */
const PAST_BARLINE = 0.03

/** A system position of the staff. */
export type Position = 'top' | 'bottom'

/** A staff layout a session holds. */
export type Layout = 'one-system' | 'split'

/** What each position shows, as slot keys (`${phraseNumber}:${part}`); null is blank. */
export interface Systems {
  readonly top: string | null
  readonly bottom: string | null
}

/** One position's settled unit as drawn: its slot, its notes, its measures and its band. */
export interface DrawnSystem {
  readonly key: string
  /** The `data-note-id` of every note drawn, in document order. */
  readonly noteIds: readonly string[]
  /** Every drawn note's markup, in the same order. */
  readonly notes: readonly string[]
  /** The 0-based measure index of every measure drawn, in document order. */
  readonly measures: readonly number[]
  /** The measure the playhead band lies on in this system, or null without one. */
  readonly bandMeasure: number | null
  /** The SVG's rendered width, in CSS px. */
  readonly svgWidth: number
  /** The mark `markSystems` left on this unit's SVG, or null: a redraw drops it. */
  readonly svgMark: string | null
  /** The mark `markSystems` left on this unit, or null: a new unit has none. */
  readonly unitMark: string | null
}

/** The staff and the controller's state, read in the same task. */
export interface StaffReading {
  readonly state: WorkspaceHarnessSessionState
  readonly top: DrawnSystem | null
  readonly bottom: DrawnSystem | null
  /** How many settled units a position holds, at most: more than one is a defect. */
  readonly settledPerPosition: number
  /** How many units are fading out. */
  readonly fading: number
  /** How many playhead bands the staff draws. */
  readonly bands: number
}

/** Intent: the audio time of barline `measureIndex` (0-3) of phrase `phraseNumber`. */
export async function barlineAt(
  page: Page,
  phraseNumber: number,
  measureIndex: number,
): Promise<number> {
  const { countInEndsAt } = await sessionTimeline(page)
  return countInEndsAt + ((phraseNumber - 1) * 4 + measureIndex) * MEASURE
}

/**
 * Intent: move the clock just past a barline and wait until the playhead, read on the audio clock
 * once a frame, is on that measure.
 */
export async function toBarline(
  page: Page,
  phraseNumber: number,
  measureIndex: number,
): Promise<void> {
  const at = await barlineAt(page, phraseNumber, measureIndex)
  await advanceAudioBy(page, at + PAST_BARLINE - (await audioNow(page)))
  await expect
    .poll(async () => (await sessionState(page)).playhead)
    .toEqual({ phraseNumber, measureIndex })
}

/** Intent: wait until the session has readied phrase `phraseNumber` (its look-ahead decided). */
export async function untilReady(page: Page, phraseNumber: number): Promise<void> {
  await expect
    .poll(async () => (await sessionState(page)).latestReady, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(phraseNumber)
}

/**
 * Intent: what each position shows at measure `measureIndex` of phrase `phraseNumber` (the
 * count-in reads as phrase 1's first measure) with phrases up to `latestReady` readied. One
 * system: phrase n on top when odd, below when even, the next phrase in the other once readied.
 * Split: bars 1-2 on top and 3-4 below; from bar 3 the top takes the next phrase's opening.
 */
export function expectedSystems(
  layout: Layout,
  phraseNumber: number,
  measureIndex: number,
  latestReady: number,
): Systems {
  const next = latestReady > phraseNumber ? phraseNumber + 1 : null
  if (layout === 'one-system') {
    const own = `${phraseNumber}:whole`
    const other = next === null ? null : `${next}:whole`
    return phraseNumber % 2 === 1 ? { top: own, bottom: other } : { top: other, bottom: own }
  }
  const closing = `${phraseNumber}:closing`
  if (measureIndex < 2) return { top: `${phraseNumber}:opening`, bottom: closing }
  return { top: next === null ? null : `${next}:opening`, bottom: closing }
}

/** Intent: the position holding measure `measureIndex` of phrase `phraseNumber` in a layout. */
export function playheadPosition(
  layout: Layout,
  phraseNumber: number,
  measureIndex: number,
): Position {
  if (layout === 'one-system') return phraseNumber % 2 === 1 ? 'top' : 'bottom'
  return measureIndex < 2 ? 'top' : 'bottom'
}

/** Intent: the staff's two positions and the controller's state, read in one task. */
export function readStaff(page: Page): Promise<StaffReading> {
  return page.evaluate(() => {
    const frame = document.querySelector('.staff-frame')
    if (frame === null) throw new Error('readStaff: no staff frame')
    let settledPerPosition = 0
    const drawn = (position: string) => {
      const units = frame.querySelectorAll<HTMLElement>(
        `[data-system-position="${position}"] > .staff-content:not(.is-fading-out)`,
      )
      settledPerPosition = Math.max(settledPerPosition, units.length)
      const unit = units[0]
      if (unit === undefined) return null
      const svg = unit.querySelector<SVGSVGElement>('svg.staff-svg')
      if (svg === null) throw new Error(`readStaff: the ${position} unit has no staff SVG`)
      const slots = [...svg.querySelectorAll('g.measure-slot')]
      const notes = [...svg.querySelectorAll('[data-note-id]')]
      const band = svg.querySelector('rect.playhead-band')
      const bandSlot =
        band === null
          ? undefined
          : slots.find((slot) => slot.getAttribute('data-band-x') === band.getAttribute('x'))
      return {
        key: `${unit.dataset.phraseNumber}:${unit.dataset.systemPart}`,
        noteIds: notes.map((note) => note.getAttribute('data-note-id') ?? ''),
        notes: notes.map((note) => note.outerHTML),
        measures: slots.map((slot) => Number(slot.getAttribute('data-measure-index'))),
        bandMeasure:
          bandSlot === undefined ? null : Number(bandSlot.getAttribute('data-measure-index')),
        svgWidth: svg.getBoundingClientRect().width,
        svgMark: svg.dataset.rollMark ?? null,
        unitMark: unit.dataset.rollMark ?? null,
      }
    }
    return {
      state: window.__workspaceHarness.session.state(),
      top: drawn('top'),
      bottom: drawn('bottom'),
      settledPerPosition,
      fading: frame.querySelectorAll('.staff-content.is-fading-out').length,
      bands: frame.querySelectorAll('rect.playhead-band').length,
    }
  })
}

/** Intent: the slot keys a reading's settled units show. */
export function drawnKeys(reading: StaffReading): Systems {
  return { top: reading.top?.key ?? null, bottom: reading.bottom?.key ?? null }
}

/**
 * Intent: wait until the staff has caught up with the controller: no unit fading out, and each
 * position's settled unit showing the slot the state gives it; return that reading.
 */
export async function settledStaff(page: Page): Promise<StaffReading> {
  let reading: StaffReading | null = null
  await expect
    .poll(
      async () => {
        await settleFrames(page)
        reading = await readStaff(page)
        return reading.fading === 0 && sameSystems(drawnKeys(reading), reading.state.systems)
      },
      { timeout: 15_000 },
    )
    .toBe(true)
  if (reading === null) throw new Error('settledStaff: no reading')
  return reading
}

/** Intent: whether two system contents are the same. */
function sameSystems(a: Systems, b: Systems): boolean {
  return a.top === b.top && a.bottom === b.bottom
}

/**
 * Intent: how many measures are on screen after the one being played, read from the drawn units:
 * the measures that follow it in playing order without a gap.
 */
export function readAhead(reading: StaffReading, phraseNumber: number, measureIndex: number) {
  const onScreen = new Set<number>()
  for (const system of [reading.top, reading.bottom]) {
    if (system === null) continue
    const phrase = Number(system.key.split(':')[0])
    for (const measure of system.measures) onScreen.add((phrase - 1) * 4 + measure)
  }
  let ahead = 0
  const playing = (phraseNumber - 1) * 4 + measureIndex
  while (onScreen.has(playing + ahead + 1)) ahead += 1
  return ahead
}

/** Intent: tag every settled unit and its SVG, so a later reading tells a redraw or a new unit. */
export async function markSystems(page: Page, mark: string): Promise<void> {
  await page.evaluate((value) => {
    for (const unit of document.querySelectorAll<HTMLElement>(
      '.staff-frame [data-system-position] > .staff-content:not(.is-fading-out)',
    )) {
      unit.dataset.rollMark = value
      const svg = unit.querySelector<SVGSVGElement>('svg.staff-svg')
      if (svg !== null) svg.dataset.rollMark = value
    }
  }, mark)
}

declare global {
  interface Window {
    __rollingLog?: RollingLogEntry[]
  }
}

/** One staff event the rolling log records, with the observer batch it was delivered in. */
export interface RollingLogEntry {
  readonly kind: 'fade-out' | 'enter' | 'band' | 'notation-error'
  readonly position: string | null
  /** The unit's slot key (fade-out, enter) or the band's system slot key (band). */
  readonly key: string | null
  readonly batch: number
  /** The session's phase when it was recorded. */
  readonly phase: 'idle' | 'count-in' | 'running'
}

/**
 * Intent: from now on, log every unit that starts fading out, every unit that enters a position,
 * every playhead band drawn, and the score taking the `error` notation state, each with the
 * session's phase then (at Idle, a staff with no room takes that state behind its own notice).
 */
export async function startRollingLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const frame = document.querySelector('.staff-frame')
    if (frame === null) throw new Error('startRollingLog: no staff frame')
    const log: RollingLogEntry[] = []
    window.__rollingLog = log
    let batch = 0
    const unitKey = (unit: Element | null) =>
      unit instanceof HTMLElement ? `${unit.dataset.phraseNumber}:${unit.dataset.systemPart}` : null
    const positionOf = (node: Element) =>
      node.closest('[data-system-position]')?.getAttribute('data-system-position') ?? null
    new MutationObserver((records) => {
      batch += 1
      const { phase } = window.__workspaceHarness.session.state()
      for (const record of records) {
        const target = record.target as Element
        if (record.type === 'attributes' && record.attributeName === 'class') {
          if (
            target.classList.contains('staff-content') &&
            target.classList.contains('is-fading-out') &&
            !(record.oldValue ?? '').includes('is-fading-out')
          ) {
            log.push({
              kind: 'fade-out',
              position: positionOf(target),
              key: unitKey(target),
              batch,
              phase,
            })
          }
        }
        if (record.type === 'attributes' && record.attributeName === 'data-notation-state') {
          if (target.getAttribute('data-notation-state') === 'error') {
            log.push({ kind: 'notation-error', position: null, key: null, batch, phase })
          }
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          if (node.classList.contains('staff-content') && positionOf(node) !== null) {
            log.push({
              kind: 'enter',
              position: positionOf(node),
              key: unitKey(node),
              batch,
              phase,
            })
          }
          if (node.matches('rect.playhead-band')) {
            const unit = node.closest('.staff-content')
            log.push({ kind: 'band', position: positionOf(node), key: unitKey(unit), batch, phase })
          }
        }
      }
    }).observe(frame, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['class', 'data-notation-state'],
    })
  })
}

/** Intent: every entry the rolling log recorded since it started. */
export function rollingLog(page: Page): Promise<RollingLogEntry[]> {
  return page.evaluate(() => window.__rollingLog ?? [])
}

/** Intent: the times the score took the `error` notation state while a session ran. */
export async function sessionNotationErrors(page: Page): Promise<RollingLogEntry[]> {
  return (await rollingLog(page)).filter(
    (entry) => entry.kind === 'notation-error' && entry.phase !== 'idle',
  )
}
