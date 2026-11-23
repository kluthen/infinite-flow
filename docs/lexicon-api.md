# The lexicon API

This document records the lexicon API: the module that reads the app's lexicon
([`docs/music/lexicon.md`](music/lexicon.md)) and hands its shown entries to whoever asks, the
contract those entries follow, and what the module promises so that another caller, or a service
in another language, can rely on it. The settled behaviour is in the v3.4 master spec,
[§E9](../specs/versions/v3/master-spec.md#e9-the-lexicon-api); the reasons are in
[§E14](../specs/versions/v3/master-spec.md#e14-architectural-decisions-and-their-reasons).

The code lives in `src/lexicon/`. It is plain TypeScript: text in, entries out, with no Vite, no
browser and no network in it.

## Words used here

- **Entry**: one `###` heading of the lexicon file with its fields (`id`, `aliases`, `popup`,
  `definition`, `in_infinite_flow`, `related`, `sources`).
- **Shown entry**: an entry outside the lexicon's Internal group, shaped into the entry contract
  below. Internal entries are never shown entries: the parser reads them, the shaping drops them.
- **Group**: the `##` heading an entry sits under. Groups count from the first one holding an
  entry, so the file's preface sections are not groups.
- **Build-only module**: a module that exists only while Vite builds or serves the app, here
  `virtual:lexicon-words`. The module itself never imports one.

## The read interface

`src/lexicon/index.ts` exports everything a caller uses:

| Export                         | File               | What it does                                                                                                                                                                                                                                                  |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseLexicon(text, fileName)` | `parse-lexicon.ts` | The lexicon file's text in, every entry out (Internal ones included) with its fields as written, its group, its group's place and its line. Throws a `LexiconFormatError` naming the file, the line and the word on an empty or malformed lexicon.            |
| `shownEntries(parsed)`         | `shown-entries.ts` | Shapes parsed entries into shown entries: Internal entries dropped, and every related id naming one; `sources` dropped; `aliases` split into other names; no app meaning as `null`.                                                                           |
| `createLexiconReader(entries)` | `read-lexicon.ts`  | The read interface over the shown entries handed to it, in the lexicon's order: `entries()`, `entryById(id)` (or `null`), `groupNames()`. It reads no file and no network, and throws when the entries break the contract (an id twice, groups out of order). |
| `LexiconEntry`                 | `lexicon-entry.ts` | The TypeScript type of one shown entry: the entry contract.                                                                                                                                                                                                   |
| `LexiconFormatError`           | `parse-lexicon.ts` | The error the parser throws.                                                                                                                                                                                                                                  |

The reader is built from a list of entries, never from a file: whoever holds the entries hands
them in. A to Z and search are the page's own behaviour, not the API's.

```ts
import { createLexiconReader, parseLexicon, shownEntries } from './src/lexicon/index.ts'

const reader = createLexiconReader(shownEntries(parseLexicon(text, 'docs/music/lexicon.md')))
reader.entryById('scale-degree') // one shown entry, or null
```

## The entry contract

One shown entry has exactly these nine fields, all required, no other allowed
([§E9.2](../specs/versions/v3/master-spec.md#e92-the-entry-contract)):

| Field        | Type            | Holds                                                                          |
| ------------ | --------------- | ------------------------------------------------------------------------------ |
| `id`         | string          | The entry's id, unique among the entries.                                      |
| `word`       | string          | The entry's heading, as written.                                               |
| `otherNames` | list of strings | Its other names, in the lexicon's order; empty when the lexicon says `none`.   |
| `popup`      | string          | Its plain line, as written.                                                    |
| `definition` | string          | Its definition, as written.                                                    |
| `appMeaning` | string or null  | Its app meaning, as written; null when the entry has none.                     |
| `related`    | list of strings | The ids of its related entries that are shown entries, in the lexicon's order. |
| `group`      | string          | Its group's name, as the lexicon heads it.                                     |
| `groupOrder` | integer, from 1 | Its group's place in the lexicon's order.                                      |

Text fields keep the lexicon's light inline marks (`**bold**`, `_emphasis_`, `` `code` ``) as
written; how the page shows them is the page's business
([§E6](../specs/versions/v3/master-spec.md#e6-the-page)). A list of entries is in the lexicon's
order, which also means the group places never go down along it.

The contract is written twice, and the two say the same thing:

- **The TypeScript type** `LexiconEntry`, in `src/lexicon/lexicon-entry.ts`, for callers in this
  repository.
- **The JSON Schema** `src/lexicon/lexicon-entry.schema.json`, draft 2020-12, version 1 (its `$id`
  is `urn:infinite-flow:lexicon-entry/v1`), for anything outside TypeScript: a service in another
  language can serve against it, and a caller can check what it receives. It uses only `type`,
  `required`, `properties`, `additionalProperties: false`, `items` and `minimum`.

The schema is not part of the app's bundle; nothing in the app imports it.

## What the module guarantees

- **One parser.** The build step and every caller read the lexicon through the same parser and
  shaping; no second reading of the file exists.
- **No network and no file.** Nothing inside the module fetches, opens a socket or reads a file:
  the parser takes text, the reader takes entries. Everything stays in the browser, as the
  browser-only rule asks.
- **No browser-only assumption.** No DOM (`window`, `document`), no browser storage, no Vite-only
  import (no build-only module, no `?raw` import, no `import.meta.env`), no Vue. The module runs
  in Node as it is (its relative imports carry their `.ts` extension, and it is typechecked in the
  Node configuration, without the DOM's types).
- **No runtime dependency.** It imports no package.

`src/lexicon/lexicon-words.d.ts` is the one file under `src/lexicon/` that names a build-only
module: it declares the type of `virtual:lexicon-words` for the callers that import it from
outside the module. It is a type declaration only, erased at build, and imports nothing; an import
of that module from inside `src/lexicon/` is refused.

## How it is checked

All three run in `npm run test:unit` (details in
[The lexicon's fixtures and checks](testing.md#the-lexicons-fixtures-and-checks)):

- **The schema's conformance** (`tests/unit/lexicon/lexicon-entry-schema.spec.ts`): every shown
  entry the parser and the shaping give on the real lexicon conforms to the schema; an entry with a
  field missing, a wrong type or an extra field is refused; the schema's fields, the type's fields
  and the real entries' fields are the same set. The schema is checked by a small checker of the
  schema's own subset, written in the test, which refuses any keyword it does not know; no
  validator package is added.
- **The browser-free check** (`tests/unit/lexicon/lexicon-api-boundary.spec.ts`): every code file
  under `src/lexicon/` is read through the TypeScript parser, so a word in a comment or a string is
  not a use, and any of the uses above fails it, as does a Vue file or a package import. It is shown
  failing on uses planted in a throwaway copy of the directory.
- **The read interface** (`tests/unit/lexicon/read-lexicon.spec.ts`) and the parser and shaping
  on the real file and on made-up lexicons.

## Its first caller

The app is the module's first caller. At build time, the build step
(`scripts/lexicon-words-plugin.ts`) parses and shapes the lexicon and serves the shown entries as
the build-only module `virtual:lexicon-words`, a file of its own out of the first load. The
lexicon page (v3.4) loads that file through a dynamic `import()` and reads it only through
`createLexiconReader`; the word popups will do the same when they are built.

## How a backend could serve the same data

Because the reader takes the entries it is handed, the place the entries come from can change
without its callers changing. A service, in any language, could serve the shown entries as a JSON
list in the lexicon's order, each entry conforming to the schema; the caller would then hand that
list to `createLexiconReader` in place of the build-only module's, and everything after it reads
the same. Nothing like this is built: the app has no server, and whether the module later moves to
the library's repository is open
([§E9.3](../specs/versions/v3/master-spec.md#e93-where-it-lives-later)).
