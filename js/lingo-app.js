const TROPHIES = {
    firstLesson: { name: 'First Steps', desc: 'Complete your first lesson', icon: 'fa-solid fa-shoe-prints' },
    perfectLesson: { name: 'Perfectionist', desc: 'Score 10/10 on a lesson', icon: 'fa-solid fa-crown' },
    streak3: { name: 'On Fire', desc: 'Reach a 3-day streak', icon: 'fa-solid fa-fire' },
    streak7: { name: 'Dedicated', desc: 'Reach a 7-day streak', icon: 'fa-solid fa-calendar-check' },
    streak30: { name: 'Unstoppable', desc: 'Reach a 30-day streak', icon: 'fa-solid fa-bolt' },
    xp100: { name: 'Learner', desc: 'Earn 100 XP', icon: 'fa-solid fa-star' },
    xp500: { name: 'Scholar', desc: 'Earn 500 XP', icon: 'fa-solid fa-graduation-cap' },
    xp1000: { name: 'Master', desc: 'Earn 1000 XP', icon: 'fa-solid fa-hat-wizard' },
    polyglot: { name: 'Polyglot', desc: 'Study 3 language tracks', icon: 'fa-solid fa-language' },
    mathWiz: { name: 'Math Wizard', desc: 'Complete every math topic', icon: 'fa-solid fa-calculator' },
    explorer: { name: 'Explorer', desc: 'Try 10 different subjects', icon: 'fa-solid fa-compass' },
    gamer: { name: 'Gamer', desc: 'Play 3 different games', icon: 'fa-solid fa-gamepad' },
    snakemaster: { name: 'Snake Charmer', desc: 'Score 100+ in Snake', icon: 'fa-solid fa-worm' },
    puzzler: { name: 'Puzzler', desc: 'Score 500+ in 2048', icon: 'fa-solid fa-table-cells-large' },
    minesweep: { name: 'Bomb Squad', desc: 'Win Minesweeper', icon: 'fa-solid fa-bomb' },
    memory: { name: 'Elephant', desc: 'Complete Memory in under 12 moves', icon: 'fa-solid fa-brain' },
    checkmate: { name: 'Grandmaster', desc: 'Win a chess game', icon: 'fa-solid fa-chess-king' }
};

const AVATAR_PRESETS = [
    { id: 'falcon', emoji: 'F', label: 'Falcon' },
    { id: 'fox', emoji: 'X', label: 'Fox' },
    { id: 'otter', emoji: 'O', label: 'Otter' },
    { id: 'panda', emoji: 'P', label: 'Panda' },
    { id: 'frog', emoji: 'R', label: 'Frog' },
    { id: 'tiger', emoji: 'T', label: 'Tiger' }
];

const LANG_CODES = {
    spanish: 'es-ES',
    french: 'fr-FR',
    german: 'de-DE',
    italian: 'it-IT',
    portuguese: 'pt-BR',
    japanese: 'ja-JP',
    chinese: 'zh-CN',
    korean: 'ko-KR',
    russian: 'ru-RU',
    arabic: 'ar-SA',
    hindi: 'hi-IN',
    dutch: 'nl-NL',
    turkish: 'tr-TR',
    polish: 'pl-PL',
    swedish: 'sv-SE',
    greek: 'el-GR',
    hebrew: 'he-IL',
    vietnamese: 'vi-VN',
    indonesian: 'id-ID',
    ukrainian: 'uk-UA',
    czech: 'cs-CZ',
    danish: 'da-DK',
    finnish: 'fi-FI',
    norwegian: 'nb-NO',
    hungarian: 'hu-HU',
    romanian: 'ro-RO',
    thai: 'th-TH',
    persian: 'fa-IR',
    bulgarian: 'bg-BG',
    catalan: 'ca-ES',
    croatian: 'hr-HR',
    serbian: 'sr-RS',
    slovak: 'sk-SK',
    lithuanian: 'lt-LT',
    estonian: 'et-EE',
    icelandic: 'is-IS',
    malay: 'ms-MY',
    bengali: 'bn-IN',
    basque: 'eu-ES',
    galician: 'gl-ES',
    macedonian: 'mk-MK',
    slovenian: 'sl-SI',
    albanian: 'sq-AL',
    georgian: 'ka-GE'
};

const LANGUAGE_SUBJECTS = new Set(Object.keys(LANG_CODES));

// Catalog + lazy course packs (replaces the old inline lingo-data.js globals).
// categories is filled from content/catalog.json; questions caches loaded packs.
let categories = {};
const questions = {};
const PACK_CACHE = {};

const PROFILE_KEY = 'lingo.profile';
const PROGRESS_KEY = 'lingo.progress';
const SRS_KEY = 'lingo.srs';
const WORDS_KEY = 'lingo.words';

// ponytail: UI hint only -- the server gate is Basic auth, this cookie grants nothing.
function setAuthCookie() {
    document.cookie = 'lingo_authed=1; path=/; max-age=' + (60 * 60 * 24 * 30) + '; SameSite=Strict';
}
function clearAuthCookie() {
    document.cookie = 'lingo_authed=; path=/; max-age=0';
}

// The client loads from our own /js/spark-client.js, but keep the degrade path: if it is missing,
// `sb` is null and auth is unavailable instead of the whole app dying at module scope.
const sb = window.spark ? window.spark.createClient('https://api.jaybulb.com') : null;

// A reset link lands here with ?recovery_token=...; the client announces it and we ask for the new password.
function showRecoveryForm() {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999';
    o.innerHTML = '<form style="background:var(--card,#fff);color:inherit;padding:1.5rem;border-radius:12px;display:grid;gap:.75rem;min-width:280px"><strong>Choose a new password</strong><input type="password" minlength="8" required placeholder="New password (8+ characters)" autocomplete="new-password"><button class="btn" type="submit">Save password</button><span class="auth-feedback"></span></form>';
    o.querySelector('form').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const { error } = await sb.auth.updateUser({ password: ev.target.querySelector('input').value });
        if (error) { ev.target.querySelector('.auth-feedback').textContent = error.message; return; }
        o.remove();
        location.reload();
    });
    document.body.appendChild(o);
}
if (sb) sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') showRecoveryForm(); });

let currentUser = null;
let userIsPro = false;
// ponytail: owner account always gets Pro perks, no purchase flow to test against
const ADMIN_EMAILS = ['trommatic@icloud.com'];

const DEFAULT_PROGRESS = {
    xp: 0,
    streak: 0,
    hearts: 5,
    completed_subjects: [],
    lessons_completed: {},
    trophy_ids: [],
    last_played: '',
    // Local-only fields (not synced to the server, see saveProgress's whitelist).
    streak_freezes: 0,
    weekly_xp: 0,
    week_start: ''
};

const WEEKLY_XP_GOAL = 150;

// Monday-anchored ISO date string for "start of this week", used to detect
// week rollovers for the weekly XP quest without pulling in a date library.
function currentWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - day);
    // Local calendar date, not toISOString() (which is UTC and can land on
    // the wrong day near midnight in negative-UTC-offset zones).
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

let recognition = null;
let isListening = false;
let selectedAuthAvatar = AVATAR_PRESETS[0].id;

let localProfile = null;

// A lesson is crowned only if the learner actually got enough right. 0.6 matches
// the heart economy already in place: with 5 hearts and 10 questions the fifth
// wrong answer ends the lesson, so any survivor already has >= 6/10. It only
// changes the outcome for short packs, where surviving proved nothing.
const LESSON_PASS_RATIO = 0.6;

function lessonPassed(correctAnswers, totalQuestions, hearts) {
    if (hearts <= 0) return false;
    if (!totalQuestions) return false;
    return correctAnswers >= Math.ceil(totalQuestions * LESSON_PASS_RATIO);
}

let gameState = {
    selectedCategory: 'languages',
    selectedSubject: null,
    currentQuestion: 0,
    totalQuestions: 10,
    correctAnswers: 0,
    xp: 0,
    streak: 0,
    hearts: 5,
    currentAnswer: null,
    answered: false,
    answerWords: [],
    lessonQuestions: [],
    currentQuestionData: null,
    completedSubjects: [],
    selectedLesson: null,
    placement: null,
    retried: new Set()
};

// `/app/?demo=1` plays one real lesson with no account, so the landing page can
// prove the product instead of describing it. It uses the real renderers -- a
// separate demo widget would drift from them -- and writes nothing: see the DEMO
// guards in saveProgress and saveSrsData.
const DEMO = new URLSearchParams(location.search).has('demo');
// Course to play in demo mode. Generated lessons carry all five exercise types in
// order (translation, cloze, word bank, listening, match), so one lesson shows
// everything the landing page claims.
const DEMO_SUBJECT = 'spanish';
const DEMO_LESSON = 't1l1';

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    setupEventListeners();
    setupKeyboardNav();
    setupTouchGestures();
    initSpeechRecognition();
    updateStats();
    await loadCatalog();
    if (DEMO) { startDemo(); return; }
    initializeApp();
});

// Deliberately bypasses the auth gate. The gate lives at a single choke point in
// renderSubjects, and nothing downstream of it re-checks -- so calling startLesson
// directly is a chosen exception, not an oversight. Don't "fix" it by adding a
// check here without also giving the landing page another way to demo.
function startDemo() {
    document.body.classList.add('demo');
    gameState.selectedSubject = DEMO_SUBJECT;
    gameState.hearts = 5;
    startLesson(DEMO_LESSON);
}

// Fetch the course catalog (course metadata only, not lesson content).
async function loadCatalog() {
    try {
        const res = await fetch('/content/catalog.json');
        const data = await res.json();
        categories = data.categories || {};
    } catch (_) {
        categories = {};
    }
}

function findSubjectMeta(subjectId) {
    for (const cat of Object.values(categories)) {
        const found = (cat.subjects || []).find((subject) => subject.id === subjectId);
        if (found) return found;
    }
    return null;
}

// Lazily fetch and flatten a course pack into the SRS-ready exercise array.
// Teaching overlay: content/teach/<course>.json adds a unit tip, a lesson intro with worked examples,
// a recap line per lesson, and a "why" per exercise, without touching the generated course file.
function applyTeach(pack, overlay) {
    const lessons = overlay.lessons || {};
    const why = overlay.explain || {};
    (pack.units || []).forEach((unit) => {
        if (overlay.units && overlay.units[unit.id] && overlay.units[unit.id].tip) unit.tip = overlay.units[unit.id].tip;
        (unit.lessons || []).forEach((lesson) => {
            if (lessons[lesson.id]) lesson.teach = lessons[lesson.id];
            (lesson.exercises || []).forEach((ex) => { if (ex.id && why[ex.id] && !ex.explain) ex.explain = why[ex.id]; });
        });
    });
}

async function loadCourse(subjectId) {
    if (questions[subjectId]) return questions[subjectId];
    const meta = findSubjectMeta(subjectId);
    const path = meta && meta.packPath ? meta.packPath : `/content/courses/${subjectId}.json`;
    let pack;
    try {
        const res = await fetch(path);
        pack = await res.json();
    } catch (_) {
        questions[subjectId] = [];
        return questions[subjectId];
    }
    try {
        const taught = await fetch(`/content/teach/${subjectId}.json`);
        if (taught.ok) applyTeach(pack, await taught.json());
    } catch (_) { /* no teaching overlay for this course yet */ }
    const flat = [];
    (pack.units || []).forEach((unit) => {
        (unit.lessons || []).forEach((lesson) => {
            (lesson.exercises || []).forEach((exercise) => flat.push(exercise));
        });
    });
    flat.forEach((exercise, index) => {
        if (!exercise.id) exercise.id = `${subjectId}_${index}`;
    });
    questions[subjectId] = flat;
    PACK_CACHE[subjectId] = pack;
    return flat;
}

function isAuthed() {
    return Boolean(currentUser);
}

async function initializeApp() {
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    if (session) {
        currentUser = session.user;
        setAuthCookie();
        await hydrateFromDb(session.user.id);
    }
    localProfile = loadProfile();
    if (localProfile) {
        syncGameStateFromProgress();
        updateHeaderProfile();
        updateStats();
    }
    updateShellForAuth();
    renderSubjects(gameState.selectedCategory);
}

async function hydrateFromDb(uid) {
    const [{ data: prof }, { data: prog }] = await Promise.all([
        sb.from('lingo_profiles').select('*').eq('id', uid).maybeSingle(),
        sb.from('lingo_progress').select('*').eq('id', uid).maybeSingle(),
    ]);
    if (prof) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ display_name: prof.display_name, avatar_id: prof.avatar_id }));
        userIsPro = !!prof.is_pro || ADMIN_EMAILS.includes(currentUser?.email);
    }
    if (prog) {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({
            xp: prog.xp, streak: prog.streak, hearts: prog.hearts,
            completed_subjects: prog.completed_subjects,
            lessons_completed: prog.lessons_completed,
            trophy_ids: prog.trophy_ids,
            last_played: prog.last_played || '',
        }));
        if (prog.srs) localStorage.setItem(SRS_KEY, JSON.stringify(prog.srs));
    }
}

function loadProfile() {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
}

function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (currentUser) {
        sb.from('lingo_profiles').upsert({ id: currentUser.id, ...profile }).then(() => {});
    }
}

// Migrate legacy flat "subjectId/lessonId" string keys (which could collide
// across courses if either id ever contained a "/") into a per-subject nested
// map: { [subjectId]: { [lessonId]: true } }. Safe to run on already-migrated data.
function migrateLessonsCompleted(lessonsCompleted) {
    const migrated = {};
    Object.entries(lessonsCompleted || {}).forEach(([key, value]) => {
        if (!value) return;
        const slash = key.indexOf('/');
        if (slash === -1) {
            // Already nested: { subjectId: { lessonId: true, ... } }
            migrated[key] = { ...(migrated[key] || {}), ...value };
            return;
        }
        const subjectId = key.slice(0, slash);
        const lessonId = key.slice(slash + 1);
        if (!migrated[subjectId]) migrated[subjectId] = {};
        migrated[subjectId][lessonId] = true;
    });
    return migrated;
}

function loadProgress() {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    try {
        const parsed = { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
        parsed.lessons_completed = migrateLessonsCompleted(parsed.lessons_completed);
        return parsed;
    } catch (_) { return { ...DEFAULT_PROGRESS }; }
}

function saveProgress(patch) {
    if (DEMO) return;
    const current = loadProgress();
    const next = { ...current, ...patch };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    if (currentUser) {
        sb.from('lingo_progress').upsert({
            id: currentUser.id,
            xp: next.xp, streak: next.streak, hearts: next.hearts,
            completed_subjects: next.completed_subjects,
            lessons_completed: next.lessons_completed,
            trophy_ids: next.trophy_ids,
            last_played: next.last_played || null,
            srs: getSrsData(),
            updated_at: new Date().toISOString(),
        }).then(() => {});
    }
}

function syncGameStateFromProgress() {
    const progress = loadProgress();
    gameState.xp = progress.xp;
    gameState.streak = progress.streak;
    gameState.hearts = progress.hearts;
    gameState.completedSubjects = [...progress.completed_subjects];
}

function getUnlockedAchievements() {
    return loadProgress().trophy_ids;
}

function getSrsData() {
    const raw = localStorage.getItem(SRS_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (_) { return {}; }
}

function saveSrsData(srs) {
    if (DEMO) return;
    localStorage.setItem(SRS_KEY, JSON.stringify(srs));
}

// Standard SM-2 spaced-repetition scheduler (SuperMemo 2). `quality` is 0-5,
// where >=3 counts as a correct recall. First two correct reps get fixed
// 1-day/6-day intervals; after that the interval grows by the card's easiness
// factor each time. Any lapse (quality < 3) resets repetitions and interval
// to start over, but does NOT reset easiness -- the 1.3 floor and the formula
// below are SM-2's own constants, not tuned here. This card shape (`easiness`,
// `interval`, `repetitions`, `nextReview`) is shared with the iOS/macOS app
// via the `srs` column, so it must not change independently there.
function updateSrs(questionId, quality) {
    const srs = getSrsData();
    const card = srs[questionId] || { easiness: 2.5, interval: 1, repetitions: 0, nextReview: new Date().toISOString() };

    if (quality >= 3) {
        if (card.repetitions === 0) card.interval = 1;
        else if (card.repetitions === 1) card.interval = 6;
        else card.interval = Math.round(card.interval * card.easiness);
        card.repetitions += 1;
    } else {
        card.repetitions = 0;
        card.interval = 1;
    }

    card.easiness = Math.max(1.3, card.easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    const next = new Date();
    next.setDate(next.getDate() + card.interval);
    card.nextReview = next.toISOString();
    srs[questionId] = card;
    saveSrsData(srs);
}

// Word-strength: per-subject { word: { seen, correct } }, local-only like the SRS data.
// ponytail: tokenises the answer text only; weak = seen >= 2 and under 60% right.
function getWordData() {
    try { return JSON.parse(localStorage.getItem(WORDS_KEY)) || {}; } catch (_) { return {}; }
}

function wordsOf(text) {
    return typeof text === 'string' ? text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [] : [];
}

function updateWords(subjectId, question, isCorrect) {
    if (DEMO || !subjectId || !['translation', 'cloze', 'listening', 'sentence'].includes(question.type)) return;
    const data = getWordData();
    const subject = data[subjectId] || (data[subjectId] = {});
    new Set(wordsOf(question.answer)).forEach((word) => {
        const entry = subject[word] || (subject[word] = { seen: 0, correct: 0 });
        entry.seen += 1;
        if (isCorrect) entry.correct += 1;
    });
    localStorage.setItem(WORDS_KEY, JSON.stringify(data));
}

function hasWeakWord(subjectWords, question) {
    return wordsOf(question.answer).some((word) => {
        const entry = subjectWords[word];
        return entry && entry.seen >= 2 && entry.correct / entry.seen < 0.6;
    });
}

function getDueCount(subjectId) {
    const srs = getSrsData();
    const subjectQuestions = questions[subjectId] || [];
    const now = new Date();
    return subjectQuestions.filter((question) => {
        const card = srs[question.id];
        return card && new Date(card.nextReview) <= now;
    }).length;
}

// Completed-lesson tally for a course card. The total is only known once the
// pack has been fetched (packs load lazily), so callers must handle total=null.
// ponytail: degrades like getDueCount rather than eagerly fetching all 41 packs.
function getCourseProgress(subjectId) {
    const done = Object.keys(loadProgress().lessons_completed[subjectId] || {}).length;
    const pack = PACK_CACHE[subjectId];
    if (!pack) return { done, total: null };
    let total = 0;
    (pack.units || []).forEach((unit) => { total += (unit.lessons || []).length; });
    return { done, total };
}

// Placement test: two questions from each of up to five evenly spaced units. Passing a
// probe unit (all its questions right) skips every unit up to and including it, in order.
// ponytail: all-right-or-stop is crude and a typo costs a unit, tune the bar with real data.
function startPlacement() {
    const units = PACK_CACHE[gameState.selectedSubject].units || [];
    const n = Math.min(5, units.length);
    const placement = { questions: [], unitOf: {}, asked: {}, right: {}, probes: [] };
    for (let i = 0; i < n; i += 1) {
        const u = Math.round(i * (units.length - 1) / Math.max(n - 1, 1));
        const pool = [];
        (units[u].lessons || []).forEach((lesson) => pool.push(...getLessonExercises(gameState.selectedSubject, lesson.id)));
        const picked = shuffle(pool).slice(0, 2);
        if (!picked.length) continue;
        placement.probes.push(u);
        placement.asked[u] = picked.length;
        picked.forEach((question) => { placement.unitOf[question.id] = u; });
        placement.questions.push(...picked);
    }
    startLesson(null, false, placement);
}

function getWeakQuestions(subjectId) {
    const weakWords = getWordData()[subjectId] || {};
    return (questions[subjectId] || []).filter((question) => hasWeakWord(weakWords, question));
}

function getQuestionsForLesson(subjectId, subset) {
    // When a skill-tree lesson is chosen, play exactly its exercises; otherwise
    // draw from the whole subject (review mode), due cards first.
    if (Array.isArray(subset)) {
        const ordered = [...subset];
        shuffle(ordered);
        return ordered;
    }
    const subjectQuestions = questions[subjectId] || [];
    const srs = getSrsData();
    const now = new Date();
    const weakWords = getWordData()[subjectId] || {};
    const due = [];
    const weak = [];
    const rest = [];

    subjectQuestions.forEach((question) => {
        const card = srs[question.id];
        if (card && new Date(card.nextReview) <= now) due.push(question);
        else if (hasWeakWord(weakWords, question)) weak.push(question);
        else rest.push(question);
    });

    shuffle(due);
    shuffle(weak);
    shuffle(rest);
    return [...due, ...weak, ...rest].slice(0, gameState.totalQuestions);
}

function saveAchievement(id) {
    const progress = loadProgress();
    if (progress.trophy_ids.includes(id)) return;
    saveProgress({ trophy_ids: [...progress.trophy_ids, id] });
    showAchievementToast(id);
}

function checkAchievements() {
    const completed = gameState.completedSubjects;
    const unlocked = getUnlockedAchievements();

    if (completed.length > 0 && !unlocked.includes('firstLesson')) saveAchievement('firstLesson');
    if (gameState.streak >= 3 && !unlocked.includes('streak3')) saveAchievement('streak3');
    if (gameState.streak >= 7 && !unlocked.includes('streak7')) saveAchievement('streak7');
    if (gameState.streak >= 30 && !unlocked.includes('streak30')) saveAchievement('streak30');
    if (gameState.xp >= 100 && !unlocked.includes('xp100')) saveAchievement('xp100');
    if (gameState.xp >= 500 && !unlocked.includes('xp500')) saveAchievement('xp500');
    if (gameState.xp >= 1000 && !unlocked.includes('xp1000')) saveAchievement('xp1000');

    const langSubjects = completed.filter((subjectId) => LANGUAGE_SUBJECTS.has(subjectId));
    if (langSubjects.length >= 3 && !unlocked.includes('polyglot')) saveAchievement('polyglot');

    const mathIds = categories.math.subjects.map((subject) => subject.id);
    if (mathIds.every((id) => completed.includes(id)) && !unlocked.includes('mathWiz')) saveAchievement('mathWiz');
    if (completed.length >= 10 && !unlocked.includes('explorer')) saveAchievement('explorer');
}

function showAchievementToast(id) {
    const trophy = TROPHIES[id];
    if (!trophy) return;
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.setAttribute('role', 'alert');
    const iconDiv = document.createElement('div');
    iconDiv.className = 'achievement-toast-icon';
    const iconEl = document.createElement('i');
    iconEl.className = trophy.icon;
    iconDiv.appendChild(iconEl);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'achievement-toast-content';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'achievement-toast-title';
    titleDiv.textContent = 'Trophy unlocked';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'achievement-toast-name';
    nameDiv.textContent = trophy.name;
    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(nameDiv);
    toast.appendChild(iconDiv);
    toast.appendChild(contentDiv);
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Same visual pattern as showAchievementToast, for the day a banked streak
// freeze auto-covers a missed day instead of resetting the streak.
function showStreakFreezeToast() {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.setAttribute('role', 'alert');
    const iconDiv = document.createElement('div');
    iconDiv.className = 'achievement-toast-icon';
    const iconEl = document.createElement('i');
    iconEl.className = 'fa-solid fa-snowflake';
    iconDiv.appendChild(iconEl);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'achievement-toast-content';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'achievement-toast-title';
    titleDiv.textContent = 'Streak freeze used';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'achievement-toast-name';
    nameDiv.textContent = 'Missed a day, streak saved';
    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(nameDiv);
    toast.appendChild(iconDiv);
    toast.appendChild(contentDiv);
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderAchievementPanel() {
    const unlocked = getUnlockedAchievements();
    const panel = document.getElementById('achievementPanel');
    panel.textContent = '';

    const header = document.createElement('div');
    header.className = 'achievement-panel-header';
    const h2 = document.createElement('h2');
    h2.textContent = 'Trophies';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn achievement-close';
    closeBtn.id = 'closeTrophiesBtn';
    closeBtn.setAttribute('aria-label', 'Close trophies');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    header.appendChild(h2);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const list = document.createElement('div');
    list.className = 'achievement-list';
    Object.entries(TROPHIES).forEach(([id, trophy]) => {
        const item = document.createElement('div');
        item.className = 'achievement-item ' + (unlocked.includes(id) ? 'unlocked' : 'locked');
        const iconDiv = document.createElement('div');
        iconDiv.className = 'achievement-icon';
        const iconEl = document.createElement('i');
        iconEl.className = trophy.icon;
        iconDiv.appendChild(iconEl);
        const info = document.createElement('div');
        info.className = 'achievement-info';
        const name = document.createElement('div');
        name.className = 'achievement-name';
        name.textContent = trophy.name;
        const desc = document.createElement('div');
        desc.className = 'achievement-desc';
        desc.textContent = trophy.desc;
        info.appendChild(name);
        info.appendChild(desc);
        item.appendChild(iconDiv);
        item.appendChild(info);
        if (unlocked.includes(id)) {
            const check = document.createElement('i');
            check.className = 'fa-solid fa-check achievement-check';
            item.appendChild(check);
        }
        list.appendChild(item);
    });
    panel.appendChild(list);

    panel.classList.add('active');
    trapFocus(panel);
    document.getElementById('closeTrophiesBtn').addEventListener('click', () => panel.classList.remove('active'));
}

function renderProfilePanel() {
    if (!localProfile) return;

    const panel = document.getElementById('profilePanel');
    const avatar = getAvatarById(localProfile.avatar_id);
    panel.textContent = '';

    const panelHeader = document.createElement('div');
    panelHeader.className = 'profile-panel-header';
    const headerLeft = document.createElement('div');
    const kicker = document.createElement('div');
    kicker.className = 'profile-panel-kicker';
    kicker.textContent = 'Profile';
    const h2 = document.createElement('h2');
    h2.textContent = localProfile.display_name;
    headerLeft.appendChild(kicker);
    headerLeft.appendChild(h2);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn achievement-close';
    closeBtn.id = 'closeProfileBtn';
    closeBtn.setAttribute('aria-label', 'Close profile');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    panelHeader.appendChild(headerLeft);
    panelHeader.appendChild(closeBtn);
    panel.appendChild(panelHeader);

    const summary = document.createElement('div');
    summary.className = 'profile-summary';
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'profile-summary-avatar';
    avatarDiv.textContent = avatar.emoji;
    const summaryInfo = document.createElement('div');
    summaryInfo.className = 'profile-summary-copy';
    const summaryName = document.createElement('div');
    summaryName.className = 'profile-summary-name';
    summaryName.textContent = localProfile.display_name;
    const summaryMeta = document.createElement('div');
    summaryMeta.className = 'profile-summary-meta';
    const handle = localProfile.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const joinedYear = currentUser ? new Date(currentUser.created_at).getFullYear() : null;
    summaryMeta.textContent = joinedYear ? `@${handle} · Joined ${joinedYear}` : `@${handle} · Local profile`;
    summaryInfo.appendChild(summaryName);
    summaryInfo.appendChild(summaryMeta);
    summary.appendChild(avatarDiv);
    summary.appendChild(summaryInfo);
    panel.appendChild(summary);

    const overview = document.createElement('div');
    overview.className = 'profile-overview';
    [
        ['fa-fire', `${gameState.streak} day streak`],
        ['fa-bolt', `${gameState.xp} XP`],
        ['fa-book', `${gameState.completedSubjects.length} courses started`],
        ['fa-trophy', `${getUnlockedAchievements().length} trophies`]
    ].forEach(([icon, label]) => {
        const item = document.createElement('div');
        item.className = 'profile-overview-item';
        item.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i> ${label}`;
        overview.appendChild(item);
    });
    panel.appendChild(overview);

    const form = document.createElement('form');
    form.className = 'profile-form';
    form.id = 'profileForm';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'auth-field';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = 'Display name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'profileDisplayName';
    nameInput.value = localProfile.display_name;
    nameInput.maxLength = 50;
    nameInput.required = true;
    nameLabel.appendChild(nameSpan);
    nameLabel.appendChild(nameInput);
    form.appendChild(nameLabel);

    const avatarPickerDiv = document.createElement('div');
    avatarPickerDiv.className = 'avatar-picker';
    avatarPickerDiv.id = 'profileAvatarPicker';
    form.appendChild(avatarPickerDiv);

    const questProgress = loadProgress();
    const questXp = questProgress.week_start === currentWeekStart() ? (questProgress.weekly_xp || 0) : 0;
    const questDiv = document.createElement('div');
    questDiv.className = 'profile-quest';
    const questLabel = document.createElement('div');
    questLabel.className = 'profile-quest-label';
    questLabel.textContent = `Weekly quest: ${Math.min(questXp, WEEKLY_XP_GOAL)} / ${WEEKLY_XP_GOAL} XP`;
    const questBar = document.createElement('div');
    questBar.className = 'profile-quest-bar';
    const questFill = document.createElement('div');
    questFill.className = 'profile-quest-fill';
    questFill.style.width = `${Math.min((questXp / WEEKLY_XP_GOAL) * 100, 100)}%`;
    questBar.appendChild(questFill);
    questDiv.appendChild(questLabel);
    questDiv.appendChild(questBar);
    if (questProgress.streak_freezes > 0) {
        const freezeLabel = document.createElement('div');
        freezeLabel.className = 'profile-quest-label';
        freezeLabel.style.marginTop = '8px';
        freezeLabel.innerHTML = `<i class="fa-solid fa-snowflake" aria-hidden="true"></i> ${questProgress.streak_freezes} streak freeze${questProgress.streak_freezes > 1 ? 's' : ''} banked`;
        questDiv.appendChild(freezeLabel);
    }
    form.appendChild(questDiv);

    const schoolLink = document.createElement('a');
    schoolLink.href = '/school/index.html';
    schoolLink.className = 'btn';
    schoolLink.style.display = 'block';
    schoolLink.style.textAlign = 'center';
    schoolLink.style.marginBottom = '12px';
    schoolLink.textContent = 'School dashboard';
    form.appendChild(schoolLink);

    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.type = 'submit';
    saveBtn.textContent = 'Save profile';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn';
    resetBtn.type = 'button';
    resetBtn.id = 'resetProfileBtn';
    resetBtn.textContent = 'Reset progress';
    const signOutBtn = document.createElement('button');
    signOutBtn.className = 'btn';
    signOutBtn.type = 'button';
    signOutBtn.id = 'signOutBtn';
    signOutBtn.textContent = 'Sign out';
    signOutBtn.style.display = currentUser ? '' : 'none';
    actions.appendChild(saveBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(signOutBtn);
    form.appendChild(actions);

    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'auth-feedback';
    feedbackDiv.id = 'profileFeedback';
    feedbackDiv.setAttribute('aria-live', 'polite');
    form.appendChild(feedbackDiv);

    panel.appendChild(form);

    let selectedAvatar = localProfile.avatar_id;
    renderAvatarPicker('profileAvatarPicker', selectedAvatar, (avatarId) => {
        selectedAvatar = avatarId;
    });

    panel.classList.add('active');
    trapFocus(panel);

    document.getElementById('closeProfileBtn').addEventListener('click', () => panel.classList.remove('active'));
    document.getElementById('resetProfileBtn').addEventListener('click', async () => {
        if (confirm('Reset all progress? This cannot be undone.')) {
            localStorage.removeItem(PROGRESS_KEY);
            localStorage.removeItem(SRS_KEY);
            if (currentUser) {
                await sb.from('lingo_progress').upsert({ id: currentUser.id, ...DEFAULT_PROGRESS, srs: {} });
            }
            gameState.xp = 0;
            gameState.streak = 0;
            gameState.hearts = 5;
            gameState.completedSubjects = [];
            updateHeaderProfile();
            updateStats();
            panel.classList.remove('active');
        }
    });
    document.getElementById('signOutBtn').addEventListener('click', async () => {
        if (sb) await sb.auth.signOut();
        clearAuthCookie();
        currentUser = null;
        localProfile = null;
        localStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem(PROGRESS_KEY);
        localStorage.removeItem(SRS_KEY);
        gameState.xp = 0;
        gameState.streak = 0;
        gameState.hearts = 5;
        gameState.completedSubjects = [];
        updateHeaderProfile();
        updateStats();
        panel.classList.remove('active');
        updateShellForAuth();
        // Signing out must put the gate back, not leave the last catalog on screen.
        renderSubjects(gameState.selectedCategory);
    });
    document.getElementById('profileForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const feedback = document.getElementById('profileFeedback');
        localProfile.display_name = document.getElementById('profileDisplayName').value.trim();
        localProfile.avatar_id = selectedAvatar;
        saveProfile(localProfile);
        updateHeaderProfile();
        feedback.textContent = 'Profile saved.';
        feedback.className = 'auth-feedback success';
    });
}

function setupEventListeners() {
    document.querySelectorAll('.category-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach((item) => item.classList.remove('active'));
            tab.classList.add('active');
            tab.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
            gameState.selectedCategory = tab.dataset.category;
            renderSubjects(gameState.selectedCategory);
        });
    });

    document.getElementById('treeBackBtn').addEventListener('click', resetToHome);
    // checkBtn is driven by its onclick alone (check, then continue). A second listener here ran checkAnswer
    // and then the swapped-in nextQuestion in the same click, so the feedback never stayed on screen.
    document.getElementById('skipBtn').addEventListener('click', skipQuestion);
    document.getElementById('continueBtn').addEventListener('click', continueLearning);
    document.getElementById('achievementBtn').addEventListener('click', renderAchievementPanel);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('profileBtn').addEventListener('click', () => {
        if (localProfile) {
            renderProfilePanel();
        } else {
            const dialog = document.getElementById('authShell');
            document.getElementById('tabSignin').click();
            dialog.showModal();
            setTimeout(() => document.getElementById('signinEmail')?.focus(), 100);
        }
    });
    document.getElementById('authCloseBtn').addEventListener('click', () => {
        document.getElementById('authShell').close();
    });

    // Auth tab switching
    document.getElementById('tabSignup').addEventListener('click', () => {
        document.getElementById('formSignup').style.display = '';
        document.getElementById('formSignin').style.display = 'none';
        document.getElementById('tabSignup').classList.add('active');
        document.getElementById('tabSignin').classList.remove('active');
    });
    document.getElementById('tabSignin').addEventListener('click', () => {
        document.getElementById('formSignin').style.display = '';
        document.getElementById('formSignup').style.display = 'none';
        document.getElementById('tabSignin').classList.add('active');
        document.getElementById('tabSignup').classList.remove('active');
    });

    document.getElementById('formSignup').addEventListener('submit', async (event) => {
        event.preventDefault();
        const feedback = document.getElementById('authFeedback');
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        if (!name || !email || !password) return;
        feedback.textContent = 'Creating account…';
        feedback.className = 'auth-feedback';
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) { feedback.textContent = error.message; feedback.className = 'auth-feedback error'; return; }
        currentUser = data.user;
        setAuthCookie();
        const profile = { display_name: name, avatar_id: svgDataUri(generatePixelArtSVG()) };
        await sb.from('lingo_profiles').upsert({ id: currentUser.id, ...profile });
        await sb.from('lingo_progress').upsert({ id: currentUser.id, ...DEFAULT_PROGRESS });
        localProfile = profile;
        saveProfile(profile);
        updateHeaderProfile();
        updateStats();
        updateShellForAuth();
        renderSubjects(gameState.selectedCategory);
    });


    document.getElementById('forgotPassword').addEventListener('click', async () => {
        const feedback = document.getElementById('authFeedback');
        const email = document.getElementById('signinEmail').value.trim();
        if (!email) { feedback.textContent = 'Enter your email first.'; feedback.className = 'auth-feedback error'; return; }
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        feedback.textContent = error ? error.message : 'Check your email for a reset link.';
        feedback.className = error ? 'auth-feedback error' : 'auth-feedback';
    });

    document.getElementById('formSignin').addEventListener('submit', async (event) => {
        event.preventDefault();
        const feedback = document.getElementById('authFeedback');
        const email = document.getElementById('signinEmail').value.trim();
        const password = document.getElementById('signinPassword').value;
        feedback.textContent = 'Signing in…';
        feedback.className = 'auth-feedback';
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { feedback.textContent = error.message; feedback.className = 'auth-feedback error'; return; }
        currentUser = data.user;
        setAuthCookie();
        try { await hydrateFromDb(currentUser.id); } catch (_) {}
        localProfile = loadProfile();
        if (!localProfile) {
            localProfile = { display_name: email.split('@')[0], avatar_id: selectedAuthAvatar };
            saveProfile(localProfile);
        }
        feedback.textContent = '';
        syncGameStateFromProgress();
        updateHeaderProfile();
        updateStats();
        updateShellForAuth();
        renderSubjects(gameState.selectedCategory);
    });
}

function updateShellForAuth() {
    const dialog = document.getElementById('authShell');
    if (localProfile && dialog.open) dialog.close();
}

function getAvatarById(id) {
    return AVATAR_PRESETS.find((avatar) => avatar.id === id) || AVATAR_PRESETS[0];
}

function updateHeaderProfile() {
    const label = localProfile ? localProfile.display_name : 'Start';
    const avatar = getAvatarById(localProfile ? localProfile.avatar_id : null);
    document.getElementById('profileName').textContent = label;
    const chip = document.getElementById('profileAvatar');
    const avId = localProfile ? localProfile.avatar_id : null;
    if (isDataAvatar(avId)) {
        chip.textContent = '';
        chip.style.backgroundImage = `url("${avId}")`;
        chip.style.backgroundSize = 'cover';
    } else {
        chip.style.backgroundImage = '';
        chip.textContent = avatar.emoji;
    }
}


function generatePixelArtSVG() {
    const palettes = [
        ['#e63946','#457b9d','#1d3557'],
        ['#7b2d8b','#c77dff','#e0aaff'],
        ['#0077b6','#00b4d8','#90e0ef'],
        ['#d62828','#f77f00','#fcbf49'],
        ['#2d6a4f','#52b788','#b7e4c7']
    ];
    const bgs = ['#111','#0d0d0d','#1a1a1a','#0f0f1a','#0a1a0a'];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    const bg = bgs[Math.floor(Math.random() * bgs.length)];
    const px = 8, size = 8, total = size * px;
    const grid = Array.from({length: size}, () =>
        Array.from({length: Math.ceil(size / 2)}, () =>
            Math.random() > 0.45 ? Math.floor(Math.random() * 3) : -1
        )
    );
    let rects = '';
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const ci = grid[row][col < size / 2 ? col : size - 1 - col];
            if (ci >= 0) rects += `<rect x="${col*px}" y="${row*px}" width="${px}" height="${px}" fill="${palette[ci]}"/>`;
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${bg}"/>${rects}</svg>`;
}

function svgDataUri(svg) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

function isDataAvatar(id) {
    return typeof id === 'string' && id.startsWith('data:');
}

function renderAvatarPicker(containerId, selectedId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.textContent = '';
    let current = isDataAvatar(selectedId) ? selectedId : svgDataUri(generatePixelArtSVG());
    onSelect(current);
    const img = document.createElement('img');
    img.src = current;
    img.alt = 'Avatar — tap to generate a new one';
    img.title = 'Tap to generate a new avatar';
    img.style.cssText = 'width:56px;height:56px;border-radius:12px;cursor:pointer;display:block;';
    img.addEventListener('click', () => {
        current = svgDataUri(generatePixelArtSVG());
        img.src = current;
        onSelect(current);
    });
    const upload = document.createElement('button');
    upload.type = 'button';
    upload.className = 'avatar-option';
    upload.textContent = 'Upload';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    upload.addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
        const f = file.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            const im = new Image();
            im.onload = () => {
                const c = document.createElement('canvas');
                c.width = c.height = 64;
                const sq = Math.min(im.width, im.height);
                c.getContext('2d').drawImage(im, (im.width - sq) / 2, (im.height - sq) / 2, sq, sq, 0, 0, 64, 64);
                current = c.toDataURL('image/jpeg', 0.85);
                img.src = current;
                onSelect(current);
            };
            im.src = reader.result;
        };
        reader.readAsDataURL(f);
    });
    container.append(img, upload, file);
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    return recognition;
}

function startListening(langCode, callback) {
    if (!recognition) return;
    recognition.lang = langCode;
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        isListening = false;
        callback(transcript);
        updateMicButton(false);
    };
    recognition.onerror = recognition.onend = () => {
        isListening = false;
        updateMicButton(false);
    };
    isListening = true;
    updateMicButton(true);
    recognition.start();
}

function updateMicButton(active) {
    const button = document.getElementById('micBtn');
    if (button) button.classList.toggle('listening', active);
}

function trapFocus(element) {
    const focusable = element.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    element._trapHandler = (event) => {
        if (event.key === 'Tab') {
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
        if (event.key === 'Escape') {
            element.classList.remove('active');
            element.removeEventListener('keydown', element._trapHandler);
        }
    };
    element.addEventListener('keydown', element._trapHandler);
}

function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeColor(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeColor(next);
}

function updateThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#111' : '#fafafa');
}

function setupKeyboardNav() {
    document.addEventListener('keydown', (event) => {
        const lesson = document.getElementById('lessonContainer');
        const result = document.getElementById('resultContainer');
        if (lesson.classList.contains('active')) {
            if (event.key === 'Enter' || (event.key === ' ' && event.target.tagName !== 'INPUT')) {
                event.preventDefault();
                const button = document.getElementById('checkBtn');
                if (!button.disabled) button.click();
            }
            if (['1', '2', '3', '4'].includes(event.key)) {
                const choices = document.querySelectorAll('.choice-btn');
                const index = parseInt(event.key, 10) - 1;
                if (choices[index]) {
                    choices[index].click();
                    choices[index].focus();
                }
            }
            if (event.key === 'Escape') resetToHome();
        }
        if (result.classList.contains('active')) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                document.getElementById('continueBtn').click();
            }
            if (event.key === 'Escape') resetToHome();
        }
    });
}

function setupTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    document.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].screenX;
        touchStartY = event.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (event) => {
        const dx = event.changedTouches[0].screenX - touchStartX;
        const dy = event.changedTouches[0].screenY - touchStartY;
        if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            const result = document.getElementById('resultContainer');
            if (result.classList.contains('active')) {
                if (dx > 0) resetToHome();
                else continueLearning();
            }
        }
    }, { passive: true });
    document.addEventListener('click', (event) => {
        const target = event.target.closest('.btn, .choice-btn, .subject-card, .word-chip, .avatar-option, .profile-chip');
        if (!target) return;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = target.getBoundingClientRect();
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        target.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    });
}

// Shown in place of the course grid when signed out, or when the sign-in client failed to
// load and signing in is impossible.
function renderAuthGate() {
    document.getElementById('categoryTitle').textContent = sb ? 'Sign in to continue' : 'Sign-in unavailable';
    const grid = document.getElementById('subjectGrid');
    grid.textContent = '';

    const panel = document.createElement('div');
    panel.className = 'auth-gate';

    const message = document.createElement('p');
    message.className = 'auth-gate-text';
    message.textContent = sb
        ? 'Courses and your progress are tied to your account. Sign in or create one to start learning.'
        : 'Could not load the sign-in service. Check your connection, or a content blocker may be stopping it.';
    panel.appendChild(message);

    if (sb) {
        const button = document.createElement('button');
        button.className = 'btn btn-primary';
        button.id = 'authGateSignIn';
        button.textContent = 'Sign in';
        button.addEventListener('click', () => document.getElementById('authShell').showModal());
        panel.appendChild(button);
    }

    grid.appendChild(panel);
}

function renderSubjects(category) {
    // Course content requires a real account, not just a local profile. Gating here rather
    // than at each call site means every path into the catalog is covered by one check.
    if (!isAuthed()) { renderAuthGate(); return; }
    if (isGameCategory(category)) {
        document.getElementById('categoryTitle').textContent = 'Choose a game';
        const grid = document.getElementById('subjectGrid');
        grid.textContent = '';
        Object.entries(GAMES_REGISTRY).forEach(([id, game]) => {
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.dataset.subject = id;
            card.dataset.game = 'true';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', game.name);
            const iconDiv = document.createElement('div');
            iconDiv.className = 'subject-icon';
            const iconEl = document.createElement('i');
            iconEl.className = game.icon;
            iconEl.setAttribute('aria-hidden', 'true');
            iconDiv.appendChild(iconEl);
            const nameDiv = document.createElement('div');
            nameDiv.className = 'subject-name';
            nameDiv.textContent = game.name;
            const levelDiv = document.createElement('div');
            levelDiv.className = 'subject-level';
            levelDiv.textContent = game.level;
            card.appendChild(iconDiv);
            card.appendChild(nameDiv);
            card.appendChild(levelDiv);
            card.addEventListener('click', () => selectSubject(card));
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSubject(card); }
            });
            grid.appendChild(card);
        });
        return;
    }
    const categoryData = categories[category];
    if (!categoryData) return;
    document.getElementById('categoryTitle').textContent = categoryData.title;
    const grid = document.getElementById('subjectGrid');
    grid.textContent = '';
    categoryData.subjects.forEach((subject) => {
        const dueCount = getDueCount(subject.id);
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.dataset.subject = subject.id;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', subject.name);
        const iconDiv = document.createElement('div');
        iconDiv.className = 'subject-icon';
        const iconEl = document.createElement('i');
        iconEl.className = subject.icon;
        iconEl.setAttribute('aria-hidden', 'true');
        iconDiv.appendChild(iconEl);
        const nameDiv = document.createElement('div');
        nameDiv.className = 'subject-name';
        nameDiv.textContent = subject.name;
        const levelDiv = document.createElement('div');
        levelDiv.className = 'subject-level';
        levelDiv.textContent = subject.level;
        card.appendChild(iconDiv);
        card.appendChild(nameDiv);
        card.appendChild(levelDiv);
        if (dueCount > 0) {
            const badge = document.createElement('div');
            badge.className = 'review-badge';
            badge.textContent = dueCount + ' due';
            card.appendChild(badge);
        }
        const progress = getCourseProgress(subject.id);
        if (progress.done > 0) {
            const grade = document.createElement('div');
            grade.className = 'subject-grade';
            grade.textContent = progress.total
                ? Math.round((progress.done / progress.total) * 100) + '% complete'
                : progress.done + (progress.done === 1 ? ' lesson done' : ' lessons done');
            card.appendChild(grade);
        }
        if (subject.url) {
            card.addEventListener('click', () => { window.location.href = subject.url; });
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    window.location.href = subject.url;
                }
            });
        } else {
            card.addEventListener('click', () => selectSubject(card));
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectSubject(card);
                }
            });
        }
        grid.appendChild(card);
    });
}

function selectSubject(card) {
    document.querySelectorAll('.subject-card').forEach((subjectCard) => subjectCard.classList.remove('selected'));
    card.classList.add('selected');
    gameState.selectedSubject = card.dataset.subject;
    if (card.dataset.game === 'true') {
        setTimeout(() => startGame(card.dataset.subject), 300);
    } else {
        setTimeout(() => showSkillTree(card.dataset.subject), 300);
    }
}

// Ordered list of every lesson in a course (units flattened), with unit titles.
function getLessonOrder(pack) {
    const order = [];
    (pack.units || []).forEach((unit) => {
        (unit.lessons || []).forEach((lesson) => {
            order.push({ unitId: unit.id, unitTitle: unit.title, lesson });
        });
    });
    return order;
}

function isLessonComplete(subjectId, lessonId) {
    const bySubject = loadProgress().lessons_completed[subjectId];
    return Boolean(bySubject && bySubject[lessonId]);
}

// A lesson unlocks when it is first in the course or the previous lesson is done.
function isLessonUnlocked(subjectId, order, index) {
    if (index === 0) return true;
    return isLessonComplete(subjectId, order[index - 1].lesson.id);
}

function makeIcon(faClass) {
    const icon = document.createElement('i');
    icon.className = faClass;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
}

async function showSkillTree(subjectId) {
    gameState.selectedSubject = subjectId;
    await loadCourse(subjectId);
    const pack = PACK_CACHE[subjectId];
    if (!pack) { startLesson(); return; }
    document.getElementById('subjectSelection').style.display = 'none';
    document.getElementById('resultContainer').classList.remove('active');
    document.getElementById('lessonContainer').classList.remove('active');
    document.getElementById('skillTree').classList.add('active');
    renderSkillTree(pack);
}

// "Before you start": the grammar note for this unit, if one was written, plus three real
// phrases from the unit itself. Until now a lesson only ever tested -- nothing taught.
function buildUnitIntro(unit) {
    const preview = Array.isArray(unit.preview) ? unit.preview : [];
    if (!unit.tip && !preview.length) return null;

    const card = document.createElement('div');
    card.className = 'unit-intro';

    const label = document.createElement('div');
    label.className = 'unit-intro-label';
    label.textContent = 'Before you start';
    card.appendChild(label);

    if (unit.tip) {
        const tip = document.createElement('p');
        tip.className = 'unit-intro-tip';
        tip.textContent = unit.tip;
        card.appendChild(tip);
    }

    if (preview.length) {
        const list = document.createElement('dl');
        list.className = 'unit-intro-phrases';
        preview.forEach(([english, target]) => {
            const dt = document.createElement('dt');
            dt.textContent = target;
            const dd = document.createElement('dd');
            dd.textContent = english;
            list.appendChild(dt);
            list.appendChild(dd);
        });
        card.appendChild(list);
    }
    return card;
}

// "Learn this first": before a lesson's first attempt, show what it will ask, with the
// answers and the why, so the quiz checks something you were taught.
// ponytail: capped at 8 rows; long lessons teach their first 8 and quiz the rest.
function learnRows(lessonQuestions) {
    const rows = [];
    lessonQuestions.forEach((q) => {
        if (q.pairs) q.pairs.forEach(([english, target]) => rows.push([target, english, true]));
        else if (q.type === 'translation' || q.type === 'sentence') rows.push([q.answer, q.question, true]);
        else if (q.type === 'listening') rows.push([q.answer, meaningOf(q.answer) || '', true]);
        else if (q.type === 'cloze') rows.push([q.question.replace(/_{2,}/, q.answer), meaningOf(q.question.replace(/_{2,}/, q.answer)) || '', true]);
        else rows.push([q.question, q.answer + (q.explain ? `. ${q.explain}` : ''), false]);
    });
    const seen = new Set();
    return rows.filter(([term]) => !seen.has(term) && seen.add(term)).slice(0, 8);
}

function hearButton(text) {
    const hear = document.createElement('button');
    hear.type = 'button';
    hear.className = 'feedback-hear';
    hear.setAttribute('aria-label', `Hear ${text}`);
    hear.append(makeIcon('fa-solid fa-volume-high'));
    hear.addEventListener('click', () => speak(text, currentLang()));
    return hear;
}

// Teach first: what this lesson is about, each new thing with a worked example, then a tip.
function renderTeach(card, teach, spoken, unitTip) {
    const add = (tag, className, text) => {
        const el = document.createElement(tag);
        el.className = className;
        el.textContent = text;
        return el;
    };
    if (teach.intro) card.appendChild(add('p', 'teach-intro', teach.intro));
    (teach.points || []).forEach((pt) => {
        const item = document.createElement('div');
        item.className = 'teach-point';
        const head = document.createElement('div');
        head.className = 'teach-term';
        if (spoken && pt.say !== false) head.appendChild(hearButton(pt.term));
        head.append(add('strong', '', pt.term), add('span', 'teach-meaning', pt.meaning));
        item.appendChild(head);
        if (pt.example) {
            const ex = document.createElement('p');
            ex.className = 'teach-example';
            if (spoken) ex.appendChild(hearButton(pt.example));
            ex.append(pt.example);
            if (pt.example_en) ex.append(document.createElement('br'), add('span', 'teach-example-en', pt.example_en));
            item.appendChild(ex);
        }
        if (pt.note) item.appendChild(add('p', 'teach-note', pt.note));
        card.appendChild(item);
    });
    const tip = teach.tip || unitTip;
    if (tip) card.appendChild(add('p', 'teach-tip', tip));
}

// Recap on the results screen: the lesson's points again, so the last thing you see is what you learned.
function renderRecap() {
    const old = document.getElementById('lessonRecap');
    old?.parentNode?.removeChild(old);
    const pack = PACK_CACHE[gameState.selectedSubject];
    let teach = null;
    (pack?.units || []).forEach((u) => (u.lessons || []).forEach((l) => { if (l.id === gameState.selectedLesson) teach = l.teach; }));
    if (!teach || !(teach.points || []).length) return;
    const box = document.createElement('div');
    box.id = 'lessonRecap';
    box.className = 'lesson-recap';
    const label = document.createElement('div');
    label.className = 'unit-intro-label';
    label.textContent = 'What you learned';
    const list = document.createElement('ul');
    teach.points.forEach((pt) => {
        const li = document.createElement('li');
        li.textContent = `${pt.term}: ${pt.meaning}`;
        list.appendChild(li);
    });
    box.append(label, list);
    if (teach.recap) {
        const p = document.createElement('p');
        p.textContent = teach.recap;
        box.appendChild(p);
    }
    const stats = document.querySelector('#resultContainer .result-stats');
    if (stats) stats.after(box);
}

function showLearnCard(lessonId) {
    const pack = PACK_CACHE[gameState.selectedSubject];
    const unit = (pack?.units || []).find((u) => (u.lessons || []).some((l) => l.id === lessonId));
    const teach = ((unit?.lessons || []).find((l) => l.id === lessonId) || {}).teach;
    const rows = learnRows(gameState.lessonQuestions);
    if (!rows.length && !teach) return false;
    const container = document.getElementById('questionContainer');
    container.textContent = '';
    document.getElementById('progressLabel').textContent = 'Learn';
    const card = document.createElement('div');
    card.className = 'unit-intro learn-card';
    const label = document.createElement('div');
    label.className = 'unit-intro-label';
    label.textContent = teach ? 'Lesson' : 'Learn this first';
    card.appendChild(label);
    if (unit?.tip && !teach) {
        const tip = document.createElement('p');
        tip.className = 'unit-intro-tip';
        tip.textContent = unit.tip;
        card.appendChild(tip);
    }
    const list = document.createElement('dl');
    list.className = 'unit-intro-phrases';
    const spoken = LANGUAGE_SUBJECTS.has(gameState.selectedSubject);
    if (teach) renderTeach(card, teach, spoken, unit && unit.tip);
    else rows.forEach(([term, meaning, sayable]) => {
        const dt = document.createElement('dt');
        if (spoken && sayable) {
            const hear = document.createElement('button');
            hear.type = 'button';
            hear.className = 'feedback-hear';
            hear.setAttribute('aria-label', `Hear ${term}`);
            hear.append(makeIcon('fa-solid fa-volume-high'));
            hear.addEventListener('click', () => speak(term, currentLang()));
            dt.append(hear, ' ');
        }
        dt.append(term);
        const dd = document.createElement('dd');
        dd.textContent = meaning;
        list.append(dt, dd);
    });
    card.appendChild(list);
    container.appendChild(card);
    document.getElementById('feedback').className = 'feedback';
    document.getElementById('feedback').textContent = '';
    document.getElementById('skipBtn').hidden = true;
    // The quiz has not started yet: mark answered so a stray Skip or Check does nothing.
    gameState.answered = true;
    const button = document.getElementById('checkBtn');
    button.textContent = 'Start the quiz';
    button.disabled = false;
    button.onclick = () => { document.getElementById('skipBtn').hidden = false; loadQuestion(); };
    return true;
}

function renderSkillTree(pack) {
    const meta = findSubjectMeta(pack.id) || {};
    const treeIcon = document.getElementById('treeIcon');
    treeIcon.textContent = '';
    treeIcon.appendChild(makeIcon(meta.icon || pack.icon || 'fa-solid fa-book'));
    document.getElementById('treeTitle').textContent = pack.name;
    const order = getLessonOrder(pack);
    const done = order.filter((entry) => isLessonComplete(pack.id, entry.lesson.id)).length;
    document.getElementById('treeSub').textContent = `${done} / ${order.length} lessons complete`;

    const host = document.getElementById('treeUnits');
    host.textContent = '';
    const units = pack.units || [];
    // A long course is a wall of locked rows. Past four units, fold each unit into one
    // line with its progress and open only the one you are in, with a Continue button on top.
    const collapsible = units.length > 4;
    const nextIndex = order.findIndex((entry, i) => !isLessonComplete(pack.id, entry.lesson.id) && isLessonUnlocked(pack.id, order, i));
    const next = nextIndex >= 0 ? order[nextIndex] : null;
    if (next) {
        const cta = document.createElement('button');
        cta.className = 'tree-continue';
        cta.setAttribute('aria-label', `${done ? 'Continue' : 'Start'}: ${next.lesson.title}`);
        const text = document.createElement('span');
        const kicker = document.createElement('span');
        kicker.className = 'tree-continue-kicker';
        kicker.textContent = done ? 'Continue' : 'Start';
        const title = document.createElement('span');
        title.className = 'tree-continue-title';
        title.textContent = next.lesson.title;
        const where = document.createElement('span');
        where.className = 'tree-continue-where';
        where.textContent = next.unitTitle;
        text.append(kicker, title, where);
        cta.append(text, makeIcon('fa-solid fa-arrow-right'));
        cta.addEventListener('click', () => startLesson(next.lesson.id));
        host.appendChild(cta);
    }
    if (done === 0 && units.length >= 3 && !DEMO) {
        const test = document.createElement('button');
        test.className = 'tree-continue';
        test.setAttribute('aria-label', 'Placement test: skip what you already know');
        const ttext = document.createElement('span');
        const tkicker = document.createElement('span');
        tkicker.className = 'tree-continue-kicker';
        tkicker.textContent = 'Not a beginner?';
        const ttitle = document.createElement('span');
        ttitle.className = 'tree-continue-title';
        ttitle.textContent = 'Take the placement test';
        const twhere = document.createElement('span');
        twhere.className = 'tree-continue-where';
        twhere.textContent = '10 questions, skip what you know';
        ttext.append(tkicker, ttitle, twhere);
        test.append(ttext, makeIcon('fa-solid fa-arrow-right'));
        test.addEventListener('click', startPlacement);
        host.appendChild(test);
    }
    const weakCount = getWeakQuestions(pack.id).length;
    if (weakCount) {
        const weak = document.createElement('button');
        weak.className = 'tree-continue';
        weak.setAttribute('aria-label', `Practice weak words: ${weakCount} exercises`);
        const wtext = document.createElement('span');
        const wkicker = document.createElement('span');
        wkicker.className = 'tree-continue-kicker';
        wkicker.textContent = 'Practice';
        const wtitle = document.createElement('span');
        wtitle.className = 'tree-continue-title';
        wtitle.textContent = 'Your weak words';
        const wwhere = document.createElement('span');
        wwhere.className = 'tree-continue-where';
        wwhere.textContent = `${weakCount} exercises to fix`;
        wtext.append(wkicker, wtitle, wwhere);
        weak.append(wtext, makeIcon('fa-solid fa-arrow-right'));
        weak.addEventListener('click', () => startLesson(null, true));
        host.appendChild(weak);
    }
    let flatIndex = 0;
    units.forEach((unit) => {
        const unitEl = document.createElement('div');
        unitEl.className = 'tree-unit';
        const lessons = unit.lessons || [];
        const unitDone = lessons.filter((lesson) => isLessonComplete(pack.id, lesson.id)).length;
        const open = !collapsible || (next ? next.unitId === unit.id : unit === units[0]);
        const body = document.createElement('div');
        body.className = 'tree-unit-body';
        body.id = `tree-unit-${unit.id}`;
        body.hidden = !open;

        if (collapsible) {
            const head = document.createElement('button');
            head.className = 'tree-unit-head';
            head.setAttribute('aria-expanded', String(open));
            head.setAttribute('aria-controls', body.id);
            const name = document.createElement('span');
            name.className = 'tree-unit-title';
            name.textContent = unit.title;
            const count = document.createElement('span');
            count.className = 'tree-unit-count';
            count.textContent = `${unitDone}/${lessons.length}`;
            const bar = document.createElement('span');
            bar.className = 'tree-unit-bar';
            const fill = document.createElement('i');
            fill.style.width = `${lessons.length ? Math.round((unitDone / lessons.length) * 100) : 0}%`;
            bar.appendChild(fill);
            head.append(name, count, bar, makeIcon('fa-solid fa-chevron-down'));
            head.addEventListener('click', () => {
                const nowOpen = body.hidden;
                body.hidden = !nowOpen;
                head.setAttribute('aria-expanded', String(nowOpen));
            });
            unitEl.appendChild(head);
        } else {
            const heading = document.createElement('div');
            heading.className = 'tree-unit-title';
            heading.textContent = unit.title;
            unitEl.appendChild(heading);
        }
        const intro = buildUnitIntro(unit);
        if (intro) body.appendChild(intro);

        lessons.forEach((lesson) => {
            const index = flatIndex;
            flatIndex += 1;
            const complete = isLessonComplete(pack.id, lesson.id);
            const unlocked = isLessonUnlocked(pack.id, order, index);
            const node = document.createElement('button');
            node.className = 'tree-node' + (complete ? ' complete' : '') + (unlocked ? '' : ' locked');
            node.disabled = !unlocked;
            node.setAttribute('aria-label', `${lesson.title}${complete ? ', complete' : unlocked ? '' : ', locked'}`);
            const dot = document.createElement('span');
            dot.className = 'tree-node-dot';
            dot.appendChild(makeIcon(complete ? 'fa-solid fa-crown' : unlocked ? 'fa-solid fa-play' : 'fa-solid fa-lock'));
            const label = document.createElement('span');
            label.className = 'tree-node-label';
            label.textContent = lesson.title;
            node.appendChild(dot);
            node.appendChild(label);
            if (unlocked) node.addEventListener('click', () => startLesson(lesson.id));
            body.appendChild(node);
        });
        unitEl.appendChild(body);
        host.appendChild(unitEl);
    });
}

function resetToHome() {
    document.getElementById('lessonContainer').classList.remove('active');
    document.getElementById('resultContainer').classList.remove('active');
    document.getElementById('skillTree').classList.remove('active');
    document.getElementById('subjectSelection').style.display = 'block';
    gameState.selectedLesson = null;
    document.querySelectorAll('.subject-card').forEach((card) => card.classList.remove('selected'));
    renderSubjects(gameState.selectedCategory);
}

// Speak text aloud with the course's language voice (real audio, no asset files).
function speak(text, lang, slow) {
    if (!text || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (lang) utter.lang = lang;
        utter.rate = slow ? 0.45 : 0.9;
        window.speechSynthesis.speak(utter);
    } catch (_) { /* TTS unavailable */ }
}

function currentLang() {
    const meta = findSubjectMeta(gameState.selectedSubject);
    return (meta && meta.lang) || LANG_CODES[gameState.selectedSubject] || 'en-US';
}

async function startLesson(lessonId, weakOnly, placement) {
    gameState.selectedLesson = lessonId || null;
    gameState.placement = placement || null;
    gameState.retried = new Set();
    document.querySelector('.result-title').textContent = 'Lesson Complete';
    document.querySelector('.result-subtitle').textContent = 'Here is how you did.';
    document.getElementById('subjectSelection').style.display = 'none';
    document.getElementById('skillTree').classList.remove('active');
    document.getElementById('lessonContainer').classList.add('active');
    gameState.currentQuestion = 0;
    gameState.correctAnswers = 0;
    gameState.hearts = 5;
    await loadCourse(gameState.selectedSubject);
    const subset = placement ? placement.questions : weakOnly ? getWeakQuestions(gameState.selectedSubject).sort(() => Math.random() - 0.5).slice(0, 10)
        : lessonId ? getLessonExercises(gameState.selectedSubject, lessonId) : null;
    gameState.lessonQuestions = getQuestionsForLesson(gameState.selectedSubject, subset);
    gameState.totalQuestions = gameState.lessonQuestions.length || 10;
    updateStats();
    document.getElementById('skipBtn').hidden = false;
    if (lessonId && !weakOnly && !placement && !isLessonComplete(gameState.selectedSubject, lessonId) && showLearnCard(lessonId)) return;
    loadQuestion();
}

// Pull a single lesson's exercises (stamped with ids) from a cached pack.
function getLessonExercises(subjectId, lessonId) {
    const pack = PACK_CACHE[subjectId];
    if (!pack) return [];
    for (const unit of pack.units || []) {
        const lesson = (unit.lessons || []).find((entry) => entry.id === lessonId);
        if (lesson) return lesson.exercises;
    }
    return [];
}

function renderProgressPips(current, total) {
    const bar = document.getElementById('progressBar');
    bar.setAttribute('aria-valuemax', total);
    bar.setAttribute('aria-valuenow', current);
    if (bar.childElementCount !== total) {
        bar.textContent = '';
        for (let i = 0; i < total; i += 1) {
            const pip = document.createElement('div');
            pip.className = 'progress-pip';
            bar.appendChild(pip);
        }
    }
    Array.from(bar.children).forEach((pip, i) => pip.classList.toggle('filled', i < current));
}

function loadQuestion() {
    const question = gameState.lessonQuestions[gameState.currentQuestion];
    if (!question) {
        showResults();
        return;
    }
    gameState.answered = false;
    renderProgressPips(gameState.currentQuestion, gameState.totalQuestions);
    document.getElementById('progressLabel').textContent = `${gameState.currentQuestion} / ${gameState.totalQuestions}`;
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('show', 'correct', 'incorrect');
    feedback.textContent = '';
    gameState.currentAnswer = null;
    gameState.answerWords = [];
    const button = document.getElementById('checkBtn');
    button.textContent = 'Check';
    button.onclick = checkAnswer;
    button.disabled = false;
    renderQuestion(question);
}

function renderQuestion(question) {
    const container = document.getElementById('questionContainer');
    container.textContent = '';
    const isLanguage = LANGUAGE_SUBJECTS.has(gameState.selectedSubject);
    const hasSpeech = recognition && isLanguage;

    const typeDiv = document.createElement('div');
    typeDiv.className = 'question-type';

    if (question.type === 'translation' || question.type === 'mathChoice' || question.type === 'cloze' || question.type === 'chess') {
        typeDiv.textContent = CHOICE_PROMPTS[question.type];
        container.appendChild(typeDiv);

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = question.question;
        container.appendChild(questionText);
        if (question.fen) container.appendChild(renderChessBoard(question.fen));

        if (hasSpeech && question.type === 'translation') {
            const micBtn = document.createElement('button');
            micBtn.className = 'mic-btn';
            micBtn.id = 'micBtn';
            micBtn.setAttribute('aria-label', 'Speak your answer');
            micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            container.appendChild(micBtn);
        }

        const choicesDiv = document.createElement('div');
        choicesDiv.className = 'choices-container';
        choicesDiv.setAttribute('role', 'radiogroup');
        question.choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.dataset.choice = choice;
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', 'false');
            btn.setAttribute('tabindex', index === 0 ? '0' : '-1');
            btn.textContent = choice;
            btn.addEventListener('click', () => selectChoice(btn));
            choicesDiv.appendChild(btn);
        });
        container.appendChild(choicesDiv);

        if (hasSpeech && question.type === 'translation') {
            const micBtn = document.getElementById('micBtn');
            if (micBtn) {
                micBtn.addEventListener('click', () => {
                    if (isListening) { recognition.stop(); return; }
                    startListening(LANG_CODES[gameState.selectedSubject] || 'en-US', (transcript) => {
                        const normalized = transcript.toLowerCase().trim();
                        const btn = [...container.querySelectorAll('.choice-btn')].find((b) => b.dataset.choice.toLowerCase() === normalized);
                        if (btn) selectChoice(btn);
                    });
                });
            }
        }
    } else if (question.type === 'sentence') {
        typeDiv.textContent = 'Translate this sentence';
        container.appendChild(typeDiv);

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = question.question;
        container.appendChild(questionText);

        if (hasSpeech) {
            const micBtn = document.createElement('button');
            micBtn.className = 'mic-btn';
            micBtn.id = 'micBtn';
            micBtn.setAttribute('aria-label', 'Speak your answer');
            micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            container.appendChild(micBtn);
        }

        const answerBox = document.createElement('div');
        answerBox.className = 'answer-box';
        answerBox.id = 'answerBox';
        answerBox.setAttribute('aria-live', 'polite');
        container.appendChild(answerBox);

        const wordBank = document.createElement('div');
        wordBank.className = 'word-bank';
        question.words.forEach((word) => {
            const chip = document.createElement('div');
            chip.className = 'word-chip';
            chip.dataset.word = word;
            chip.setAttribute('role', 'button');
            chip.setAttribute('tabindex', '0');
            chip.textContent = word;
            chip.addEventListener('click', () => toggleWord(chip));
            chip.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleWord(chip); }
            });
            wordBank.appendChild(chip);
        });
        container.appendChild(wordBank);

        if (hasSpeech) {
            const micBtn = document.getElementById('micBtn');
            if (micBtn) {
                micBtn.addEventListener('click', () => {
                    if (isListening) { recognition.stop(); return; }
                    startListening(LANG_CODES[gameState.selectedSubject] || 'en-US', (transcript) => {
                        const words = transcript.toLowerCase().split(/\s+/);
                        words.forEach((word) => {
                            const chip = [...container.querySelectorAll('.word-chip:not(.used)')].find((c) => c.dataset.word.toLowerCase() === word);
                            if (chip) toggleWord(chip);
                        });
                    });
                });
            }
        }
    } else if (question.type === 'match') {
        typeDiv.textContent = 'Tap the matching pairs';
        container.appendChild(typeDiv);

        gameState.matchState = { selected: null, matched: 0, missed: false };
        const total = question.pairs.length;

        const grid = document.createElement('div');
        grid.className = 'match-grid';
        const left = question.pairs.map((pair, index) => ({ text: pair[0], key: index, side: 'l' }));
        const right = shuffle(question.pairs.map((pair, index) => ({ text: pair[1], key: index, side: 'r' })));

        [left, right].forEach((column) => {
            const col = document.createElement('div');
            col.className = 'match-col';
            column.forEach((cell) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'match-btn';
                btn.dataset.key = String(cell.key);
                btn.dataset.side = cell.side;
                btn.textContent = cell.text;
                btn.addEventListener('click', () => selectMatch(btn, question, total));
                col.appendChild(btn);
            });
            grid.appendChild(col);
        });
        container.appendChild(grid);
    } else if (question.type === 'listening') {
        typeDiv.textContent = 'Type what you hear';
        container.appendChild(typeDiv);

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-volume-high';
        icon.style.marginRight = '0.5rem';
        icon.style.opacity = '0.5';
        icon.setAttribute('aria-hidden', 'true');
        questionText.appendChild(icon);
        const replayBtn = document.createElement('button');
        replayBtn.type = 'button';
        replayBtn.className = 'btn tts-btn';
        replayBtn.setAttribute('aria-label', 'Play audio');
        replayBtn.appendChild(makeIcon('fa-solid fa-volume-high'));
        replayBtn.appendChild(document.createTextNode(' Play'));
        replayBtn.addEventListener('click', () => speak(question.audio || question.answer, currentLang()));
        questionText.appendChild(replayBtn);
        const slowBtn = document.createElement('button');
        slowBtn.type = 'button';
        slowBtn.className = 'btn tts-btn';
        slowBtn.setAttribute('aria-label', 'Play audio slowly');
        slowBtn.appendChild(makeIcon('fa-solid fa-gauge-simple-low'));
        slowBtn.appendChild(document.createTextNode(' Slow'));
        slowBtn.addEventListener('click', () => speak(question.audio || question.answer, currentLang(), true));
        questionText.appendChild(slowBtn);
        container.appendChild(questionText);
        speak(question.audio || question.answer, currentLang());

        if (hasSpeech) {
            const micBtn = document.createElement('button');
            micBtn.className = 'mic-btn';
            micBtn.id = 'micBtn';
            micBtn.setAttribute('aria-label', 'Speak your answer');
            micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            container.appendChild(micBtn);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'translation-input';
        input.id = 'listeningInput';
        input.placeholder = 'Type your answer here...';
        input.setAttribute('aria-label', 'Your answer');
        container.appendChild(input);
        setTimeout(() => input.focus(), 100);

        if (hasSpeech) {
            const micBtn = document.getElementById('micBtn');
            if (micBtn) {
                micBtn.addEventListener('click', () => {
                    if (isListening) { recognition.stop(); return; }
                    startListening(LANG_CODES[gameState.selectedSubject] || 'en-US', (transcript) => {
                        document.getElementById('listeningInput').value = transcript;
                    });
                });
            }
        }
    } else if (question.type === 'math') {
        typeDiv.textContent = 'Solve the problem';
        container.appendChild(typeDiv);

        const eq = document.createElement('div');
        eq.className = 'math-equation';
        eq.textContent = question.question;
        container.appendChild(eq);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'math-input';
        input.id = 'mathInput';
        input.placeholder = 'Enter your answer';
        input.setAttribute('aria-label', 'Your answer');
        container.appendChild(input);
        // Phone keyboards bury ^ ( ) / and there is no sqrt or pi key. Each button types the exact
        // ASCII the answer key uses, so a tap never produces something the grader rejects.
        const pad = document.createElement('div');
        pad.className = 'math-keys';
        pad.setAttribute('role', 'group');
        pad.setAttribute('aria-label', 'Math symbols');
        ['sqrt(', 'pi', '^', '/', '(', ')', '-', ','].forEach((key) => {
            const keyBtn = document.createElement('button');
            keyBtn.type = 'button';
            keyBtn.className = 'math-key';
            keyBtn.textContent = key;
            keyBtn.setAttribute('aria-label', `Insert ${key}`);
            keyBtn.addEventListener('pointerdown', (event) => event.preventDefault());
            keyBtn.addEventListener('click', () => {
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? start;
                input.setRangeText(key, start, end, 'end');
                input.focus();
            });
            pad.appendChild(keyBtn);
        });
        container.appendChild(pad);
        setTimeout(() => input.focus(), 100);
    }

    gameState.currentQuestionData = question;
}

// Prompt line per choice-rendered exercise type.
const CHOICE_PROMPTS = {
    translation: 'Select the correct translation',
    mathChoice: 'Choose the correct answer',
    cloze: 'Fill in the blank',
    chess: 'Chess puzzle',
};

// Board for a `chess` exercise, drawn from its FEN with the side to move at the
// bottom. Both sides use the solid glyphs (the hollow white set reads as faint
// outlines once coloured); colour and an outline tell them apart. U+FE0E keeps
// Apple from turning the pawn into a colour emoji.
const CHESS_GLYPHS = { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' };
function renderChessBoard(fen) {
    const [placement, turn] = fen.split(' ');
    const rows = placement.split('/').map((rank) => rank.replace(/\d/g, (n) => '.'.repeat(Number(n))).split(''));
    const black = turn === 'b';
    const board = document.createElement('div');
    board.className = 'chess-board';
    board.setAttribute('role', 'img');
    board.setAttribute('aria-label', `Chess position, ${black ? 'Black' : 'White'} to move: ${fen}`);
    for (let r = 0; r < 8; r += 1) {
        for (let f = 0; f < 8; f += 1) {
            const rank = black ? 7 - r : r, file = black ? 7 - f : f;
            const square = document.createElement('div');
            square.className = (rank + file) % 2 ? 'chess-square dark' : 'chess-square';
            const piece = rows[rank][file];
            if (piece !== '.') {
                square.textContent = CHESS_GLYPHS[piece.toLowerCase()] + '\uFE0E';
                square.classList.add(piece === piece.toUpperCase() ? 'white-piece' : 'black-piece');
            }
            board.appendChild(square);
        }
    }
    return board;
}

function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
}

// Two taps make a pair. A wrong pair is remembered in `missed` so the whole
// exercise still scores as incorrect even though the user can keep going.
function selectMatch(button, question, total) {
    const state = gameState.matchState;
    if (!state || button.classList.contains('matched')) return;

    const previous = state.selected;
    if (!previous) {
        button.classList.add('selected');
        state.selected = button;
        return;
    }
    if (previous === button) {
        button.classList.remove('selected');
        state.selected = null;
        return;
    }
    previous.classList.remove('selected');
    state.selected = null;

    if (previous.dataset.side === button.dataset.side) return;

    if (previous.dataset.key === button.dataset.key) {
        previous.classList.add('matched');
        button.classList.add('matched');
        state.matched += 1;
        if (state.matched === total) gameState.currentAnswer = question.answer;
    } else {
        state.missed = true;
        [previous, button].forEach((cell) => {
            cell.classList.add('match-wrong');
            setTimeout(() => cell.classList.remove('match-wrong'), 400);
        });
    }
}

function selectChoice(button) {
    document.querySelectorAll('.choice-btn').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-checked', 'false');
    });
    button.classList.add('selected');
    button.setAttribute('aria-checked', 'true');
    gameState.currentAnswer = button.dataset.choice;
}

function toggleWord(chip) {
    const word = chip.dataset.word;
    const answerBox = document.getElementById('answerBox');
    if (chip.classList.contains('used')) {
        chip.classList.remove('used');
        const index = gameState.answerWords.lastIndexOf(word);
        if (index >= 0) gameState.answerWords.splice(index, 1);
    } else {
        chip.classList.add('used');
        gameState.answerWords.push(word);
    }
    answerBox.textContent = '';
    gameState.answerWords.forEach((item) => {
        const chip2 = document.createElement('div');
        chip2.className = 'word-chip';
        chip2.textContent = item;
        answerBox.appendChild(chip2);
    });
    gameState.currentAnswer = gameState.answerWords.join(' ');
}

// The "why" behind an answer, shown either way (right or wrong) so a correct
// guess still teaches the rule behind it. Optional: most exercises have none.
// What a target-language answer means, pulled from the course's own translation
// and match exercises, so a miss on "Type what you hear" still teaches "Hola = Hello".
function meaningOf(answer) {
    const subjectId = gameState.selectedSubject;
    if (!LANGUAGE_SUBJECTS.has(subjectId) || typeof answer !== 'string') return null;
    const key = answer.trim().toLowerCase();
    for (const q of questions[subjectId] || []) {
        if ((q.type === 'translation' || q.type === 'sentence') && q.answer?.trim().toLowerCase() === key) return q.question;
        for (const [english, target] of q.pairs || []) if (target.trim().toLowerCase() === key) return english;
    }
    return null;
}

// Every language answer gets a "hear it" button and, when known, its meaning.
function appendTeach(feedback, question) {
    if (!LANGUAGE_SUBJECTS.has(gameState.selectedSubject) || question.type === 'match') return;
    // A blank is only learned in context: say and show the whole sentence, filled in.
    const said = question.type === 'cloze' ? question.question.replace(/_{2,}/, question.answer) : question.answer;
    const row = document.createElement('div');
    row.className = 'feedback-teach';
    const hear = document.createElement('button');
    hear.type = 'button';
    hear.className = 'feedback-hear';
    hear.setAttribute('aria-label', `Hear ${said}`);
    hear.append(makeIcon('fa-solid fa-volume-high'));
    hear.addEventListener('click', () => speak(said, currentLang()));
    row.appendChild(hear);
    const meaning = question.type === 'listening' ? meaningOf(question.answer)
        : question.type === 'cloze' ? meaningOf(said) : question.question;
    const text = document.createElement('span');
    text.textContent = meaning ? `${said} means "${meaning}"` : said;
    row.appendChild(text);
    feedback.appendChild(row);
}

function appendExplain(feedback, question) {
    if (!question.explain) return;
    const p = document.createElement('p');
    p.className = 'feedback-explain';
    p.textContent = question.explain;
    feedback.appendChild(p);
}

function checkAnswer() {
    // Resolve each question exactly once. The Skip button stays enabled after an
    // answer is submitted, and skipping now routes through here, so without this
    // guard a second press would re-score the same question -- draining another
    // heart, or re-awarding the XP for one already answered correctly.
    if (gameState.answered) return;
    gameState.answered = true;

    const question = gameState.currentQuestionData;
    let isCorrect = false;

    if (question.type === 'match') {
        isCorrect = !gameState.matchState?.missed;
    } else if (question.type === 'translation' || question.type === 'mathChoice' || question.type === 'cloze' || question.type === 'chess' || question.type === 'sentence') {
        isCorrect = gameState.currentAnswer === question.answer;
    } else if (question.type === 'listening') {
        const input = document.getElementById('listeningInput')?.value.trim();
        isCorrect = input?.toLowerCase() === question.answer.toLowerCase();
    } else if (question.type === 'math') {
        const input = document.getElementById('mathInput')?.value.trim();
        isCorrect = input?.replace(/\s/g, '').toLowerCase() === question.answer.replace(/\s/g, '').toLowerCase();
    }

    if (question.id) updateSrs(question.id, isCorrect ? 5 : 1);
    updateWords(gameState.selectedSubject, question, isCorrect);
    const placement = gameState.placement;
    if (placement && isCorrect && question.id in placement.unitOf) {
        const u = placement.unitOf[question.id];
        placement.right[u] = (placement.right[u] || 0) + 1;
    }

    const feedback = document.getElementById('feedback');
    const questionCard = document.querySelector('.question-card');
    if (isCorrect) {
        feedback.className = 'feedback correct show';
        feedback.textContent = 'Correct.';
        appendExplain(feedback, question);
        appendTeach(feedback, question);
        gameState.correctAnswers += 1;
        gameState.xp += 10;
        vibrate(50);
        questionCard.classList.add('correct-anim');
        setTimeout(() => questionCard.classList.remove('correct-anim'), 600);
        const xpStat = document.querySelector('.stat-xp');
        if (xpStat) {
            xpStat.style.position = 'relative';
            const floater = document.createElement('span');
            floater.className = 'xp-float';
            floater.textContent = '+10';
            xpStat.appendChild(floater);
            setTimeout(() => floater.remove(), 1000);
        }
    } else {
        feedback.className = 'feedback incorrect show';
        feedback.textContent = 'Incorrect. The answer is: ';
        const strong = document.createElement('strong');
        strong.textContent = question.answer;
        feedback.appendChild(strong);
        appendExplain(feedback, question);
        appendTeach(feedback, question);
        // A miss comes back once at the end of the lesson, so the lesson teaches it
        // instead of only marking it wrong. Not in placement, where it would skew the probe.
        if (!gameState.placement && !gameState.retried.has(question)) {
            gameState.retried.add(question);
            gameState.lessonQuestions.push(question);
            gameState.totalQuestions += 1;
        }
        gameState.hearts -= 1;
        vibrate([50, 30, 50]);
        questionCard.classList.add('incorrect-anim');
        setTimeout(() => questionCard.classList.remove('incorrect-anim'), 600);
    }

    updateStats();
    const button = document.getElementById('checkBtn');
    button.textContent = 'Continue';
    button.onclick = nextQuestion;

    if (question.type === 'translation' || question.type === 'mathChoice' || question.type === 'cloze' || question.type === 'chess') {
        document.querySelectorAll('.choice-btn').forEach((item) => {
            item.style.pointerEvents = 'none';
            if (item.dataset.choice === question.answer) item.classList.add('correct');
            else if (item.classList.contains('selected')) item.classList.add('incorrect');
        });
    }

    if (gameState.hearts <= 0) {
        setTimeout(() => showResults(), 1500);
    }
}

function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

function spawnConfetti() {
    const colors = ['#2e86de', '#5aa9f0', '#9bc7f5', '#1f6fb2', '#d4a843'];
    for (let index = 0; index < 30; index += 1) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        piece.style.width = `${Math.random() * 6 + 5}px`;
        piece.style.height = `${Math.random() * 6 + 5}px`;
        piece.style.animationDelay = `${Math.random() * 0.8}s`;
        piece.style.animationDuration = `${Math.random() * 1.5 + 1.5}s`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 3000);
    }
}

function skipQuestion() {
    // A skip is a wrong answer. checkAnswer() already resolves an empty input or
    // selection as incorrect, so routing through it costs a heart and penalises
    // SRS instead of advancing for free.
    checkAnswer();
}

function nextQuestion() {
    gameState.currentQuestion += 1;
    if (gameState.currentQuestion >= gameState.totalQuestions || gameState.hearts <= 0) {
        showResults();
    } else {
        loadQuestion();
    }
}

function showResults() {
    renderRecap();
    document.getElementById('lessonContainer').classList.remove('active');
    document.getElementById('resultContainer').classList.add('active');
    document.getElementById('correctCount').textContent = gameState.correctAnswers;
    document.getElementById('xpEarned').textContent = gameState.correctAnswers * 10;

    if (DEMO) {
        // Nothing below this point should run: it all writes progress, streaks and
        // achievements a demo player does not have.
        document.querySelector('.result-title').textContent = 'That was one lesson';
        document.querySelector('.result-subtitle').textContent =
            'There are 522 more, across 12 languages. Create an account to keep your XP and streak.';
        const cta = document.getElementById('continueBtn');
        cta.textContent = 'Create an account';
        cta.onclick = () => { window.location.href = '/app/'; };
        return;
    }

    const progress = loadProgress();
    const today = new Date().toISOString().slice(0, 10);
    let streakFreezes = progress.streak_freezes || 0;
    let usedFreeze = false;
    if (progress.last_played !== today) {
        if (!progress.last_played) {
            gameState.streak += 1;
        } else {
            const diff = Math.floor((new Date(today) - new Date(progress.last_played)) / (1000 * 60 * 60 * 24));
            if (diff > 1 && diff <= 2 && streakFreezes > 0) {
                // Missed exactly one day and have a freeze banked: spend it to
                // preserve the streak instead of resetting to 1.
                streakFreezes -= 1;
                usedFreeze = true;
                gameState.streak += 1;
            } else {
                gameState.streak = diff > 1 ? 1 : gameState.streak + 1;
            }
        }
    }
    // Grant a freeze at every 7-day streak milestone (cap 2 banked, unlimited for Pro).
    const freezeCap = userIsPro ? Infinity : 2;
    if (progress.last_played !== today && gameState.streak > 0 && gameState.streak % 7 === 0 && streakFreezes < freezeCap) {
        streakFreezes += 1;
    }

    // Weekly XP quest: reset the counter when a new week starts, else accrue.
    const weekStart = currentWeekStart();
    const xpEarnedThisLesson = gameState.correctAnswers * 10;
    const weeklyXp = progress.week_start === weekStart
        ? (progress.weekly_xp || 0) + xpEarnedThisLesson
        : xpEarnedThisLesson;

    // NB: this records a subject as soon as ONE lesson in it is finished, so it is a
    // "courses started" list despite the name. The profile stat and the firstLesson
    // achievement both read it that way. A real "courses completed" count needs each
    // pack's lesson total, and packs load lazily — see getCourseProgress.
    if (gameState.selectedSubject && !gameState.completedSubjects.includes(gameState.selectedSubject)) {
        gameState.completedSubjects.push(gameState.selectedSubject);
    }

    // Crown a skill-tree lesson only when the player survived AND actually
    // answered enough correctly -- surviving alone used to be enough, so skipping
    // every question crowned the lesson with zero correct answers.
    const lessonsCompleted = { ...progress.lessons_completed };
    if (gameState.selectedLesson
        && lessonPassed(Math.min(gameState.correctAnswers, gameState.totalQuestions - gameState.retried.size), gameState.totalQuestions - gameState.retried.size, gameState.hearts)) {
        lessonsCompleted[gameState.selectedSubject] = {
            ...(lessonsCompleted[gameState.selectedSubject] || {}),
            [gameState.selectedLesson]: true,
        };
    }

    if (gameState.placement) {
        const { probes, asked, right } = gameState.placement;
        let placed = -1;
        for (const u of probes) {
            if ((right[u] || 0) < asked[u]) break;
            placed = u;
        }
        const done = { ...(lessonsCompleted[gameState.selectedSubject] || {}) };
        PACK_CACHE[gameState.selectedSubject].units.slice(0, placed + 1)
            .forEach((unit) => (unit.lessons || []).forEach((lesson) => { done[lesson.id] = true; }));
        lessonsCompleted[gameState.selectedSubject] = done;
        document.querySelector('.result-title').textContent = 'Placement done';
        document.querySelector('.result-subtitle').textContent = placed < 0
            ? 'Starting from the first lesson.'
            : `Skipped ${placed + 1} unit${placed ? 's' : ''} you already know.`;
    }

    saveProgress({
        xp: gameState.xp,
        streak: gameState.streak,
        hearts: Math.max(gameState.hearts, 0),
        completed_subjects: [...gameState.completedSubjects],
        lessons_completed: lessonsCompleted,
        last_played: today,
        streak_freezes: streakFreezes,
        weekly_xp: weeklyXp,
        week_start: weekStart
    });

    if (usedFreeze) showStreakFreezeToast();

    if (gameState.correctAnswers === gameState.totalQuestions) {
        saveAchievement('perfectLesson');
    }
    checkAchievements();

    spawnConfetti();
    updateStats();
    renderSubjects(gameState.selectedCategory);
    setTimeout(() => document.getElementById('continueBtn').focus(), 100);
}

function continueLearning() {
    document.getElementById('resultContainer').classList.remove('active');
    document.getElementById('lessonContainer').classList.remove('active');
    // Came from a skill-tree lesson: return to the tree so the new crown and the
    // next unlocked lesson are visible. Otherwise fall back to subject select.
    const pack = PACK_CACHE[gameState.selectedSubject];
    if ((gameState.selectedLesson || gameState.placement) && pack) {
        gameState.selectedLesson = null;
        gameState.placement = null;
        document.getElementById('skillTree').classList.add('active');
        renderSkillTree(pack);
        return;
    }
    document.getElementById('subjectSelection').style.display = 'block';
    document.querySelectorAll('.subject-card').forEach((card) => card.classList.remove('selected'));
    renderSubjects(gameState.selectedCategory);
}

function updateStats() {
    document.getElementById('xp').textContent = gameState.xp;
    document.getElementById('streak').textContent = gameState.streak;
    document.getElementById('hearts').textContent = gameState.hearts;
}

function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

window.resetToHome = resetToHome;

// ===== WebMCP accessors =====
// Read-only views plus the two navigations. Progress is only ever written by
// answering questions, so no accessor here can award XP or complete a lesson.
window.lexlyCatalog = async () => {
    if (!Object.keys(categories).length) await loadCatalog();
    return categories;
};
window.lexlyProgress = () => {
    const p = loadProgress();
    const profile = loadProfile();
    return {
        username: profile.username || null,
        xp: p.xp, streak: p.streak, hearts: p.hearts,
        weeklyXp: p.weekly_xp, weeklyGoal: WEEKLY_XP_GOAL,
        trophies: getUnlockedAchievements(),
        lessonsCompleted: p.lessons_completed,
    };
};
window.lexlyCourseProgress = async (subjectId) => {
    if (!findSubjectMeta(subjectId)) { await loadCatalog(); }
    if (!findSubjectMeta(subjectId)) return { error: `Unknown subject "${subjectId}"` };
    await loadCourse(subjectId);
    return { subjectId, ...getCourseProgress(subjectId), due: getDueCount(subjectId) };
};
window.lexlyDueReviews = (subjectId) => {
    if (subjectId) return { subjectId, due: getDueCount(subjectId) };
    // Only subjects whose pack has been fetched have questions to count.
    return { bySubject: Object.fromEntries(Object.keys(questions).map(id => [id, getDueCount(id)])) };
};
window.lexlyOpenCourse = async (subjectId) => {
    if (!findSubjectMeta(subjectId)) { await loadCatalog(); }
    if (!findSubjectMeta(subjectId)) return { error: `Unknown subject "${subjectId}"` };
    gameState.selectedSubject = subjectId;
    await showSkillTree(subjectId);
    return { opened: subjectId };
};
window.lexlyStartLesson = async (subjectId, lessonId) => {
    const opened = await window.lexlyOpenCourse(subjectId);
    if (opened.error) return opened;
    await startLesson(lessonId);
    return { subjectId, lessonId: lessonId || null, questions: gameState.totalQuestions };
};
