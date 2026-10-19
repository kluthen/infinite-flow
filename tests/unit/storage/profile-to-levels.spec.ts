// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { KeptRecordError } from '@/storage/records/kept-record-shape'
import {
  parseStoredProfileSelection,
  storedProfileLevels,
} from '@/storage/records/profile-to-levels'

/** The storage source tree, read from disk. */
const STORAGE_DIRECTORY = fileURLToPath(new URL('../../../src/storage', import.meta.url))

/** Intent: every file under a directory, at any depth. */
function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}

// @test-link [[module_stored_profile_to_levels]]
describe('a stored musical profile selection read as figure levels', () => {
  // @test-link [[module_stored_profile_to_levels]]
  it.each([
    [{ musicalProfile: 'Neutral', isCustom: false }, NEUTRAL_FIGURE_LEVELS],
    [{ musicalProfile: 'Neutral', isCustom: true }, NEUTRAL_FIGURE_LEVELS],
    [{ musicalProfile: 'Jazz', isCustom: false }, JAZZ_FIGURE_LEVELS],
    [{ musicalProfile: 'Jazz', isCustom: true }, JAZZ_FIGURE_LEVELS],
  ] as const)("reads %j as its profile's levels, whatever its customized flag", (value, levels) => {
    const selection = parseStoredProfileSelection(structuredClone(value), 'Stored')

    expect(selection).toEqual(value)
    expect(storedProfileLevels(selection)).toStrictEqual(levels)
    expect(Object.isFrozen(storedProfileLevels(selection))).toBe(true)
  })

  // @test-link [[module_stored_profile_to_levels]]
  it.each([
    ['an unknown profile', { musicalProfile: 'Rock', isCustom: false }],
    ['a profile name in another case', { musicalProfile: 'jazz', isCustom: false }],
    ['a missing profile', { isCustom: false }],
    ['a missing customized flag', { musicalProfile: 'Neutral' }],
    ['a customized flag as text', { musicalProfile: 'Jazz', isCustom: 'yes' }],
    ['an extra field', { musicalProfile: 'Jazz', isCustom: false, label: 'Jazz' }],
    ['no object', 'Jazz'],
    ['null', null],
  ] as const)('refuses a stored selection with %s as an invalid stored value', (_, value) => {
    expect(() => parseStoredProfileSelection(value, 'Stored')).toThrow(KeptRecordError)
  })

  // @test-link [[module_stored_profile_to_levels]]
  it('gives the same levels for a selection read twice, never a shared value', () => {
    const selection: ProfileSelection = { musicalProfile: 'Jazz', isCustom: true }

    expect(storedProfileLevels(selection)).not.toBe(storedProfileLevels(selection))
    expect(storedProfileLevels(selection)).toStrictEqual(storedProfileLevels(selection))
  })
})

describe('storage maps a stored profile to levels in one place', () => {
  it('has no file under src/storage but records/profile-to-levels.ts mention levelsForProfile', () => {
    const mentioning = filesUnder(STORAGE_DIRECTORY)
      .filter((path) => readFileSync(path, 'utf8').includes('levelsForProfile'))
      .map((path) => relative(STORAGE_DIRECTORY, path).split('\\').join('/'))

    expect(mentioning).toEqual(['records/profile-to-levels.ts'])
  })
})
