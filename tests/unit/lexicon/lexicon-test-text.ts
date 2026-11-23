/**
 * Small made-up lexicons for the lexicon module's tests, and an independent reading of the real
 * lexicon file the parser's output is compared against. Nothing here copies a real entry: the
 * made-up words and plain lines exist only in these tests.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** The real lexicon file, as the build step reads it. */
export const realLexiconPath = fileURLToPath(
  new URL('../../../docs/music/lexicon.md', import.meta.url),
)

/** The real lexicon file's text. */
export function realLexiconText(): string {
  return readFileSync(realLexiconPath, 'utf8')
}

/** The fields of one made-up entry, in the template's order; a field left out is not written. */
export interface SampleEntry {
  readonly word: string
  readonly id?: string
  readonly aliases?: string
  readonly popup?: string
  readonly definition?: string
  readonly in_infinite_flow?: string
  readonly related?: string
  readonly sources?: string
}

/** One made-up entry's lines: its `###` heading and each field it gives, in the template's order. */
export function sampleEntryLines(entry: SampleEntry): string[] {
  const fieldNames = [
    'id',
    'aliases',
    'popup',
    'definition',
    'in_infinite_flow',
    'related',
    'sources',
  ] as const
  const lines = [`### ${entry.word}`, '']
  for (const name of fieldNames) {
    const value = entry[name]
    if (value !== undefined) lines.push(`- **${name}:** ${value}`)
  }
  lines.push('')
  return lines
}

/** A complete made-up entry with every field, its id the word in lower case. */
export function fullSampleEntry(word: string, overrides: Partial<SampleEntry> = {}): SampleEntry {
  const id = word.toLowerCase().replace(/\s+/gu, '-')
  return {
    word,
    id: `\`${id}\``,
    aliases: 'none',
    popup: `The made-up word ${word}, for tests only.`,
    definition: `${word} is a word made up for the lexicon module's tests.`,
    in_infinite_flow: `${word} means nothing in the app.`,
    sources: 'tests only',
    ...overrides,
  }
}

/**
 * A made-up lexicon: a title, a preface section with a fenced template (as the real file has), then
 * each group with its entries. A group named `Internal (no popup)` is the Internal group.
 */
export function sampleLexicon(groups: Record<string, readonly string[][]>): string {
  const lines = [
    '# Test lexicon',
    '',
    '## Entry template',
    '',
    '```markdown',
    '### <Term>',
    '',
    '- **id:** `kebab-case-id`',
    '```',
    '',
  ]
  for (const [group, entries] of Object.entries(groups)) {
    lines.push(`## ${group}`, '')
    for (const entryLines of entries) lines.push(...entryLines)
  }
  return lines.join('\n')
}

/** One `###` entry of a lexicon file as an independent, plain reading of the text finds it. */
export interface FileEntry {
  readonly group: string
  readonly word: string
  readonly fields: Readonly<Record<string, string>>
}

/**
 * Every `###` entry of a lexicon text, read without the parser: fenced blocks removed, the text
 * cut at each `## ` heading and then at each `### ` heading, and each `- **name:** value` line of
 * an entry taken as written.
 */
export function fileEntries(text: string): FileEntry[] {
  const withoutFences = text.replace(/^```[\s\S]*?^```/gmu, '')
  const entries: FileEntry[] = []
  for (const section of withoutFences.split(/^## /mu).slice(1)) {
    const [heading = '', ...blocks] = section.split(/^### /mu)
    const group = (heading.split('\n')[0] ?? '').trim()
    for (const block of blocks) {
      const word = (block.split('\n')[0] ?? '').trim()
      const fields = Object.fromEntries(
        [...block.matchAll(/^- \*\*(\w+):\*\* (.*)$/gmu)].map((match) => [match[1], match[2]]),
      )
      entries.push({ group, word, fields })
    }
  }
  return entries
}

/** The ids a `related` or `id` field names, backticks removed. */
export function idsOf(field: string | undefined): string[] {
  if (field === undefined || field.trim() === '') return []
  return field.split(',').map((id) => id.trim().replace(/^`|`$/gu, ''))
}
