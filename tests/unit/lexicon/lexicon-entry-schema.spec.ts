// @vitest-environment node
/**
 * The entry contract's JSON Schema, `src/lexicon/lexicon-entry.schema.json`: every shown entry of
 * the real lexicon conforms to it, an entry that breaks it is refused, and its fields are exactly
 * the entry type's. The schema is checked by a small checker of its own subset (types, required
 * fields, items, no extra field, a minimum), which refuses any keyword it does not know, so the
 * schema cannot grow a rule these tests would silently skip.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { parseLexicon, shownEntries, type LexiconEntry } from '@/lexicon'

import { realLexiconText } from './lexicon-test-text'

const schemaPath = fileURLToPath(
  new URL('../../../src/lexicon/lexicon-entry.schema.json', import.meta.url),
)
const entryTypePath = fileURLToPath(
  new URL('../../../src/lexicon/lexicon-entry.ts', import.meta.url),
)

/** One schema of the subset the checker reads; any other keyword is refused. */
interface SubsetSchema {
  readonly $schema?: string
  readonly $id?: string
  readonly title?: string
  readonly description?: string
  readonly type?: string | readonly string[]
  readonly required?: readonly string[]
  readonly properties?: Readonly<Record<string, SubsetSchema>>
  readonly additionalProperties?: boolean
  readonly items?: SubsetSchema
  readonly minimum?: number
}

const knownKeywords = new Set([
  '$schema',
  '$id',
  'title',
  'description',
  'type',
  'required',
  'properties',
  'additionalProperties',
  'items',
  'minimum',
])

/** The JSON type names a value has: `integer` counts as a `number` too. */
function jsonTypes(value: unknown): string[] {
  if (value === null) return ['null']
  if (Array.isArray(value)) return ['array']
  if (typeof value === 'number') return Number.isInteger(value) ? ['integer', 'number'] : ['number']
  if (typeof value === 'object') return ['object']
  return [typeof value]
}

/**
 * Every way `value` breaks `schema`, as `<path>: <problem>`; none when it conforms. Throws when the
 * schema uses a keyword outside the checker's subset.
 */
function schemaErrors(schema: SubsetSchema, value: unknown, path = '$'): string[] {
  const unknown = Object.keys(schema).filter((keyword) => !knownKeywords.has(keyword))
  if (unknown.length > 0) {
    throw new Error(`${path}: the checker does not know the keyword(s) ${unknown.join(', ')}`)
  }
  if (schema.type !== undefined) {
    const allowed = typeof schema.type === 'string' ? [schema.type] : schema.type
    if (!jsonTypes(value).some((type) => allowed.includes(type))) {
      return [`${path}: is ${jsonTypes(value)[0]}, not ${allowed.join(' or ')}`]
    }
  }
  const errors: string[] = []
  if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) {
    errors.push(`${path}: is below ${schema.minimum}`)
  }
  if (Array.isArray(value) && schema.items !== undefined) {
    const items = schema.items
    value.forEach((item, index) => errors.push(...schemaErrors(items, item, `${path}[${index}]`)))
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    for (const name of schema.required ?? []) {
      if (!(name in record)) errors.push(`${path}: lacks the required field ${name}`)
    }
    const properties = schema.properties ?? {}
    for (const [name, field] of Object.entries(record)) {
      const fieldSchema = properties[name]
      if (fieldSchema !== undefined)
        errors.push(...schemaErrors(fieldSchema, field, `${path}.${name}`))
      else if (schema.additionalProperties === false) {
        errors.push(`${path}: has the field ${name}, which the schema does not allow`)
      }
    }
  }
  return errors
}

/** The schema file, parsed. */
function entrySchema(): SubsetSchema {
  return JSON.parse(readFileSync(schemaPath, 'utf8')) as SubsetSchema
}

/** The names of the members of the `LexiconEntry` interface, read from its source file. */
function entryTypeFields(): string[] {
  const source = ts.createSourceFile(
    entryTypePath,
    readFileSync(entryTypePath, 'utf8'),
    ts.ScriptTarget.Latest,
  )
  const declaration = source.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'LexiconEntry',
  )
  if (declaration === undefined) throw new Error(`${entryTypePath} declares no LexiconEntry`)
  return declaration.members.map((member) => {
    if (member.name === undefined || !ts.isIdentifier(member.name)) {
      throw new Error(`LexiconEntry has a member that is not a plain named field`)
    }
    return member.name.text
  })
}

/** A made-up shown entry that conforms to the contract. */
const conformingEntry: LexiconEntry = {
  id: 'blorp',
  word: 'Blorp',
  otherNames: ['blorpish'],
  popup: 'Blorp, a made-up word.',
  definition: 'Blorp is made up for these tests.',
  appMeaning: null,
  related: [],
  group: 'Made-up words',
  groupOrder: 1,
}

describe("the entry contract's JSON Schema", () => {
  // @test-link [[api_lexicon_read_contract]]
  it('sits beside the lexicon module, draft 2020-12, version 1', () => {
    expect(existsSync(schemaPath)).toBe(true)
    const schema = entrySchema()
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(schema.$id).toMatch(/lexicon-entry\/v1$/u)
  })

  // @test-link [[api_lexicon_read_contract]]
  it('requires the nine fields of the contract and allows no other', () => {
    expect(existsSync(schemaPath)).toBe(true)
    const schema = entrySchema()
    const nine = [
      'id',
      'word',
      'otherNames',
      'popup',
      'definition',
      'appMeaning',
      'related',
      'group',
      'groupOrder',
    ]
    expect(schema.type).toBe('object')
    expect([...(schema.required ?? [])].sort()).toEqual([...nine].sort())
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual([...nine].sort())
    expect(schema.additionalProperties).toBe(false)
  })

  // @test-link [[api_lexicon_read_contract]]
  it('is met by every shown entry the parser and the shaping give on the real lexicon', () => {
    expect(existsSync(schemaPath)).toBe(true)
    const schema = entrySchema()
    const shown = shownEntries(parseLexicon(realLexiconText(), 'docs/music/lexicon.md'))
    expect(shown.length).toBeGreaterThan(0)
    const errors = shown.flatMap((entry) => schemaErrors(schema, entry, `$[${entry.id}]`))
    expect(errors).toEqual([])
  })

  // @test-link [[api_lexicon_read_contract]]
  it('refuses an entry with a field missing, a wrong type or an extra field', () => {
    expect(existsSync(schemaPath)).toBe(true)
    const schema = entrySchema()
    expect(schemaErrors(schema, conformingEntry)).toEqual([])
    expect(schemaErrors(schema, { ...conformingEntry, appMeaning: 'Blorp is a test.' })).toEqual([])

    const withoutPopup = Object.fromEntries(
      Object.entries(conformingEntry).filter(([name]) => name !== 'popup'),
    )
    expect(schemaErrors(schema, withoutPopup)).toEqual(['$: lacks the required field popup'])
    expect(schemaErrors(schema, { ...conformingEntry, word: null })).toEqual([
      '$.word: is null, not string',
    ])
    expect(schemaErrors(schema, { ...conformingEntry, groupOrder: 1.5 })).toEqual([
      '$.groupOrder: is number, not integer',
    ])
    expect(schemaErrors(schema, { ...conformingEntry, groupOrder: 0 })).toEqual([
      '$.groupOrder: is below 1',
    ])
    expect(schemaErrors(schema, { ...conformingEntry, related: ['snerk', 3] })).toEqual([
      '$.related[1]: is integer, not string',
    ])
    expect(schemaErrors(schema, { ...conformingEntry, otherNames: 'blorpish' })).toEqual([
      '$.otherNames: is string, not array',
    ])
    expect(schemaErrors(schema, { ...conformingEntry, sources: 'A made-up book.' })).toEqual([
      '$: has the field sources, which the schema does not allow',
    ])
  })

  // @test-link [[api_lexicon_read_contract]]
  it("holds the same fields as the entry type and the real lexicon's entries", () => {
    expect(existsSync(schemaPath)).toBe(true)
    const schemaFields = Object.keys(entrySchema().properties ?? {}).sort()
    expect(entryTypeFields().sort()).toEqual(schemaFields)
    const shown = shownEntries(parseLexicon(realLexiconText(), 'docs/music/lexicon.md'))
    for (const entry of shown) expect(Object.keys(entry).sort()).toEqual(schemaFields)
  })
})

describe("the schema checker's own subset", () => {
  it('refuses a schema keyword it does not know', () => {
    expect(() => schemaErrors({ type: 'string', pattern: '^b' } as SubsetSchema, 'blorp')).toThrow(
      'the checker does not know the keyword(s) pattern',
    )
  })
})
