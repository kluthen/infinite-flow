/**
 * A minimal XML tree and its deterministic serializer, enough for the MusicXML encoder: elements
 * with ordered attributes, element or text children, two-space indentation, one element per line
 * except a text-only element, which stays on one line. The same tree always serializes to the
 * same bytes, which is what makes exporting the same session twice give identical files.
 */

/** One XML element: a name, its attributes in output order, and its children in output order. */
// @spec-link [[rule_generated_notes_musicxml_export]]
export interface XmlElement {
  readonly name: string
  readonly attributes: readonly (readonly [string, string])[]
  readonly children: readonly XmlNode[]
}

/** An element, or a run of character data. */
export type XmlNode = XmlElement | string

/** Intent: build an element; attributes are given as an ordered list of name/value pairs. */
export function element(
  name: string,
  attributes: readonly (readonly [string, string])[] = [],
  children: readonly XmlNode[] = [],
): XmlElement {
  return { name, attributes, children }
}

/** Intent: build an element holding only one run of text, such as `<step>C</step>`. */
export function textElement(name: string, text: string | number): XmlElement {
  return element(name, [], [String(text)])
}

/** Intent: escape the five XML special characters in character data or an attribute value. */
export function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** Intent: the opening of a start or empty tag: the name plus its escaped attributes. */
function openTag(node: XmlElement): string {
  const attributes = node.attributes
    .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
    .join('')
  return `<${node.name}${attributes}`
}

/** Intent: serialize one element and its subtree at `depth`, one line per element. */
function serializeElement(node: XmlElement, depth: number, lines: string[]): void {
  const indent = '  '.repeat(depth)
  if (node.children.length === 0) {
    lines.push(`${indent}${openTag(node)}/>`)
    return
  }
  if (node.children.every((child) => typeof child === 'string')) {
    const text = node.children.map((child) => escapeXml(child as string)).join('')
    lines.push(`${indent}${openTag(node)}>${text}</${node.name}>`)
    return
  }
  lines.push(`${indent}${openTag(node)}>`)
  for (const child of node.children) {
    if (typeof child === 'string') {
      throw new Error(`XML element <${node.name}> mixes text and element children.`)
    }
    serializeElement(child, depth + 1, lines)
  }
  lines.push(`${indent}</${node.name}>`)
}

/**
 * Intent: serialize a whole document: the given prolog lines (XML declaration, document type),
 * then the root element, each line ending in a line feed.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
export function serializeXmlDocument(prolog: readonly string[], root: XmlElement): string {
  const lines = [...prolog]
  serializeElement(root, 0, lines)
  return `${lines.join('\n')}\n`
}
