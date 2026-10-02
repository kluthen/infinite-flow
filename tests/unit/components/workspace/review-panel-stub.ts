/**
 * A stand-in for the lazily loaded Review panel in the workspace specs, so they never need the
 * panel's observers or engraver (ReviewPanel*.spec.ts cover the real one): it takes the real
 * panel's props and events, renders its title, and exposes the same `focusTitle`. A spec swaps it
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
  },
  emits: ['update:format', 'update:backingTrack'],
  setup(_props, { expose }) {
    const title = ref<HTMLElement | null>(null)
    expose({
      focusTitle: () => {
        if (title.value === null) throw new Error('review panel stub: no title')
        title.value.focus()
      },
    })
    return () =>
      h('section', { class: 'review-panel' }, [
        h('h2', { ref: title, class: 'review-title', tabindex: '-1' }, 'Last session'),
      ])
  },
})

export default ReviewPanelStub
