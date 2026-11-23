---
id: api_lexicon_read_contract
status: DRAFT
version: 0.2
tags: [v3, release-v3.4, lexicon, api]
type: API
layer: ARCHITECTURE
priority: 1
human_name: The Lexicon API's Read Contract
parents:
  - [[req_lexicon_page]]
dependents: []
---

# The Lexicon API's Read Contract

## INTENT
Give every caller one way to read the lexicon, a typed read interface over entries of one written shape, free of any browser-only assumption, so a backend could later serve the same entries without its callers changing.

## THE RULE / LOGIC
The lexicon API is a plain TypeScript module in src/lexicon/: the parser (the lexicon file's text in, every entry out, Internal ones included, with its fields as written, its group, its group's place and its line, or an error naming the file, the line and the entry's word on an empty or malformed lexicon), the shaping into shown entries, the entry's type, and a read interface. The read interface is built from a list of shown entries handed to it, already in the lexicon's order, never by reading a file or the network itself; it gives the shown entries in the lexicon's order, finds one entry by its id or says there is none, and gives the groups' names in the lexicon's order, each once. It refuses entries that break the contract: an id given twice, or a group's place lower than one before it. A to Z and search are the page's own behaviour, not the API's. The page, its first caller, reads the lexicon only through the read interface, so no second parser exists.

The entry contract, one shown entry as the API hands it out, has exactly nine fields, all required, no other allowed: id (string, unique among the entries); word (string, the entry's heading as written); otherNames (list of strings, in the lexicon's order, empty when the lexicon says none); popup (string, the plain line as written); definition (string, as written); appMeaning (string as written, or null when the entry has none); related (list of strings, the ids of its related entries that are shown entries, in the lexicon's order); group (string, the group's name as the lexicon heads it); groupOrder (integer from 1, the group's place in the lexicon's order). Text fields keep the lexicon's light inline marks (bold, emphasis, code) as written. A list of entries is in the lexicon's order, so the group places never go down along it. The contract is written twice and both say the same thing: the TypeScript type, for callers in this repository, and a JSON Schema (draft 2020-12), version 1, beside the module, for callers outside TypeScript; the parser's output on the real lexicon conforms to the schema. The schema is not part of the app's bundle.

The module fetches nothing, opens no socket and reads no file; it holds no DOM, no browser storage, no Vite-only import (no build-only module, no raw-file import, no build-time variables) and no Vue, and it imports no package. It runs in Node as it is. The one file under src/lexicon/ that names a build-only module is the type declaration of the lexicon's words for the callers outside the module, which imports nothing and is erased at build. It lives in this repository.

## TECHNICAL INTERFACE
src/lexicon/index.ts exports parseLexicon(text, fileName) and its LexiconFormatError (src/lexicon/parse-lexicon.ts), shownEntries(parsed) (src/lexicon/shown-entries.ts), createLexiconReader(entries) giving a LexiconReader with entries(), entryById(id) (or null) and groupNames() (src/lexicon/read-lexicon.ts), and the entry type LexiconEntry (src/lexicon/lexicon-entry.ts). The entry contract's JSON Schema is src/lexicon/lexicon-entry.schema.json, $id urn:infinite-flow:lexicon-entry/v1, using only type, required, properties, additionalProperties: false, items and minimum. A check, reading every code file under src/lexicon/ through the TypeScript parser, fails on a use of the DOM, browser storage, a Vite-only import, Vue, the network, a file read or a package import, and on a Vue file there.

## EXPECTATION
- The read interface, given entries, returns them in the lexicon's order, one entry by id (none for an unknown id), and the groups' names in order; it refuses an id given twice and groups out of order.
- Every shown entry has exactly the nine fields of the contract; the schema requires all nine and allows no other; the type and the schema hold the same fields; the real lexicon's output conforms, and an entry with a field missing, a wrong type or an extra field is refused.
- No file under src/lexicon/ uses the DOM, browser storage, a Vite-only import, Vue, the network or a file read, or imports a package.
- The page reads the lexicon only through the read interface.
