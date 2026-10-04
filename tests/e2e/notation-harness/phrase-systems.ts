/**
 * The notation harness's per-system engraving hook, published as `window.__notationSystems`: it
 * draws a fixture phrase on the real engraver module (fonts loaded) either whole, through
 * `engraveWrittenPhrase` into a top and a bottom host, or one system part at a time, through
 * `engravePhraseSystem` into one host, and returns serialisable snapshots of what was drawn: the
 * reported geometry, and each SVG's size, normalised markup (VexFlow's per-element `autoN` ids
 * renamed in order of appearance, since they count every element ever created on the page), note
 * ids, measure-slot indices and each slot's drawn notehead x positions, plus the reported measure
 * anchors and the fixture's event count per measure. Hosts are scratch elements laid out on the
 * page, so the engraver's bounds check can measure them, and removed once read.
 */
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { MeasureAnchors } from '@/notation/engraving-anchors'
import { NotationError } from '@/notation/notation-error'
import type { VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'
import { resolveFixture } from './fixtures'

/** Intent: create a laid-out scratch host on the page, so drawn SVGs have real boxes. */
function scratchHost(): HTMLElement {
  const host = document.createElement('div')
  host.className = 'notation-systems-scratch'
  document.body.append(host)
  return host
}

/** Intent: rename VexFlow's `autoN` element ids in order of first appearance, so markup compares. */
function normalisedMarkup(svg: SVGSVGElement): string {
  const names = new Map<string, string>()
  return svg.outerHTML.replace(/auto\d+/gu, (id) => {
    const known = names.get(id)
    if (known !== undefined) return known
    const name = `id${names.size}`
    names.set(id, name)
    return name
  })
}

/** Intent: snapshot one drawn system SVG in a serialisable form. */
function svgSnapshot(svg: SVGSVGElement): NotationHarnessSvgSnapshot {
  const slots = [...svg.querySelectorAll('g.measure-slot')]
  return {
    width: svg.getAttribute('width'),
    height: svg.getAttribute('height'),
    viewBox: svg.getAttribute('viewBox'),
    markup: normalisedMarkup(svg),
    noteIds: [
      ...new Set(
        [...svg.querySelectorAll('[data-note-id]')].map((el) => el.getAttribute('data-note-id')!),
      ),
    ],
    measureIndices: slots.map((slot) => Number(slot.getAttribute('data-measure-index'))),
    systemIndices: slots.map((slot) => Number(slot.getAttribute('data-system-index'))),
    noteheadXs: slots.map(noteheadXs),
  }
}

/**
 * Intent: the drawn `x` of each stave note's notehead (or rest) glyph in one measure slot, in
 * drawing order: the first text of its `g.vf-notehead` group, which VexFlow draws first.
 */
// @test-link [[module_notation_engraving_anchors]]
function noteheadXs(slot: Element): number[] {
  return [...slot.querySelectorAll('g.vf-stavenote')].map((note) => {
    const text = note.querySelector('g.vf-notehead text')
    if (text === null) throw new Error('A drawn stave note has no notehead text.')
    return Number(text.getAttribute('x'))
  })
}

/** Intent: snapshot reported measure anchors in a serialisable form. */
// @test-link [[module_notation_engraving_anchors]]
function anchorsSnapshot(anchors: readonly MeasureAnchors[]): NotationHarnessMeasureAnchors[] {
  return anchors.map(({ measureIndex, systemIndex, eventStartsPx, barlinePx }) => ({
    measureIndex,
    systemIndex,
    eventStartsPx: [...eventStartsPx],
    barlinePx,
  }))
}

/** Intent: a phrase's event count (notes and rests) per measure, in phrase order. */
function eventCounts(phrase: WrittenPhrase): number[] {
  return phrase.measures.map((measure) => measure.events.length)
}

/** Intent: describe a thrown value in a serialisable form, keeping a NotationError's code. */
function thrownSnapshot(error: unknown): NotationHarnessThrown {
  return {
    name: error instanceof Error ? error.name : typeof error,
    code: error instanceof NotationError ? error.code : null,
    message: error instanceof Error ? error.message : String(error),
  }
}

/** Intent: build the `window.__notationSystems` hook on the engraver `readyEngraver` loads. */
// @test-link [[module_session_rolling_display]]
export function notationSystemsHook(
  readyEngraver: () => Promise<VexflowEngraverModule>,
): NotationHarnessSystems {
  return {
    async engravePhrase(fixtureName, phraseNumber, containerWidthPx, viewport) {
      const engraver = await readyEngraver()
      const hosts = [scratchHost(), scratchHost()] as const
      const phrase = resolveFixture(fixtureName)
      try {
        const score = engraver.engraveWrittenPhrase(
          hosts,
          phrase,
          phraseNumber,
          containerWidthPx,
          viewport,
        )
        return {
          staffSpacePx: score.staffSpacePx,
          widthPx: score.widthPx,
          heightPx: score.heightPx,
          positionBlockPx: score.positionBlockPx,
          requiredUnits: score.requiredUnits,
          measureBoxes: score.measureBoxes.map((box) => ({ x: box.x, width: box.width })),
          measureAnchors: anchorsSnapshot(score.measureAnchors),
          measureEventCounts: eventCounts(phrase),
          svgs: score.svgs.map(svgSnapshot),
        }
      } finally {
        for (const host of hosts) host.remove()
      }
    },
    async engravePart(fixtureName, phraseNumber, part, containerWidthPx, viewport) {
      const engraver = await readyEngraver()
      const host = scratchHost()
      const phrase = resolveFixture(fixtureName)
      try {
        const system = engraver.engravePhraseSystem(
          host,
          phrase,
          phraseNumber,
          part,
          containerWidthPx,
          viewport,
        )
        return {
          staffSpacePx: system.staffSpacePx,
          widthPx: system.widthPx,
          heightPx: system.heightPx,
          positionBlockPx: system.positionBlockPx,
          requiredUnits: system.requiredUnits,
          measureBoxes: system.measureBoxes.map((box) => ({ x: box.x, width: box.width })),
          measureAnchors: anchorsSnapshot(system.measureAnchors),
          measureEventCounts: eventCounts(phrase),
          svg: svgSnapshot(system.svg),
          hostChildCount: host.childElementCount,
          hostHoldsSvg: host.contains(system.svg),
        }
      } finally {
        host.remove()
      }
    },
    async engravePartFailure(fixtureName, phraseNumber, part, containerWidthPx, viewport) {
      const engraver = await readyEngraver()
      const host = scratchHost()
      const sentinel = document.createElement('span')
      host.append(sentinel)
      try {
        engraver.engravePhraseSystem(
          host,
          resolveFixture(fixtureName),
          phraseNumber,
          part,
          containerWidthPx,
          viewport,
        )
        return { thrown: null, hostChildCount: host.childElementCount, sentinelKept: true }
      } catch (error) {
        return {
          thrown: thrownSnapshot(error),
          hostChildCount: host.childElementCount,
          sentinelKept: sentinel.parentElement === host,
        }
      } finally {
        host.remove()
      }
    },
  }
}
