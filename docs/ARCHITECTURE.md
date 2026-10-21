# Architecture

A gamified language and skills learning app featuring 12 languages plus math, science, programming, and BC curriculum content. Spaced-repetition exercises, daily streaks, and XP-based progression. Runs on web (PWA), iOS, macOS, and Android (Kotlin Multiplatform). Progress syncs via Supabase for signed-in users.

## How it runs

**Web**: browser loads `app/index.html`, runs `js/lingo-app.js` which is the entire app (state, auth, UI). User picks a course catalog, works through lessons (exercises rendered by the right type handler), earns XP/hearts, and progress is saved to Supabase (signed-in users) or localStorage (demo mode). No build step, no framework, pure vanilla JS/HTML/CSS.

**iOS**: `ios/Sources/iOS/LingoApp.swift` is the entry point, renders shared `CatalogView`. Supabase auth, progress sync on `syncFromCloud()`. The bundled `content/` (symlinked in Xcode) loads catalog and course packs. A daily reminder (UserNotifications) fires tomorrow if the user completes a lesson today.

**macOS**: `ios/Sources/macOS/LingoApp.swift` is the entry point (separate from iOS), renders `CatalogView`. Same auth and progress syncing as iOS.

**Android/Desktop (KMP)**: `kmp/composeApp/src/commonMain/kotlin/com/nulljosh/tonchi/AppScreen.kt` is the shared entry point, fetches catalog from the live web API.

## Web

| File | What it owns |
|---|---|
| `index.html` | Landing page, sign-in form, feature callouts, app store links, attribution to Tatoeba |
| `app/index.html` | App shell, all screens are toggled divs, no client-side routing (state-driven visibility) |
| `js/lingo-app.js` | State machine (catalog, progress, SRS cards), Supabase auth (email+password + Apple + Google), SM-2 spaced repetition logic, exercise renderers (translation, math choice, cloze, sentence, listening, match, math), trophy unlock checks, localStorage persistence |
| `js/games.js` | Mini-games (chess, 2048, memory, minesweeper, snake), arcade side-track not language exercises |
| `js/webmcp.js` | WebMCP tools for Claude integration, exposes catalog and progress accessors |
| `css/lingo.css` | All styling, `data-theme` attribute for light/dark mode toggling |
| `privacy.html` | Privacy policy |
| `support.html` | Support page |
| `onboarding.js` | Shared onboarding modal (reused across multiple Supabase apps) |
| `sw.js` | Service worker, network-first for pages, cache-first for assets |
| `manifest.json` | PWA manifest (app name, icons, start URL, display mode) |
| `assets/` | SVG icons and images (bundled with service worker) |
| `fonts/` | Geist font family (woff2 files, preloaded in HTML head) |

## Testing (web)

| File | What it owns |
|---|---|
| `tools/validate-catalog.js` | Validates catalog structure and exercise renderer field coverage on both web and iOS |
| `tools/check-streak-freeze.js` | Guards streak reset logic (7-day milestones, freeze consumption, reset conditions) |
| `tools/check-lesson-completion-scoping.js` | Validates lesson completion IDs stay unique per subject, no cross-course collisions |
| `tools/check-lesson-gate.mjs` | Verifies lesson progression gates (prerequisites, pass ratios), extracts lessonPassed from js/lingo-app.js |

## Content generation scripts

| File | What it owns |
|---|---|
| `scripts/build-language-course.mjs` | Generates language packs from Tatoeba/OpenSubtitles, appends with `t` prefix (safe to re-run) |
| `scripts/fieldbook-course.py` | Builds fieldbook.json (science/math domain reference) from ../fieldbook source |
| `scripts/import-pwnlingo-exercises.mjs` | Imports Duolingo exercise captures from sibling pwnlingo repo into new Patois course files |
| `scripts/make-appicon.sh` | Renders icon.svg to all iOS app icon sizes (do not hand-export) |
| `scripts/deploy.sh` | Publishes web + content to Cloudflare Pages (run manually, project not git-connected) |

## iOS entry points

| File | What it owns |
|---|---|
| `ios/Sources/iOS/LingoApp.swift` | iOS app entry point, root scene, splash screen on loading, tab navigation layout, share sheet overlay |
| `ios/Sources/iOS/WhatsNewSheet.swift` | Changelog modal shown on app update (version-gated via `@AppStorage("whats_new_seen_version")`) |
| `ios/Sources/macOS/LingoApp.swift` | macOS app entry point, root scene, splash screen on loading, sidebar navigation layout, share sheet overlay |

## Shared views
| `ios/Sources/Shared/CatalogView.swift` | Course category list and subject picker, branches between platforms (tabs vs sidebar) |
| `ios/Sources/Shared/UnitsView.swift` | Unit list within a course, progress tracking per unit, introduces lessons |
| `ios/Sources/Shared/LessonView.swift` | Exercise renderer, dispatches by exercise type (translation, cloze, sentence, match, math, math choice, listening), handles answers, XP/heart mechanics, AVSpeechSynthesizer for listening exercises |
| `ios/Sources/Shared/NotesView.swift` | Markdown content viewer for masterclass notes, renders blocks (prose, code, tables, flashcards) |
| `ios/Sources/Shared/AuthView.swift` | Sign-in/sign-up form, email+password, Apple/Google sign-in, display name setup |
| `ios/Sources/Shared/AuthStore.swift` | Supabase auth (email, Apple, Google), biometric login (Face ID/Touch ID via Keychain), session persistence, profile fetch/update |
| `ios/Sources/Shared/AvatarPickerView.swift` | 8x8 pixel-art avatar generator and picker, mirrors web's SVG generation to PNG |
| `ios/Sources/Shared/SettingsView.swift` | Account settings, daily reminder toggle, delete account, daily streak/XP display |
| `ios/Sources/Shared/SplashView.swift` | Loading screen with Patois cap icon |
| `ios/Sources/Shared/ContentStore.swift` | @Observable store, loads bundled `catalog.json` and course packs, manages progress (XP, streak, hearts, SRS cards), syncs with Supabase on init, saves to UserDefaults |
| `ios/Sources/Shared/Models.swift` | Decodable types: Catalog, Subject, CoursePack, Unit, Lesson, Exercise, LingoProfile, SrsCard (SM-2 spaced repetition) |
| `ios/Sources/Shared/DailyReminder.swift` | Local notification for daily lesson reminders, reschedules after lesson complete |
| `ios/Sources/Shared/KeychainHelper.swift` | Keychain storage for credentials |
| `ios/Sources/Shared/SessionKeychainStorage.swift` | Data-protection keychain for Supabase session (macOS safe storage) |
| `ios/Sources/Shared/Color+Hex.swift` | Hex color parsing for CSS color imports |

## iOS widgets

| File | What it owns |
|---|---|
| `ios/Sources/Widget/LingoWidget.swift` | Home screen widget, displays streak and XP, updates via WidgetKit timeline |
| `ios/Sources/Widget/LingoWidgetBundle.swift` | Widget bundle entry point |

## iOS tests

| File | What it owns |
|---|---|
| `ios/Tests/ContentStoreTests.swift` | Unit tests for content decoding (catalog, courses, exercises) from real bundle files |
| `ios/Tests/DailyReminderTests.swift` | Unit tests for reminder scheduling (fires before 7am today, after 7am fires tomorrow, reschedules after lesson) |

## Content

| File | What it owns |
|---|---|
| `content/catalog.json` | Course catalog: categories (languages, math, science, skills, masterclasses) with subjects and packs |
| `content/courses/*.json` | Course packs: units, lessons, exercises (type + fields specific to renderer) |
| `content/notes/*.json` | Masterclass notes: sections, blocks (prose, code, callouts, tables, flashcards) |
| `school/*.html` | BC curriculum masterclass pages (gated by basic auth via functions/school/_middleware.js, noindex) |
| `scripts/build-language-course.mjs` | Generates language packs from Tatoeba (CC-BY 2.0 FR) and OpenSubtitles frequency, appends with `t` prefix, safe to re-run |
| `tools/validate-catalog.js` | Validates catalog structure, all packs/notes/exercises, and renderer field coverage (web + iOS) |

## Backend

| File | What it owns |
|---|---|
| `functions/school/_middleware.js` | Constant-time basic auth for `/school/` pages, protects BC curriculum masterclass from public indexing |

## Build and deployment

| File | What it owns |
|---|---|
| `scripts/build-language-course.mjs` | Generates language course packs from Tatoeba and OpenSubtitles word frequency, appends units with `t` prefix, safe to re-run |
| `scripts/deploy.sh` | Publishes web + content to Cloudflare Pages (not git-connected, must run manually) |
| `scripts/check-lesson-gate.mjs` | Verifies lesson gate logic, ensures progression rules are enforced |
| `tools/validate-catalog.js` | Validates catalog structure, all referenced packs/notes, and exercise renderer coverage |
| `tools/check-streak-freeze.js` | Guards streak increment logic against edge cases |
| `tools/check-lesson-completion-scoping.js` | Validates lesson completion tracking across platforms |
| `ios/Scripts/prepare-plist.py` | Post-xcodegen plist patcher (injects CFBundleVersion, CFBundleShortVersion) |
| `content/` | Course catalog, language packs, and masterclass notes (data source for web and iOS) |
| `school/` | BC curriculum masterclass content (password-gated, noindex) |

## Data storage

**Supabase (spark project)**: auth (email+password, Apple, Google), `lingo_profiles` table (username, avatar), `lingo_progress` table (XP, streak, hearts, last played, SRS cards, lessons completed). RLS gates data to signed-in user.

**Browser localStorage** (web only): progress/SRS/auth (when not signed in or in demo mode).

**Device UserDefaults** (iOS/macOS): progress, SRS cards, daily reminder toggle, theme choice.

**Service Worker cache** (web): network-first for pages, cache-first for assets.

## KMP (Kotlin Multiplatform)

| File | What it owns |
|---|---|
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/tonchi/Content.kt` | LexlyClient HTTP fetcher for catalog from web API |
| `kmp/shared/src/commonTest/kotlin/com/nulljosh/tonchi/ContentTest.kt` | Tests for catalog shape decoding |
| `kmp/composeApp/src/commonMain/kotlin/com/nulljosh/tonchi/AppScreen.kt` | Shared Compose UI |
| `kmp/composeApp/src/androidMain/kotlin/com/nulljosh/tonchi/MainActivity.kt` | Android entry |
| `kmp/composeApp/src/desktopMain/kotlin/com/nulljosh/tonchi/Main.kt` | Desktop window setup |

## watchOS

| File | What it owns |
|---|---|
| `watchos/LexlyWatchApp.swift` | watchOS app entry point, root scene setup |
| `watchos/ContentView.swift` | Root view, tabs for streak and pairing |
| `watchos/Views/StreakView.swift` | Displays current streak and XP, fetches from Supabase REST API |
| `watchos/Settings/PairingView.swift` | Token paste UI for Supabase access token (watch has no sign-in flow) |
| `watchos/Models/WatchAPI.swift` | Direct REST client to Supabase lingo_progress table, bypasses native SDK |
| `watchos/Models/WatchModels.swift` | SrsCard and DBProgress decodables, SM-2 shape mirrors web/iOS |

## Backend services

| File | What it owns |
|---|---|
| `supabase/functions/stripe-checkout/index.ts` | Creates Stripe Checkout Session for Pro unlock, redirects to success URL |
| `supabase/functions/stripe-webhook/index.ts` | Stripe webhook handler, flips `lingo_profiles.is_pro` on checkout completion |
| `supabase/migrations/20260709000000_add_is_pro.sql` | Migration: adds `is_pro` boolean column to lingo_profiles table |

## Mechanics

**Spaced Repetition (SM-2)**: interval/factor/difficulty stored per exercise in `srs` column (both web and iOS write this shape). Card is due when `nextReviewDate <= today`. Correct answer increases interval, wrong answer decreases it.

**Daily Streak**: increments if user completes a lesson on a given day. Resets to 1 if missed. `lastPlayed` tracks the last day a lesson was completed.

**Hearts system**: 5 hearts by default, lose 1 per wrong answer, regain 1 after a period or by time. When 0, the user cannot proceed until hearts restore.

**XP and Trophies**: earn 10 XP per correct answer, unlock trophies (First Steps, Perfectionist, On Fire, etc.) based on conditions. Widget displays current XP.

## External services

**Supabase (spark project)**: auth, progress persistence, SRS card sync across devices.

**OpenSubtitles + Tatoeba**: language course generation, CC-BY 2.0 FR license (attribution in landing, iOS settings).

**Web API**: KMP fetches the live catalog from `patois.jaybulb.com/content/catalog.json`.

## Gotchas

**Content is data-driven**: every exercise type (translation, cloze, math, etc.) is defined by JSON fields. Web and iOS renderers must both read the same fields. `tools/validate-catalog.js` enforces this, keep it in sync when adding a type.

**Platform auth differs on purpose**: web gates the catalog behind sign-in (with `?demo=1` escape hatch per App Review 5.1.1(v)). iOS/macOS do NOT gate content (sign-in unlocks only progress sync) for the same App Review reasons. Do not "fix" this inconsistency without a recheck with legal.

**SRS shape is cross-platform**: SM-2 cards in Supabase must decode identically on web and iOS. Any JSON shape change breaks one or both.

**Service worker cache evicts by version**: `CACHE_VERSION` in `sw.js` controls cache eviction. Bump it to force a cache clear.

**No book content**: a previous `books` category in catalog.json was removed 2026-08-30 because Apple rejected the app for having book summaries (now Bookrank's product). Categories are now explicit in `CatalogView.categoryOrder` rather than sorted alphabetically.

**Daily reminder is local only**: UserNotifications, no push backend. Permission is asked after the first completed lesson. Reschedules to tomorrow after every lesson (so a day with a lesson never gets nagged).

**Content symlink**: `ios/Sources/Resources/content` is symlinked to `content/`, so web edits reach the app bundle automatically without a copy step.
