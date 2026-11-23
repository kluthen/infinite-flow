/**
 * The lexicon's text on the page: its inline marks built as text parts, never read as HTML, and
 * the folding its order and its search compare words by. `**bold**` is bold, `_emphasis_` is
 * italic, a `` `code` `` mark shows its words with the marks dropped, and any other Markdown
 * shows as written.
 */

/** One run of an entry's text: plain, bold or italic. */
export interface MarkedPart {
  readonly kind: 'plain' | 'bold' | 'emphasis'
  readonly text: string
}

/**
 * The three inline marks, leftmost first: a code mark, a bold mark, and an emphasis mark whose
 * underscores stand outside a word (so `snake_case_name` is no mark).
 */
const INLINE_MARK =
  /`([^`]+)`|\*\*(?!\s)(.+?)(?<!\s)\*\*|(?<![\p{L}\p{N}_])_(?![\s_])(.+?)(?<![\s_])_(?![\p{L}\p{N}_])/gu

/** Hyphens and apostrophes, which the search counts as a space. */
const HYPHENS_AND_APOSTROPHES = /[-‐‑‒–—'‘’ʼ]/gu

/** Combining marks (accents), once a text is decomposed. */
const COMBINING_MARKS = /\p{M}/gu

/** Append a part, merging it into the previous one when both are plain. */
function pushPart(parts: MarkedPart[], part: MarkedPart): void {
  if (part.text === '') return
  const last = parts.at(-1)
  if (last !== undefined && last.kind === 'plain' && part.kind === 'plain') {
    parts[parts.length - 1] = { kind: 'plain', text: last.text + part.text }
  } else parts.push(part)
}

/**
 * A text's parts as the page shows them: bold, italic, and plain text with code marks dropped;
 * any other Markdown, and an unclosed mark, stays as written.
 */
// @spec-link [[req_lexicon_page]]
export function markedParts(text: string): MarkedPart[] {
  const parts: MarkedPart[] = []
  let from = 0
  for (const match of text.matchAll(INLINE_MARK)) {
    pushPart(parts, { kind: 'plain', text: text.slice(from, match.index) })
    const [, code, bold, emphasis] = match
    if (code !== undefined) pushPart(parts, { kind: 'plain', text: code })
    else if (bold !== undefined) pushPart(parts, { kind: 'bold', text: bold })
    else if (emphasis !== undefined) pushPart(parts, { kind: 'emphasis', text: emphasis })
    from = match.index + match[0].length
  }
  pushPart(parts, { kind: 'plain', text: text.slice(from) })
  return parts
}

/** A text with its inline marks dropped. */
export function plainText(text: string): string {
  return markedParts(text)
    .map((part) => part.text)
    .join('')
}

/**
 * A text folded for the A to Z order: marks dropped, accents removed, lower case; hyphens,
 * apostrophes and spaces kept as written.
 */
export function foldedText(text: string): string {
  return plainText(text).normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
}

/**
 * A text folded for the search: as for the order, with hyphens, apostrophes and runs of spaces
 * each counted as one space, and no space at either end.
 */
// @spec-link [[req_lexicon_page]]
export function searchKey(text: string): string {
  return foldedText(text).replace(HYPHENS_AND_APOSTROPHES, ' ').replace(/\s+/gu, ' ').trim()
}
