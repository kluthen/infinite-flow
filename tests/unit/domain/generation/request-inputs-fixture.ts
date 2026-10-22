/**
 * One valid rhythm lock group and one valid steering block, built by their own constructors, for
 * the tests that carry v3.2's request inputs through the intent, the core request and the worker.
 */

import {
  makeRequestRhythmLock,
  type RequestRhythmLock,
} from '@/domain/generation/request-rhythm-lock'
import { makeSteeringBlock, type SteeringBlock } from '@/domain/generation/steering-block'

/** A locked rhythm lock group: four tiled measures, two allowed changes, a tenser phrase. */
export const SAMPLE_RHYTHM_LOCK: RequestRhythmLock = makeRequestRhythmLock({
  state: {
    kind: 'locked',
    bars: [0, 1, 2, 3].map((measure) => [
      { kind: 'note', startTick: 0, durationTicks: 8, tieContinuation: measure === 2 },
      { kind: 'rest', startTick: 8, durationTicks: 4, tieContinuation: false },
      { kind: 'note', startTick: 12, durationTicks: 4, tieContinuation: false },
    ]),
  },
  allowedChanges: ['move_rest', 'split_note'],
  tenserPhrase: true,
})

/** A steering block with starts in every measure, three moves and a direction-only strength. */
export const SAMPLE_STEERING: SteeringBlock = makeSteeringBlock({
  targetRhythm: {
    measures: [
      [
        { tick: 0, kind: 'note' },
        { tick: 6, kind: 'rest' },
      ],
      [{ tick: 4, kind: 'note' }],
      [],
      [{ tick: 0, kind: 'note' }],
    ],
    band: 'close',
  },
  moves: [
    { direction: 'up', size: 'skip' },
    { direction: 'same' },
    { direction: 'down', size: 'step' },
  ],
  strength: 'direction',
})
