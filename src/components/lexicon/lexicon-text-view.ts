/**
 * The lexicon's text drawn as the page shows it, from `markedParts`: bold as `strong`, emphasis
 * as `em`, the rest as text nodes. Never HTML read from the lexicon.
 */
import { createTextVNode, h, type FunctionalComponent, type VNode } from 'vue'

import { markedParts } from './lexicon-text'

/** A text's parts as nodes. */
function markedNodes(text: string): VNode[] {
  return markedParts(text).map((part) => {
    if (part.kind === 'bold') return h('strong', part.text)
    if (part.kind === 'emphasis') return h('em', part.text)
    return createTextVNode(part.text)
  })
}

/** One field of an entry, its inline marks shown. */
// @spec-link [[req_lexicon_page]]
export const LexiconText: FunctionalComponent<{ text: string }> = (props) => markedNodes(props.text)
LexiconText.props = ['text']

/**
 * The "Also called" line's text: "Also called {names}.", the other names in the lexicon's order,
 * the one a search found the entry by first and in bold.
 */
// @spec-link [[req_lexicon_page]]
export const LexiconOtherNames: FunctionalComponent<{
  names: readonly string[]
  foundBy: string | null
}> = (props) => {
  const rest = props.names.filter((name) => name !== props.foundBy)
  const nodes: (VNode | VNode[])[] = [createTextVNode('Also called ')]
  if (props.foundBy !== null) nodes.push(h('strong', markedNodes(props.foundBy)))
  for (const [at, name] of rest.entries()) {
    if (at > 0 || props.foundBy !== null) nodes.push(createTextVNode(', '))
    nodes.push(markedNodes(name))
  }
  nodes.push(createTextVNode('.'))
  return nodes.flat()
}
LexiconOtherNames.props = ['names', 'foundBy']
