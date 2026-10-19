# Patois loop handoff (2026-10-18, evening)

## What the loop is

Self-paced loop building Patois alongside Cruise. Each round: 1) Cruise health (runner alive, XP rising, streak extended, disk above 3GB, new milestone.jsonl lines); fix real breakage first. 2) Pick next Patois roadmap item using open sources only (Tatoeba, Lichess CC0, original), never Duolingo's captured sentences/structure. Examples: fact-check held Greek/Polish packs so they can go catalog; Android chess board UI; step-by-step chess lines; ATTRIBUTION.md accuracy; Cruise gift/chest selectors once Duolingo shows one. 3) Run every Patois check (validate-catalog, streak-freeze, lesson-completion-scoping, lesson-gate, chess --check, macOS build on Swift changes), then commit, push, confirm CI green, sync README/roadmap/landing. 4) Reply 1-2 line TLDR. No App Store submissions, no deletes of existing content, at most one Haiku subagent per round.

## Where things stand

Patois 1.1.6 for iOS and Mac was submitted on 2026-10-18 and is waiting for App Review. The store name flips from Lexly to Patois when Apple approves it. Build 202610181930 carries the Pat the macaw icon, lesson animations (progress bar, shake on a miss, combo, confetti, XP on the summary), a full-window lesson layout and a landing page with the live app on it. The teach-first lessons (intro, worked examples with audio, practice, recap) are live for Spanish units 1 to 5. The Sign in with Apple failure message now carries the error code. The failure does not reproduce on my side, so it needs a real phone.

Cruise was at 602,884 XP with a 193-day streak and the runner alive. Balance mode had been picking the least-complete course; every pick now has to pass a live XP-rate check. Still open on Joshua: `sudo pmset -a autorestart 1`.

## Next, in order

1. Teach-first lessons for the other courses and the layout rehaul (only Spanish units 1 to 5 teach first today)
2. Sign in with Apple checked on a real phone
3. Step-by-step chess lines: a combination is one question about its first move today; an exercise where the board answers back would teach the follow-up
4. ATTRIBUTION.md still says no third-party app content is used; the restored Hindi/Japanese/Korean/French/Arabic drill units contradict that
5. Cruise gift/chest selectors once Duolingo shows one (gift-sent and chest-open log entries)
6. Russian (speaking exercises) and Arabic (characterMatch pair-select) earn no XP; investigate if worth fixing
7. Chess course stub units (6 hand-written multiple-choice units) could use more original content

Done since the 2026-10-05 handoff: Polish, Greek, Turkish and Swedish fact-checked and in the catalog; Android draws the chess board (compiles with JDK 17 at /opt/homebrew/opt/openjdk@17); renamed to Patois (2026-10-17); teach-first lessons and build 202610181930 (2026-10-18).

## Restart prompt

```
/loop Keep building Cruise and Patois, one shippable slice per round. Each round: 1) Cruise health: runner alive, XP rising, streak extended today, disk above 3GB, new lines in scripts/milestones.jsonl; fix real breakage first. 2) Pick the next Patois item from its roadmap.md that uses open sources only (Tatoeba, Lichess CC0, original content), never Duolingo's captured sentences or exercise structure: e.g. multi-move chess puzzles for forks/skewers, fact-checking held-off language packs so they can go back in the catalog, more units for logged languages, Android support for chess. 3) Run every Patois check (validate-catalog, streak-freeze, lesson-completion-scoping, lesson-gate, chess --check, macOS build when Swift changes), then commit, push, confirm CI green, sync README/roadmap/landing. 4) Reply with a 1-2 line TLDR. No App Store submissions, no deletes of existing content, at most one Haiku subagent at a time.
```
