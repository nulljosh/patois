# Patois loop handoff (2026-10-22, early morning)

## What the loop is

Self-paced loop building Patois alongside ex-Cruise. Each round: 1) Surf health (runner alive, XP rising, streak extended, disk above 3GB, new milestone.jsonl lines); fix real breakage first. 2) Pick next Patois roadmap item using open sources only (Tatoeba, Lichess CC0, original), never Duolingo's captured sentences/structure. Examples: fact-check held Greek/Polish packs so they can go catalog; Android chess board UI; step-by-step chess lines; ATTRIBUTION.md accuracy; Surf gift/chest selectors once Duolingo shows one. 3) Run every Patois check (validate-catalog, streak-freeze, lesson-completion-scoping, lesson-gate, chess --check, macOS build on Swift changes), then commit, push, confirm CI green, sync README/roadmap/landing. 4) Reply 1-2 line TLDR. No App Store submissions, no deletes of existing content, at most one Haiku subagent per round.

## Where things stand

- The Patois name is used everywhere users see it: domain, repo links, sitemap and store URLs. Store builds still follow their own review lines.
patois.jaybulb.com serves 200 now, a Cloudflare Pages custom domain on the lexly-heyitsmejosh project (the project name stays). The store name still flips from Lexly on approval.

Patois 1.1.6 for iOS and Mac was submitted on 2026-10-18 and is waiting for App Review. Last checked 2026-10-19: iOS 1.1.6 was still WAITING_FOR_REVIEW, so check App Store Connect before acting on it. The store name flips from Lexly to Patois when Apple approves it. Main also has the Apple sign-in nonce fix and a streak-freeze crash fix (2026-10-21), so the next iOS build should carry them. Build 202610181930 carries the Pat the macaw icon, lesson animations (progress bar, shake on a miss, combo, confetti, XP on the summary), a full-window lesson layout and a landing page with the live app on it. The teach-first lessons (intro, worked examples with audio, practice, recap) are live for Spanish units 1 to 5. The Sign in with Apple failure message now carries the error code. The failure does not reproduce on my side, so it needs a real phone.

Surf's runner was dead from Wednesday until a fix on 2026-10-22, after a disk cleanup removed its launcher's build folder; the 197-day streak was saved. Balance mode had been picking the least-complete course; every pick now has to pass a live XP-rate check. Still open on Joshua: `sudo pmset -a autorestart 1`.

## Next, in order

1. Teach-first lessons for the other courses and the layout rehaul (only Spanish units 1 to 5 teach first today)
2. Sign in with Apple checked on a real phone
3. Step-by-step chess lines: a combination is one question about its first move today; an exercise where the board answers back would teach the follow-up
4. ATTRIBUTION.md still says no third-party app content is used; the restored Hindi/Japanese/Korean/French/Arabic drill units contradict that
5. Surf gift/chest selectors once Duolingo shows one (gift-sent and chest-open log entries)
6. Russian (speaking exercises) and Arabic (characterMatch pair-select) earn no XP; investigate if worth fixing
7. Chess course stub units (6 hand-written multiple-choice units) could use more original content

Done since the 2026-10-05 handoff: Polish, Greek, Turkish and Swedish fact-checked and in the catalog; Android draws the chess board (compiles with JDK 17 at /opt/homebrew/opt/openjdk@17); renamed to Patois (2026-10-17); teach-first lessons and build 202610181930 (2026-10-18). Pre-Calc 12 masterclass covers units 1 to 10 with flashcards (2026-10-22).

## Restart prompt

```
/loop Keep building Surf and Patois, one shippable slice per round. Each round: 1) Surf health: runner alive, XP rising, streak extended today, disk above 3GB, new lines in scripts/milestones.jsonl; fix real breakage first. 2) Pick the next Patois item from its roadmap.md that uses open sources only (Tatoeba, Lichess CC0, original content), never Duolingo's captured sentences or exercise structure: e.g. multi-move chess puzzles for forks/skewers, fact-checking held-off language packs so they can go back in the catalog, more units for logged languages, Android support for chess. 3) Run every Patois check (validate-catalog, streak-freeze, lesson-completion-scoping, lesson-gate, chess --check, macOS build when Swift changes), then commit, push, confirm CI green, sync README/roadmap/landing. 4) Reply with a 1-2 line TLDR. No App Store submissions, no deletes of existing content, at most one Haiku subagent at a time.
```
