import { describe, expect, it } from 'vitest'

import { element, escapeXml, serializeXmlDocument, textElement } from '@/export/musicxml/xml-text'

// @test-link [[rule_generated_notes_musicxml_export]]
describe('xml-text serializer', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f')
  })

  it('writes an indented tree, text-only and empty elements on one line, escaped values', () => {
    const root = element(
      'score',
      [['name', 'R&B "x"']],
      [textElement('part-name', 'Sax <alto>'), element('rest')],
    )
    expect(serializeXmlDocument(['<?xml version="1.0"?>'], root)).toBe(
      '<?xml version="1.0"?>\n' +
        '<score name="R&amp;B &quot;x&quot;">\n' +
        '  <part-name>Sax &lt;alto&gt;</part-name>\n' +
        '  <rest/>\n' +
        '</score>\n',
    )
  })

  it('refuses an element that mixes text and element children', () => {
    const mixed = element('a', [], ['text', element('b')])
    expect(() => serializeXmlDocument([], mixed)).toThrow(/mixes text and element children/)
  })
})
