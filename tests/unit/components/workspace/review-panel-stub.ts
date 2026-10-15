/**
 * A stand-in for the lazily loaded Review panel in the workspace specs, so they never need the
 * panel's observers or engraver (ReviewPanel*.spec.ts cover the real one): it takes the real
 * panel's props and events, renders its title, and, when the session holds a played note,
 * `Keep my played notes` and (when deletable) `Delete played notes`, emitting as the real ones do,
 * and exposes the same focus functions. A spec swaps it
 * in with `vi.mock('@/components/review/ReviewPanel.vue', () => import('./review-panel-stub'))`.
 */
import { defineComponent, h, ref, type PropType } from 'vue'

import type { ExportRequest, GeneratedNotesFormat } from '@/components/review/review-types'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { SessionHistoryRecord } from '@/session/session-history'

/** Intent: the panel stand-in, named as the real one so a spec finds it by name. */
// @test-link [[req_last_session_review]]
const ReviewPanelStub = defineComponent({
  name: 'ReviewPanel',
  props: {
    records: { type: Array as PropType<readonly SessionHistoryRecord[]>, required: true },
    instrumentName: { type: String, required: true },
    viewport: { type: Object as PropType<StaffViewport | null>, default: null },
    noRoom: { type: Boolean, required: true },
    format: { type: String as PropType<GeneratedNotesFormat>, required: true },
    backingTrack: { type: Boolean, required: true },
    exportFile: {
      type: Function as PropType<(request: ExportRequest) => Promise<void>>,
      required: true,
    },
    holdsPlayedNote: { type: Boolean, required: true },
    playedNotesShown: { type: Boolean, required: true },
    exportPlayedNotes: { type: Function as PropType<() => Promise<void>>, required: true },
    keepPlayedNotes: { type: Boolean, required: true },
    canDeletePlayedNotes: { type: Boolean, required: true },
    includeVeryShortNotes: { type: Boolean, required: true },
    playedNotesFileHoldsNote: { type: Boolean, required: true },
  },
  emits: [
    'update:format',
    'update:backingTrack',
    'update:playedNotesShown',
    'update:keepPlayedNotes',
    'update:includeVeryShortNotes',
    'delete-played-notes',
  ],
  setup(props, { expose, emit }) {
    const title = ref<HTMLElement | null>(null)
    const keep = ref<HTMLElement | null>(null)
    const remove = ref<HTMLElement | null>(null)
    /** Intent: focus `target`, which must be rendered. */
    const focus = (target: HTMLElement | null, name: string): void => {
      if (target === null) throw new Error(`review panel stub: no ${name}`)
      target.focus()
    }
    expose({
      focusTitle: () => focus(title.value, 'title'),
      focusKeepPlayedNotes: () => focus(keep.value, 'Keep my played notes'),
      focusDeletePlayedNotes: () => focus(remove.value, 'Delete played notes'),
    })
    return () =>
      h('section', { class: 'review-panel' }, [
        h('h2', { ref: title, class: 'review-title', tabindex: '-1' }, 'Last session'),
        props.holdsPlayedNote
          ? h('div', { class: 'review-view' }, [
              h(
                'button',
                {
                  ref: keep,
                  'aria-pressed': String(props.keepPlayedNotes),
                  onClick: () => emit('update:keepPlayedNotes', !props.keepPlayedNotes),
                },
                'Keep my played notes',
              ),
              props.canDeletePlayedNotes
                ? h(
                    'button',
                    { ref: remove, onClick: () => emit('delete-played-notes') },
                    'Delete played notes',
                  )
                : null,
            ])
          : null,
      ])
  },
})

export default ReviewPanelStub
