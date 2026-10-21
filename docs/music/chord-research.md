# Chord Research

Status: research v1 (2026-10-12), groundwork for v3.3 richer chords (D261; a separate,
docs-only item before v3.3 by D262). Not settled policy.

## Purpose

v3.3 lets the player allow chords richer than today's three-note chords, with flags set in the
app (D261). D261 also asks for research first, so that the generator later uses sourced chord
data rather than recollection. This document is that research. It answers five questions, then
gathers what each open question of v3.3 (O165–O173 and O175, recorded in the v3.3 section of
`specs/versions/v3/README.md` and in `specs/open-questions.md` on `main`) needs to know.

1. **Chord types.** Which richer chords exist: the seventh chords, sixth and suspended chords,
   ninths, elevenths and thirteenths, altered chords.
2. **Construction.** Which chord each degree of each of the app's seven modes carries when one
   more note is stacked, and which further notes fit on top.
3. **Style plausibility.** Which chord types sound right in the styles the presets aim at: Jazz,
   Bebop, Blues, Bossa, Modal (Dorian), Pop song and folk.
4. **Chord symbols.** How each type is written, and which MusicXML chord kind it maps to.
5. **Melodies.** How a melody treats a seventh or an extension: does it resolve it or rest on it?

A few words first. A **chord** is several notes heard together. Most chords in Western music are
built by **stacking thirds**: start on a note (the **root**), skip one scale note, take the next,
and so on. Three notes stacked this way make a [triad](lexicon.md#triad) (C–E–G). A fourth note on
top makes a [seventh chord](lexicon.md#seventh-chord) (C–E–G–B), because that note lies a seventh
above the root. Going on gives the [extended chords](lexicon.md#extended-chord): the ninth,
eleventh and thirteenth. Each note added on top of the seventh is a
[chord extension](lexicon.md#chord-extension). A chord's
[quality](lexicon.md#chord-quality) (major, minor and so on) is set by the exact distances between
its notes.

Every fact the generator may rely on cites a source (S numbers, listed in
[research sources](research-sources.md#chords-v33)) or a repository path. Judgments of this
document's own are marked **(inference)**; recommendations are marked **Recommendation** and are
never decisions.

## How this was gathered

- **Repository.** The [harmony planner policy](harmony-planner-policy.md), the
  [lexicon](lexicon.md), the [preset catalogue](preset-catalogue.md#what-no-setting-can-express-today),
  the [embellishment catalogue](embellishment-catalogue.md), the
  [Jazz](jazz-profile.md) and [Neutral](neutral-profile.md) profiles, sources S14, S15, S101, S103
  and S112, and the code and atoms that assume a three-note chord (listed in
  [Internal findings](#internal-findings)). The v3.3 section of `specs/versions/v3/README.md`
  and the O165–O175 entries were read on `main` (commit `e3b240f`).
- **Unmerged research.** On branch `v4-accompaniment-research`, read with `git show` and not
  checked out: `docs/music/generation-breadth-review.md`, the style atlas `docs/music/styles/`,
  its `lexicon.md` (entries `chord-inversion`, `voicing`, `guide-tone`, `seventh-chord`) and its
  `research-sources.md`, which runs to S411. The new sources here therefore start at S412.
  Where this document disagrees with that branch, it says so in
  [Disagreements with the v4 branch](#disagreements-with-the-v4-branch).
- **Web.** Open textbooks first: Open Music Theory 2e (S416–S421) and Music Theory for the
  21st-Century Classroom (S422–S428); the MusicXML 4.0 reference (S412–S415); then Wikipedia
  pages as pointers for widely documented facts (S429–S441, S452), jazz-teaching pages (S442–S446)
  and a few articles (S447–S450). One forum thread (S451) is the only folk-accompaniment source
  found; it is marked as weak wherever it is used. Each key fact is cross-checked with a second
  source where one was found; where only one exists, the text says so.
- **Calculations.** The construction tables were computed from the collection offsets in
  `src/domain/harmony/collection.ts` (`COLLECTION_OFFSETS`) by a throwaway script, not committed.
  They are arithmetic, not opinion: stacking thirds inside a seven-note collection gives exactly
  these chords. The avoid-note marks apply the rule stated in
  [Avoid notes and available extensions](#avoid-notes-and-available-extensions).

## Chord types

A **seventh chord** is a triad plus the note a seventh above its root. Its name comes from two
facts: the quality of the triad underneath, and the size of the seventh. Five types are the common
ones in classical and popular music (S416, S422); three more appear in jazz and in minor keys
(S429, S433, S434).

| Type                                                                | Built from                            | Notes on C     | Usual symbol | Occurs in the app's seven modes?      |
| ------------------------------------------------------------------- | ------------------------------------- | -------------- | ------------ | ------------------------------------- |
| [Major seventh](lexicon.md#major-seventh-chord)                     | major triad + major seventh           | C–E–G–B        | Cmaj7        | yes, twice per mode                   |
| [Minor seventh](lexicon.md#minor-seventh-chord)                     | minor triad + minor seventh           | C–E♭–G–B♭      | Cm7          | yes, three times per mode             |
| [Dominant seventh](lexicon.md#dominant-seventh-chord)               | major triad + minor seventh           | C–E–G–B♭       | C7           | yes, once per mode                    |
| [Half-diminished seventh](lexicon.md#half-diminished-seventh-chord) | diminished triad + minor seventh      | C–E♭–G♭–B♭     | Cm7♭5, Cø7   | yes, once per mode                    |
| [Diminished seventh](lexicon.md#diminished-seventh-chord)           | diminished triad + diminished seventh | C–E♭–G♭–B𝄫(=A) | Cdim7, C°7   | no: harmonic minor (S432)             |
| Minor-major seventh                                                 | minor triad + major seventh           | C–E♭–G–B       | Cm(maj7)     | no: harmonic and melodic minor (S433) |
| Augmented major seventh                                             | augmented triad + major seventh       | C–E–G♯–B       | C+maj7       | no: harmonic and melodic minor (S434) |
| Augmented seventh                                                   | augmented triad + minor seventh       | C–E–G♯–B♭      | C+7, C7♯5    | no (S429 lists it as a further type)  |

The other families:

- **[Sixth chords](lexicon.md#sixth-chord).** A triad plus the sixth above the root: C6 is
  C–E–G–A; Cm6 is C–E♭–G–A, a minor triad with a major sixth (S435). C6 holds the same four notes
  as Am7, so which note is the root depends on context (S435). The symbol "6" is used only when no
  seventh is present; with a seventh, the same note is called 13 (S426). The 6/9 chord adds the
  ninth too, and implies no seventh (S417, S438).
- **[Suspended chords](lexicon.md#suspended-chord).** The third is replaced by the fourth
  (Csus4: C–F–G) or the second (Csus2: C–D–G) (S417, S436). "sus" alone means sus4 (S417,
  S438). With a seventh it is written C7sus4 or C7sus, the "sus" after the number (S417). It is
  a different thing from the melodic [suspension](lexicon.md#suspension) the lexicon already has:
  that one is a held note that clashes and then falls by step; the sus chord's fourth does not
  have to resolve in popular music (S436).
- **[Extended chords](lexicon.md#extended-chord).** Stacking past the seventh gives the ninth,
  eleventh and thirteenth (S417, S437). An extension in a symbol implies the ones below it: C11
  contains the seventh and the ninth, though not every implied note is played (S417); "9" in a
  symbol means the seventh is present, and a ninth without a seventh is written "add9" (S425,
  S417). Extensions are major (ninth, thirteenth) or perfect (eleventh) by default (S417); the
  thirteenth is the last one, since a thirteenth chord holds all seven notes of the scale (S437).
  In practice the fifth, and often the eleventh, is left out (S437, S425).
- **[Altered chords](lexicon.md#altered-chord).** A dominant seventh whose fifth or ninth is
  raised or lowered: 7♭9, 7♯9, 7♯11, 7♭13, 7♯5 (S417, S428). Bebop uses them (S103). Each needs a
  note from outside the collection, so none is diatonic (inference from the construction below).

## Construction in the app's seven modes

The app's collections are the seven church modes; Major is Ionian's notes and Minor is Aeolian's
(`COLLECTION_OFFSETS`). Today the planner builds the chord on degree d from collection degrees d,
d+2 and d+4 ([harmony planner policy](harmony-planner-policy.md#collection-and-chord-vocabulary)).
The seventh chord adds degree d+6. All seven modes contain the same seven-note pattern started at a
different point, so their seventh chords are the same seven chords in a different order. Table B
describes those seven chords once; table A says which of them each degree of each mode carries.

### Table A: the seventh chord on each degree

Each cell gives the chord's quality and, in brackets, which row of table B it is, named by C
major's Roman numeral for that chord (the [Roman numeral](lexicon.md#roman-numeral) of a chord is
its root's degree).

| Degree | Ionian (Major) | Dorian     | Phrygian   | Lydian     | Mixolydian | Aeolian (Minor) | Locrian    |
| ------ | -------------- | ---------- | ---------- | ---------- | ---------- | --------------- | ---------- |
| 1      | maj7 (I)       | m7 (ii)    | m7 (iii)   | maj7 (IV)  | 7 (V)      | m7 (vi)         | m7♭5 (vii) |
| 2      | m7 (ii)        | m7 (iii)   | maj7 (IV)  | 7 (V)      | m7 (vi)    | m7♭5 (vii)      | maj7 (I)   |
| 3      | m7 (iii)       | maj7 (IV)  | 7 (V)      | m7 (vi)    | m7♭5 (vii) | maj7 (I)        | m7 (ii)    |
| 4      | maj7 (IV)      | 7 (V)      | m7 (vi)    | m7♭5 (vii) | maj7 (I)   | m7 (ii)         | m7 (iii)   |
| 5      | 7 (V)          | m7 (vi)    | m7♭5 (vii) | maj7 (I)   | m7 (ii)    | m7 (iii)        | maj7 (IV)  |
| 6      | m7 (vi)        | m7♭5 (vii) | maj7 (I)   | m7 (ii)    | m7 (iii)   | maj7 (IV)       | 7 (V)      |
| 7      | m7♭5 (vii)     | maj7 (I)   | m7 (ii)    | m7 (iii)   | maj7 (IV)  | 7 (V)           | m7 (vi)    |

On C, the seven modes give:

| Mode       | Degrees 1 to 7                              |
| ---------- | ------------------------------------------- |
| Ionian     | Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bm7♭5      |
| Dorian     | Cm7, Dm7, E♭maj7, F7, Gm7, Am7♭5, B♭maj7    |
| Phrygian   | Cm7, D♭maj7, E♭7, Fm7, Gm7♭5, A♭maj7, B♭m7  |
| Lydian     | Cmaj7, D7, Em7, F♯m7♭5, Gmaj7, Am7, Bm7     |
| Mixolydian | C7, Dm7, Em7♭5, Fmaj7, Gm7, Am7, B♭maj7     |
| Aeolian    | Cm7, Dm7♭5, E♭maj7, Fm7, Gm7, A♭maj7, B♭7   |
| Locrian    | Cm7♭5, D♭maj7, E♭m7, Fm7, G♭maj7, A♭7, B♭m7 |

The C major row matches the textbook list of diatonic seventh chords: major sevenths on I and IV,
minor sevenths on ii, iii and vi, the dominant seventh on V and the half-diminished on vii (S429,
S416, S423).

### Table B: the seven diatonic seventh chords and what fits on top

The three collection notes that are not in the seventh chord are its diatonic extensions: the
ninth, eleventh and thirteenth. An **avoid note** is marked "avoid" (rule below). "Chord scale" is
the mode a jazz musician would play over that chord (S419, S428): the collection itself, started on
the chord's root.

| Row | Chord (on C major) | Chord tones | 9th           | 11th          | 13th                         | Sixth chord on the same root | Diatonic sus           | Chord scale |
| --- | ------------------ | ----------- | ------------- | ------------- | ---------------------------- | ---------------------------- | ---------------------- | ----------- |
| I   | Cmaj7              | C E G B     | 9 (D)         | 11 (F), avoid | 13 (A)                       | C6                           | sus2, sus4             | Ionian      |
| ii  | Dm7                | D F A C     | 9 (E)         | 11 (G)        | 13 (B), disputed (see below) | Dm6                          | sus2, sus4             | Dorian      |
| iii | Em7                | E G B D     | ♭9 (F), avoid | 11 (A)        | ♭13 (C), avoid               | none                         | sus4                   | Phrygian    |
| IV  | Fmaj7              | F A C E     | 9 (G)         | ♯11 (B)       | 13 (D)                       | F6                           | sus2                   | Lydian      |
| V   | G7                 | G B D F     | 9 (A)         | 11 (C), avoid | 13 (E)                       | G6                           | sus2, sus4 (and 7sus4) | Mixolydian  |
| vi  | Am7                | A C E G     | 9 (B)         | 11 (D)        | ♭13 (F), avoid               | none                         | sus2, sus4             | Aeolian     |
| vii | Bm7♭5              | B D F A     | ♭9 (C), avoid | 11 (E)        | ♭13 (G)                      | none                         | none                   | Locrian     |

### What the tables show

- **Only four qualities ever occur.** Every mode has two major sevenths, three minor sevenths, one
  dominant seventh and one half-diminished (table A). The diminished seventh, minor-major seventh
  and augmented major seventh need harmonic or melodic minor (S432–S434), which the app does not
  offer, so under a diatonic frame they never appear.
- **The dominant seventh sits on a different degree in each mode.** Major (Ionian) has it on
  degree 5 (G7 in C), the classical dominant (S430). Mixolydian has it on its home chord (C7 in
  C Mixolydian). Natural Minor (Aeolian) has it on degree 7 (B♭7 in C minor), so Minor's
  degree-5 chord is a minor seventh (Gm7), with no leading tone, as the triad v is today
  ([dominant](lexicon.md#dominant)).
- **A sixth chord brings no new notes.** On any degree, the diatonic sixth chord holds the same
  notes as the seventh chord two degrees lower (C6 = Am7; Dm6 = Bm7♭5) (S435; arithmetic). Under a
  diatonic frame a "sixth chord" flag would change the chord's root and symbol, not the notes
  heard (inference).
- **Suspended chords break the stacking in thirds.** A diatonic sus4 needs a perfect fourth and
  a perfect fifth above the root, a sus2 a whole step and a perfect fifth (S436, S417). Five of
  the seven rows allow each; the half-diminished row allows neither, because its fifth is
  diminished (arithmetic). Csus2 and Gsus4 hold the same three notes (arithmetic).
- **The extensions fill the collection.** A seventh chord leaves three collection notes outside
  it; a thirteenth chord leaves none (S437; arithmetic). This matters for the pitch search, which
  treats the notes outside the chord as the decorating notes
  ([Internal findings](#internal-findings)).
- **Major and Minor in the tonal plans** (inference from table A and the
  [tonal templates](harmony-planner-policy.md#tonal-motion-candidates)): Major's chords become
  Imaj7, iim7 or IVmaj7, iiim7 or vim7, and V7 at the open ending. Minor's become im7, iim7♭5 or
  ivm7, IIImaj7 or VImaj7, and v m7. Degree 7, the only half-diminished chord of Major, is
  excluded from the tonal templates today.

### Avoid notes and available extensions

Jazz teaching sorts the notes of a chord's scale into chord tones, **available extensions** (also
called available tensions) and **[avoid notes](lexicon.md#avoid-note)**. The common rule: a
non-chord note a half step above a chord tone is an avoid note, because over the chord it forms a
minor ninth (a half step plus an octave), the harshest clash; a note a whole step above a chord
tone is available (S442, S445). The standard example is F over a C major chord: a half step above
the third, E (S439, S445). Writers who apply the rule add three remarks:

- **Dominant chords are looser.** On a dominant seventh, only notes a half step above the third
  or the seventh are avoided, and a ♭9 against the root is accepted (S442); "dominant chords can
  have anything added" (S445). In the diatonic set this changes nothing: the dominant's only
  avoid note stays the eleventh (C over G7), and the 11th is left out of a C13 for that reason
  (S425).
- **The eleventh over a major chord is raised.** Writers make it ♯11 instead (S445, S437), which
  is exactly what the Lydian row (IV) has.
- **The Dorian thirteenth is disputed.** By the half-step rule it is available (S442), but other
  writers call Dorian's sixth an avoid tone because it can make the chord sound like a dominant
  (S439), or avoid the 13th on a minor seventh outside modal music (S445). That sixth is Dorian's
  [characteristic note](lexicon.md#characteristic-note), so modal music features it on purpose
  (S104, S105).

An avoid note is a rule about **sustaining** the note against the chord, not about touching it:
used in passing, an avoid note is acceptable in a melody (S445, S439). The term is a
jazz-pedagogy convention (S440, S442), not a law of all music; outside modal jazz some players
find it of limited use (inference from the disagreement above).

## Style plausibility

How common each chord type is in the styles the presets aim at. ●● = the norm, ● = common,
○ = occasional, – = rare or not found, ? = no source found. A cell marked "outside" needs notes
from outside the selected collection, so a diatonic v3.3 (O166) could not play it.

| Chord type                                                   | Jazz             | Bebop      | Blues                         | Bossa                    | Modal (Dorian)       | Pop song | Folk (reel)            |
| ------------------------------------------------------------ | ---------------- | ---------- | ----------------------------- | ------------------------ | -------------------- | -------- | ---------------------- |
| Triads                                                       | ○                | –          | ○ (tonic, disputed)           | ?                        | ?                    | ●●       | ●                      |
| Major seventh                                                | ●● (I, IV)       | ●●         | –                             | ●●                       | ?                    | ○        | ?                      |
| Minor seventh                                                | ●● (ii, iii, vi) | ●●         | ● (minor blues)               | ●●                       | ●● (home chord)      | ○        | ?                      |
| Dominant seventh                                             | ●● (V)           | ●●         | ●● (I, IV, V; partly outside) | ●● (often outside)       | ● (IV in i–IV)       | ○        | ○ (colour)             |
| Half-diminished                                              | ● (ii of minor)  | ?          | –                             | ?                        | ?                    | –        | –                      |
| Sixth chords                                                 | ● (tonic)        | ?          | ?                             | ● (6/9)                  | ?                    | ?        | ?                      |
| Suspended chords                                             | ○ (V9sus4)       | ?          | ?                             | ?                        | ● (modal jazz)       | ●        | ○                      |
| Ninths, elevenths, thirteenths                               | ●                | ●          | ?                             | ●                        | ● (quartal voicings) | ○ (add9) | ○ (added 9 for colour) |
| Altered dominants                                            | ● outside        | ●● outside | ?                             | ● outside                | –                    | –        | –                      |
| Diminished seventh, minor-major and augmented major sevenths | ○ outside        | ○ outside  | –                             | ● outside (passing dim7) | –                    | –        | –                      |

Evidence, style by style:

- **Jazz.** Seventh chords are the basic harmonic unit, used more often than triads, and 9ths, 11ths
  and 13ths are added to them (S441, citing Rawlins and Bahha); ninth chords are common on every
  seventh type but the diminished seventh (S425). The ii–V–I, "m7–dom–maj7" in major (S441), is
  the central progression; its tonic maj7 is often replaced by a 6 chord, as in "Misty" (S421),
  and a jazz chord is "usually either made into a 7th or a 6th chord" (S445). The half-diminished
  is the ii of a minor ii–V–i (S431). Altered dominants pair with altered scales (S428).
  Sevenths therefore fall on **every degree** of a progression in jazz.
- **Bebop.** Quick chord changes with extended and altered chords (S103); bebop scales are built so
  that all four notes of a dominant seventh fall on the beats (S9). The atlas's bebop entry asks
  for "seventh chords throughout" (v4 branch, `docs/music/styles/jazz-blues-soul.md`).
- **Blues.** In the standard twelve-bar blues "all chords are dominant seventh chords and do not
  fit into a single key"; a minor blues uses im7 and ivm7 with a dominant V (S420). Dominant
  sevenths are "generally used throughout" (S101). But one source says the I chord is most often a
  major triad, with I7 in some songs (S430): the sources disagree on the tonic. In a diatonic frame,
  only one of I7, IV7 and V7 is ever available (C Mixolydian has C7 but not F7 or G7).
- **Bossa.** "Unconventional chords ... complex progressions and 'ambiguous' harmonies" (S112); the
  basic guitar pattern adds the sixth and ninth to the major chord (S112). In 40 Jobim songs,
  descending chromatic bass lines appear in 45 % and dominant substitution (a dominant chord not
  built on degree 5) in 55 %; the progressions are written in sevenths and beyond, such as
  Imaj7–♯Idim7–IIm7 (S447). Much of bossa harmony is therefore **outside** a diatonic frame.
- **Modal (Dorian).** "Oye Como Va" is an A Dorian vamp on Am7 and D7 (S105): the minor seventh
  on degree 1 and the dominant seventh on degree 4, both diatonic (table A). Modal jazz holds one
  Dorian chord for many bars and voices it in fourths, the "So What" chord (S104, S452), which is
  not a stack of thirds. Suspended chords were frequent in modal jazz (S436).
- **Pop song.** In the McGill Billboard corpus (Hot 100 singles, 1958–1991), plain major and minor
  triads are about 65 % of chords (S450, a secondary report of that corpus). Sus chords are common
  in popular and folk music (S436), and "add9" or "2" is the usual pop symbol for an added ninth
  (S438). No source found gives the share of seventh chords by degree in pop; the ○ marks for
  sevenths and extensions in the Pop column are inferred from the 65 % triad share.
- **Folk (reel).** No academic source was found. One practitioner thread on backing Irish tunes
  describes chords that leave out the third over a drone, with sevenths or ninths added "for
  colour" (S451, weak). Irish tunes are mostly Ionian, Mixolydian and Dorian (S107). The atlas's
  reel entry lists chords I, IV, V, ♭VII as triads (inference there).

## Chord symbols and MusicXML

Chord-symbol practice varies; textbooks advise picking one system and keeping it (S417). A bare
letter means a major triad, a bare 7 means a minor seventh on a major triad, and extensions are
major or perfect unless marked (S417). Symbols name notes, not functions: they do not refer to a
key (S417).

MusicXML writes a chord symbol as a `<harmony>` element with `<root>`, `<kind>` and optional
`<bass>` and `<degree>` elements (S415). The `<kind>` value is one of 33 names (S412, S415); its
`text` attribute is the symbol as printed, and `use-symbols="yes"` asks for Δ, −, +, ° and ø
(S413). `<degree>` adds, alters or removes one note (S414): "add" degrees count from a dominant
chord, "alter" and "subtract" from the kind's own chord (S415).

| Chord type              | Symbol variants (on C)          | MusicXML `<kind>`                                   | Diatonic in the app's modes                                        |
| ----------------------- | ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| Major triad             | C (CM, CΔ rare)                 | `major`                                             | yes (today)                                                        |
| Minor triad             | Cm, C−, Cmin                    | `minor`                                             | yes (today)                                                        |
| Diminished triad        | Cdim, C°                        | `diminished`                                        | yes (today)                                                        |
| Augmented triad         | C+, Caug                        | `augmented`                                         | no                                                                 |
| Major seventh           | Cmaj7, CM7, CMa7, CΔ7           | `major-seventh`                                     | yes                                                                |
| Minor seventh           | Cm7, C−7, Cmin7, Cmi7           | `minor-seventh`                                     | yes                                                                |
| Dominant seventh        | C7                              | `dominant`                                          | yes                                                                |
| Half-diminished seventh | Cm7♭5, C−7♭5, Cø7, Cø           | `half-diminished`                                   | yes                                                                |
| Diminished seventh      | Cdim7, C°7                      | `diminished-seventh`                                | no                                                                 |
| Minor-major seventh     | Cm(maj7), CmM7, C−Δ7            | `major-minor`                                       | no                                                                 |
| Augmented major seventh | C+maj7, C+M7, CΔ7♯5             | none; `augmented` plus an added 7th (inference)     | no                                                                 |
| Augmented seventh       | C+7, Caug7, C7♯5                | `augmented-seventh`                                 | no                                                                 |
| Major sixth             | C6                              | `major-sixth`                                       | yes                                                                |
| Minor sixth             | Cm6                             | `minor-sixth`                                       | yes (row ii only)                                                  |
| Six-nine                | C6/9                            | `major-sixth` plus an added 9th (inference)         | yes                                                                |
| Suspended fourth        | Csus4, Csus                     | `suspended-fourth`                                  | yes, on five rows                                                  |
| Suspended second        | Csus2                           | `suspended-second`                                  | yes, on five rows                                                  |
| Dominant seventh sus4   | C7sus4, C7sus                   | `suspended-fourth` plus an added 7th (inference)    | yes (row V)                                                        |
| Added ninth             | Cadd9, C2, C(9)                 | `major` plus an added 9th (S415's A(9) example)     | yes                                                                |
| Ninths                  | C9, Cmaj9 (CΔ9), Cm9 (C−9)      | `dominant-ninth`, `major-ninth`, `minor-ninth`      | yes, where the 9th is available                                    |
| Elevenths               | C11, Cm11                       | `dominant-11th`, `minor-11th` (`major-11th` exists) | on minor rows only; 11 is an avoid note on major and dominant rows |
| Thirteenths             | C13, Cmaj13, Cm13               | `dominant-13th`, `major-13th`, `minor-13th`         | yes, where the 13th is available                                   |
| Altered dominants       | C7♭9, C7♯9, C7♯11, C7♭13, C7alt | `dominant` plus altered or added degrees            | no                                                                 |

Sources for the symbol variants: S417, S426, S429, S431, S432, S438; for the kinds: S412, S415.
The symbol column follows S438's summary table. Three details matter for the app:

- **"Δ" alone is ambiguous**: some use it for a major triad, others for a major seventh (S438).
- **"dim" alone usually means the triad**, but some jazz charts use it for the diminished seventh
  (S432). The app writes "dim" for the triad today (`src/domain/notation/notation-input.ts`).
- **MusicXML's `major-minor` is the minor triad with a major seventh** (S412), the reverse of what
  its name suggests to a beginner; and MusicXML has no single kind for the augmented major seventh
  (S412).

## Melodies over richer chords

### The seventh in classical practice

In common-practice harmony a chord's seventh is a dissonance: "resolve the 7th of a 7th chord down
by step" is the one general voice-leading rule for every seventh chord, with a rare exception that
moves up (S424). The dominant seventh's seventh moves down by step and its third (the leading
tone) up to the tonic (S430). Historically the seventh first destabilised the triad and only later
"was allowed to become a part of the chord itself" (S429). In the 19th century the seventh chord
was about the upper limit of chordal consonance; ninth and eleventh chords were used with some
notes treated as appoggiaturas (S437).

### The seventh in jazz

In jazz the seventh is part of the basic chord: seventh chords are the basic harmonic unit (S441).
The third and seventh are the **guide tones** (an entry on branch
`v4-accompaniment-research`, glossed here: the two notes that tell most about a chord), the notes
"hardly ever omitted" from a voicing (S418) and "the most harmonically important notes of the
chord" (S443, S427). Targeting them in a solo "sounds strong" (S443). Improvisers are told to put
chord tones on the downbeat (S419) and to make long notes chord tones (S444); bebop scales place
the root, third, fifth and seventh of a dominant seventh on the beats (S9). For melodic purposes,
then, the seventh is a chord tone in jazz (S443, S9, S427; three sources agree).

The seventh still often moves down by step in jazz, but as smooth voice leading rather than an
obligation: in ii–V–I and other circle-of-fifths progressions the guide tones move by step from
chord to chord (S427, S443). Over Dm7 to G7, the seventh of Dm7 (C) moves a half step down to the
third of G7 (B) (arithmetic).

**Extensions in a melody.** The available extensions (9, 13, and 11 on minor chords) can be
targeted and held (S442, S445, S446). Avoid notes are not held against the chord but may pass by
(S445, S439).

### Pop and rock melodies

Rock and pop melodies can be partly independent of the chords: non-chord tones may fail to resolve
by step, mostly in pentatonic melodies and in verses rather than choruses; Temperley calls this the
"melodic-harmonic divorce" (S449, read through S448). In pop, then, neither a seventh nor a
decorating note is bound to resolve (inference from S449 and S436).

### Arpeggios over a seventh chord

- **Jazz.** The four-note arpeggio 1–3–5–7 is the "typical pattern" in jazz practice; teachers
  also recommend starting on the third, 3–5–7–9, to bring out the chord's quality and its ninth
  (S446). "Play the full arpeggio occasionally to spell out the chord" (S444). Both patterns are
  four notes long. A three-note subset that includes the seventh, such as 3–5–7 (E–G–B over
  Cmaj7), is the first three notes of S446's 3–5–7–9 pattern (inference).
- **Classical and pop.** No source gathered here sets a length for an arpeggio over a seventh
  chord. The [arpeggio](lexicon.md#arpeggio) is a chord's notes one after another, in any length.

## Internal findings

### What the project holds today

- **Chord vocabulary.** "Root-position diatonic triads only. Inversions, sevenths, suspensions,
  slash chords, and non-triad sonorities are outside this policy even when they could be diatonic"
  ([harmony planner policy](harmony-planner-policy.md#collection-and-chord-vocabulary)). None of
  D11–D13 says "triads only" in its own words; the policy implements them.
- **Lexicon.** [Triad](lexicon.md#triad), [seventh chord](lexicon.md#seventh-chord) ("does not use
  seventh chords yet"), [chord tone](lexicon.md#chord-tone), [chord symbol](lexicon.md#chord-symbol)
  ("only triad symbols appear"), [arpeggio](lexicon.md#arpeggio) and [run](lexicon.md#run) (a run is
  three chord tones). The lexicon's own arpeggio example, C–E–G–C, is four notes long.
- **Presets.** The [preset catalogue](preset-catalogue.md#what-no-setting-can-express-today) lists
  seventh and richer chords as missing for Blues, Bebop, Modal jazz and Bossa (S101, S103, S112).
- **Embellishments.** Every figure decorates and lands on a chord tone; the arpeggiated figure (18)
  is "chord tones only" and limited to three-note runs
  ([embellishment catalogue](embellishment-catalogue.md#18-arpeggiated-figure)); the bebop-scale
  passing tone (20) "targets seventh chords" (S9).
- **Sources S14 and S15** are the glossaries behind the lexicon's existing triad and seventh-chord
  entries; they were not re-read here (S14's host refused the connection), and S416 and S422
  confirm those entries' facts. S101, S103 and S112 are discussed under
  [Style plausibility](#style-plausibility).
- **Branch `v4-accompaniment-research`.** The breadth review counts seventh chords as one
  "capability, not a style", built once and off by default; the atlas's `seventh-chords`
  capability ("four-note chords, dominant sevenths above all") is used by 21 of its 63 styles, and
  its `extended-altered-chords` depends on it. Its lexicon's `voicing` and `chord-inversion`
  entries are reused verbatim in this branch's lexicon.

### Where a fourth chord note meets the code

| Place                                                                                       | What it assumes today                                                                                            | What a fourth note meets                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/domain/harmony/harmony-types.ts`                                                       | `DiatonicTriad.pitchClasses` is a 3-tuple; `TriadQuality` is major, minor or diminished                          | a new chord type and quality set                                                                                                                                               |
| `src/domain/harmony/collection.ts`                                                          | `deriveTriads` stacks d, d+2, d+4; `deriveTriadQuality` throws on any other shape                                | add d+6; the four qualities of table A                                                                                                                                         |
| `src/domain/harmony/harmony-planner.ts` (modal colour chords)                               | a colour chord is a non-tonic triad that contains the mode's colour degree                                       | measured on seventh chords the set grows: Ionian and Lydian add degree 5, Dorian and Aeolian degree 7, Phrygian degree 3, Locrian degree 6; Mixolydian is unchanged (computed) |
| `src/domain/harmony/harmony-join.ts`                                                        | `sameTriad` compares three pitch classes                                                                         | a carried chord with four notes                                                                                                                                                |
| `src/domain/pitch/pitch-context.ts`                                                         | `chordPitchClasses` is the triad; a modal phrase may end on any non-tonic chord tone of the home chord           | with a seventh, the home chord's seventh becomes a legal final note; under Major's V7, the seventh (F over G7) counts as "a dominant chord tone"                               |
| `src/domain/pitch/pitch-candidates.ts`                                                      | chord tones first, then the collection notes outside the chord as decorating notes                               | four outside notes per chord become three (a seventh), none (a thirteenth)                                                                                                     |
| `src/domain/pitch/pitch-ranking.ts`                                                         | chord tones rank first; Arpeggio chaos orders chord tones by distance                                            | one more chord tone per chord to order                                                                                                                                         |
| `src/domain/pitch/pitch-motion.ts`                                                          | `WIDE` is 3 semitones; a third same-direction wide interval is `wide_chain_too_long`; a run is three chord tones | adjacent seventh-chord tones are always 3–4 semitones apart, so any four-note one-way arpeggio is rejected; so is today's triad arpeggio C–E–G–C (G to C is 5)                 |
| `src/domain/pitch/pitch-figures.ts`, `validation/figure-rules.ts`                           | a note one collection step from a chord tone is never itself a chord tone (comment at `figure-rules.ts:103`)     | false with a seventh: the seventh and the root are one collection step apart (B–C, C–D)                                                                                        |
| `src/domain/pitch/validation/phrase-facts.ts`, `contour-endpoint-rules.ts`, `join-rules.ts` | chord tone = triad tone; tonal ending = chord tone of the degree-5 triad                                         | same as the search                                                                                                                                                             |
| `src/domain/generation/carry-in/carry-in.ts`                                                | a carried chord has exactly `degree`, `pitchClasses`, `quality`; quality in a 3-item list                        | a four-note chord is refused as malformed; the replay key carries the carry-in                                                                                                 |
| `src/domain/generation/carry-in/phrase-ending-debt.ts`                                      | the next phrase lands on a tonic-triad tone (degrees 1, 3, 5)                                                    | does the landing include the tonic chord's seventh?                                                                                                                            |
| `src/domain/backing/backing-renderer.ts`                                                    | three qualities; close-position triad, top at or below E4, three inversions tried; bass root then fifth          | a four-note voicing (four inversions), and a choice of which notes to play                                                                                                     |
| `src/domain/notation/notation-input.ts`, `written-phrase.ts`                                | suffix per triad quality: "", "m", "dim"                                                                         | new suffixes                                                                                                                                                                   |
| `src/notation/vexflow-mapping.ts`                                                           | the suffix is added as plain text                                                                                | VexFlow 5.0.0's `ChordSymbol` has glyphs for °, ø, Δ, −, +, ♭ and ♯ (`node_modules/vexflow/build/esm/src/chordsymbol.js`), unused today                                        |
| `src/domain/notation/score-description.ts`                                                  | speaks "minor" and "diminished"; any other suffix is read verbatim                                               | "m7♭5" would be read as written                                                                                                                                                |
| `src/export/musicxml/musicxml-measure.ts`                                                   | `CHORD_KIND_BY_SUFFIX` has three entries; any other suffix throws `MusicXmlExportError`                          | every export with a richer chord would fail until the table grows                                                                                                              |
| Replay key (`src/generation-worker/phrase-replay-key*.ts`)                                  | `ifk1.` today; v3.0 plans `ifk2.`, v3.1 `ifk3.`, v3.2 `ifk4.`                                                    | a richer-chord phrase needs the version after `ifk4.`                                                                                                                          |

### Where a fourth chord note meets the atoms

| Atom                                                                                                        | Status        | What it says today                                                                                    |
| ----------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `module_harmony_candidate_domain`                                                                           | REVIEW        | "exact diatonic collection and triad material"                                                        |
| `rule_neutral_profile_diatonic_harmony`                                                                     | REVIEW        | "mostly diatonic chord movement"; no triad wording                                                    |
| `rule_jazz_chromatic_resolution`                                                                            | REVIEW        | "harmony remains diatonic"                                                                            |
| `rule_leapiness_arpeggio_run_limits`                                                                        | REVIEW        | a run is "exactly three consecutive sounding chord tones"; a third wide interval is "always invalid"  |
| `rule_leap_recovery`                                                                                        | STABLE        | defers a debt inside "a recognized three-note chord-tone run"                                         |
| `rule_figures_resolve_onto_chord_tones`                                                                     | DRAFT         | every free figure ends on a chord tone                                                                |
| `rule_embellishment_figures_defined`                                                                        | DRAFT         | "A chord tone is a note of the chord sounding at that moment"                                         |
| `rule_figure_level_orders_search`, `rule_figure_level_never_a_quota`, `rule_neutral_and_jazz_figure_levels` | DRAFT         | chord tones are tried first                                                                           |
| `rule_tension_arc_settled`, `rule_tension_arc_build`                                                        | REVIEW        | non-chord-tone activity resolves onto chord tones                                                     |
| `rule_arpeggio_chaos_respects_constraints`                                                                  | REVIEW        | orders chord tones                                                                                    |
| `rule_open_phrase_ending`                                                                                   | STABLE        | "the final event is a dominant chord tone"; a tense note is "a scale tone outside the final chord"    |
| `rule_join_tense_note_resolution`, `entity_phrase_carry_in`                                                 | REVIEW        | the landing is a tonic-triad tone                                                                     |
| `rule_harmony_change_drops_unfit_harmonic_carry_in`                                                         | STABLE        | drops a carried chord the new settings never end on                                                   |
| `module_pitch_search_context`, `module_pitch_search_transition`                                             | REVIEW        | chord-tone facts and endpoints                                                                        |
| `req_session_backing_track`                                                                                 | STABLE        | "the highest close-position triad whose top note is at or below E4"                                   |
| `rule_generated_notes_musicxml_export`                                                                      | REVIEW        | "Chord symbols are always included"                                                                   |
| `module_notation_display_convention`                                                                        | REVIEW        | already "preserves chord quality, alterations, extensions, additions, and omissions" when transposing |
| `module_notation_layout_preflight`                                                                          | REVIEW        | the system height holds chord symbols over the highest notes; longer symbols are wider                |
| `module_phrase_replay_key`                                                                                  | REVIEW        | the key version                                                                                       |
| `rule_kept_session_content`, `req_last_session_review`                                                      | DRAFT, STABLE | kept sessions store, and the review shows, chord symbols exactly as displayed                         |
| `rule_jam_melody_follows_doodle_moves`                                                                      | DRAFT         | orders candidates within ranks, "chord tones first"                                                   |
| `vision_infinite_flow_first_release`                                                                        | STABLE        | the scope runs through v3.2                                                                           |

### Surprises

- **The three-note cap is about chain length, not chord size.** Today's triad arpeggio C–E–G–C
  (the example in the [lexicon](lexicon.md#arpeggio) and in
  [embellishment entry 18](embellishment-catalogue.md#18-arpeggiated-figure)) cannot be written in
  one direction either: its three intervals (4, 3, 5 semitones) are all "wide". A seventh chord
  changes which three notes may form a run, not how long it is.
- **A seventh puts two chord tones one step apart.** The figure validator's comment that a note one
  step from a chord tone "can never itself be" a chord tone holds only for triads.
- **The colour-chord sets change if they are measured on seventh chords** (table above), so a
  modal plan's candidates would change when sevenths are allowed unless colour chords stay
  measured on the triad (inference).
- **The replay key after v3.2 is `ifk4.`** (`specs/versions/v3/rhythm-lock.md`, D251), so a
  richer-chord key is the one after `ifk4.`, not after `ifk3.` as O171's text says.
- **`module_notation_display_convention` already speaks of extensions**, so the written-pitch
  convention needs no new rule for richer chords.

## Facts for each open question

### O165 — the flag set and its defaults

- In the app's seven modes, a diatonic seventh chord is always one of four qualities: maj7, m7, 7
  or m7♭5 (table A; S416, S429). The diminished seventh, minor-major seventh and augmented major
  seventh need harmonic or melodic minor (S432–S434): per-quality flags for them would never fire
  under a diatonic frame.
- How often sevenths appear differs by style: the norm in jazz (S441), throughout the blues (S420),
  a minority in pop, where plain triads are about 65 % of chords (S450). A level, like the
  embellishment figure levels, can say "occasionally" as well as "mostly"; a plain switch cannot
  (inference).
- The dominant seventh alone has the strongest single-quality case: it is the classical V7 (S430)
  and the blues chord (S420).
- A diatonic sixth chord holds the notes of the seventh chord two degrees lower (S435; table B), so
  a sixth-chord flag would add symbols and roots, not new sounds. Jazz uses the 6 chord as a tonic
  (S421, S445).
- Suspended chords replace the third, so they are not a stack of thirds; five of the seven rows
  allow each (table B; S436, S417).
- An extended chord implies the lower extensions (S417); the 11th is an avoid note on the major and
  dominant rows (S425, S442, S445); on the minor rows the ♭9 and ♭13 are avoided (table B).
- **Recommendation:** one "Seventh chords" family flag in v3.3, shaped as a level (Off up to
  Strongly favored, a preference and never a quota) rather than a switch, Off by default; triads
  always allowed. Sixth, suspended and extended chords stay later families, each with its own flag.
  A "dominant sevenths only" refinement is the one per-quality option with clear backing, if the
  spec wants one.

### O166 — diatonic only?

- Stacking d, d+2, d+4, d+6 inside the collection gives the chords of table A and nothing else.
- What a diatonic frame leaves out, by style: the blues' I7–IV7–V7, which "do not fit into a single
  key" (S420); bossa's dominant substitutions (55 % of Jobim songs) and chromatic bass lines (45 %)
  (S447); bebop's altered dominants (S103, S428).
- What it serves: the jazz ii–V–I in Major (iim7–V7–Imaj7, S441), the Dorian vamp i7–IV7 (Am7–D7,
  S105), and occasional sevenths in pop and folk (S450, S451).
- Minor's degree-5 chord stays a minor seventh (v m7), with no leading tone (table A).
- **Recommendation:** diatonic only for v3.3, as proposed. Record Blues, Bossa and Bebop as partly
  served, and keep altered and borrowed chords for a later capability (the atlas's
  `extended-altered-chords`, `modal-mixture` and `split-melody-chord-collections` on the v4 branch).

### O167 — the three-note arpeggio run cap

- The four-note arpeggio 1–3–5–7, and the four-note 3–5–7–9, are the patterns jazz teaching uses
  (S446, S444).
- In close position, neighbouring tones of a seventh chord are 3 or 4 semitones apart, so any
  four-note one-way arpeggio is a three-interval wide chain and is rejected (`pitch-motion.ts`).
  The triad arpeggio C–E–G–C is rejected today for the same reason.
- Under the cap, a seventh chord can still sound its seventh inside a run of three: E–G–B over
  Cmaj7, G–B–D or B–D–F over G7 (arithmetic). The run check needs only that the three notes are
  chord tones of one chord (`recognizable` in `pitch-motion.ts`).
- **Recommendation:** keep the cap at three for v3.3 and let the seventh count in a run, which is
  enough to hear it (inference). If listening shows the full arpeggio is wanted, raising the cap
  to four only under a four-note chord is the contract change to put to the owner; the same
  question would then reach today's triad-plus-octave arpeggio.

### O168 — figures and what a chord tone is

- **Classical:** the seventh resolves down by step (S424, S430); ninths and elevenths were treated
  as appoggiaturas (S437).
- **Jazz:** the seventh is a chord tone for melodic purposes: guide tone, targeted, on the beat
  (S443, S427, S9); available extensions may be held, avoid notes only pass (S442, S445).
- **Pop:** melodies need not resolve their non-chord tones (S449).
- **Code:** the decorating notes shrink from four to three per chord; a passing tone can no longer
  sit between the seventh and the root (they are one step apart); a modal phrase could end on the
  home chord's seventh, and a Major phrase on V7's seventh, under today's endpoint rules
  ([Internal findings](#where-a-fourth-chord-note-meets-the-code)).
- **Recommendation:** when a seventh chord is chosen, its seventh counts as a chord tone everywhere
  (search order, figure targets, runs, Arpeggio chaos), since sevenths are opt-in and the styles that
  want them (jazz, bossa, modal) treat them as stable. Extensions stay non-chord tones in v3.3. The
  endpoint and join rules keep their wording only after a listening check of a phrase ending on
  the seventh; if it sounds unfinished in a bad way, exclude the seventh from the final note and
  from the join's landing.

### O169 — how the planner picks a richer chord

- In jazz nearly every chord is a seventh chord (S441); in the blues every chord is a dominant
  seventh (S420); in pop most chords are triads (S450).
- Classical practice puts the dominant seventh on V, major sevenths "usually" on I or IV, and minor
  sevenths on ii, iii or vi (S429).
- Measured on seventh chords, the modal colour-chord sets grow (table in
  [Internal findings](#where-a-fourth-chord-note-meets-the-code)).
- Adding a seventh per event as a free choice multiplies the harmony candidates by up to two per
  event (inference); generation must still keep up at the fastest tempo.
- **Recommendation:** a seeded preference per event, driven by the flag's level, never a quota
  (D210); keep the colour-chord choice measured on the triad so modal plans keep their candidates;
  consider a role order (the degree-5 open arrival first) as the spec's own option; measure the
  generation time as v3.1 did.

### O170 — what the player sees and hears

- **Symbols:** the four diatonic qualities are written Cmaj7 (or CΔ7), Cm7 (or C−7), C7 and
  Cm7♭5 (or Cø7) (S417, S438, S429, S431). One system, kept consistently, is the textbook advice
  (S417). The app writes letters today (m, dim), not signs (−, °).
- **MusicXML:** all four have a kind: `major-seventh`, `minor-seventh`, `dominant`,
  `half-diminished` (S412); the `text` attribute carries the printed symbol (S413). Today any
  unknown suffix makes the export throw.
- **Spoken description:** needs words for each new suffix.
- **Backing:** jazz voicings keep the third and seventh and may drop the fifth; the root comes
  from the bass (S418, S427). A four-note close-position chord with its top at or below E4 reaches
  lower than a triad (inference).
- **Recommendation:** spell maj7, m7, 7 and m7♭5, all in letters, matching today's "m" and "dim";
  map them to the four MusicXML kinds with the suffix as `text`; the backing plays all four notes
  in close position under the same E4 ceiling, which changes `req_session_backing_track` (STABLE),
  so the owner confirms the wording.

### O171 — presets, saved settings, Vary settings and the replay key

- The styles that want sevenths most are Jazz, Bebop, Bossa and the blues (S441, S103, S112, S420);
  Pop and folk use them occasionally (S450, S451).
- The carry-in refuses any chord that is not a three-note triad (`carry-in.ts`), and the replay key
  carries the carry-in. v3.2's key is `ifk4.`, so v3.3 needs the next version.
- **Recommendation:** no built-in changes by default, so v3.1's promise holds; a built-in that
  allows sevenths (a Jazz or Bossa variant) is a new preset or the owner's explicit change; the
  flag is stored by value in saved settings and player presets; Vary settings does not move it
  unless the player puts it in an allowed group (inference: the flag chooses a sound, not a
  practice variation).

### O172 — Jam and the key and mode suggestion

- The planned suggestion scores the doodle's own notes against the 84 key and mode pairs
  ([key and mode estimation](key-and-mode-estimation.md)); no generated chord enters it.
- The doodle's preference orders candidates within ranks, chord tones first
  (`rule_jam_melody_follows_doodle_moves`), so whether the seventh is a chord tone (O168) changes
  which notes share the first rank.
- **Recommendation:** the suggestion stays unchanged; a Jam follows the same chord flags as any
  session.

### O173 — declared intent

- The atoms in [Where a fourth chord note meets the atoms](#where-a-fourth-chord-note-meets-the-atoms)
  are the candidates; five are STABLE: `rule_open_phrase_ending`, `rule_leap_recovery`,
  `req_session_backing_track`, `rule_harmony_change_drops_unfit_harmonic_carry_in` and
  `req_last_session_review` (the last two need no wording change if a four-note chord is simply
  "a chord" and its symbol "a chord symbol"), plus the vision.
- `module_notation_display_convention` already covers extensions; `rule_neutral_profile_diatonic_harmony`
  never says "triads".
- **Recommendation:** revise `module_harmony_candidate_domain`, `rule_leapiness_arpeggio_run_limits`
  (only if O167 changes the cap, otherwise a note that a run may include the seventh),
  `rule_figures_resolve_onto_chord_tones` and `rule_embellishment_figures_defined` (what a chord
  tone is), `entity_phrase_carry_in`, `rule_join_tense_note_resolution`, `module_phrase_replay_key`,
  `rule_generated_notes_musicxml_export` and `req_session_backing_track`; `rule_open_phrase_ending`
  and `rule_leap_recovery` only if O168 or O167 change their meaning.

### O175 — chord flags and a later style-pack layer

- The v4 branch names the capability `seventh-chords` and makes `extended-altered-chords` depend on
  it; its breadth review would let a pack switch capabilities on as data, with a pack id and
  version in the replay key.
- The evidence on how often sevenths occur differs by style (O165's facts), which a level can carry
  and a switch cannot.
- v3.1's figure levels are carried by value in `ifk3.` (`specs/archive/v3/embellishment-flags.md`).
- **Recommendation:** yes to the shape: one named capability per chord family, using the atlas's
  ids (`seventh-chords` first), stored by value in saved settings, presets and the replay key, never
  tied to a preset's name. Precedence between a player's flag and a pack waits for style packs.

## Disagreements with the v4 branch

- **D12 and "triads only".** The style atlas's conflict table cites D12 for "triads only, no altered
  harmony". D12 defers altered dominants and substitutions; the triads-only rule is the harmony
  planner policy's, implementing D11 and D13. The v3.3 spec on `main` says the same.
- **The blues tonic.** The atlas's Chicago blues entry says every chord is a dominant seventh, as
  S420 does; S430 says the I chord is most often a major triad. The sources disagree; the atlas
  states only one side.
- **Bossa's "seventh and ninth chords (S112)".** The current S112 page speaks of "unconventional
  chords" and shows a sixth and ninth added to a major chord; it names no seventh chords. S447
  supports sevenths and beyond in Jobim's songs.
- **Bebop's "arpeggios up to the 9th".** The atlas asks for this; under v3.3's proposed scope
  (sevenths only) a ninth is an extension, not a chord tone, so it stays out (inference).
- **Lexicon entries.** This branch reuses the v4 entries `chord-inversion` and `voicing` with the
  same heading, id, aliases, popup and definition. Only their `in_infinite_flow`, `related` and
  `sources` fields differ, because their v4 related entries (`basso-continuo`, `guide-tone`,
  `voice-leading`, `comping`) and sources (S131, S146, S276) do not exist on `main`. A merge should
  keep v4's fields and add this branch's v3.3 sentence. `guide-tone` is not added here: it lives in
  the v4 lexicon's "Texture and arranging" category, which `main` does not have.

## Proposed lexicon entries

Added to the [lexicon](lexicon.md#harmony) under Harmony: [altered chord](lexicon.md#altered-chord),
[avoid note](lexicon.md#avoid-note), [chord extension](lexicon.md#chord-extension),
[chord inversion](lexicon.md#chord-inversion), [chord scale](lexicon.md#chord-scale),
[diminished seventh chord](lexicon.md#diminished-seventh-chord),
[dominant seventh chord](lexicon.md#dominant-seventh-chord),
[extended chord](lexicon.md#extended-chord),
[half-diminished seventh chord](lexicon.md#half-diminished-seventh-chord),
[major seventh chord](lexicon.md#major-seventh-chord),
[minor seventh chord](lexicon.md#minor-seventh-chord), [sixth chord](lexicon.md#sixth-chord),
[suspended chord](lexicon.md#suspended-chord) and [voicing](lexicon.md#voicing).

## Sources

S412–S452, in full in [research sources](research-sources.md#chords-v33). Existing sources used:
S9, S14, S15, S101, S103, S104, S105, S107, S112. In brief:

- **MusicXML 4.0:** S412 kind values, S413 `<kind>`, S414 `<degree>`, S415 chord-symbols tutorial.
- **Open Music Theory 2e:** S416 seventh chords, S417 chord symbols, S418 jazz voicings, S419
  chord-scale theory, S420 blues harmony, S421 ii–V–I.
- **Music Theory for the 21st-Century Classroom:** S422 introduction to seventh chords, S423 Roman
  numerals of diatonic seventh chords, S424 voice-leading seventh chords, S425 jazz chord basics,
  S426 chord-symbol specifics, S427 jazz chord voicings, S428 chord-scale relationships.
- **Wikipedia (pointers):** S429 seventh chord, S430 dominant seventh, S431 half-diminished, S432
  diminished seventh, S433 minor-major seventh, S434 augmented major seventh, S435 sixth chord,
  S436 suspended chord, S437 extended chord, S438 chord names and symbols, S439 avoid note, S440
  chord-scale system, S441 jazz harmony, S452 "So What".
- **Jazz teaching:** S442 available tensions, S443 guide tones, S444 vertical improvisation (The
  Jazz Piano Site); S445 Rogers, jazz harmony; S446 Murphy, approaching arpeggios.
- **Articles and data:** S447 Cosgrove, chromatic devices in Jobim; S448 Reed, melodic-harmonic
  divorce idiom; S449 Temperley, the melodic-harmonic divorce in rock; S450 Suda et al., the
  Billboard chord-quality share.
- **Practitioner forum:** S451 backing Irish tunes (weak).
