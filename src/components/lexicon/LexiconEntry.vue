<script setup lang="ts">
/**
 * One entry of the lexicon page (`lexicon-entry`, ui_ux screens/lexicon-page: One entry): its
 * word and group, its plain line, its other names, then behind More, opened in place, its
 * definition, its app meaning under "In Infinite Flow" when it has one, and its related words as
 * links to their entries on the page. Every field as the lexicon writes it, marks shown as text.
 * Whether it is open is the page's; a press of More, or a related link, is told to the page.
 */
import { computed } from 'vue'

import type { LexiconEntry } from '@/lexicon'
import { plainText } from './lexicon-text'
import { LexiconOtherNames, LexiconText } from './lexicon-text-view'

const props = defineProps<{
  entry: LexiconEntry
  /** Whether its detail is open. */
  open: boolean
  /** The other name a search found it by, shown first and in bold; null otherwise. */
  foundBy: string | null
  /** Its related entries shown on the page, each with its name as a link reads it. */
  related: readonly { readonly id: string; readonly label: string }[]
}>()

const emit = defineEmits<{
  /** More (or Less) was pressed: the detail opens (true) or closes (false). */
  toggle: [open: boolean]
  /** A related link was followed, to the entry with this id. */
  follow: [id: string]
}>()

/** More's accessible name: "More about {word}", "Less about {word}" while open. */
const moreName = computed(
  () => `${props.open ? 'Less' : 'More'} about ${plainText(props.entry.word)}`,
)

/** The `details` toggled itself (a press of its `summary`): tell the page. */
// @spec-link [[req_lexicon_page]]
function handleToggle(event: Event): void {
  const open = (event.currentTarget as HTMLDetailsElement).open
  if (open !== props.open) emit('toggle', open)
}
</script>

<template>
  <li :id="`lexicon-${entry.id}`" class="lexicon-entry">
    <div class="lexicon-entry-head">
      <h4 class="lexicon-word" tabindex="-1"><LexiconText :text="entry.word" /></h4>
      <span class="lexicon-group">{{ entry.group }}</span>
    </div>
    <p class="lexicon-popup"><LexiconText :text="entry.popup" /></p>
    <p v-if="entry.otherNames.length > 0" class="sheet-hint">
      <LexiconOtherNames :names="entry.otherNames" :found-by="foundBy" />
    </p>
    <details class="lexicon-more" :open="open" @toggle="handleToggle">
      <summary :aria-label="moreName">{{ open ? 'Less' : 'More' }}</summary>
      <div class="lexicon-detail">
        <p><LexiconText :text="entry.definition" /></p>
        <template v-if="entry.appMeaning !== null">
          <h5>In Infinite Flow</h5>
          <p><LexiconText :text="entry.appMeaning" /></p>
        </template>
        <p v-if="related.length > 0" class="lexicon-related">
          Related:
          <template v-for="(link, at) in related" :key="link.id"
            >{{ at === 0 ? '' : ', '
            }}<a
              class="lexicon-link"
              :href="`#lexicon-${link.id}`"
              @click.prevent="emit('follow', link.id)"
              ><LexiconText :text="link.label" /></a
          ></template>
        </p>
      </div>
    </details>
  </li>
</template>
