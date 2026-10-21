# Patois API

Patois is a client-side learning app. Course content is static JSON under
`/content` and progress lives in `localStorage`, mirrored to Supabase with the
user's own session. There is no REST API of its own; the agent-facing interface
is WebMCP.

## Content endpoints

Plain static files, no auth:

- `GET /content/catalog.json` — categories and their subjects
- `GET /content/courses/:subjectId.json` — one course pack (units → lessons → exercises)

## WebMCP

With the app open, Patois registers tools on `document.modelContext`.
Source: `js/webmcp.js`, backed by the `window.lexly*` accessors at the bottom of
`js/lingo-app.js`.

### Read-only

| Tool | Does |
|---|---|
| `list_courses` | The catalog; filter with `category` |
| `get_progress` | XP, streak, hearts, weekly goal, trophies, lessons completed |
| `get_course_progress` | Lessons done, total and cards due for one subject |
| `get_due_reviews` | Spaced-repetition cards due, per subject or across loaded subjects |

### Reversible writes

| Tool | Does |
|---|---|
| `open_course` | Open a subject's skill tree |
| `start_lesson` | Start a lesson (or a mixed review session if `lessonId` is omitted) |
| `go_home` | Return to the home screen |

`get_course_progress` returns `total: null` for a course whose pack has not been
fetched yet — packs load lazily and there are 41 of them.

There is deliberately no tool that awards XP, completes a lesson or unlocks a
trophy. Progress is only ever written by actually answering questions, so an
agent cannot inflate it.
