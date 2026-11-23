# Sample lexicon

A made-up lexicon for the lexicon build step's tests, laid out like the real lexicon file. None of
its words or lines comes from the real lexicon.

## Entry template

```markdown
### <Term>

- **id:** `kebab-case-id`
```

## Shapes

### Blorp

- **id:** `blorp`
- **aliases:** blorpy, the blorp (old, rare)
- **popup:** A made-up round shape, for the build step's tests only.
- **definition:** Blorp is a word made up for the tests.
- **in_infinite_flow:** Blorp means nothing in the app.
- **related:** `zindle`, `quaffle`
- **sources:** made-up source S0

### Zindle

- **id:** `zindle`
- **aliases:** none
- **popup:** A made-up pointed shape, for the build step's tests only.
- **definition:** Zindle is a made-up word with **bold** and _emphasis_ marks.
- **related:** `blorp`
- **sources:** made-up source S0

## Colours

### Snerk

- **id:** `snerk`
- **aliases:** none
- **popup:** A made-up colour, for the build step's tests only.
- **definition:** Snerk is a made-up colour with a `code` mark.
- **related:** `blorp`
- **sources:** made-up source S0

## Internal (no popup)

### Quaffle

- **id:** `quaffle`
- **aliases:** none
- **popup:** Internal: a made-up word the page never shows.
- **definition:** Quaffle is a made-up internal word.
- **related:** `blorp`
- **sources:** made-up source S0

### Wibble

- **id:** `wibble`
- **aliases:** wobble
- **popup:** Internal: a made-up word that a test moves out of the Internal group.
- **definition:** Wibble is a made-up internal word.
- **related:** `snerk`
- **sources:** made-up source S0
