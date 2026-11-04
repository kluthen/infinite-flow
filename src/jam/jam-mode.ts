/**
 * Jam's code entry: the one module Jam's loader (src/components/workspace/load-jam-mode.ts)
 * imports, so all of Jam's code reaches the rest of the app through it and loads on demand, out of
 * the first load. It gathers what the workspace takes from Jam: Jam's workspace view, and Jam's
 * Idle note routing (the starting note the cue row names, and what a played note means), and Jam's
 * own settings (made, decoded and saved by Jam's code) with Jam's controls, which show them; a
 * fresh Jam's start (its capture and phrase 1, with the view the workspace reads), and the cue
 * row's two parts before phrase 1 (`jam-capture`, `jam-writing`).
 */
export { default as JamWorkspace } from './JamWorkspace.vue'
export { default as JamControls } from './JamControls.vue'
export { default as JamCapture } from './JamCapture.vue'
export { default as JamWriting } from './JamWriting.vue'
export { createJamIdleNotes } from './jam-idle-notes'
export { createJamSettings, jamFigureLevels, jamGenerationControls } from './jam-settings'
export { startFreshJam } from './fresh-jam'
