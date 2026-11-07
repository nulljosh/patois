// Plays every chess line through the real checkAnswer/showChessReply in lingo-app.js with a
// stub DOM: right moves advance the line, the last one grades once, a wrong step grades wrong.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const src = fs.readFileSync(__dirname + '/../js/lingo-app.js', 'utf8');
const grab = (name) => {
    const start = src.indexOf(`function ${name}(`);
    assert(start >= 0, name);
    let depth = 0, i = src.indexOf('{', start);
    for (; i < src.length; i += 1) { if (src[i] === '{') depth += 1; else if (src[i] === '}' && --depth === 0) break; }
    return src.slice(start, i + 1);
};
const el = () => ({ classList: { add() {}, remove() {}, contains: () => false }, style: {}, appendChild() {}, textContent: '', className: '' });
const els = {};
const ctx = {
    gameState: {}, srs: [], document: {
        getElementById: (id) => (els[id] ||= el()),
        querySelector: () => el(), querySelectorAll: () => [], createElement: () => el(),
    },
    updateSrs(id, q) { ctx.srs.push(q); }, updateWords() {}, appendExplain() {}, appendTeach() {},
    updateStats() {}, vibrate() {}, renderQuestion() {}, setTimeout() {}, showResults() {}, nextQuestion() {},
};
vm.createContext(ctx);
vm.runInContext(['chessView', 'checkAnswer', 'showChessReply'].map(grab).join('\n'), ctx);

const pack = JSON.parse(fs.readFileSync(__dirname + '/../content/courses/chess.json', 'utf8'));
const lines = pack.units.flatMap((u) => u.lessons.flatMap((l) => l.exercises)).filter((e) => e.steps?.length);
assert(lines.length > 0, 'no chess lines');
for (const q of lines) {
    const play = (wrongAt) => {
        Object.assign(ctx.gameState, { currentQuestionData: q, chessStep: 0, answered: false, correctAnswers: 0, xp: 0, hearts: 5, retried: new Set(), lessonQuestions: [], totalQuestions: 1 });
        ctx.srs = [];
        for (let s = 0; s <= q.steps.length; s += 1) {
            const view = vm.runInContext('chessView(gameState.currentQuestionData)', ctx);
            assert(view.choices.includes(view.answer), q.id);
            ctx.gameState.currentAnswer = s === wrongAt ? view.choices.find((c) => c !== view.answer) : view.answer;
            vm.runInContext('checkAnswer()', ctx);
            if (s === wrongAt) return;
            if (s < q.steps.length) {
                assert.equal(ctx.srs.length, 0, `${q.id}: graded before the line ended`);
                assert.equal(els.checkBtn.textContent, 'Next move', q.id);
                els.checkBtn.onclick();
                assert.equal(ctx.gameState.chessStep, s + 1, q.id);
            }
        }
    };
    play(-1);
    assert.deepEqual(ctx.srs, [5], `${q.id}: full line should grade right once`);
    assert.equal(ctx.gameState.correctAnswers, 1, q.id);
    play(q.steps.length);
    assert.deepEqual(ctx.srs, [1], `${q.id}: a wrong last step should grade wrong`);
    assert.equal(ctx.gameState.hearts, 4, q.id);
}
console.log(`chess lines ok: ${lines.length} played through checkAnswer`);
