# lexly Roadmap

> Priority tier 1 (2026-10-17): live blocker, work first. Order: live blockers, ship pushes, active features, portfolio, exploratory. See ~/Documents/Code/LOOP-HANDOFF.md.

## Rehaul (Joshua 2026-10-17, do first)
- [ ] UI rehaul: the web landing and the app are ugly. Rebuild on the shared tokens (8 point grid, one radius set, 48 point capsules, SF Pro / Helvetica), the way Airwell was done. No tilted device mockups or frames on the landing, the app itself goes on the page. Then fresh README screenshots. (2026-10-21: README shots in screenshots/ still match the live app, which still shows the old blue chat-bubble logo instead of Pat the macaw; retaking before the rehaul changes nothing.)
- [x] Name: Joshua says Tonchi sucks. Patois is locked on the iOS listing (2026-10-17). Confirm it sticks before moving the subdomain (tonchi.jaybulb.com stays live as the alias). Done 2026-10-21: site, README and store URLs now on patois.jaybulb.com; the pending 1.1.6 app info says Patois and goes live on approval.
- [x] Stale numbers on the landing: it says 122 courses, the docs say 165. Measure from content/ and fix. Done 2026-10-21: catalog has 125 lesson courses (128 tiles, Biology listed twice, two notes-only masterclasses); landing, README and WHITEPAPER say 125.

## Shipped 2026-09-10, iPad support dropped, Sign In with Apple fixed, manual code signing

Debugged why Lexly iOS couldn't rebuild for App Store submission. Discovered Sign In with Apple capability was missing from the bundle ID on Apple's side (ASC showed zero enabled capabilities). Fixed via `asc bundle-ids capabilities add` to enable it on bundle ID 5L733DK3HV. Generated new App Store distribution provisioning profiles (Lingo AppStore 20260910, widget variant). Switched both targets from automatic to manual code signing in Xcode project, updated ExportOptions.plist. Found the app also lacked the required iPad Pro 12.9" screenshot (never had one even on live 1.1.3). Rather than generate iPad screenshots for an iPhone-only app, dropped iPad support entirely (TARGETED_DEVICE_FAMILY "1,2" → "1"). Reused the rejected 1.1.5 App Store version slot, bumped to 1.1.6 (build 202609101345), submitted for review. Currently WAITING_FOR_REVIEW as a deliberate resubmission into the same 4.3(a) "Design: Spam" wave that rejected Lexly 2026-08-28. Appeal reply citing Curvely and NYC Survive successful reversals drafted but not filed pending this submission's outcome.

## Shipped 2026-09-07, Fieldbook course integration

Generated a new "Fieldbook" science course in the catalog (content/courses/fieldbook.json, 9 units, 528 exercises) from the sibling fieldbook repo's data.js via scripts/fieldbook-course.py. Each lesson opens with a read-first tip linking to fieldbook.heyitsmejosh.com, the first exercise per lesson is the hand-written check question, and remaining exercises are which-field drills to reinforce learning. Regeneration happens automatically when scripts/deploy.sh detects the sibling repo's presence. Deployed to lexly.heyitsmejosh.com 2026-09-07.

## Shipped 2026-08-30, themed units and teaching content

Units are now themes, not difficulty tiers. `scripts/build-language-course.mjs` buckets
each sentence pair by matching its **English** side against keyword sets, so membership is
derived from the content rather than asserted, which is the difference between this and
the topic-naming pass that had to be reverted in August. All 12 languages get the same 10
themes: Greetings & Courtesy through Health & Body.

Every unit now opens with a **Before you start** card (web `buildUnitIntro`, iOS
`UnitIntro`): three real phrases drawn from that unit, plus a grammar note where one could
be written accurately. Tips exist for Spanish, French, German, Italian and Portuguese (50
in total); Japanese, Chinese, Korean, Arabic, Hindi, Russian and Dutch deliberately have
none, because a wrong grammar note is worse than no note. Until now not one exercise
taught anything, the app only ever tested.

**The frequency filter was starving the smaller languages.** It required every word of a
sentence to appear in the top-50k list. Allowing one unknown word took Hindi from 284
usable pairs to 1,863 (6.6x), Korean 1.7x, Arabic 1.5x, measured, not estimated. Hindi is
now a full 10 units instead of 8, and every language sits at 10.

Also added slow replay on listening exercises (0.45x web, 0.4x iOS).

Verified on an iPhone 17 Pro simulator: the Food & Drink unit shows its tip and three
food phrases, and the sentences in it are actually about eating.

## Open, next on the curriculum
- [x] App Store marketing URL: currently generic portfolio root (heyitsmejosh.com), should be https://lexly.heyitsmejosh.com. Frozen until 1.1.6+ ship due to current version READY_FOR_SALE status. Done 2026-10-21: iOS and Mac 1.1.6 (in review) have marketing https://patois.jaybulb.com and support /support, confirmed with asc.

- [ ] **Word-strength model (lexeme-lite).** The keystone: it unlocks a placement test,
  weak-word review, and a vocabulary stat all at once. Design: `lingo.words` =
  `{ [subject]: { [word]: { seen, correct } } }`, updated by tokenising the answer in
  `checkAnswer` (web) / `recordAnswer` (iOS). Weak word = `seen >= 2 && correct/seen <
  0.6`. Feed a "practice your weak words" session through the existing due-first review
  path. Keep it local-only, `streak_freezes` and `weekly_xp` already set that precedent,
  so no Supabase migration is needed.
- [ ] Placement test (needs the word model first), iOS speaking exercises, leagues,
  stories, recorded human audio.
- [ ] Grammar tips for the remaining 7 languages, needs someone who can verify them.

## Shipped 2026-08-30, removed book summaries, fixed the iOS opening screen

**The iOS app opened on a list of book summaries.** `CatalogView` rendered categories
with `catalog.categories.keys.sorted()`, so `books` sorted first alphabetically, while
the web app explicitly starts at `languages`. A language-learning app therefore opened,
for every user and every App Review reviewer, as a book-summary app.

Two fixes: `CatalogView.categoryOrder` is now an explicit list (languages first), and
the `books` category is gone from `content/catalog.json` entirely, 15 entries, all
notes-only, so the exercise/course/lesson counts are unchanged. The 15 masterclass JSON
files moved to `bookrank/content/masterclasses/` rather than being deleted.

**This is very likely the real cause of the Guideline 2.1 rejection on macOS 1.1.4**,
which cited "book or magazine content" and a China publishing permit. That was recorded
as a territory-licensing problem and worked around by dropping CHN. The actual problem
was that Lexly contained book content at all. It also plausibly fed the 4.3(a) spam
read: a "language app" whose first screen is book summaries looks like a grab-bag.

Note the category was already unreachable on web, `app/index.html` has no `books`
tab, so it was only ever visible on iOS.

## Verified on device 2026-08-30, all five exercise types, iOS simulator

Driven with AXe on an iPhone 17 Pro simulator, not just compiled: translation, cloze,
word bank (chips move to the answer row, Check enables), listening (Play button present
and audible), and match (two-column grid). Hearts decrement on wrong answers. This
closes the "iOS never actually run" gap.

## Open, gaps left by the 2026-08-30 content/parity work

- [ ] **iOS `match` and word-bank UI have never been run.** They compile and
  `ContentStoreTests` proves the JSON decodes with `words`/`audio`/`pairs` intact, but no one has
  tapped through a lesson in the simulator. `FlowRow` (the custom wrapping `Layout`) and
  `MatchGrid` are the untested pieces.
- [ ] **Generated content is ordered by word frequency, not by teaching order.** Unit 1 is
  "statistically most common words", not "greetings". This is the real remaining gap versus a
  designed curriculum, and no amount of extra sentences fixes it.
- [ ] **Chess: play the whole line.** Today a combination is one question about its first move. A step-by-step exercise where the board answers back would teach the follow-up too.
- [ ] **No native-speaker review of ~1,800 generated exercises.** Tatoeba sentences are
  human-written so the floor is high, but Hindi, Arabic, Korean and Chinese have had no check at
  all beyond schema validation.
- [ ] **~23 non-language courses are still 15-exercise stubs** (algebra, chess, geography,
  chemistry, biology, and the rest of the 1-unit packs). Tatoeba does not cover them, so they need
  a different generator or hand authoring.
- [ ] Deliberately skipped, revisit when there are users: leagues/leaderboards (needs a new table +
- [x] (obsolete 2026-10-21: the landing has no screenshots now, it runs the live app in an iframe at /app/?embed) **Hero screenshots are stale (show pre-auth-gate catalog).** The landing page marketing
  images display the course list that authenticated users now see, but a logged-out visitor cannot
  reach this screen (auth gate on renderSubjects). Screenshots need to show what a visitor actually
  encounters (sign-in screen or a sample lesson) or be honest about the login requirement.
- [x] (obsolete 2026-10-21: visitors can open a real lesson in the embedded app) **No screenshot of an actual lesson.** Landing page describes five exercise types (multiple-choice,
  match, cloze, word-bank, listening) but has zero visual proof. One lesson-in-progress screenshot
  would give visitors real sense of what they are learning.
- [ ] **No social proof.** No testimonials, review scores, user count, or credibility markers.
  Not a blocker for v1, but typical SaaS landing pages have at least one "X students learned Y".
  RLS, renders empty until there is a user base) and the winding-path unit UI (a re-skin).

## Shipped 2026-08-30, language content 10x + iOS exercise parity

**iOS was rendering a broken subset of the web app's exercises.** `Exercise` in
`ios/Sources/Shared/Models.swift` decoded only `type/question/answer/choices/id`, silently
dropping `words` and `audio`. A `sentence` exercise therefore rendered as a bare text field
with no word bank, and a `listening` exercise rendered "Type what you hear" with **no audio
at all**, unanswerable. `ContentStore.recordAnswer` was `if correct { xp += 10 }`: no
hearts, no spaced repetition, both of which the web app has had for months.

Fixed: added `words`/`audio`/`pairs` to the model and `lang` to `CoursePack`; rewrote
`LessonView` to switch on `exercise.type` instead of on `choices != nil`; added a word-bank
renderer, `AVSpeechSynthesizer` playback with a replay button, and a hearts row; ported SM-2
and the `LESSON_PASS_RATIO` pass rule from `js/lingo-app.js` verbatim so cards written on
either platform stay interchangeable through the shared `lingo_progress.srs` column.

**Content: 830 → 2,615 exercises; languages 195 → 1,995.** Eleven of twelve languages were
sitting at exactly 1 unit / 3 lessons / 15 exercises. `scripts/build-language-course.mjs`
generates packs from Tatoeba sentence pairs (CC-BY 2.0 FR) ranked by OpenSubtitles word
frequency, appending generated units *after* the hand-authored ones so existing exercise ids
,  and therefore committed SRS cards and `lessons_completed` keys, never orphan. Re-runnable
and idempotent; corpora cache in gitignored `cache/`. Hindi's corpus only supports 9 units,
so unit count adapts rather than failing.

Attribution is required by CC-BY and is in place: `ATTRIBUTION.md`, a landing-page footer
link, and a Settings row on iOS/macOS.

**Two new exercise types on both platforms:** `match` (tap the matching pairs) and `cloze`
(fill in the blank).

`tools/validate-catalog.js` now type-checks every exercise against what the renderers on
*both* platforms actually read, the guard that would have caught the iOS drop. It found two
genuine issues on first run (duplicate multiple-choice options, and rows where the
"translation" equalled its own prompt), both fixed at the generator.

**Deliberately not done:** leagues/leaderboards (an empty leaderboard is worse than none
until there are users) and the winding-path UI (a re-skin, not a capability).

**Not submitted.** Per the 4.3(a) note below, the iOS build was not bumped, archived, or
resubmitted. This work sits on main until the appeal resolves.

## App Review, Guideline 4.3(a), iOS 1.1.5 (2026-08-28)

- [ ] **iOS 1.1.5 REJECTED under Guideline 4.3(a) Design: Spam.** Submission `16ca1b81-3421-4fcd-af22-c321b5983c31`, thread `1d490667-6b7d-34fb-a662-42e561a595a0`, rejected 08:14 PT. Apple's letter is the byte-identical wave boilerplate and names no comparison app. Lexly is the seventh app hit; see `~/Documents/Code/notes/appeal-4-3-spam.md`.
- **Do not rebuild, bump, or resubmit the build.** Nothing in the binary was cited, and resubmitting the same build has failed for every other app in the wave and deepens the pattern.
- [ ] **Subtitle + privacy URL still queued.** `subtitle` → "Languages and BC course notes" and `privacyPolicyUrl` → `lexly.heyitsmejosh.com/privacy` live on the app-info record, which is locked while macOS 1.1.5 is IN_REVIEW. **`asc metadata push` reports these as applied and they silently do not land**, always re-pull to verify. Push again once macOS review concludes.
- [ ] **Watch macOS 1.1.5** (submission `e3d14cbc-a175-4267-baaf-b693a33bc4a6`, IN_REVIEW on the same build). If it also comes back 4.3(a), file the same reply on the Mac thread.
- **Repositioning reverted (2026-08-29, `a5df300`).** The "lead with BC Grade 12 everywhere" commit demoted languages off the default tab and out of the listing copy. Languages are core to the app, not filler, reverted in full. The 4.3(a) read is driven by the screenshots and the account's submission pattern, not by which tab opens first; fix it there instead.
- Canonical metadata now lives in `metadata/` at the repo root. `ios/fastlane/metadata/` is dead legacy that still says "LingoAce"/"LingoPlay", never push from it.

## Shipped 2026-08-27, landing page App Store CTA deduplication

The hero and platforms card had duplicate download buttons. Removed the platforms card duplicate so the page has one download CTA (the iOS Smart App Banner on Safari, the hero button on other browsers). Deployed 2026-08-27 evening via `./scripts/deploy.sh` along with commit 8b5012f.

## Shipped 2026-08-27, push to main now deploys

`.github/workflows/deploy.yml` runs `scripts/deploy.sh` itself (not a copy, so the published path
list can't drift). Both repo secrets are set: `CLOUDFLARE_ACCOUNT_ID` and a `CLOUDFLARE_API_TOKEN`
scoped to Cloudflare Pages:Edit (token `lexly-ci-pages-deploy`). Verified end to end, a dispatch run
deployed and logged `deploy verified`, which is deploy.sh curling production and md5-comparing one

## Shipped 2026-08-28, Sign in with Apple + Google sign-in (iOS + macOS)

Added Sign in with Apple to both platforms (commit 8d59f7f). Bundle ID `com.nulljosh.lingo` was already registered on the shared Supabase `external_apple_client_id`. Added Google sign-in via OAuth browser flow (commit 4304ed0), the shared Supabase project already has working Google credentials. Both flows tested end to end on iOS and macOS. Reference implementation is Healstack macOS (tested 2026-08-28 by Joshua signing in as trommatic@icloud.com).

**Joshua must physically test Apple/Google sign-in on macOS** to verify the system sheets work (cannot be automated; requires Touch ID).
file per asset class. The "a plain git push publishes nothing" trap that staled the site for 2 weeks
is closed.

**Why a Claude Code web session cannot deploy directly, verified not assumed:** two independent
walls. (1) No Cloudflare credentials, the container gets a git clone and no secrets, no
`~/.wrangler`, and `wrangler login` is an interactive browser flow. (2) The sandbox network policy
denies `api.cloudflare.com:443` outright (gateway 403 on CONNECT; npm/PyPI are allowlisted, the
Cloudflare API is not), so even a hand-pasted token could not reach Cloudflare from there. CI is
the fix: GitHub Actions holds the token and has open network.

## RESOLVED + RESUBMITTED 2026-08-25, macOS 1.1.4 was never a code bug

Read out of Resolution Center after Joshua supplied a 2FA code. The real reason, verbatim in
substance:

> **Guideline 2.1 - Information Needed.** "the app includes or accesses book or magazine content
> and is intended for distribution on the App Store in China mainland. However, you have not
> provided a permit demonstrating authorization to distribute an app with this content."
> Apple wants the Internet Publishing License (网络出版服务许可证).

Reviewed on a MacBook Air (15-inch, M3, 2024) against 1.1.4 (`202608242229`).

**This invalidates two earlier theories.** The 2.1(a) "unable to sign in" fix and the
collapsed-window fix were both aimed at the wrong thing, the rejection was about *territory
licensing*, not the build. Do not re-derive a code cause for this.

**Fix applied:** the permit is issued by China's NPPA to a registered Chinese entity, with the
developer name required to match the 单位名称 on the license, not attainable here. So China
mainland was dropped instead:

    asc pricing availability edit --app 6783501611 --territory "CHN" --available false

Verified `available: true -> false` (`PROCESSING_TO_NOT_AVAILABLE`), with all 175 territory rows
still present, that endpoint lists every territory with a boolean, so the count not changing is
correct, the row does not disappear.

Then: the stale `UNRESOLVED_ISSUES` submission had to be cancelled before the version could move
(`asc submit cancel --id 90f5d700-... --confirm`, wait out the `CANCELING` state), and only then
did `asc review submit` succeed. **New submission `c7a51dfe-7410-4be1-958e-9ba7f704be59`,
submitted 2026-08-25 17:07 UTC. macOS 1.1.4 is now `WAITING_FOR_REVIEW`.**

Note: `metadata.required.whats_new` still warns and is still **not fixable**, this is the first
macOS version on the record, so Apple refuses the PATCH ("cannot be edited at this time").
0 blocking either way.

**Scope beyond Lexly:** bookrank, wordroot, quotestreak and inkpress are all also listed in China
mainland. bookrank is *already live* with book summaries and China on, which means this rule is
reviewer-triggered rather than automatic. Deliberately did **not** pre-emptively change them.

## Shipped 2026-08-23, iOS 1.1.3 is LIVE on the App Store
https://apps.apple.com/app/id6783501611, linked from the landing page (hero CTA, footer, Smart App
Banner meta), the app shell footer, README and support page. The platforms card used to repeat the
hero's download CTA; it now reads as plain text so the page has one download button, not two. macOS
on the same record is still unreleased; keep it badged "Pending" on the site until it clears review.

## Done 2026-08-18, macOS 1.1.3 submit-ready
`asc validate` on `f9f6e627-0b7f-421a-9e85-50cfcdf96106`: 0 errors, 0 blocking.

One warning remains and is **not fixable**: `metadata.required.whats_new`. ASC rejects the PATCH with
"Attribute 'whatsNew' cannot be edited at this time" because this is the *first* macOS version on the
merged universal record, a first version has no What's New field. Non-blocking; ignore it on this row
and expect it to disappear on macOS 1.1.4.

## Security (2026-08-17)
- **Auth bypass in /school endpoint closed**: The `/school` gate was using a forged browser cookie (`lingo_authed`) for authentication. Fixed with Basic auth checking the `SCHOOL_PASSWORD` environment variable; requests without it are now denied (commit dfa230b). Deployed live.

## Auth VERIFIED END-TO-END AGAINST LIVE BACKEND 2026-08-15

The 08-13/08-14 "root cause found and fixed" claim **holds up**. Independently re-verified
today against the live shared `spark` Supabase project (`tjsxsqlxjmanwvmywwvw`), not from
the notes. Nothing needed fixing; no code change was made.

- **Sign-in, real session.** `POST /auth/v1/token?grant_type=password` as
  `jatrommel@gmail.com` → HTTP 200, access token (928 chars) + refresh token, `expires_in`
  3600, `email_confirmed_at` 2026-05-28. Demo account is healthy.
- **Sign-up, real session, immediately.** `POST /auth/v1/signup` with a throwaway address →
  HTTP 200 **with an `access_token` in the response**. Email confirmation is **OFF** on this
  project, so `signUp` returns a live session and the `guard session != nil` passes.
- **Lexly is NOT exposed to the dead-mailer failure that sank sparkjar.** No confirmation
  email is required for sign-up to succeed, so there is no silent no-op mail path in the
  review-critical flow. Do not port sparkjar's Resend migration here as a rejection fix , 
  it is unrelated. (The separate "Email verification on signup + forgot-password" section
  below is still a real *feature* gap, just not a ship blocker.)
- **Post-signup writes succeed.** `lingo_profiles` upsert → HTTP 201, `lingo_progress`
  upsert → HTTP 201 under the new user's own token, so RLS is not blocking the path that
  runs right after the guard.
- **`delete-account` edge function works** → HTTP 200 `{"ok":true}`; probe user cleaned up,
  no test rows left behind.
- **Committed and pushed, verified with git, not with notes.** `main` is clean and exactly
  in sync with `origin/main` (0 ahead / 0 behind) through `754cec0`. The old "unpushed wip"
  worry is stale for good.
- **Builds green both platforms.** iOS: `-scheme Lingo-iOS -destination
  'generic/platform=iOS Simulator'` → BUILD SUCCEEDED. macOS: `-scheme Lingo-macOS
  -destination 'generic/platform=macOS'` → BUILD SUCCEEDED. Simulator never booted.

**Build gotcha, cost ~15 min today, don't repeat it.** The macOS target only builds via
`-scheme Lingo-macOS`. Building it with `-target Lingo-macOS` fails with
`unable to resolve module dependency: 'ConcurrencyExtras' / 'IssueReporting'` in
`swift-clocks`, because `-target` skips proper SPM package-graph resolution and
`ONLY_ACTIVE_ARCH` then expands to x86_64+arm64 with deps built for only one. It is **not**
a stale DerivedData problem (reproduced from a wiped DerivedData) and **not** a repo defect.
All three schemes (`Lingo-iOS`, `Lingo-macOS`, `LingoWidgetExtension`) are tracked in git and
present; `xcodegen generate` today was a byte-identical no-op.

Remaining before resubmit: nothing technical. Blocked only on the 2026-08-18 freeze, then
`asc versions attach-build` + `asc review submissions-submit --confirm`.

## macOS sign-in fix BUILT AND STAGED 2026-08-14

The 2.1(a) sign-in fix (`0ec5a2c`, 2026-08-13) was committed but had **never been built** , 
the newest build on the record was `202607271632` (Jul 27), two weeks older than the fix, so
every artifact Apple could see still had the bug. Rebuilt and uploaded today:

- Build **`202608141030`**, `MARKETING_VERSION` 1.1.3, scheme `Lingo-macOS`, Release.
- **Version string unified at 1.1.3.** The macOS record sat at 1.1.1 while iOS shipped 1.1.3
  off the same shared `MARKETING_VERSION`; a macOS build stamped 1.1.3 cannot attach to a
  1.1.1 version row. Since this is one Universal Purchase record, both platforms now track
  1.1.3 rather than forking the version string per platform.
- **Dead-demo-account hypothesis is disproven.** The prior leading theory was that
  `jatrommel@gmail.com` no longer signed in. Verified directly against the Supabase token
  endpoint on 2026-08-14: returns a valid `access_token`. The credentials are fine, the
  silent-nil path in `AuthStore.signIn` was the whole defect. Don't re-chase the demo account.
- **Verified staged 2026-08-14:** build `202608141030` is `VALID` on the main record
  (id `38d91fcc-02ae-414d-a71d-782ab1ba550e`), attached to version row
  `f9f6e627-0b7f-421a-9e85-50cfcdf96106`, now **MAC_OS 1.1.3
  `PREPARE_FOR_SUBMISSION`**. Nothing is in `WAITING_FOR_REVIEW`.
- **`asc versions create` will not work here**: it errors "You cannot create a new
  version of the App in the current state" while the rejected row is still open. The
  rejected row is editable: `asc versions update --version-id <id> --version 1.1.3`
  then `asc versions attach-build`. That's the path, don't retry create.
- **Ready to submit**: `asc validate` clean 2026-08-18. Held only until the four in-flight verdicts land.

Ruled out while investigating: macOS sandbox entitlements.
`com.apple.security.network.client` is present in `Sources/macOS/Lingo-macOS.entitlements`.

**Cross-app note:** the "one root cause, three apps" framing in the section below is wrong.
Verified 2026-08-14, sparkjar (dead `spark.heyitsmejosh.com` host, rebuilt 08-12) and
healstack (missing Supabase Info.plist config + `fatalError`, build `202608121022` VALID)
were both already fixed *and* staged. Lexly was the only one still missing a build.

## App Review rejection reason, READ FROM RESOLUTION CENTER 2026-08-12

Two Mac records, two different rejections. Both are macOS 1.1.1; iOS 1.1.3 is live and fine.

**Record `6783501611` (the real one), Guideline 2.1(a) App Completeness.** Reviewed
2026-08-04, MacBook Pro 14-inch, macOS 26.6, build 202607261932.

> Bug description: upon review we have found when we entered login details that the
> **Sign In will load briefly and then stops**.

**Record `6783501927` (the duplicate), two reasons.** Reviewed 2026-08-07, build 202607171509.

1. **Guideline 5.2.5, Legal, Intellectual Property.** *"Terms for Mac in the app name in an
   inappropriate manner."* The app record is literally named **"Lexly Mac"**, Apple treats
   "Mac" in the name as trademark misuse. **This record can never ship under that name.**
   Rename it, or delete the duplicate record (the standing plan) and ship macOS under the
   iOS record as a platform.
2. **Guideline 2.1, Information Needed.** The demo account in App Store Connect does not
   work: `jatrommel@gmail.com` / `Joshisrad4$!!`, *"We also received an error message when
   tried to sign up with own account."* Note those credentials match
   `project_dose_account_recovery` and are now known-bad to reviewers.

Sign-in failure is shared with healstack and sparkjar, one root cause, three apps.

Source: `asc web review show --app 6783501611 --apple-id trommatic@icloud.com` (needs `asc-login`;
the public API only returns a generic "unresolved issues" wrapper). Submissions frozen
The freeze lifted 2026-08-18; submission is now gated only on the four in-flight review verdicts.

## ASC state VERIFIED 2026-08-12 (`asc versions list`)

**iOS 1.1.3 is LIVE** (`READY_FOR_SALE`). **macOS 1.1.1 is `REJECTED` on both records** , 
the real one `6783501611` and the duplicate `6783501927`. Reason is Resolution-Center-only
(needs `asc-login`).

Freeze lifted 2026-08-18 (Guideline 5.6 suspension expired). Submitted that day and now
WAITING_FOR_REVIEW: Curvely iOS 1.2.0, Wiretext iOS 1.1.0, Wordroot iOS 1.0, Healstack iOS 2.3.4.
**Held pending those four verdicts, never a batch:** Sparkjar iOS+Mac, BCGD iOS+Mac, Wordroot Mac,
Lexly Mac. All six are `asc validate` clean (0 errors, 0 blocking) with a VALID build attached, so
each is one `asc review submit` away. Do not submit until the in-flight verdicts land.

## Email verification on signup + forgot-password flow

Lexly's signup/login UI in `js/lingo-app.js` handles basic authentication but lacks password-recovery and email-verification paths. Currently if a user forgets their password or wants account security via email verification, there's no path forward. Implement: (1) password-reset route that emails a time-limited reset token, (2) token verification before allowing a new password, (3) optional email-verification on signup (soft gate, existing accounts grandfathered, login never blocked). See sparkjar's `/api/auth/verify-email.js` + `/api/auth/password-reset.js` for a reference implementation and the mail.js helper. This requires backend API infrastructure that Lexly currently lacks, either extend the static-app model with a minimal Cloudflare Worker API, or migrate to a backend-driven architecture (more scope but enables other features like leaderboards/friends).

## Current release state (2026-08-06)
- **iOS**: 1.1.3 READY_FOR_DISTRIBUTION/shipped (build 202607271632 VALID, confirmed 2026-08-02). New icon, refreshed screenshots, What's New set.
- **macOS**: 1.1.1 REJECTED (notification 2026-08-04, submission `a91ea668-bb56-4a31-b722-d7c58782777c`, state UNRESOLVED_ISSUES, version id `f9f6e627-0b7f-421a-9e85-50cfcdf96106`). History: rejected 07-24 (bad support URL + 2.1 sign-in issue, support URL fixed 07-26), resubmitted 07-27 (submission `8c047c73`), the 08-02 "rejection" turned out to be a stuck reviewSubmission holding an orphaned deleted-IAP item (canceled + resubmitted, not a real content issue), now rejected again 08-04.
  - Ruled out: stale-deploy theory, macOS app bundles its catalog locally (`ContentStore.loadJSON` in `ios/Sources/Shared/ContentStore.swift:13`), doesn't fetch from the web, so the 2-week-stale website couldn't be the cause.
  - Leading unverified hypothesis: demo account. `jatrommel@gmail.com` was previously flagged failing sign-in (2.1) on the old standalone Lexly Mac record; the merged record likely declares the same credentials. Known-good password (per healstack recovery): `Joshisrad4$!!`. Verify login works, update review demo credentials if needed.

## Open, content & UI
- [ ] Landing page (`index.html`): user likes it, wants it "bumped more", no specific ask, needs a follow-up conversation on direction. (Separately: this landing page is the reference design to port to any other `~/Documents/Code` project still missing a matching one, needs a project-by-project survey, not started.)

## From Apple Notes (imported 2026-08-08)
- [ ] Course list icons (`CatalogView.swift:64`, `sfSymbol(for: subject.icon)`) need "bump/less generic" per note, currently plain SF Symbols mapped per subject; needs actual icon-set decisions (custom glyphs? different SF Symbol picks?), not a mechanical fix.
- [ ] Richen list/course icons (user wants them "bumped"/more visually rich).
- [ ] A UI glitch/visual artifact reported via screenshot (2026-07-21 brain dump), needs the actual image reviewed to diagnose, never triaged.
- [ ] "+" icon color complaint, **ruled out 2026-07-25**: no `+`/`fa-plus` exists anywhere except the Arithmetic course icon, styled identically to every other subject icon. Nothing uniquely wrong found; needs the actual screenshot to identify what the user meant before touching anything further.

## Open, content & courses
- [ ] Add more compute-related skills/courses beyond Computer Basics.
- [ ] Add more skills/games/science courses generally (content-expansion ask).
- [ ] Expand language courses beyond beginner to intermediate/expert levels.
- [ ] **Lessons should actually teach content before quizzing** — content-authoring job now, not UI (the UI side shipped 2026-09-12: an optional `explain` field renders in the feedback banner on both web and iOS/macOS, and the unit-intro tip/preview card now covers French's `u1`). French's `u1` (15 exercises) has real explanations; the other ~850 exercises across 11 languages and ~40 non-language courses still carry none. Needs a native-speaker/subject-matter pass per course, not a mechanical fill.
- [ ] Math subjects should match Duolingo's subject/grade structure, with the ability to switch back and forth between the two systems (iOS + Mac).
- [ ] Idea: integrate/copy the approach at calculus.academa.ai, LLM-driven interactive calculus tutor. Exploratory, no scope pinned down; needs a follow-up conversation on full integration vs. a Lexly feature inspired by it.
- [ ] School section (masterclasses + a year of tutor notes/assignments) is the only part of the app with personal custom content, user considering splitting it into its own standalone project. Needs a decision, not a code change.
- [ ] Masterclasses need a clearer/more prominent tab in the UI (currently buried).
- [ ] Confirm final, complete A+ masterclass for Biology 12.
- [ ] **Masterclass JSON generation from Uprighty summaries**, BLOCKED: converter execution times out on the full dataset (runtime hang, not a logic error). 15 book summaries converted, catalog entries + validator support added, all deployed live. Generation itself deferred pending investigation; plan file at `~/claude/plans/tldr-shorter-and-bang-zippy-cupcake.md`.
- [ ] Duolingo Grade 4 Unit 5 (Intro to LCM), ~40+ exercises pending sync, session budget constrained.

## Open, features (Codecademy/Duolingo parity research, 2026-07-16)
Already have: 40+ courses, spaced repetition, XP, streaks (+ freeze/repair), hearts, achievements, speech recognition, weekly XP quests, per-question progress pips, light/dark, PWA, Duolingo-style profile panel (avatar banner + stats grid, shipped 2026-08-02).
- [ ] Fractional/continuous progress bar, clarify with Joshua first: per-question pips (`n / total`) already exist and are visible; only a *smooth fill* variant (vs. discrete pips) is missing. If "fractional" meant the pip count, this is already done.
- [ ] A real "courses completed" count still needs each pack's lesson total, and packs load lazily (`getCourseProgress` returns `total: null` until a pack is cached, deliberately, it will not eagerly fetch all 41). Either persist per-course lesson totals into `content/catalog.json` at build time, or accept counting only cached packs. Decide before building the completion stat.
      NB 2026-08-19: `completed_subjects` is still pushed unconditionally in `showResults()` and
      remains a "courses started" list, deliberately untouched by the completion-gating fix above,
      since the profile stat and the `firstLesson` achievement both read it that way. Decide here.
- [ ] Skill-tree/unit gating: **lesson-level gating already exists**, `isLessonUnlocked` unlocks a lesson only when the previous one is complete. What is missing is UNIT-level gating (lock later units until the prior unit passes) and the path visualisation. (M)
- [ ] Placement/diagnostic test per course so advanced users can skip ahead. (M)
- [ ] Richer achievement/badge screen + course-completion certificate view. (S)
- [ ] Leaderboard (friends/weekly XP), needs a friend-graph/leaderboard backend; no schema exists yet. (M–L)
- [ ] Friends/following/followers + league/social features (Duolingo reference), same backend gap as leaderboard above, scope together. Needs its own session.
- [ ] "Practice Hub", free-practice mode across completed lessons for spaced-repetition reinforcement, separate from the linear course. (M)
- [ ] More listening/speaking exercise types (dictation, "speak this sentence"), reusing existing speech-recognition plumbing. (M)
- [ ] Lower priority: hearts-refill economy tuning, timed challenge mode. (S each)
- [ ] Illustrated character + speech bubble for translate exercises, needs illustration/audio assets Lexly doesn't have; asset-production task. Revisit if audio assets get added.
- [ ] App Store Custom Product Page or featuring nomination ("banner like Duolingo"), Custom Product Pages (up to 35, self-serve via ASC) vs. the Apple-curated editorial banner (featuring nomination form, not purchasable) are different things; determine which Josh means, then set one up via `asc` or submit a nomination.
- Explicitly skipped: Codecademy-style full code-execution sandbox (out of scope, high effort, low relevance to a language app); Duolingo mascot/illustrated skill-tree reskin (conflicts with no-gradients/no-mascot design taste, current minimal list-tree stays).

## From Notes.app (imported 2026-08-07)
- [ ] Mac OS issues flagged (from a bare Apple Note titled "Lexly / Mac OS / Issues", no detail text, screenshot attachment lost on export), likely related to the unresolved Mac rejection from 2026-08-04. Ask Josh for specifics next time this comes up.

## Known-broken tooling
- [ ] SwiftLint build-tool plugin wiring was removed from `project.yml` (`packages:`/`buildToolPlugins:`) after it broke the iOS 1.1.3 archive step (`Validate plug-in "SwiftLintBuildToolPlugin"` failure, headless archives can't grant the plugin's interactive trust prompt). If Lexly should keep SwiftLint, re-add and verify with `xcodebuild ... -skipPackagePluginValidation` before shipping.

## App Store submission freeze, LIFTED 2026-08-18
Freeze lifted 2026-08-18 (Guideline 5.6 suspension expired). Submitted that day and now
WAITING_FOR_REVIEW: Curvely iOS 1.2.0, Wiretext iOS 1.1.0, Wordroot iOS 1.0, Healstack iOS 2.3.4.
**Held pending those four verdicts, never a batch:** Sparkjar iOS+Mac, BCGD iOS+Mac, Wordroot Mac,
Lexly Mac. All six are `asc validate` clean (0 errors, 0 blocking) with a VALID build attached, so
each is one `asc review submit` away. Do not submit until the in-flight verdicts land.
- **CLOSED 2026-08-25** (superseded, the plan changed from renaming that record to deleting it (see the delete items below), and macOS now ships under the canonical record 6783501611, whose 1.1.4 is WAITING_FOR_REVIEW). Was: Lexly Mac (6783501927) REJECTED on two counts. **5.2.5 IP:** the record name "Lexly Mac" uses the term "Mac" inappropriately, rename the App Store record to drop "Mac". **2.1:** the demo account jatrommel@gmail.com / Joshisrad4$!! does not work for reviewers and sign-up also errors, fix production auth and re-verify the demo credentials by actually signing in with them.

## Decision 2026-08-10: merge Lexly Mac into one Universal Purchase record
Apple rejected "Lexly Mac" under 5.2.5, the name uses "Mac" inappropriately. Rather than
rename around it, collapse the two records. Voxprint (6782604262) already proved one app record
serves iOS + macOS via Universal Purchase, so the second record is what created the naming
problem in the first place.
- [ ] Once macOS ships under the Lexly record, delete the orphaned **Lexly Mac** record (6783501927). That retires the 5.2.5 rejection permanently instead of renaming around it., attempted 2026-08-17, rejected 409 on two dashboard-only prerequisites, see below.
- [ ] Record work done; freeze lifted 2026-08-18. Only the submit remains, held for the in-flight verdicts.

## 2026-08-10, the Universal Purchase merge is ALREADY DONE; only the duplicate deletion is left
Verified via the API tonight. The main **Lexly** record (6783501611, `com.nulljosh.lingo`)
already carries **MAC_OS 1.1.1** alongside iOS 1.1.3/1.1.2/1.1.1. So Lexly is already one record
serving both platforms, no merge work is needed.

The separate **Lexly Mac** record (6783501927, `com.nulljosh.lingo.mac`) is a pure duplicate. Its
only version is MAC_OS 1.1.1 REJECTED, nothing live, nothing to lose. It is also the record that
drew the 5.2.5 "Mac in the app name" rejection. Deleting it retires that rejection permanently
and removes a rejected record from the review queue.

Also verified: the App Review demo account `jatrommel@gmail.com` now signs in cleanly against the
shared Supabase project (HTTP 200), so the 2.1 "we couldn't sign in" half of that rejection looks
already resolved. The related Healstack demo account was genuinely broken and was fixed tonight , 
see healstack/roadmap.md; same shared database, different user row.

- [ ] Delete the duplicate `6783501927`, **RAN 2026-08-17, rejected by Apple with a 409. It is NOT a one-command delete; two dashboard-only prerequisites must be cleared first.**

  Command run (web session authenticated fine, 2FA accepted):
  `asc web apps delete --app 6783501927 --expected-bundle-id com.nulljosh.lingo.mac --confirm`

  Apple's response, `status 409, correlation_key=BQ5J5M4UT3K5YJ6HJVMZYOZYTM`:
  `codes=[STATE_ERROR.CANNOT_REMOVE_WITH_APP_STORE_AVAILABILITY, ENTITY_ERROR.ATTRIBUTE.INVALID.INVALID_STATE.IN_FLIGHT_REVIEW_SUBMISSIONS]`

  So two blockers, both **dashboard-only, verified there is no `asc` path for either**:
  1. **In-flight review submission.** `asc review submissions list --app 6783501927` shows `d4eda5d7-eb32-4495-ac8b-bcc34550a9f7`, MAC_OS, state `UNRESOLVED_ISSUES`, submitted 2026-08-07. (Two older ones are `COMPLETE` and harmless.) `asc review submissions` exposes only `list`, no cancel/withdraw. Must be removed from review in the ASC dashboard.
  2. **App Store availability record.** `asc web apps availability` exposes only `create`, not remove, matches the known availability dead-end. The app must be taken off sale / have its territories cleared in the dashboard.

  Order: clear the review submission, then remove availability, then re-run the delete command above. Nothing else about the merge is outstanding (see the two checked lines above, 6783501611 already carries MAC_OS 1.1.3 and the repo already builds `com.nulljosh.lingo`), so this record is inert in the meantime: no builds go to it, nothing depends on it.

## App Store screenshots (queued 2026-08-11)
`screenshots/` is hand-made PNGs (6.5/6.7/mac), last touched 2026-07-27, no harness.
Build one with the `appstore-screenshots` skill, then run. Copy the pattern from
`talli/ios`: Snapfile needs `xcargs("-skipPackagePluginValidation -skipMacroValidation")`,
and the mock must cover every network refresh path, not just `init`, see talli 7386f1d.

## From Apple Notes (imported 2026-08-11)
- [ ] iOS: login works but no success message / no visual feedback on button tap
- [ ] iOS: Settings is bare, login provides no actual information or data afterward
- [ ] iOS: add padding to app icon (or scale the glyph down)
- [x] Web landing page: screenshots are basic and mildly stale, refresh them (obsolete 2026-10-21: landing embeds the live app, no screenshots left)

> Resume note, RESOLVED 2026-08-13: the `wip: partial work from /work notes ingest` commit
> (`9513311`) has now been reviewed and build-verified on both platforms. Its auth changes are
> the success path the App Review rejection was about; keep them. It was also already pushed , 
> the "unpushed" claim was stale.

## Sign-in rejection, ROOT CAUSE FOUND AND FIXED 2026-08-13

**The reviewed build had no success path.** Build `202607261932` was cut from commit
`996cf9a` (2026-07-26 **19:30**), two minutes after that same commit first *added* sign-in
to Settings, so the feature was submitted without ever being run on a Mac. In that build
`AuthView.submit()` ended at `busy = false`: on a **successful** sign-in the spinner stopped
and nothing else happened, no dismiss, no navigation, no state change. The sheet just sat
there redisplaying the form. That is literally the reviewer's "the Sign In will load briefly
and then stops." Not a credential problem, not network, not entitlements.

Ruled out along the way, so nobody re-checks them:
- **Credentials fine.** `POST /auth/v1/token?grant_type=password` with
  `jatrommel@gmail.com` returns HTTP 200 and a valid access token (curled 2026-08-13).
- **Entitlements fine.** `com.apple.security.network.client` was added in that same
  `996cf9a` commit, 2 minutes *before* the build, so the reviewed build did have it.
- **Keychain fine.** supabase-swift's `KeychainLocalStorage` query (`kSecAttrAccessible`,
  no `kSecUseDataProtectionKeychain`) was probed directly on macOS 26: `SecItemAdd` returns
  `errSecSuccess`. Adding `kSecUseDataProtectionKeychain` is what *fails* (-34018), do not
  "fix" it that way.

**Fixed:**
- The missing success path was already closed by wip commit `9513311` (2026-08-11), which
  added `dismiss()` plus the "check your email to confirm" notice. Now build-verified on
  both platforms, that commit is good, treat it as reviewed.
- `AuthStore.signIn` still had the same silent-failure shape one layer down: it discarded
  `signIn`'s return and re-read `try? await supabase.auth.session`, so any storage/refresh
  failure left `session` nil while the call still "succeeded", sheet dismisses, UI stays
  signed out, nothing shown. Now assigns the `Session` that `signIn` returns directly, so a
  failure throws and surfaces in `errorMessage`. Same fix applied to `signUp` via
  `result.session`.

Verified: `xcodebuild` BUILD SUCCEEDED for Lingo-macOS and Lingo-iOS;
`node tools/validate-catalog.js` clean. Staged; freeze lifted 2026-08-18, submit held for in-flight verdicts.

Note the duplicate record `6783501927` failed 5.2.5 purely on the name "Lexly Mac"; that one
cannot ship under that name regardless of the auth fix.

## Stashed 2026-08-15

  **Rejected the `handle_new_user` trigger** this item originally suggested. `auth.users` is
  shared with epiphany/healstack/sparkjar, so the trigger would write lingo rows for users of
  three other apps who will never open lexly, and it would do nothing for anyone already
  stranded. The client-side lazy path has neither problem.

  `lingo_progress` was dropped from signup entirely rather than moved: `ContentStore.save()`
  (`ios/Sources/Shared/ContentStore.swift:84`) already upserts the complete row on every
  lesson, so a missing row self-heals on first activity and the signup write was pure
  duplication. `syncFromCloud()` already no-ops on a missing row.

  `ignoreDuplicates` (ON CONFLICT DO NOTHING) matters and is not cosmetic, `lingo_profiles`
  carries an **`is_pro`** column, so a plain upsert on every launch would reset paid users to
  free and clobber any rename made in Settings.

  Verified live against `tjsxsqlxjmanwvmywwvw`, not just built (probe user created then
  deleted via the `delete-account` edge function, sign-in afterwards → `invalid_credentials`,
  no residue):
  1. signup with `data:{display_name,avatar_id}` → metadata echoed back, and the JWT carries
     `user_metadata` (total token 1051 bytes, no meaningful bloat from the avatar data URI)
  2. `lingo_profiles` after signup → `[]`, confirming the signup path writes nothing
  3. lazy ensure (`POST …?on_conflict=id`, `Prefer: resolution=ignore-duplicates`) → 201, row
     created with the right name/avatar
  4. rename the row, re-run ensure → 201, row **still** reads the rename, exactly 1 row

  Confirmation-ON is reasoned, not directly exercised: that setting is project-wide on a
  shared project and must not be flipped to test. The mechanism is unchanged either way , 
  metadata lands on the auth user regardless, and the session simply arrives at first
  sign-in instead of at signup, hitting the same `loadProfile()` path.

  No committed test script: the only meaningful check mutates live auth state (creates and
  deletes a real user), which isn't worth shipping as a runnable file. The 4-step curl
  sequence above is the reproduction.

## Ingested 2026-08-18
- [x] Landing page: add dark mode support. Done 2026-10-21: index.html has a dark token block under prefers-color-scheme, and the only hard-coded colour left is the white label on the accent button.

## Found while working 2026-08-19
- [ ] **Delete the stray "Lexly Mac" ASC record 6783501927** (its only version is macOS 1.1.1
  REJECTED). The canonical record is 6783501611, which now carries iOS 1.1.3 READY_FOR_SALE and
  macOS 1.1.3 WAITING_FOR_REVIEW. The dashboard rejection badge people keep noticing is this dead
  duplicate, not the real app. App-record deletion is dashboard-only, blocked on an Apple web
  session (`asc web` SRP signin returned HTTP 503 all through 2026-08-19, before the 2FA step).
- [ ] **`scripts/deploy.sh` verify loop can't catch a stale image.** It md5-checks only
  `content/catalog.json`, `css/lingo.css`, `js/lingo-app.js`, so the marketing PNGs deployed
  above passed verification while the edge still served the old bytes for ~2 min. Add one image
  to the canary list (the script's own comment already warns that a content-only canary is the
  same failure wearing a new hat).

## From ASC session 2026-08-19
- [ ] **Delete stray ASC record 6783501927 (Lexly Mac, com.nulljosh.lingo.mac).**
  Progress 2026-08-19: in-flight submission d4eda5d7 cancelled successfully via
  `asc review submissions-update --id <id> --canceled=true --confirm`, so that
  blocker is cleared. Deletion still returns
  `STATE_ERROR.CANNOT_REMOVE_WITH_APP_STORE_AVAILABILITY`; clearing availability
  appears dashboard-only (Pricing and Availability -> remove from sale everywhere).
  Then: `asc web apps delete --app 6783501927 --expected-bundle-id com.nulljosh.lingo.mac --expected-name "Lexly Mac" --confirm`
  Safe: canonical Lexly 6783501611 (com.nulljosh.lingo) carries MAC_OS 1.1.3
  WAITING_FOR_REVIEW; the stray's 1.1.1 was never live.
- [ ] Do the 'remove from sale in all territories' step via Claude in Chrome rather than by hand, Joshua OK'd browser automation for this on 2026-08-19. It is the one genuinely dashboard-only step: `asc web apps availability` exposes only `create`, so there is no CLI path. Once availability is cleared the delete command above works.

## Braindump 2026-08-19
- [ ] Add a Discrete Mathematics course (logic, sets, combinatorics, graphs, proofs), needs curriculum scoping first.
- [ ] Copy more features from Brilliant and Duolingo (interactive problem cards, streaks, leagues, hearts/lives, daily goals), audit which are missing.

## Braindump 2026-08-19
- [ ] Scan/copy as much Duolingo content as possible, usage and session by session. Source state: math mostly done, language ~1/3 done, English perfect, a few other languages at level 10-15/100. User is done with Duolingo; port the content into Lexly.

## Ingested 2026-08-22
- **CLOSED 2026-08-25** (superseded, submission a91ea668 is COMPLETE; the record moved on to 1.1.4, which was rejected for an unrelated reason (China publishing permit) and has since been fixed and resubmitted as c7a51dfe). Was: **Lexly Mac rejection, Guideline 2.1(a) App Completeness** (submission a91ea668-bb56-4a31-b722-d7c58782777c, reviewed 2026-08-20, MacBook Pro 14" M4 / macOS 26.6.2, v1.1.3 build 202608141030). "We were unable to bypass the keychain request to access the app." The Mac build throws a blocking keychain prompt the reviewer cannot get past. Make keychain access optional / non-blocking at launch, or provide a path into the app that does not require it.
- **CLOSED 2026-08-25** (ANSWERED 2026-08-25, the weeks-long Mac stall had a cause, found by reading Resolution Center with a 2FA code: Guideline 2.1, book content listed in China mainland without an Internet Publishing License. Never a stale-build problem. China availability was dropped and 1.1.4 is now WAITING_FOR_REVIEW). Was: From Notes: "Weeks of trying to refresh this app submission with no luck. Latest build is like 3 weeks aka stale." iOS 1.1.3 is READY_FOR_DISTRIBUTION and its submission is COMPLETE, the stall is the Mac record, blocked by the keychain bug above.

## 2026-08-23, delete the Lexly Mac duplicate record
Lexly Mac (ASC 6783501927, com.nulljosh.lingo.mac) was merged into Lexly (6783501611); macOS
now ships from the main record (1.1.4 Waiting for Review). The duplicate sits at 1.1.1 Rejected
for two reasons, read verbatim 2026-08-23 from submission d4eda5d7:
- 5.2.5 Legal: Intellectual Property, "Terms for Mac in the app name in an inappropriate manner".
- 2.1 Information Needed, the demo account in App Review Information (jatrommel@gmail.com) would
  not sign in, and sign-up errored too.
Neither is worth fixing on a record that should not exist.
- [ ] Ask Apple Developer Support to delete app record 6783501927.
- [ ] Regardless: verify the demo account on the surviving Lexly record actually signs in, since
      the same credentials are likely reused there.

## Ingested 2026-08-24

- [ ] **Hero animation pass** (Notes 2026-08-24). Reference: bookrank's hero animation, same style/vibe. Subject: **words in different languages**. Plus: generate a mascot in the spirit of Duolingo's, add it to the app with minor animations.

## Someday / Explore

- [ ] **Port the scrolling-languages hero animation to every project.** From Notes 2026-08-24: "I like the animation of the scrolling text of different languages. Can we apply that across all projects? It's awesome. Super original or semi original idea." Lexly is the source of the effect. Known wanters: Voxprint (voxprint/roadmap.md), Talli, Wordroot (wordroot/roadmap.md:137 hero animation pass). The per-project swap is the *content* of the scroll (languages for Lexly, words for Wordroot, etc.), not the mechanism. Right home is the shared Jaybulb `tokens.css` / design-system layer so it is written once, do not fork a copy into each repo.

## From Apple Notes (imported 2026-08-25)

- [ ] Add animation to the splash screen. If the app takes even a second to load there should be a logo or mascot animation.
- [ ] Make list item icons more rich and relevant to their content.
- [ ] All list items (even nested within views) should have rich icons.
- [ ] Build a bot / reviewer / test suite that goes through all the courses and bangs them out. Should run behind an account and max out XP.
- [ ] Needs more lessons and better UI.
- [ ] Settings: when signed in should show user details, and have a profile tab (social aspect) showing XP etc.
- [ ] Add intermediate and expert to all courses. There should be like 5-10 levels, not 3.

## From screenshot pass (2026-08-27)
- [ ] `content/notes/becoming-steve-jobs-masterclass.json` opens with an internal working note ("this batch picks up well past the previously-summarized material... pages 130-273 is still unphotographed"). That is author scaffolding, not reader content, strip it before that book is ever screenshotted or featured.
- [ ] Content typo: Good Feng Shui summary lists a book as "If Itsdam for Modern Times", almost certainly a garbled OCR of a real Eva Wong title. Verify and correct.
- [ ] The floating Learn/Settings tab bar overlaps the last line of scrolling summary text (visible in every summary screenshot). Needs bottom content inset equal to the bar height.

## From Notes (imported 2026-08-27)
- [ ] **Decide: purge the dead Resend key from git history?** Not done deliberately, it needs a `git filter-repo` rewrite of 22+ commits plus a force-push to a public repo (breaks every existing clone), for a string that is already invalid and unusable. Security value is nil; only reason to do it is tidiness. Joshua's call.

- [ ] Reposition Lexly before any iOS resubmit: lead with the BC school-curriculum angle (PC12, AP Bio 12) in name/subtitle/screenshots/first-run, not streaks and hearts. Gamification stays, but it stops being the pitch. Cosmetic metadata edits are exhausted as a lever.

## 2026-08-30 Landing page gaps resolved

The earlier gaps have been addressed:
- Hero screenshots showing pre-auth-gate catalog: no longer an issue since the demo lesson at /app/?demo=1 shows what visitors actually encounter
- No screenshot of an actual lesson: the demo lesson provides a playable example of all five exercise types
- No social proof: unavailable to honestly show (0 App Store reviews, 0 GitHub stars), but the demo lets visitors experience the product themselves rather than seeing fake testimonials

## Ingested 2026-10-16
- [ ] Very neglected app. Stale name and screenshots on the App Store: live listing is still Lexly 1.1.3 with old screenshots. (screenshots: notes/attachments/2026-10-16/lexly-1.png, notes/attachments/2026-10-16/tonchi-2.png)
- [x] Needs iPad testing. iOS 1.1.6 was rejected 2.1.0 App Completeness; the reviewer's iPad screenshot shows the sign-in screen with "Nonces mismatch". (screenshots: notes/attachments/2026-10-16/tonchi-3.png, notes/attachments/2026-10-16/tonchi-4.png) Fixed 2026-10-21 in build 202610210745 (nonce matched by hash), resubmitted. Mac build still has the old code.

## Ingested 2026-10-21
- [x] Stale names all over, repo and App Store are super stale (GitHub repo still says "Tonchi", latest release is "lexly v1.1.5", homepage tonchi.jaybulb.com). (screenshot: notes/attachments/2026-10-21/patois-1.png) Done 2026-10-21: GitHub description, homepage and release title, repo docs and store URLs now say Patois and patois.jaybulb.com; listing name Patois ships with 1.1.6.
