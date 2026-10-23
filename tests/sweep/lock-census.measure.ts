// @vitest-environment node
/**
 * The lock census runner (v3.2 measurement M2), manual only, never in `npm run quality`: run via
 * `npm run measure:lock`. Every supported rhythm setting with seeds 7 and 13 (or `LOCK_LIMIT`
 * evenly spaced cases), a seeded eight-phrase session per case with the rhythm lock on, Tension
 * across phrases on and off, at 120 BPM with every attempt generated at the flat modelled cost
 * (timing plays no part). Each session is classified against phrase 1's rhythm for each change kind
 * alone and all five together; each draw (phrases 2 to 8, repeats skipped) records which kinds had
 * a candidate one change away in the phrase's own rhythm domain, pooled per rhythm control value and
 * per rhythm setting. Groups: the sweep's own cases, and each built-in preset applied to every case,
 * each case then with its own phrase-1 and session seeds (a preset replaces every case's rhythm
 * setting, so the sweep's two seeds would lock only about two rhythms per preset).
 * A summary prints as `LOCK-CENSUS` lines; a figure is reported, never failed on: only every
 * session's completion is checked.
 *
 * Until the lock is built (chunks 10 to 16) the generator ignores it: the figures are the baseline
 * of sessions without the lock, classified as if phrase 1 were locked. The draws' availability is
 * already meaningful: it is what the domain offers a locked rhythm.
 *
 * Env: `LOCK_OUT` writes the full figures JSON (with the machine, the date and the run duration)
 * to that path; `LOCK_LIMIT` keeps N evenly spaced sweep cases; `LOCK_SETTINGS` sweep (default),
 * builtin or both.
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

import { sweepCases } from '../unit/session/deadline-sweep'
import { machineBlock } from './figure-census-sweep'
import { evenlySpaced } from './jam-sweep-population'
import {
  LOCK_PHRASE_COUNT,
  LOCK_TEMPO,
  TENSION_ACROSS_PHRASES,
  censusOfGroup,
  lockCensusChoices,
  seedScheme,
  settingGroups,
  type LockGroupTally,
} from './lock-census-sweep'

describe('lock census runner (M2)', () => {
  it('reports, per setting group, Tension across phrases and allowed list, the lock census and the draws', async () => {
    const startedAt = performance.now()
    const date = new Date().toISOString()
    const machine = machineBlock()
    const choices = lockCensusChoices()
    const cases = evenlySpaced(sweepCases(), choices.limit)
    const groups = settingGroups(choices.settings)
    const tallies: LockGroupTally[] = []
    for (const group of groups) {
      const tally = await censusOfGroup(group, cases, (density, count) => {
        const heap = Math.round(process.memoryUsage().heapUsed / 2 ** 20)
        console.log(
          `LOCK-CENSUS [${group.label}] density ${density}: ${count} cases played, heap ${heap} MB`,
        )
      })
      console.log(tally.lines().join('\n'))
      tallies.push(tally)
    }

    const report = {
      date,
      durationSeconds: (performance.now() - startedAt) / 1000,
      machine,
      population: {
        description:
          'every supported rhythm setting with each seed (or LOCK_LIMIT evenly spaced cases), under each setting group (the sweep cases, or a built-in preset applied to every case with per-case seeds); one seeded session per case with the rhythm lock on, Tension across phrases on and off, every attempt generated at the flat modelled cost; each allowed list classified; per draw (phrases 2 to 8, repeats skipped) the kinds one change away in the phrase own rhythm domain',
        sweepCases: cases.length,
        settingGroups: groups.map((group) => group.label),
        seeds: seedScheme(choices.settings),
        sessions: tallies.reduce((sum, tally) => sum + tally.sessions, 0),
        phrasesPerSession: LOCK_PHRASE_COUNT,
        tempo: LOCK_TEMPO,
        note: 'baseline: the generator ignores the lock (chunks 10–16 pending); classified against phrase 1',
      },
      lockedRhythms: tallies.map((tally) => ({
        label: tally.label,
        completedSessions: tally.completed,
        distinctLockedRhythms: tally.distinctLockedRhythms,
      })),
      groups: tallies.flatMap((tally) => tally.groups()),
      availabilityByRhythmSetting: tallies.flatMap((tally) => tally.availabilityFigures()),
    }
    const outPath = process.env.LOCK_OUT
    if (outPath !== undefined) writeFileSync(outPath, JSON.stringify(report, null, 2))
    const sessionsPerGroup = cases.length * TENSION_ACROSS_PHRASES.length
    expect(tallies.map((tally) => [tally.sessions, tally.completed])).toEqual(
      groups.map(() => [sessionsPerGroup, sessionsPerGroup]),
    )
  })
})
