import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { encodeGeneratedNotesMusicXml } from '@/export/musicxml/musicxml-encoder'
import {
  bbTenorTempoChangeSession,
  cKeyboardPlainSession,
  cKeyboardSession,
  ebAltoKeyChangeSession,
} from './musicxml-session-fixtures'

const SCHEMA_DIRECTORY = `${resolve('tests/fixtures/musicxml/schema')}/`
const GOLDEN_DIRECTORY = `${resolve('tests/fixtures/musicxml/golden')}/`

/**
 * Validate one document against the vendored MusicXML 4.0 schema with xmllint, offline: the
 * catalog maps the schema's imports to the local copies and the no-network option forbids any
 * download. xmllint must be installed; a missing binary fails the test instead of skipping it.
 */
function validate(xml: string): { status: number | null; output: string } {
  const result = spawnSync(
    'xmllint',
    ['--noout', '--nonet', '--schema', `${SCHEMA_DIRECTORY}musicxml.xsd`, '-'],
    {
      input: xml,
      encoding: 'utf8',
      env: { ...process.env, XML_CATALOG_FILES: `${SCHEMA_DIRECTORY}catalog.xml` },
    },
  )
  if (result.error !== undefined) {
    throw new Error(
      `xmllint could not run (is libxml2's xmllint installed?): ${result.error.message}`,
    )
  }
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

// @test-link [[rule_generated_notes_musicxml_export]]
describe('MusicXML output against the MusicXML 4.0 schema', () => {
  it('rejects a document the schema forbids, so a pass means something', () => {
    const invalid =
      '<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="4.0"><bogus/></score-partwise>\n'
    expect(validate(invalid).status).not.toBe(0)
  })

  it.each([
    ['C keyboard', cKeyboardSession()],
    ['B-flat tenor with a tempo change', bbTenorTempoChangeSession()],
    ['E-flat alto with a key change', ebAltoKeyChangeSession()],
    ['C keyboard, five phrases, two tempo changes', cKeyboardPlainSession([90, 90, 125, 125, 90])],
  ])('validates the encoder output for the %s session', (_name, session) => {
    const result = validate(encodeGeneratedNotesMusicXml(session))
    expect(result.output).toBe('- validates\n')
    expect(result.status).toBe(0)
  })

  it('validates every golden file', () => {
    const goldens = readdirSync(GOLDEN_DIRECTORY).filter((name) => name.endsWith('.musicxml'))
    expect(goldens.length).toBeGreaterThanOrEqual(3)
    for (const name of goldens) {
      const result = validate(readFileSync(`${GOLDEN_DIRECTORY}${name}`, 'utf8'))
      expect(result.output, name).toBe('- validates\n')
    }
  })
})
