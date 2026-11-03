<script setup lang="ts">
/**
 * Jam's "From your doodle" list (`doodle-readings`): the seven controls read from the doodle, each
 * named as session mode's control, its value in that control's own option words. A value the
 * doodle did not show reads "{value} (default)"; a rhythmic variety the supported-combination step
 * raised reads "{value} (to work with the other rhythm values)", that mark in place of "(default)",
 * never beside it. Below the tablet-landscape width a Note density read as Sixteenth reads "Eighth
 * (Sixteenth on larger screens)", as it is played there; no other line follows the window. While
 * no doodle is kept the list is not rendered and its note stands in its place. Static text: never
 * a live region, never interactive, never ringed when the controls are read-only. Part of Jam's
 * code (src/jam/), loaded on demand.
 */
import { computed } from 'vue'

import {
  contourOptions,
  leapinessOptions,
  noteDensityOptions,
  registerOptions,
  rhythmicVarietyOptions,
  silenceDensityOptions,
  syncopationOptions,
} from '@/components/controls/control-options'
import type { SegmentedControlOption } from '@/components/controls/segmented-control-option'

import type { DoodleReading, DoodleReadings } from './doodle-controls'

const props = defineProps<{
  /** The readings of the kept doodle; null while no doodle is kept. */
  readings: DoodleReadings | null
  /** The window is narrower than `bp-tablet-landscape`. */
  belowTabletLandscape: boolean
}>()

/** One line of the list: the control's name, the value in its words, and its muted mark. */
interface ReadingLine {
  readonly name: string
  readonly value: string
  readonly mark: string | null
}

/** The note in the list's place while no doodle is kept, as the phrase-workspace handoff words it. */
const NO_DOODLE_NOTE = "They show here once you've played a doodle."

const DEFAULT_MARK = '(default)'
const RAISED_MARK = '(to work with the other rhythm values)'
const NARROW_SIXTEENTH_MARK = '(Sixteenth on larger screens)'

/** Intent: a value's words, as its session-mode control labels it; one it lacks is a defect. */
function wordsOf(options: readonly SegmentedControlOption[], value: string): string {
  const found = options.find((option) => option.value === value)
  if (found === undefined) throw new Error(`Doodle readings: no option words for "${value}".`)
  return found.label
}

/** Intent: a plain line: the value in its words, marked "(default)" when the doodle showed none. */
function plainLine(
  name: string,
  options: readonly SegmentedControlOption[],
  reading: DoodleReading<string>,
): ReadingLine {
  return {
    name,
    value: wordsOf(options, reading.value),
    mark: reading.source === 'default' ? DEFAULT_MARK : null,
  }
}

/**
 * Intent: the Note density line: a Sixteenth below the tablet-landscape width reads as the
 * Eighth it is played as, saying it is Sixteenth on larger screens; otherwise a plain line.
 */
// @spec-link [[rule_doodle_sixteenth_on_narrow_screens]]
function noteDensityLine(reading: DoodleReadings['noteDensity']): ReadingLine {
  if (reading.value === 'Sixteenth' && props.belowTabletLandscape) {
    return { name: 'Note density', value: 'Eighth', mark: NARROW_SIXTEENTH_MARK }
  }
  return plainLine('Note density', noteDensityOptions(), reading)
}

/**
 * Intent: the Rhythmic variety line, the value the phrases are written with: raised by the step,
 * "(to work with the other rhythm values)", whether it raised the doodle's value or the default;
 * else "(default)" for a default; else the value alone.
 */
// @spec-link [[rule_doodle_controls_always_supported]]
function rhythmicVarietyLine(reading: DoodleReadings['rhythmicVariety']): ReadingLine {
  const line = plainLine('Rhythmic variety', rhythmicVarietyOptions(), reading)
  return reading.raised ? { ...line, mark: RAISED_MARK } : line
}

/** Intent: the seven lines, in the handoff's order; none while no doodle is kept. */
// @spec-link [[rule_doodle_sets_jam_controls]]
const lines = computed((): readonly ReadingLine[] | null => {
  const readings = props.readings
  if (readings === null) return null
  return [
    noteDensityLine(readings.noteDensity),
    rhythmicVarietyLine(readings.rhythmicVariety),
    plainLine('Syncopation', syncopationOptions(), readings.syncopation),
    plainLine('Silence density', silenceDensityOptions(), readings.silenceDensity),
    plainLine('Contour', contourOptions(), readings.contour),
    plainLine('Leapiness', leapinessOptions(), readings.leapiness),
    plainLine('Register', registerOptions(), readings.register),
  ]
})
</script>

<template>
  <!-- @spec-link [[rule_doodle_sets_jam_controls]] -->
  <dl v-if="lines !== null" class="doodle-readings">
    <div v-for="line in lines" :key="line.name">
      <dt>{{ line.name }}</dt>
      <dd>
        {{ line.value
        }}<template v-if="line.mark !== null"
          >{{ ' ' }}<span>{{ line.mark }}</span></template
        >
      </dd>
    </div>
  </dl>
  <p v-else class="field-note">{{ NO_DOODLE_NOTE }}</p>
</template>
