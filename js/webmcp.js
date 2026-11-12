// WebMCP tool registration for Patois. Exposes the course catalog, progress and
// lesson navigation to in-browser agents via document.modelContext.
//
// ponytail: tools call the accessors lingo-app.js already exports on window.
// Learning progress is only written by actually answering questions, so there
// is no tool that fakes XP or marks a lesson complete.
(function () {
    const mc = document.modelContext;
    if (!mc?.registerTool) return; // browser without WebMCP support

    const SUBJECT = { type: 'string', description: 'Subject id from list_courses' };

    const TOOLS = [
        // ---- read-only ---------------------------------------------------
        {
            name: 'list_courses',
            description: 'List the course catalog: categories and the subjects inside each.',
            inputSchema: {
                type: 'object',
                properties: { category: { type: 'string', description: 'Only subjects in this category' } }
            },
            execute: async ({ category } = {}) => {
                const cats = await window.patoisCatalog();
                const entries = Object.entries(cats).filter(([id]) => !category || id === category);
                return {
                    categories: entries.map(([id, c]) => ({
                        id,
                        title: c.title,
                        subjects: (c.subjects || []).map(s => ({ id: s.id, name: s.name, level: s.level }))
                    }))
                };
            }
        },
        {
            name: 'get_progress',
            description: "Get the learner's overall progress: XP, streak, hearts, weekly goal and unlocked trophies.",
            inputSchema: { type: 'object', properties: {} },
            execute: async () => window.patoisProgress()
        },
        {
            name: 'get_course_progress',
            description: 'Get lessons completed and cards due for review in one subject. `total` is null until that course pack has been loaded.',
            inputSchema: { type: 'object', properties: { subjectId: SUBJECT }, required: ['subjectId'] },
            execute: async ({ subjectId }) => window.patoisCourseProgress(subjectId)
        },
        {
            name: 'get_due_reviews',
            description: 'Count spaced-repetition cards due now, per subject or across every subject already loaded.',
            inputSchema: { type: 'object', properties: { subjectId: { ...SUBJECT, description: 'Omit for every loaded subject' } } },
            execute: async ({ subjectId } = {}) => window.patoisDueReviews(subjectId)
        },

        // ---- reversible state changes ------------------------------------
        {
            name: 'open_course',
            description: 'Open a subject\'s skill tree so the learner is looking at it.',
            inputSchema: { type: 'object', properties: { subjectId: SUBJECT }, required: ['subjectId'] },
            execute: async ({ subjectId }) => window.patoisOpenCourse(subjectId)
        },
        {
            name: 'start_lesson',
            description: 'Start a lesson. The learner answers the questions themselves — this only opens it.',
            inputSchema: {
                type: 'object',
                properties: {
                    subjectId: SUBJECT,
                    lessonId: { type: 'string', description: 'Lesson id from the skill tree; omit for a mixed review session' }
                },
                required: ['subjectId']
            },
            execute: async ({ subjectId, lessonId }) => window.patoisStartLesson(subjectId, lessonId)
        },
        {
            name: 'go_home',
            description: 'Return the app to the home screen.',
            inputSchema: { type: 'object', properties: {} },
            execute: async () => { window.resetToHome(); return { ok: true }; }
        }
    ];

    (async () => {
        for (const tool of TOOLS) {
            try { await mc.registerTool(tool); }
            catch (err) { console.warn('[webmcp] failed to register', tool.name, err?.message); }
        }
    })();
})();
