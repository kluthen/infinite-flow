---
id: api_lexicon_read_contract
status: DRAFT
version: 0.1
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
The lexicon API is a plain TypeScript module in src/lexicon/: the parser (the lexicon file's text in, every entry out with its group, its group's place and its line), the shaping into shown entries, the entry's type, and a read interface. The read interface is built from a list of entries handed to it, never by reading a file or the network itself; it gives the shown entries in the lexicon's order, finds one entry by its id or says there is none, and gives the groups' names in the lexicon's order. A to Z and search are the page's own behaviour, not the API's. The page, its first caller, reads the lexicon only through the read interface, so no second parser exists.

The entry contract, one shown entry as the API hands it out, has exactly nine fields, all required, no other allowed: id (string, unique among the entries); word (string, the entry's heading as written); otherNames (list of strings, in the lexicon's order, empty when the lexicon says none); popup (string, the plain line as written); definition (string, as written); appMeaning (string as written, or null when the entry has none); related (list of strings, the ids of its related entries that are shown entries, in the lexicon's order); group (string, the group's name as the lexicon heads it); groupOrder (integer from 1, the group's place in the lexicon's order). Text fields keep the lexicon's light inline marks as written. The contract is written as a JSON Schema (draft 2020-12), version 1, beside the module; the TypeScript type and the schema say the same thing, and the parser's output on the real lexicon conforms to the schema.

The module holds no DOM, no browser storage, no Vite-only import (no build-only module, no raw-file import, no build-time variables), no Vue and no network use, and adds no runtime dependency. It lives in this repository.

## TECHNICAL INTERFACE
src/lexicon/ exports the parser, the shaping into shown entries, the entry type and the read interface (entries in order, one entry by id or none, the groups' names in order) through its index; the entry contract's JSON Schema is src/lexicon/lexicon-entry.schema.json. A check fails when a file under src/lexicon/ uses the DOM, browser storage, a Vite-only import, Vue or the network.

## EXPECTATION
- The read interface, given entries, returns them in the lexicon's order, one entry by id (none for an unknown id), and the groups' names in order.
- Every shown entry has exactly the nine fields of the contract; the schema requires all nine and allows no other; the type and the schema hold the same fields; the real lexicon's output conforms.
- No file under src/lexicon/ uses the DOM, browser storage, a Vite-only import, Vue or the network; no runtime dependency is added.
- The page reads the lexicon only through the read interface.
