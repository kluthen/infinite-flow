/**
 * Jam's code entry: the one module Jam's loader (src/components/workspace/load-jam-mode.ts)
 * imports, so all of Jam's code reaches the rest of the app through it and loads on demand, out of
 * the first load. It gathers what the workspace takes from Jam: Jam's workspace view, and Jam's
 * Idle note routing (the starting note the cue row names, and what a played note means), and Jam's
 * own settings (made, decoded and saved by Jam's code) with Jam's controls, which show them; a
 * fresh Jam's start (its capture and phrase 1, with the view the workspace reads), and the cue
 * row's two parts before phrase 1 (`jam-capture`, `jam-writing`); and the parts of a Jam session's
 * Review that are Jam's (`module_jam_code_boundary`): its doodle's staff and its key and mode
 * suggestion, and Jam's key and mode read for the Review before Jam's settings exist; and Jam
 * mode's kept doodle (`module_kept_doodle`), which the workspace keeps and lets go, with the climb
 * of phrase 1's attempts the workspace writes from it at Idle and its bar (`jam-bar`).
 */
export { default as JamWorkspace } from './JamWorkspace.vue'
export { default as JamControls } from './JamControls.vue'
export { default as JamCapture } from './JamCapture.vue'
export { default as JamWriting } from './JamWriting.vue'
export { default as JamBar } from './JamBar.vue'
export { default as ReviewDoodle } from './review/ReviewDoodle.vue'
export { default as SuggestionRow } from './review/SuggestionRow.vue'
export { createJamIdleNotes } from './jam-idle-notes'
export {
  createJamSettings,
  decodeJamSettings,
  jamFigureLevels,
  jamGenerationControls,
} from './jam-settings'
export { startFreshJam } from './fresh-jam'
export { freshJamSettings } from './fresh-jam-settings'
export { useKeptDoodle } from './use-kept-doodle'
export { climbKeptDoodleLadder } from './kept-doodle-phrase-one'
