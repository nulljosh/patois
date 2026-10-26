#!/usr/bin/env node
// Builds language course packs from Tatoeba sentence pairs, ranked by word frequency.
//
// Sources (both permissive, both credited in ATTRIBUTION.md):
//   Tatoeba sentence pairs      CC-BY 2.0 FR   https://tatoeba.org
//   hermitdave/FrequencyWords   MIT            OpenSubtitles-derived frequency lists
//
// Generated units are APPENDED after the hand-authored ones, never replacing them, so
// existing exercise ids stay valid and committed SRS cards / lessons_completed keys
// don't orphan.
//
// Usage:  node scripts/build-language-course.mjs [lang-id ...]     (default: all)

import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, 'cache/tatoeba');
const COURSES = path.join(ROOT, 'content/courses');

// tatoeba: ISO 639-3 code on downloads.tatoeba.org
// freq:    directory in hermitdave/FrequencyWords ('2016' where 2018 has no list)
const LANGS = {
    spanish:    { tatoeba: 'spa', freq: 'es', freqYear: '2018' },
    french:     { tatoeba: 'fra', freq: 'fr', freqYear: '2018' },
    german:     { tatoeba: 'deu', freq: 'de', freqYear: '2018' },
    italian:    { tatoeba: 'ita', freq: 'it', freqYear: '2018' },
    portuguese: { tatoeba: 'por', freq: 'pt', freqYear: '2018' },
    dutch:      { tatoeba: 'nld', freq: 'nl', freqYear: '2018' },
    russian:    { tatoeba: 'rus', freq: 'ru', freqYear: '2018' },
    korean:     { tatoeba: 'kor', freq: 'ko', freqYear: '2018' },
    arabic:     { tatoeba: 'ara', freq: 'ar', freqYear: '2018' },
    japanese:   { tatoeba: 'jpn', freq: 'ja', freqYear: '2016' },
    chinese:    { tatoeba: 'cmn', freq: 'zh', freqYear: '2016' },
    hindi:      { tatoeba: 'hin', freq: 'hi', freqYear: '2016' },
    turkish: { tatoeba: 'tur', freq: 'tr', freqYear: '2018' },
    polish: { tatoeba: 'pol', freq: 'pl', freqYear: '2018' },
    swedish: { tatoeba: 'swe', freq: 'sv', freqYear: '2018' },
    greek: { tatoeba: 'ell', freq: 'el', freqYear: '2018' },
    hebrew: { tatoeba: 'heb', freq: 'he', freqYear: '2018' },
    vietnamese: { tatoeba: 'vie', freq: 'vi', freqYear: '2018' },
    indonesian: { tatoeba: 'ind', freq: 'id', freqYear: '2018' },
    ukrainian: { tatoeba: 'ukr', freq: 'uk', freqYear: '2018' },
    czech: { tatoeba: 'ces', freq: 'cs', freqYear: '2018' },
    danish: { tatoeba: 'dan', freq: 'da', freqYear: '2018' },
    finnish: { tatoeba: 'fin', freq: 'fi', freqYear: '2018' },
    norwegian: { tatoeba: 'nob', freq: 'no', freqYear: '2018' },
    hungarian: { tatoeba: 'hun', freq: 'hu', freqYear: '2018' },
    romanian: { tatoeba: 'ron', freq: 'ro', freqYear: '2018' },
    thai: { tatoeba: 'tha', freq: 'th', freqYear: '2018' },
    persian: { tatoeba: 'pes', freq: 'fa', freqYear: '2018' },
    bulgarian: { tatoeba: 'bul', freq: 'bg', freqYear: '2018' },
    catalan: { tatoeba: 'cat', freq: 'ca', freqYear: '2018' },
    croatian: { tatoeba: 'hrv', freq: 'hr', freqYear: '2018' },
    serbian: { tatoeba: 'srp', freq: 'sr', freqYear: '2018' },
    slovak: { tatoeba: 'slk', freq: 'sk', freqYear: '2018' },
    lithuanian: { tatoeba: 'lit', freq: 'lt', freqYear: '2018' },
    latvian: { tatoeba: 'lav', freq: 'lv', freqYear: '2018' },
    estonian: { tatoeba: 'est', freq: 'et', freqYear: '2018' },
    icelandic: { tatoeba: 'isl', freq: 'is', freqYear: '2018' },
    malay: { tatoeba: 'zsm', freq: 'ms', freqYear: '2018' },
    tagalog: { tatoeba: 'tgl', freq: 'tl', freqYear: '2018' },
    bengali: { tatoeba: 'ben', freq: 'bn', freqYear: '2018' },
    tamil: { tatoeba: 'tam', freq: 'ta', freqYear: '2018' },
    urdu: { tatoeba: 'urd', freq: 'ur', freqYear: '2018' },
    esperanto: { tatoeba: 'epo', freq: 'eo', freqYear: '2018' },
    afrikaans: { tatoeba: 'afr', freq: 'af', freqYear: '2018' },
    basque: { tatoeba: 'eus', freq: 'eu', freqYear: '2018' },
    galician: { tatoeba: 'glg', freq: 'gl', freqYear: '2018' },
    macedonian: { tatoeba: 'mkd', freq: 'mk', freqYear: '2018' },
    slovenian: { tatoeba: 'slv', freq: 'sl', freqYear: '2018' },
    albanian: { tatoeba: 'sqi', freq: 'sq', freqYear: '2018' },
    georgian: { tatoeba: 'kat', freq: 'ka', freqYear: '2018' },
    armenian: { tatoeba: 'hye', freq: 'hy', freqYear: '2018' },
    kazakh: { tatoeba: 'kaz', freq: 'kk', freqYear: '2018' },
    telugu: { tatoeba: 'tel', freq: 'te', freqYear: '2018' },
    malayalam: { tatoeba: 'mal', freq: 'ml', freqYear: '2018' },
};

// Scripts without spaces between words: whitespace tokenizing is meaningless, so these
// rank by character count and skip the cloze exercise (which needs a word to blank).
const UNSPACED = new Set(['japanese', 'chinese', 'thai']);

const UNITS = 10;
// Courses that Surf (the sibling repo, ex-Cruise) has played get more units, sized to
// how much it practised, and lean toward the words it practised. Only Tatoeba
// text goes into the pack; Surf's solved questions are read for their vocabulary alone.
const MAX_UNITS = 120;  // ponytail: about 2,900 sentences, ~1MB; the app fetches the whole pack when a course opens
const CRUISE_CODES = { greek: 'el', romanian: 'ro', polish: 'pl', czech: 'cs', turkish: 'tr', indonesian: 'id', hindi: 'hi', hebrew: 'he', french: 'fr', korean: 'ko', japanese: 'ja', russian: 'ru', spanish: 'es', dutch: 'nl', swedish: 'sv', italian: 'it', german: 'de', portuguese: 'pt', arabic: 'ar', chinese: 'zh', esperanto: 'eo', vietnamese: 'vi', ukrainian: 'uk', hungarian: 'hu', danish: 'da', finnish: 'fi', tagalog: 'tl' };
// One deduped file per course, committed in Surf: { type, prompt, answer } per line.
const CRUISE_DIR = path.join(ROOT, '..', 'surf', 'courses');
const MIN_UNITS = 3;
const LESSONS_PER_UNIT = 3;
// One lesson consumes: translation 1 + cloze 1 + sentence 1 + listening 1 + match 4.
const SENTENCES_PER_LESSON = 8;
const PER_UNIT = LESSONS_PER_UNIT * SENTENCES_PER_LESSON;

// Units are themes now, in teaching order. An earlier pass *named* units by topic while
// still bucketing them by difficulty, so a unit called "Food & Drink" was full of
// unrelated sentences and had to be reverted. The difference here is that membership is
// derived from the sentence's own English side, so the name is a fact about the content.
//
// Matching on English keeps theme assignment identical across all 12 languages, and
// measurement against the cached corpora shows every theme clears PER_UNIT even in the
// smallest language (Korean: 140-1076 pairs per theme).
const THEMES = [
    ['Greetings & Courtesy', 'hello hi goodbye bye please thanks thank welcome sorry excuse meet name nice pleased'],
    ['People & Family', 'family mother father brother sister son daughter friend man woman child baby parents wife husband boy girl'],
    ['Food & Drink', 'eat eats eating ate food drink drinks water coffee tea bread milk hungry thirsty dinner lunch breakfast restaurant cook meal'],
    ['Around the House', 'house home room door window table chair bed kitchen garden live lives living clean wall floor'],
    ['Travel & Places', 'car train bus walk street city town road travel airport ticket station country village abroad'],
    ['Time & Numbers', 'time day today tomorrow yesterday week month year hour minute clock late early o\'clock tonight'],
    ['Work & School', 'work works working job school study teacher student book learn read write office money buy sell class'],
    ['Feelings & Opinions', 'happy sad tired angry love want need think feel afraid glad hope believe lonely proud'],
    ['Weather & Nature', 'rain rains snow sun sunny cold warm weather wind cloud tree flower sea mountain river'],
    ['Health & Body', 'head hand eye eyes hair face sick doctor sleep sleeps hurt pain ill healthy'],
].map(([title, words]) => ({ title, words: new Set(words.split(' ')) }));

const GENERAL_UNIT = 'General Practice';

// Rank penalty applied to a sentence carrying one out-of-list word, so those sort after
// fully-known sentences of the same difficulty rather than being excluded outright.
const UNKNOWN_WORD_PENALTY = 20000;

// First theme whose keywords appear in the English side wins. English is the shared side
// of every pair, so a sentence lands in the same theme in all 12 courses.
function themeOf(englishText) {
    const words = new Set(englishText.toLowerCase().match(/[a-z']+/g) || []);
    for (const theme of THEMES) {
        for (const word of words) {
            if (theme.words.has(word)) return theme.title;
        }
    }
    return null;
}

// Grammar notes shown before a unit's lessons. Deliberately only filled in for languages
// whose grammar can be stated accurately here -- a wrong grammar note is worse than none,
// so the rest are left empty and simply do not render. Keyed by theme title.
const TIPS = {
    spanish: {
        'Greetings & Courtesy': 'Spanish has two ways to say "you": informal tu and formal usted. Usted takes the same verb ending as he/she, so "usted es" looks like "he is".',
        'People & Family': 'Every noun is masculine or feminine, and the word for "the" changes with it: el hermano, la hermana. Plurals take los and las.',
        'Food & Drink': 'Spanish usually drops the subject pronoun, because the verb ending already says who. "Quiero agua" is "I want water" with no word for "I".',
        'Around the House': 'Estar is used for where something is, ser for what it is. La casa es grande describes it; la casa esta aqui locates it.',
        'Travel & Places': 'Ir (to go) is followed by a: voy a Madrid. Combined with el it contracts to al: voy al centro.',
        'Time & Numbers': 'Telling time uses ser plus the feminine article: es la una, but son las dos. The hour is treated as a feminine noun.',
        'Work & School': 'Verbs fall into three groups by ending: -ar, -er and -ir. Learn one of each and most regular verbs follow.',
        'Feelings & Opinions': 'Gustar works backwards from English: me gusta el cafe is literally "coffee pleases me", so the thing liked is the subject.',
        'Weather & Nature': 'Weather usually uses hacer: hace frio, hace sol. Literally "it makes cold", not "it is cold".',
        'Health & Body': 'With body parts Spanish uses the article, not a possessive: me duele la cabeza, "the head hurts me", not "my head".',
    },
    french: {
        'Greetings & Courtesy': 'French has informal tu and formal vous. Vous is also the plural "you", so it covers both politeness and number.',
        'People & Family': 'Nouns are masculine or feminine, and le, la and les change with them. The plural les is the same for both genders.',
        'Food & Drink': 'French needs a partitive article for unspecified amounts: je bois du cafe, "I drink some coffee". Dropping it is ungrammatical.',
        'Around the House': 'A la and de le contract: au salon, du jardin. These contractions are obligatory, not optional.',
        'Travel & Places': 'Aller (to go) is irregular and pairs with a for places: je vais a Paris, but je vais au marche.',
        'Time & Numbers': 'Time uses il est: il est deux heures. The word heures is required, unlike the English "it is two".',
        'Work & School': 'Most verbs end in -er and share one set of endings. Learn parler and you can conjugate hundreds of others.',
        'Feelings & Opinions': 'Adjectives agree with what they describe: il est content, elle est contente. The extra e is usually silent.',
        'Weather & Nature': 'Weather uses il fait: il fait froid, il fait beau. Literally "it makes cold".',
        'Health & Body': 'Avoir mal a describes pain: j ai mal a la tete. French uses "have pain at the head", not "my head hurts".',
    },
    german: {
        'Greetings & Courtesy': 'German has informal du and formal Sie. Sie is always capitalised, which is how you tell it from sie meaning "she" or "they".',
        'People & Family': 'German has three genders: der, die and das. The gender is not predictable from meaning, so learn it with the noun.',
        'Food & Drink': 'The verb sits second in a main clause. Put anything else first and the verb still holds position two: heute esse ich Brot.',
        'Around the House': 'Some prepositions take the accusative for movement and the dative for position: in die Kueche versus in der Kueche.',
        'Travel & Places': 'Nach is used for towns and countries, zu for people and places: nach Berlin, but zum Bahnhof.',
        'Time & Numbers': 'Time uses es ist: es ist zwei Uhr. Numbers above twenty are said backwards, so 21 is einundzwanzig, "one and twenty".',
        'Work & School': 'Separable verbs split apart in a main clause: aufstehen becomes ich stehe auf, with the prefix at the end.',
        'Feelings & Opinions': 'Modal verbs like koennen and wollen send the main verb to the end in its infinitive form: ich will nach Hause gehen.',
        'Weather & Nature': 'Weather uses es plus a verb: es regnet, es schneit. There is no separate word for "it is raining".',
        'Health & Body': 'Weh tun takes the dative: mir tut der Kopf weh, literally "to me the head does hurt".',
    },
    italian: {
        'Greetings & Courtesy': 'Ciao is informal both coming and going. For strangers use buongiorno and the formal lei.',
        'People & Family': 'Nouns ending in -o are usually masculine and -a feminine, and their plurals become -i and -e.',
        'Food & Drink': 'Italian drops subject pronouns because the verb ending identifies the person: voglio acqua is "I want water".',
        'Around the House': 'Essere is used for being and location, stare for states and ongoing actions: sto bene, sono a casa.',
        'Travel & Places': 'Andare takes a for cities and in for countries: vado a Roma, but vado in Italia.',
        'Time & Numbers': 'Time uses sono le: sono le due. The exception is one o clock, e l una, which is singular.',
        'Work & School': 'Verbs come in three groups: -are, -ere and -ire. The -are group is by far the largest.',
        'Feelings & Opinions': 'Piacere works backwards like Spanish gustar: mi piace il caffe means "coffee is pleasing to me".',
        'Weather & Nature': 'Weather uses fa: fa freddo, fa caldo. For rain and snow use piove and nevica on their own.',
        'Health & Body': 'Pain uses avere mal di: ho mal di testa, "I have pain of head".',
    },
    portuguese: {
        'Greetings & Courtesy': 'Portuguese uses voce for "you" in Brazil, while tu is common in Portugal. Both are informal in everyday speech.',
        'People & Family': 'Nouns are masculine or feminine and take o, a, os or as. Adjectives change ending to match.',
        'Food & Drink': 'Subject pronouns are usually dropped: quero agua is "I want water", with the ending carrying the person.',
        'Around the House': 'Ser is for permanent qualities, estar for temporary states and location: a casa e grande, a casa esta limpa.',
        'Travel & Places': 'Prepositions contract with articles: a plus a becomes a with an accent, em plus o becomes no. These are obligatory.',
        'Time & Numbers': 'Time uses sao as: sao as duas. One o clock is singular, e uma hora.',
        'Work & School': 'Verbs fall into -ar, -er and -ir groups, and the -ar group covers most common verbs.',
        'Feelings & Opinions': 'Gostar always needs de: gosto de cafe. Leaving out de is a common beginner mistake.',
        'Weather & Nature': 'Weather uses esta or faz: esta frio, faz sol. For rain use the verb chove on its own.',
        'Health & Body': 'Pain uses estar com dor de or doer: estou com dor de cabeca.',
    },
};

async function exists(file) {
    try { await access(file); return true; } catch { return false; }
}

async function fetchTo(url, dest) {
    if (await exists(dest)) return dest;
    process.stderr.write(`  fetch ${path.basename(url)}\n`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    await writeFile(dest, Buffer.from(await response.arrayBuffer()));
    return dest;
}

// Node's zlib has no bzip2. macOS/Linux ship bunzip2, so shell out rather than take a dep.
async function fetchBz2(url, name) {
    const plain = path.join(CACHE, name);
    if (await exists(plain)) return plain;
    const archive = `${plain}.bz2`;
    await fetchTo(url, archive);
    await run('bunzip2', ['-kf', archive]);
    return plain;
}

async function loadSentences(code) {
    const file = await fetchBz2(
        `https://downloads.tatoeba.org/exports/per_language/${code}/${code}_sentences.tsv.bz2`,
        `${code}_sentences.tsv`,
    );
    const byId = new Map();
    for (const line of (await readFile(file, 'utf8')).split('\n')) {
        const [id, , text] = line.split('\t');
        if (id && text) byId.set(id, text);
    }
    return byId;
}

async function loadFrequency({ freq, freqYear }) {
    const file = path.join(CACHE, `${freq}_${freqYear}_50k.txt`);
    await fetchTo(
        `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/${freqYear}/${freq}/${freq}_50k.txt`,
        file,
    );
    const rank = new Map();
    (await readFile(file, 'utf8')).split('\n').forEach((line, index) => {
        const word = line.split(' ')[0];
        if (word && !rank.has(word)) rank.set(word, index);
    });
    return rank;
}

const tokenize = (text) =>
    text.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, '').split(/\s+/).filter(Boolean);

// Practised vocabulary for one course from Surf's solved questions: { words, items }.
// items = distinct prompt/answer rows, which sets the unit count.
async function cruiseVocab(id) {
    const code = CRUISE_CODES[id];
    const words = new Set(), items = new Set();
    if (!code) return { words, items: 0 };
    {
        let text; try { text = await readFile(path.join(CRUISE_DIR, `${code}.jsonl`), 'utf8'); } catch { return { words, items: 0 }; }
        for (const line of text.split('\n')) {
            let row; try { row = JSON.parse(line); } catch { continue; }
            items.add(`${row.prompt}\u0000${row.answer}`);
            for (const side of [row.prompt, row.answer]) if (typeof side === 'string') for (const w of tokenize(side)) words.add(w);
        }
    }
    return { words, items: items.size };
}

// Ranked pairs, easiest first. "Easiest" = the rarest word in the target sentence is
// still common; that keeps unit 1 off vocabulary nobody needs.
async function rankedPairs(id, config, practised = new Set()) {
    const excluded = new Set((await readFile(path.join(ROOT, 'scripts', 'tatoeba-exclude.txt'), 'utf8').catch(() => ''))
        .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
    const [target, english, rank] = await Promise.all([
        loadSentences(config.tatoeba),
        loadSentences('eng'),
        loadFrequency(config),
    ]);
    const linksFile = await fetchBz2(
        `https://downloads.tatoeba.org/exports/per_language/${config.tatoeba}/${config.tatoeba}-eng_links.tsv.bz2`,
        `${config.tatoeba}-eng_links.tsv`,
    );

    const unspaced = UNSPACED.has(id);
    // Dedupe on BOTH sides, ignoring case and punctuation. English-only dedupe let
    // "Ça y est." and "Ça y est !" both land in the same match exercise, which has no
    // answerable distinction between the two options.
    const normalizeKey = (text) =>
        text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const seenEnglish = new Set();
    const seenTarget = new Set();
    const pairs = [];

    for (const line of (await readFile(linksFile, 'utf8')).split('\n')) {
        const [targetId, englishId] = line.split('\t');
        const targetText = target.get(targetId);
        const englishText = english.get(englishId);
        if (!targetText || !englishText) continue;

        const key = normalizeKey(englishText);
        const targetKey = normalizeKey(targetText);
        if (seenEnglish.has(key) || seenTarget.has(targetKey)) continue;
        // Tatoeba contains rows where the "translation" is the same string, which would
        // render as a translation exercise whose answer is its own prompt.
        if (normalizeKey(targetText) === normalizeKey(englishText)) continue;
        // Quotation marks survive whitespace tokenizing as junk word-bank chips
        // (`\"\u00bfPor`), so drop quoted sentences rather than special-casing them later.
        if (/["\u00ab\u00bb\u201c\u201d]/.test(targetText) || /["\u201c\u201d]/.test(englishText)) continue;
        if (excluded.has(targetText)) continue;   // rejected by a fact-check, see scripts/tatoeba-exclude.txt

        let difficulty;
        if (unspaced) {
            const length = [...targetText].length;
            if (length < 4 || length > 18) continue;
            difficulty = length;
        } else {
            const words = tokenize(targetText);
            if (words.length < 3 || words.length > 8) continue;
            if (new Set(words).size < 3) continue;
            // Allow ONE unknown word rather than demanding every word be in the top-50k
            // list. Requiring all-known starved the smaller frequency lists: Hindi went
            // from 284 usable pairs to 1,863 with this single change (6.6x), Korean 1.7x,
            // Arabic 1.5x. Unknown-word sentences are pushed later by a rank penalty.
            const ranks = words.map((word) => rank.get(word));
            const unknown = ranks.filter((value) => value === undefined).length;
            if (unknown > 1) continue;
            const known = ranks.filter((value) => value !== undefined);
            if (!known.length) continue;
            difficulty = Math.max(...known) + unknown * UNKNOWN_WORD_PENALTY;
            // Practised words pull a sentence forward: half the rank per word, at most a quarter.
            const hits = practised.size ? words.filter((word) => practised.has(word)).length : 0;
            if (hits) difficulty /= Math.min(4, 1 + hits);
        }

        seenEnglish.add(key);
        seenTarget.add(targetKey);
        pairs.push({ target: targetText, english: englishText, difficulty, theme: themeOf(englishText) });
    }

    pairs.sort((a, b) => a.difficulty - b.difficulty);
    return pairs;
}

function shuffle(items, seed) {
    const copy = [...items];
    let state = seed;
    for (let index = copy.length - 1; index > 0; index -= 1) {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        const swap = state % (index + 1);
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
}

const distractors = (pool, exclude, count, seed) =>
    shuffle([...new Set(pool)].filter((item) => item !== exclude), seed).slice(0, count);

function buildLesson(id, unitIndex, lessonIndex, chunk, pool, unspaced) {
    const nextId = (() => {
        let counter = 0;
        return () => `${id}_t${unitIndex + 1}_${lessonIndex + 1}_${counter++}`;
    })();
    const seed = unitIndex * 1000 + lessonIndex;
    const targets = pool.map((pair) => pair.target);
    const exercises = [];

    // 1. translation — pick the target sentence for an English prompt
    const first = chunk[0];
    exercises.push({
        type: 'translation',
        question: first.english,
        answer: first.target,
        choices: shuffle([first.target, ...distractors(targets, first.target, 3, seed)], seed + 1),
        id: nextId(),
    });

    // 2. cloze — blank one word. Needs word boundaries, so unspaced scripts get a
    //    second translation instead.
    const second = chunk[1];
    const words = second.target.split(/\s+/);
    const bare = (word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    const blankAt = Math.floor(words.length / 2);
    const answer = bare(words[blankAt]);
    if (!unspaced && words.length >= 3 && answer.length > 1) {
        const wordPool = [...new Set(pool.flatMap((pair) => pair.target.split(/\s+/))
            .map(bare)
            .filter((word) => word.length > 1))];
        exercises.push({
            type: 'cloze',
            question: words.map((word, index) => (index === blankAt ? '____' : word)).join(' '),
            answer,
            choices: shuffle([answer, ...distractors(wordPool, answer, 3, seed + 2)], seed + 3),
            id: nextId(),
        });
    } else {
        exercises.push({
            type: 'translation',
            question: second.english,
            answer: second.target,
            choices: shuffle([second.target, ...distractors(targets, second.target, 3, seed + 2)], seed + 3),
            id: nextId(),
        });
    }

    // 3. sentence — word bank. Unspaced scripts have no tokens to bank, so they get a
    //    listening exercise in its place.
    const third = chunk[2];
    const bank = third.target.split(/\s+/);
    if (!unspaced && bank.length >= 2) {
        const decoyPool = [...new Set(pool.flatMap((pair) => pair.target.split(/\s+/)))];
        exercises.push({
            type: 'sentence',
            question: third.english,
            answer: third.target,
            words: shuffle([...bank, ...distractors(decoyPool, third.target, 2, seed + 4)], seed + 5),
            id: nextId(),
        });
    } else {
        exercises.push({
            type: 'listening', question: 'Type what you hear',
            answer: third.target, audio: third.target, id: nextId(),
        });
    }

    // 4. listening
    const fourth = chunk[3];
    exercises.push({
        type: 'listening', question: 'Type what you hear',
        answer: fourth.target, audio: fourth.target, id: nextId(),
    });

    // 5. match — four pairs
    exercises.push({
        type: 'match',
        question: 'Tap the matching pairs',
        answer: 'matched',
        pairs: chunk.slice(4, 8).map((pair) => [pair.english, pair.target]),
        id: nextId(),
    });

    return { id: `t${unitIndex + 1}l${lessonIndex + 1}`, title: `Lesson ${lessonIndex + 1}`, exercises };
}

async function build(id) {
    const config = LANGS[id];
    const packPath = path.join(COURSES, `${id}.json`);
    const pack = JSON.parse(await readFile(packPath, 'utf8'));

    const vocab = await cruiseVocab(id);
    const pairs = await rankedPairs(id, config, vocab.words);
    const unspaced = UNSPACED.has(id);
    const units = vocab.items ? Math.min(MAX_UNITS, Math.max(UNITS, Math.ceil(vocab.items / PER_UNIT))) : UNITS;
    if (vocab.items) process.stderr.write(`  cruise: ${vocab.items} practised items, ${vocab.words.size} words -> up to ${units} units\n`);

    // Bucket by theme, keeping each bucket in difficulty order. A theme only becomes a
    // unit if it has enough sentences of its own -- padding it with unrelated ones is
    // exactly the mistake that got the previous topic-named attempt reverted.
    const buckets = new Map(THEMES.map((theme) => [theme.title, []]));
    const leftovers = [];
    for (const pair of pairs) {
        if (pair.theme && buckets.has(pair.theme)) buckets.get(pair.theme).push(pair);
        else leftovers.push(pair);
    }

    const chosen = [];
    for (const theme of THEMES) {
        const pool = buckets.get(theme.title);
        if (pool.length >= PER_UNIT) chosen.push({ title: theme.title, pool: pool.slice(0, PER_UNIT) });
        // A bigger course keeps the rest of the theme for the practice units.
        if (units > UNITS) leftovers.push(...pool.slice(pool.length >= PER_UNIT ? PER_UNIT : 0));
    }
    if (units > UNITS) leftovers.sort((a, b) => a.difficulty - b.difficulty);

    // Anything that matched no theme still makes practice units at the end, so a large
    // corpus is not thrown away just because its sentences are off-topic.
    let spare = leftovers;
    let generalIndex = 1;
    while (chosen.length < units && spare.length >= PER_UNIT) {
        chosen.push({
            title: chosen.some((u) => u.title.startsWith(GENERAL_UNIT)) ? `${GENERAL_UNIT} ${generalIndex}` : GENERAL_UNIT,
            pool: spare.slice(0, PER_UNIT),
        });
        spare = spare.slice(PER_UNIT);
        generalIndex += 1;
    }

    if (chosen.length < MIN_UNITS) {
        process.stderr.write(`  ! only ${pairs.length} usable pairs — skipping\n`);
        return null;
    }
    if (chosen.length < units) process.stderr.write(`  ${chosen.length} units (thin corpus)\n`);

    // Shipped units never change: their exercise ids back SRS cards and lessons_completed keys.
    // A rebuild only appends units past the ones already in the pack (it used to drop and
    // regenerate them, which rewrote or deleted shipped lessons whenever the vocabulary moved).
    const shipped = new Set(pack.units.map((unit) => unit.id));
    const before = pack.units.length;

    chosen.forEach((unit, unitIndex) => {
        if (shipped.has(`t${unitIndex + 1}`)) return;
        const lessons = [];
        for (let lessonIndex = 0; lessonIndex < LESSONS_PER_UNIT; lessonIndex += 1) {
            const chunk = unit.pool.slice(
                lessonIndex * SENTENCES_PER_LESSON,
                (lessonIndex + 1) * SENTENCES_PER_LESSON,
            );
            lessons.push(buildLesson(id, unitIndex, lessonIndex, chunk, unit.pool, unspaced));
        }

        const built = { id: `t${unitIndex + 1}`, title: unit.title, lessons };
        // Three real phrases from this unit, shown before its first lesson. Derived, so
        // every language gets one.
        built.preview = unit.pool.slice(0, 3).map((pair) => [pair.english, pair.target]);
        const tip = TIPS[id] && TIPS[id][unit.title];
        if (tip) built.tip = tip;
        pack.units.push(built);
    });

    if (pack.units.length === before) return null;
    pack.version = (pack.version || 1) + 1;
    await writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`);
    return pack.units.reduce((sum, unit) =>
        sum + unit.lessons.reduce((count, lesson) => count + lesson.exercises.length, 0), 0);
}

const requested = process.argv.slice(2);
const targets = requested.length ? requested : Object.keys(LANGS);
await mkdir(CACHE, { recursive: true });

for (const id of targets) {
    if (!LANGS[id]) { process.stderr.write(`unknown language: ${id}\n`); continue; }
    process.stderr.write(`${id}\n`);
    const total = await build(id);
    if (total) process.stderr.write(`  ${total} exercises\n`);
}
