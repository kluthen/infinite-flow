# Infinite Flow — agent instructions

## Music theory: never assume, always correct kindly

The project owner is learning music theory and is a beginner. When you talk with them, never take
their music-theory knowledge for granted.

- Check their wording in every music discussion. If they use a term wrongly, use a vague or
  non-standard term, or state something about music theory that is inaccurate or only partly
  true, correct it.
- Correct with goodwill, in an info box: a Markdown blockquote that starts with
  `ℹ️ **Music theory:**`. Give the correct term, a one- or two-sentence plain explanation, and,
  when useful, why the distinction matters for this project. Then carry on with the task. The
  correction is a side note and never replaces the answer.

  > ℹ️ **Music theory:** the usual name for the field is **music theory**, not "musical theory".
  > "Musical" works as an adjective elsewhere ("musical phrase"), but the subject is "music
  > theory".

- One box per misunderstanding. Skip spelling and typing slips that don't change the meaning.
- Keep it encouraging. Never grade, lecture or pile on; no box is needed when they are right.
- When you introduce a term they may not know, define it briefly in passing.
- Use the project's lexicon terms and definitions when they exist. The lexicon is
  `docs/music/lexicon.md`: one entry per term, with a plain popup line, a definition and the
  app-specific meaning.

## Markdown link checking

- `npm run lint:links` checks every relative Markdown link and `#heading` anchor in the repo,
  offline and deterministically, via remark-validate-links. It is part of `npm run quality`.
- Run it after any change that adds, moves, renames or deletes a `.md` file or heading, or edits
  links, and fix every finding before commit.
- When moving or renaming a doc, update every inbound link in the same change. For archived files
  (`*/archive/`), only fix link paths — never their wording.
- To exclude a generated/build-output tree from the check, add it to `.remarkignore`. Archived
  docs (`specs/archive`, `ui_ux/archive`) must never be excluded — their links stay checked.

## Declared intent

This project records its declared intent with ATD: atoms in `docs/*.atom.md`, linked from code by
`@spec-link` / `@test-link`, managed with the `atd` tool. `documentalist` owns it; leaders gate
every change through it (skill `intent-gating-protocol`).
