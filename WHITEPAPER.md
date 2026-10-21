# Patois Technical Whitepaper

**v1.1.3 iOS / 1.1.4 macOS** | August 2026

Learn anything, five minutes at a time.

Most learning apps only teach one subject, so a new one has to be built for every
different thing you want to learn. Patois is a gamified learning app. Not just
languages. 40+ courses across languages, programming, math, science, school
(Pre-Calculus 12, AP Biology 12) and general skills, all on one content schema,
because the spaced-repetition and gamification mechanics that make lessons stick
don't care what the subject is. Live at
[patois.jaybulb.com](https://patois.jaybulb.com), with native iOS and
macOS apps sharing progress across platforms so a lesson started on one device
picks up where it left off on another.

## Core Mechanic: One Schema, Any Subject

Everything the app teaches is data, not code, because a code change to add a course
means an app-store review cycle before anyone can use it. `content/catalog.json`
declares subjects, courses, units, and lessons; a lesson is a sequence of typed
exercises (multiple choice, translation, listening, typing). Adding a new
course, whether Spanish or Pre-Calc 12, is a JSON change, no app update.
Masterclass courses are surfaced as normal course cards via url-type subjects
in the same catalog, so they get the same discovery and navigation as any other
course for free.

The engagement loop is standard spaced-repetition gamification:

- **Spaced repetition review**: missed items resurface on a decay schedule,
  because forgetting is the actual enemy of learning, not first exposure.
- **XP and streaks**: daily goal, streak counter, and an iOS home screen
  widget showing both, since the habit of showing up daily matters more than
  any single session's length.
- **Hearts**: wrong answers cost hearts, gating brute-force guessing so a
  learner has to actually know the answer rather than cycle through choices.
- **Achievements**: milestone badges across courses.
- **Speech recognition**: language courses score spoken answers via the
  platform speech APIs, because reading a language and speaking it are
  different skills and only one of them is testable by tapping choices.

## Architecture

- **Web**: vanilla JS/HTML/CSS. No framework, no bundler, no build step. The
  whole app is a single-page app of toggled divs, first paint is one HTML
  file, because a lesson opened mid-commute shouldn't wait on a bundle to load.
- **Content**: `content/catalog.json` plus per-course `course-data.json`
  bundles. The iOS `ContentStore` walks the bundle directory tree to find
  course data regardless of how xcodegen nests resources, so a build tool
  quirk never silently drops a course.
- **Auth + sync**: Supabase email/password (shared spark project). Progress
  writes sync across web, iOS, and macOS; profiles auto-create on first
  sign-in, since a learner who switches devices mid-course shouldn't lose
  their streak.
- **Native apps**: xcodegen projects, SF Symbol icon chips, spring animations,
  per-unit progress. Ships via `asc workflow run ship-ios`.

## Platforms

| Platform | App ID | Status |
|---|---|---|
| Web |: | Live |
| iOS (6783501611) | com.nulljosh.lingo | v1.1.3 Live |
| macOS (6783501611) | com.nulljosh.lingo.mac | v1.1.4 Live |

Both platforms ship under the single ASC record 6783501611, a duplicate
record (6783501927) was created early on and is not the app of record.

## Privacy

No ads, no trackers, because a learning app's business is teaching, not selling
attention. The only stored data is the account email and per-lesson
progress in Supabase (RLS enabled). Speech recognition runs through the OS
APIs; audio is not retained, since there's no reason to keep a recording once
it's scored.
