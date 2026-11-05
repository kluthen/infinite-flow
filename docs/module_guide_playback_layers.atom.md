---
id: module_guide_playback_layers
status: REVIEW
type: MODULE
version: 0.2
priority: 1
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_guide_playback]]
  - [[req_session_audio_mix]]
  - [[req_session_backing_track]]
layer: ARCHITECTURE
human_name: The Guide Playback in Five Layers
dependents: []
---

# The Guide Playback in Five Layers

## INTENT
Build the guide playback so a later sound library replaces only the part that sounds a note, every other layer kept as it is.

## THE RULE / LOGIC
The guide playback is built in five layers, beside an unchanged backing.

1. The renderer, pure, beside the backing renderer: from a phrase's concert timeline and its harmony events it gives the melody guide's notes and the rhythm guide's notes, in whole-note rationals, with no audio. It reads ties and rests as acknowledgement's expected notes do: a fresh attack starts a note, a tie continuation lengthens it, across a barline too, and a rest starts none; the melody guide's notes are at concert pitch, the rhythm guide's take the same starts and lengths, each on the root of the harmony event holding its start, in MIDI 60 to 71. A start no harmony event holds, or a malformed tie, is a typed error, never repaired.
2. The placement on the audio clock: each guide note's start and end placed at the exact audio time of its rational position through the phrase's tempo map, so a note on a beat falls at that beat's click; the backing's own placement, which takes whole beats only, is unchanged.
3. The seam: the audio port's sound roles, bass, chord, melody guide and rhythm guide, where the backing had two voices; each role's sound is a data entry (waveform, peak, attack, release, and whether its release ends at the note's end or starts there), and each role plays in a mix channel. The bass's and chord's entries give exactly the backing's current envelopes.
4. The mix by channel: the backing, the click and each guide have an on/off gain and a volume gain, looked up by channel rather than named one by one, so a role added later joins without reshaping the mix; the transport's mix state and the settings records follow the channels.
5. The sounding: the session bus, the only part that knows Web Audio, turns one note into an oscillator and its envelope, routes each guide through its channel, fades the guide routes with the rest on Stop, and, knowing what it sounded, across a phrase boundary too, fades a guide's still-ringing note quickly when that guide re-attacks its pitch.

A phrase's guide notes reach the transport with its backing, from the same queueing call, which then takes the phrase's concert timeline beside its harmony and tempo, at each place a phrase is queued: phrase 1 of a session started with it, a fresh Jam's phrase 1 at the hand-over, and every later phrase in both modes. A guide switched off gets no more notes sent to the bus and its on/off gain goes to 0 at once; switched on, its notes are sent from the next look-ahead window. With both guides off no guide note reaches the bus.

## TECHNICAL INTERFACE
The renderer is src/domain/backing/guide-renderer.ts: renderGuide(timeline, harmony) gives a RenderedGuide of GuideNote values for each guide, the rhythm guide in RHYTHM_GUIDE_REGISTER (MIDI 60 to 71), and throws GuideRenderError on a start no harmony event holds or a malformed tie. The placement is src/audio/guide-track.ts, scheduleGuide and guideNotesBetween, beside src/audio/backing-track.ts, through the tempo map of src/audio/click-track.ts (beatAt). The seam: src/audio/sound-roles.ts holds the mix's channels (MIX_CHANNELS, MixChannel), the sound roles (SoundRole: bass, chord, melody-guide, rhythm-guide; BackingVoice the backing's two, GuideRole and GUIDE_ROLES the guides'), each role's voice as data (SoundRoleVoice, SOUND_ROLE_VOICES) and the scheduled notes (ScheduledBackingNote, ScheduledGuideNote); src/audio/audio-ports.ts holds the SessionBus port, whose scheduleGuideNote sits beside scheduleBackingNote and scheduleClick, and MixGain, two gains per channel (<channel>-enable and <channel>-volume, the four existing gain names unchanged). The mix by channel is src/audio/audio-mix.ts: AudioMix with melodyGuideOn, melodyGuideVolume, rhythmGuideOn and rhythmGuideVolume, channelOn, withChannelOn, withChannelVolume, validateChannelVolume, readAudioMixDesign and mixGains(mix). The transport is src/audio/audio-transport.ts, with setGuideOn(guide, on) and setGuideVolume(guide, level), and queueBacking(phraseNumber, harmony, timeline, tempo), called directly, with no helper between, from src/components/workspace/workspace-session-start.ts, workspace-session-phrase-one-entry.ts and workspace-session-phrases.ts; its running session in src/audio/transport-session.ts (queuePhrase renders and queues a phrase's backing and guide notes; planWindow plans each look-ahead window with only the guides switched on). The sounding is src/audio/web-audio-session-bus.ts (createWebAudioSessionBus, one fade route per click route, the backing and each guide) over the voices of src/audio/web-audio-voices.ts (soundNote, soundBackingNote, fadeRingingNote, soundClick) and src/audio/web-audio-output.ts.

## EXPECTATION
- With both guides off, a session's calls on the audio output are the same as before the guide existed, backing and clicks included.
- Every placed guide note's start and end equal the audio time of its rational position through the tempo map, on beats, off beats and in triplets, across phrases at different tempos.
- Only the sounding layer imports Web Audio; the renderer and the placement are pure.
- A phrase's guide notes are queued by the same call as its backing at each of the three places a phrase is queued.
