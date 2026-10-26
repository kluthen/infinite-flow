/**
 * The two segments of a "During a session" switch, `Off` then `On`, and how such a switch shows an
 * `On` that is unavailable (Rising tempo without a controller, Vary settings without a move):
 * `On` disabled and named by its reason, `Off` checked in its place, the player's stored choice
 * kept and shown again once available.
 */
import type { SegmentedControlOption } from './segmented-control-option'

/** The two segments of a switch, `Off` first. */
export const OFF_ON_OPTIONS: readonly SegmentedControlOption[] = Object.freeze([
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
])

/** Intent: map a segment's value to on/off, refusing a value that is no segment of `option`. */
export function isOn(option: string, value: string): boolean {
  if (value !== 'off' && value !== 'on') {
    throw new Error(`${option} has no "${value}" option.`)
  }
  return value === 'on'
}

/** Intent: the switch's segments: `On` disabled and naming `reasonId` while unavailable. */
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[rule_vary_settings_needs_legal_move]]
export function offOnOptions(
  available: boolean,
  reasonId: string,
): readonly SegmentedControlOption[] {
  if (available) return OFF_ON_OPTIONS
  return OFF_ON_OPTIONS.map((option) =>
    option.value === 'on' ? { ...option, disabled: true, describedBy: reasonId } : option,
  )
}

/** Intent: the checked segment: `Off` while unavailable, else the player's stored choice. */
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[rule_vary_settings_needs_legal_move]]
export function shownOffOn(stored: boolean, available: boolean): 'off' | 'on' {
  return available && stored ? 'on' : 'off'
}

/**
 * Intent: the player's new choice from a click on segment `value` of `option`, or null when it
 * changes nothing: choosing the `Off` that stands in for a stored `On` while unavailable keeps the
 * `On`, so it shows again once available.
 */
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[rule_vary_settings_needs_legal_move]]
export function chosenOffOn(
  option: string,
  value: string,
  stored: boolean,
  available: boolean,
): boolean | null {
  const on = isOn(option, value)
  if (value === shownOffOn(stored, available) && on !== stored) return null
  return on
}
