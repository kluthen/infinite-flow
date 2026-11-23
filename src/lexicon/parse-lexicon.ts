/**
 * The lexicon file's parser: the file's text in, every `###` entry out with its fields as written,
 * its group, its group's place and its line. Plain text work only, so it runs at build time and
 * anywhere else alike.
 */

/** One entry of the lexicon file as the parser reads it, Internal entries included. */
export interface ParsedLexiconEntry {
  /** The entry's `###` heading, as written. */
  readonly word: string
  /** The 1-based line of the entry's heading in the file. */
  readonly line: number
  /** The `##` heading of the group the entry sits in, as written. */
  readonly group: string
  /** The group's place among the file's groups, from 1. */
  readonly groupOrder: number
  /** Whether the group is the lexicon's Internal group, never shown. */
  readonly internal: boolean
  /** The `id` field, its backticks removed. */
  readonly id: string
  /** The `aliases` field as written, or null when the entry leaves it out. */
  readonly aliases: string | null
  /** The `popup` field as written. */
  readonly popup: string
  /** The `definition` field as written. */
  readonly definition: string
  /** The `in_infinite_flow` field as written, or null when the entry leaves it out. */
  readonly inInfiniteFlow: string | null
  /** The ids the `related` field names, in its order, backticks removed. */
  readonly related: readonly string[]
  /** The `sources` field as written, or null when the entry leaves it out. */
  readonly sources: string | null
}

/** The lexicon breaks one of its template's rules; the message names the file, line and word. */
export class LexiconFormatError extends Error {
  /** A format error with the given message. */
  constructor(message: string) {
    super(message)
    this.name = 'LexiconFormatError'
  }
}

/** The template's fields, in the template's order. */
const TEMPLATE_FIELDS = [
  'id',
  'aliases',
  'popup',
  'definition',
  'in_infinite_flow',
  'related',
  'sources',
] as const
type TemplateField = (typeof TEMPLATE_FIELDS)[number]

/** A field line: `- **name:** value`. */
const FIELD_LINE = /^- \*\*([^*]+):\*\*(?: (.*))?$/u

/** One non-blank line under an entry's heading, with its 1-based line number. */
interface EntryLine {
  readonly content: string
  readonly line: number
}

/** An entry's heading and the lines under it, before they are checked. */
interface RawEntry {
  readonly word: string
  readonly line: number
  readonly group: string
  readonly groupOrder: number
  readonly lines: EntryLine[]
}

/** Whether a `##` heading names the lexicon's Internal group. */
function isInternalGroup(group: string): boolean {
  return /^Internal\b/u.test(group)
}

/** A field's value without one pair of surrounding backticks. */
function unquoted(value: string): string {
  return value.replace(/^`(.*)`$/u, '$1')
}

/**
 * Cut the text into raw entries: each `###` heading outside a fenced block, with the non-blank lines
 * up to the next heading, in the group of the `##` heading above it. A `##` section with no entry
 * is not a group (the file's preface sections), so groups count from the first one holding an
 * entry. A fence line under an entry is kept as one of its lines. Throws when an entry sits before
 * any `##` heading.
 */
function rawEntries(text: string, fileName: string): RawEntry[] {
  const entries: RawEntry[] = []
  let section: string | null = null
  let groups = 0
  let sectionCounted = false
  let current: RawEntry | null = null
  let inFence = false
  const lines = text.split(/\r?\n/u)
  for (const [index, rawLine] of lines.entries()) {
    const line = index + 1
    const content = rawLine.trimEnd()
    if (current === null && content.startsWith('```')) inFence = !inFence
    if (inFence) continue
    if (/^#{1,2} /u.test(content)) {
      current = null
      section = content.startsWith('## ') ? content.slice(3).trim() : null
      sectionCounted = false
    } else if (content.startsWith('### ')) {
      const word = content.slice(4).trim()
      if (section === null) {
        throw new LexiconFormatError(`${fileName}:${line}: "${word}" is not under a group heading`)
      }
      if (!sectionCounted) {
        groups += 1
        sectionCounted = true
      }
      current = { word, line, group: section, groupOrder: groups, lines: [] }
      entries.push(current)
    } else if (current !== null && content !== '') {
      current.lines.push({ content, line })
    }
  }
  return entries
}

/**
 * The fields of one raw entry, by name, values trimmed. Throws a LexiconFormatError when its lines
 * are not the template's fields in the template's order.
 */
function entryFields(raw: RawEntry, fail: (problem: string) => never): Map<TemplateField, string> {
  const fields = new Map<TemplateField, string>()
  let lastPlace = -1
  for (const { content, line } of raw.lines) {
    const match = FIELD_LINE.exec(content)
    if (match === null) fail(`breaks the template: line ${line} is not a field`)
    const name = match[1] as TemplateField
    const place = TEMPLATE_FIELDS.indexOf(name)
    if (place === -1) fail(`breaks the template: the field ${name} is not one of the template`)
    if (fields.has(name)) fail(`breaks the template: it gives the field ${name} twice`)
    if (place < lastPlace) {
      fail(`breaks the template: the field ${name} is out of the template's order`)
    }
    lastPlace = place
    fields.set(name, (match[2] ?? '').trim())
  }
  return fields
}

/** The parsed entry of one raw entry, its fields checked against the template. */
function parsedEntry(raw: RawEntry, fileName: string): ParsedLexiconEntry {
  /** Throws a LexiconFormatError naming the file, the entry's line and its word, then `problem`. */
  const fail = (problem: string): never => {
    throw new LexiconFormatError(`${fileName}:${raw.line}: "${raw.word}" ${problem}`)
  }
  const fields = entryFields(raw, fail)
  /** A required field's value; fails when the entry leaves it out or empty. */
  const required = (name: TemplateField): string => {
    const value = fields.get(name) ?? ''
    return value === '' ? fail(`lacks the required field ${name}`) : value
  }
  const id = unquoted(required('id'))
  const popup = required('popup')
  const definition = required('definition')
  const related = fields.get('related') ?? ''
  return {
    word: raw.word,
    line: raw.line,
    group: raw.group,
    groupOrder: raw.groupOrder,
    internal: isInternalGroup(raw.group),
    id,
    aliases: fields.get('aliases') ?? null,
    popup,
    definition,
    inInfiniteFlow: fields.get('in_infinite_flow') ?? null,
    related:
      related === '' ? [] : related.split(',').map((relatedId) => unquoted(relatedId.trim())),
    sources: fields.get('sources') ?? null,
  }
}

/**
 * Parse the lexicon file's text into every entry it holds, in the file's order, Internal entries
 * included, each frozen. `fileName` is only used in error messages.
 *
 * Throws a LexiconFormatError naming the file, the entry's heading line and its word when an entry
 * lacks its id, popup or definition; when its lines are not the template's fields in the template's
 * order (a field the template does not name, a field given twice, fields out of order, a line that
 * is not a field); when an id is used twice; or when a related id names no entry of the file.
 * Throws one naming the file alone when no entry sits outside the Internal group.
 */
// @spec-link [[api_lexicon_read_contract]]
// @spec-link [[module_lexicon_single_source]]
export function parseLexicon(text: string, fileName: string): readonly ParsedLexiconEntry[] {
  const entries = rawEntries(text, fileName).map((raw) => parsedEntry(raw, fileName))
  const byId = new Map<string, ParsedLexiconEntry>()
  for (const entry of entries) {
    const first = byId.get(entry.id)
    if (first !== undefined) {
      throw new LexiconFormatError(
        `${fileName}:${entry.line}: "${entry.word}" uses the id ${entry.id}, already used by "${first.word}" at line ${first.line}`,
      )
    }
    byId.set(entry.id, entry)
  }
  for (const entry of entries) {
    const unknown = entry.related.find((id) => !byId.has(id))
    if (unknown !== undefined) {
      throw new LexiconFormatError(
        `${fileName}:${entry.line}: "${entry.word}" breaks the template: the related id ${unknown} names no entry of the file`,
      )
    }
  }
  if (!entries.some((entry) => !entry.internal)) {
    throw new LexiconFormatError(`${fileName}: the lexicon has no shown entry`)
  }
  return Object.freeze(entries.map((entry) => Object.freeze(entry)))
}
