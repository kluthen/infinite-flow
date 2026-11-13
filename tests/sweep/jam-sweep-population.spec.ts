// @vitest-environment node
// @lint-ignore-atd measurement tooling run by `npm run test:sweep`: it checks the Jam sweep runner's choices; no business rule
/**
 * The Jam sweep runner's choices (measurement tooling, jam-sweep-population.ts): the four Seventh
 * chords levels by default, one level when named; the real ladder at Off only, since it builds
 * Jam's phrase 1 at Off, so a level above Off runs phrase 1 through the double.
 */

import { describe, expect, it } from 'vitest'

import { jamSweepChoices } from './jam-sweep-population'

describe("the Jam sweep runner's levels and ladder", () => {
  it('plays the four levels by default, the double of the ladder at each', () => {
    expect(jamSweepChoices({})).toMatchObject({
      ladder: 'double',
      levels: ['off', 'sometimes', 'favored', 'stronglyFavored'],
    })
    expect(jamSweepChoices({ JAM_LEVELS: 'favored' }).levels).toEqual(['favored'])
  })

  it('plays the real ladder at Off only, and refuses it with any level above Off', () => {
    expect(jamSweepChoices({ JAM_LADDER: 'real', JAM_LEVELS: 'off' })).toMatchObject({
      ladder: 'real',
      levels: ['off'],
    })
    expect(() => jamSweepChoices({ JAM_LADDER: 'real' })).toThrow(
      /JAM_LADDER=real .*jam-phrase-one-attempts\.ts.* at Off until v3\.3 chunk 23/,
    )
    expect(() => jamSweepChoices({ JAM_LADDER: 'real', JAM_LEVELS: 'off,sometimes' })).toThrow(
      /Sometimes/,
    )
    expect(jamSweepChoices({ JAM_LADDER: 'baseline', JAM_LEVELS: 'all' }).levels).toHaveLength(4)
  })
})
