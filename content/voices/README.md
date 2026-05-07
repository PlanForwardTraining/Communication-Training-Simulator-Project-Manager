# Voice Pool — AI Client Voices

This folder is the **voice library** the AI client roleplay can pull from. Each file maps a configured ElevenLabs voice to a personality profile, declares which DISC client types the voice fits, and controls whether that voice is currently active in the pool.

> **Verified:** All 20 voice IDs were confirmed via ElevenLabs API against the company account's voice library. Real ElevenLabs descriptive labels are reflected below. Listen to each preview URL before going live to confirm DISC alignment.

---

## How Voice Selection Works at Session Start

When a PM picks a scenario and a client DISC profile, the backend chooses which voice the AI will speak with. The selection follows this priority:

1. **Scenario-pinned voice.** If a scenario file declares a `## Voice Override` section pointing to a specific voice file, that voice is used. (Example: scenario "03-angry-client" might pin to "06-jessica" for emotional vividness.)
2. **DISC-aligned random** *(default).* Filter the active voice pool to voices marked compatible with the chosen client DISC. Pick randomly from that subset.
3. **Forced random** *(admin override).* Pick from the full active pool ignoring DISC compatibility — useful for stretching exercises.

The PM never picks the voice directly. The same scenario+DISC combination played multiple times will sound different on different days, which both adds variety and prevents the PM from "memorizing" how a particular client sounds.

---

## Voice Library (20 voices, all verified in ElevenLabs)

### Original 10 (premade ElevenLabs voices)

| File | Voice ID | Gender | ElevenLabs Description | Best Fit For (DISC) |
|---|---|---|---|---|
| [01-adam-dominant-male.md](01-adam-dominant-male.md) | `s3TPKV1kjDlVtZbl4Ksh` | Male | Engaging, Friendly, Bright | D, D/I, D/C |
| [02-bella-warm-female.md](02-bella-warm-female.md) | `hpp4J3VqNfWAUOO0d1Us` | Female | Professional, Bright, Warm | I/S, S, C |
| [03-brian-deep-male.md](03-brian-deep-male.md) | `nPczCjzI2devNBz1zQrb` | Male | Deep, Resonant and Comforting | S, S/C, D/C |
| [04-chris-casual-male.md](04-chris-casual-male.md) | `iP95p4xoKVk53GoZ742B` | Male | Charming, Down-to-Earth | I/S, S, I |
| [05-eric-trustworthy-male.md](05-eric-trustworthy-male.md) | `cjVigY5qzO86Huf0OWal` | Male | Smooth, Trustworthy | C, D/C, S/C |
| [06-jessica-warm-female.md](06-jessica-warm-female.md) | `cgSgspJ2msm6clMCkdW9` | Female | Playful, Bright, Warm | I, I/S, D/I |
| [07-liam-energetic-male.md](07-liam-energetic-male.md) | `TX3LPaxmHKxFdv7VOQHJ` | Male | Energetic, Confident | I, D/I |
| [08-matilda-professional-female.md](08-matilda-professional-female.md) | `XrExE9yKIg1WjnnlVkGX` | Female | Knowledgable, Professional | C, D/C, S/C |
| [09-roger-relaxed-male.md](09-roger-relaxed-male.md) | `CwhRBWXzGAHq8TQ4Fs17` | Male | Laid-Back, Casual, Resonant | S, S/C, I/S |
| [10-sarah-confident-female.md](10-sarah-confident-female.md) | `EXAVITQu4vr4xnSDxMaL` | Female | Mature, Reassuring, Confident | S, I/S, C |

### Added 10 (custom voices added to library 2026-05-05)

| File | Voice ID | Gender | ElevenLabs Description | Best Fit For (DISC) |
|---|---|---|---|---|
| [11-adam-m-subdued-male.md](11-adam-m-subdued-male.md) | `inGcvmoPgbvKUk9uCvHu` | Male | Adam M (sad/subdued) | S, S/C |
| [12-belle-empathetic-female.md](12-belle-empathetic-female.md) | `cNYrMw9glwJZXR8RwbuR` | Female | Empathetic Customer Service | S, I/S, C |
| [13-eryn-friendly-female.md](13-eryn-friendly-female.md) | `kdnRe2koJdOK4Ovxn2DI` | Female | Genuine, Friendly and Natural | I/S, S, I |
| [14-joey-support-male.md](14-joey-support-male.md) | `h2I5OFX58E5TL5AitYwR` | Male | Friendly Customer Support | I/S, I, S |
| [15-kiora-natural-female.md](15-kiora-natural-female.md) | `hGQkZQUA5RiOXIw7P9iO` | Female | Authentic, Natural Conversation | S, I/S, C |
| [16-mark-relaxed-male.md](16-mark-relaxed-male.md) | `UgBBYS2sOqTuMpoF3BR0` | Male | Natural Conversations | D, I/S, S, I |
| [17-michael-approachable-male.md](17-michael-approachable-male.md) | `ljX1ZrXuDIIRVcmiVSyR` | Male | Genuine and Approachable | I/S, S, S/C, C |
| [18-russell-excited-male.md](18-russell-excited-male.md) | `ZauUyVXAz5znrgRuElJ5` | Male | Young, Outgoing and Excited | I, D/I |
| [19-tori-casual-female.md](19-tori-casual-female.md) | `lAxf5ma5HGtzxC434SWT` | Female | Tori (casual, young) | I, I/S, D/I |
| [20-vexa-expressive-female.md](20-vexa-expressive-female.md) | `uwJhTSUhU9LVyeRjWtiC` | Female | Expressive Outbound Sales | I, D/I, I/S |

> **Naming notes:**
> - The pool now contains two distinct **Adam** voices (`pNInz6...` Dominant vs. `inGcvm...` "Adam M" subdued) — file names disambiguate.
> - **Bella** (`hpp4J3...`, Professional Warm) and **Belle** (`cNYrMw9...`, Empathetic) are different voices with different spellings — both kept.

---

## DISC Coverage (20 voices)

Every DISC client profile has at least 2 voice options, with most having 4-13 for variety:

| DISC Profile | Voices Available | Count |
|---|---|---|
| D | Adam, Liam | 2 |
| I | Jessica, Chris, Liam, Eryn, Joey Patel, Mark, Russell, Tori, Vexa | 9 |
| S | Sarah, Roger, Chris, Brian, Bella, Adam M, Belle, Eryn, Kiora, Mark, Michael | 11 |
| C | Sarah, Eric, Matilda, Bella, Belle, Kiora, Michael | 7 |
| D/I | Adam, Jessica, Liam, Russell, Tori, Vexa | 6 |
| D/C | Adam, Eric, Matilda, Brian | 4 |
| I/S | Sarah, Roger, Jessica, Chris, Bella, Belle, Eryn, Joey Patel, Kiora, Mark, Michael, Tori, Vexa | 13 |
| S/C | Roger, Eric, Matilda, Brian, Adam M, Michael | 6 |

> **D-pure remains light at 2 voices.** All 10 newly added voices skew warm/casual/conversational — none are dominant/sharp. If you want more D variety, browse the broader ElevenLabs library for voices labeled `dominant`, `firm`, `assertive`, or `intense` and add them.

---

## How to Verify Each Voice

Open the preview URL in any voice's profile file (or browse them all at [elevenlabs.io/voices](https://elevenlabs.io/voices)) and listen. Adjust the markdown file if the voice's actual character differs from the placeholder description.

---

## How to Add a New Voice

1. Browse [elevenlabs.io/voices](https://elevenlabs.io/voices) and add a new voice to your VoiceLab
2. Copy its Voice ID
3. Create a new file in this folder following the same template (e.g., `21-newname-vibe-gender.md`) — copy any existing voice file as a starting point and replace the metadata
4. List it in this README's voice library table
5. Update the DISC coverage table above

---

## How to Pause a Voice

To temporarily exclude a voice from the pool without deleting the file:

In the voice's frontmatter, set:
```yaml
active: false
```

The selector skips it automatically.

---

## File Naming Convention

`NN-firstname-vibe-gender.md`

- `NN` = numbered prefix for ordering (01-99) — alphabetical within each batch
- `firstname` = the voice's display name, lowercase
- `vibe` = one-word characterization (dominant, warm, deep, casual, trustworthy, etc.)
- `gender` = male or female

Example: `05-eric-trustworthy-male.md`
