// node tools/check-math-equiv.js -- typed math answers grade the same way everywhere.
const { mathEquivalent: eq, prettyMath: pm } = require('../content/math-equiv.js');
const fs = require('fs'), path = require('path');
let fails = 0;
const t = (input, answer, want) => {
    if (eq(input, answer) !== want) { fails++; console.log(`FAIL: "${input}" vs "${answer}" should be ${want}`); }
};

// accepted
t('(x-3)(x-2)', '(x-2)(x-3)', true);
t('(x+3)(x-3)', '(x-3)(x+3)', true);
t('2*x', '2x', true);
t('x*2', '2x', true);
t('C + e^x', 'e^x + C', true);
t('-e^x + xe^x + C', 'x*e^x - e^x + C', true);
t('0.5', '1/2', true);
t('.5', '1/2', true);
t('2', 'x = 2', true);
t('x=2', 'x = 2', true);
t('-1, 6', 'x = 6 or x = -1', true);
t('x=-1 or x=6', 'x = 6 or x = -1', true);
t('5pi/6, pi/6', 'pi/6, 5pi/6', true);
t('1/sqrt(3)', 'sqrt(3)/3', true);
t('3π/2', '3pi/2', true);
t('ln|x|+c', 'ln|x| + C', true);
t('(sin(x))^2', 'sin^2(x)', true);
t('sin(x)^2', 'sin^2(x)', true);
t('2cos(x)sin(x)', '2sin(x)cos(x)', true);
t('sin(B)cos(A)', 'cos(A)sin(B)', true);
t('(4, 6)', '[4,6]', true);
t('[4,6]', '[4,6]', true);
t('true', 'TRUE', true);
t('7.0', '7', true);
t('x/2', 'x/2', true);
t('0.5x', 'x/2', true);
t('2x cos(x^2)', '2x*cos(x^2)', true);
t('12(1+3x)^3', '12(3x + 1)^3', true);
t('(2x+1)^4/4+C', '(2x + 1)^4/4 + C', true);
t('1+x', 'x+1', true);
t('-2y+x', 'x-2y', true);
t('x-2*y', 'x-2y', true);
t('-(x+1)', '-x-1', false); // ponytail: no distributing
t('3 - x', '-x+3', true);
t('3,1', '1,3', true);

t('x²-25', 'x^2 - 25', true);
t('3π/2', '3pi/2', true);
t('2x·cos(x²)', '2x*cos(x^2)', true);

// display
const d = (raw, want) => { if (pm(raw) !== want) { fails++; console.log(`FAIL display: "${raw}" -> "${pm(raw)}", want "${want}"`); } };
d('sqrt(72) = 6sqrt(2)', '\u221a72 = 6\u221a2');
d('x^2 - 10x + 25', 'x\u00b2 - 10x + 25');
d('16^(-1/2)', '16^(-1/2)');
d('x^-2', 'x\u207b\u00b2');
d('3pi/2, spiral', '3\u03c0/2, spiral');
d('x >= 4', 'x \u2265 4');
d('2x*cos(x^2)', '2x\u00b7cos(x\u00b2)');
d('e^x + C', 'e\u02e3 + C');
d('x^10', 'x\u00b9\u2070');
d('sin^2(x)', 'sin\u00b2(x)');
d('sin^2(x) + cos^2(x)', 'sin²(x) + cos²(x)');
d('sqrt(x + 3)','\u221a(x + 3)');
// every pretty string must still grade as its raw answer
for (const a of ['x^2 - 25', '6sqrt(2)', '3pi/2', 'x*e^x - e^x + C', 'sin^2(x)', '(x - 5)^2', 'x^-2']) t(pm(a), a, true);

// rejected
t('', '7', false);
t('x^2-5x+6', '(x-2)(x-3)', false);
t('e^x', 'e^x + C', false);
t('[6,4]', '[4,6]', false);
t('ture', 'TRUE', false);
t('x-1', 'x+1', false);
t('6', 'x = 6 or x = -1', false);
t('2x', 'x^2', false);
t('sin(x)', 'cos(x)', false);
t('1/3', '1/2', false);
t('((', '7', false);
t('alert(1)', '7', false);

// every shipped answer must accept itself and a spaced-out copy of itself
const dir = path.join(__dirname, '..', 'content', 'courses');
let n = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const pack = JSON.parse(fs.readFileSync(path.join(dir, f)));
    for (const u of pack.units || []) for (const l of u.lessons || []) for (const e of l.exercises || []) {
        if (e.type !== 'math') continue;
        n++;
        t(e.answer, e.answer, true);
        t(' ' + e.answer.toUpperCase() + ' ', e.answer, true);
    }
}
if (fails) { console.log(`${fails} failing`); process.exit(1); }
console.log(`PASS: math answers grade by equivalence (${n} shipped answers checked)`);
