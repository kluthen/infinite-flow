/**
 * Jam's code entry: the one module Jam's loader (src/components/workspace/load-jam-mode.ts)
 * imports, so all of Jam's code reaches the rest of the app through it and loads on demand, out of
 * the first load. It gathers what the workspace takes from Jam: Jam's workspace view, and Jam's
 * Idle note routing (the starting note the cue row names, and what a played note means).
 */
export { default as JamWorkspace } from './JamWorkspace.vue'
export { createJamIdleNotes } from './jam-idle-notes'
