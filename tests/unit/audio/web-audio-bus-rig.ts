/**
 * The rig of the Web Audio session bus specs: a fresh Web Audio output on a recording fake
 * context, with its eight mix gains found, and middle C's frequency.
 */

import { createWebAudioOutput } from '@/audio/web-audio-output'
import { createFakeWebAudioContext, mixNode } from './fake-web-audio-context'

/** Intent: middle C's frequency in equal temperament, A4 = 440 Hz. */
export const MIDDLE_C_HZ = 440 * 2 ** ((60 - 69) / 12)

/** Intent: a fresh output on a fake context, with its eight mix gains found. */
export function setUp() {
  const fake = createFakeWebAudioContext()
  const output = createWebAudioOutput(fake.port, fake.performanceNow)
  const clickEnable = mixNode(output, fake, 'click-enable')
  const clickVolume = mixNode(output, fake, 'click-volume')
  const backingEnable = mixNode(output, fake, 'backing-enable')
  const backingVolume = mixNode(output, fake, 'backing-volume')
  const melodyEnable = mixNode(output, fake, 'melody-guide-enable')
  const melodyVolume = mixNode(output, fake, 'melody-guide-volume')
  const rhythmEnable = mixNode(output, fake, 'rhythm-guide-enable')
  const rhythmVolume = mixNode(output, fake, 'rhythm-guide-volume')
  return {
    fake,
    output,
    clickEnable,
    clickVolume,
    backingEnable,
    backingVolume,
    melodyEnable,
    melodyVolume,
    rhythmEnable,
    rhythmVolume,
  }
}
