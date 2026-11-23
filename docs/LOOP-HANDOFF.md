# Patois loop handoff (2026-11-23, morning)

## What the loop is

Self-paced loop building Patois alongside Surf (ex-Cruise). Each round: 1) Surf health (runner alive, XP rising, streak extended, disk above 3GB, new milestone.jsonl lines); fix real breakage first. 2) Pick the next Patois roadmap item using open sources only (Tatoeba, Lichess CC0, original), never Duolingo's captured sentences or structure. 3) Run every Patois check (validate-catalog, streak-freeze, lesson-completion-scoping, lesson-gate, chess --check, macOS build on Swift changes), then commit, push, confirm CI green, sync README/roadmap/landing. 4) Reply with a 1-2 line TLDR. No App Store submissions, no deletes of existing content, at most one Haiku subagent at a time.

## Where things stand

- The app icon is the real parrot now, replacing the old speech bubble on the README and the web favicon. The README has fresh screenshots of the live landing page and the current iPhone lesson, and its text is cut to a few lines. Deployed to patois.jaybulb.com (2026-11-23).
- iOS 1.1.6 carries the Sign in with Apple fix for the 2.1(a) rejection. It was resubmitted on 2026-11-10 and was waiting for App Review on the last check. Check App Store Connect before acting on it. The store name flips from Lexly to Patois when Apple approves it.
- The math changes (equivalence grading, real notation, Pre-Calc 11 and 12 rebuild) are held for the next iOS version so the 1.1.6 review is not reset.
- Apple's App Store Connect API can return an error that a required agreement is missing or expired. If that happens, Joshua accepts the agreement at developer.apple.com first.

## Next, in order

1. Patois roadmap open items, top first. Live blockers before features.
2. Teach-first lessons for the other courses (Spanish units are the only ones that teach before quizzing today).
3. Sign in with Apple checked on a real phone.
4. Redo the App Store screenshots and drop the Lexly name from the listing once 1.1.6 clears.
5. Joshua: one-time Xcode Cloud workflow setup in Xcode, then the old empty review drafts get cleared in App Store Connect.

## Restart prompt

```
/loop Keep building Surf and Patois, one shippable slice per round. Each round: 1) Surf health: runner alive, XP rising, streak extended today, disk above 3GB, new lines in scripts/milestones.jsonl; fix real breakage first. 2) Pick the next Patois item from its roadmap.md that uses open sources only (Tatoeba, Lichess CC0, original content), never Duolingo's captured sentences or exercise structure: e.g. multi-move chess puzzles for forks/skewers, fact-checking held-off language packs so they can go back in the catalog, more units for logged languages, Android support for chess. 3) Run every Patois check (validate-catalog, streak-freeze, lesson-completion-scoping, lesson-gate, chess --check, macOS build when Swift changes), then commit, push, confirm CI green, sync README/roadmap/landing. 4) Reply with a 1-2 line TLDR. No App Store submissions, no deletes of existing content, at most one Haiku subagent at a time.
```
