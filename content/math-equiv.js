// Grades a typed math answer. Shared by the web app and iOS/macOS (run there through JavaScriptCore),
// so both platforms accept exactly the same answers.
//
// Equivalent means the same expression up to order and spelling, not the same value:
// "(x-3)(x-2)" passes for "(x-2)(x-3)", "2*x" for "2x", "C + e^x" for "e^x + C", "0.5" for "1/2",
// "6, -1" for "x = 6 or x = -1". "x^2-5x+6" does NOT pass for "(x-2)(x-3)": a factor question
// wants the factored form. Pure numbers are compared by value, so "sqrt(3)/3" equals "1/sqrt(3)".
// ponytail: structural compare, not a CAS; like terms are not combined ("x+x" is not "2x").
(function (root) {
    const FUNCS = ['sqrt', 'sin', 'cos', 'tan', 'ln', 'log', 'abs'];
    const FN = { sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, log: Math.log10, abs: Math.abs };
    const num = (n) => String(+n.toFixed(9));

    // Parses to a canonical string; constants fold to a number string.
    function parse(src) {
        let i = 0;
        const peek = () => src[i];
        const isNumStart = (c) => c >= '0' && c <= '9' || c === '.';
        const isAlpha = (c) => c >= 'a' && c <= 'z';
        const startsPrimary = (c) => c && (isNumStart(c) || isAlpha(c) || c === '(');

        // A node is { n: number } when constant, else { s: canonical string }.
        function sum() {
            const terms = [];
            let sign = 1;
            if (peek() === '+') i++;
            for (;;) {
                terms.push(product(sign));
                if (peek() === '+') { i++; sign = 1; } else if (peek() === '-') { i++; sign = -1; } else break;
            }
            let c = 0;
            const rest = [];
            for (const t of terms) if ('n' in t) c += t.n; else rest.push(t.s);
            if (!rest.length) return { n: c };
            if (Math.abs(c) > 1e-12) rest.push(num(c));
            return rest.length === 1 ? { s: rest[0] } : { s: '(' + rest.sort().join('+') + ')' };
        }
        function neg(t) { return 'n' in t ? { n: -t.n } : { s: '-1*' + t.s }; }
        function product(c = 1) {
            const top = [], bottom = [];
            let into = top;
            const add = (f) => { if ('n' in f) c = into === top ? c * f.n : c / f.n; else into.push(f.s); };
            if (peek() === '-') { i++; c = -c; }
            add(power());
            for (;;) {
                if (peek() === '*') { i++; into = top; add(power()); }
                else if (peek() === '/') { i++; into = bottom; add(power()); }
                else if (startsPrimary(peek())) { into = top; add(power()); }
                else break;
            }
            const t = top.sort(), b = bottom.sort();
            if (!t.length && !b.length) return { n: c };
            let s = t.join('*') || '1';
            if (b.length) s += '/' + b.join('*');
            return { s: c === 1 ? s : num(c) + '*' + s };
        }
        function power() {
            let base = primary();
            if (peek() === '^') {
                i++;
                const sign = peek() === '-' ? (i++, -1) : 1;
                let e = primary();
                if (sign < 0) e = neg(e);
                if ('n' in base && 'n' in e) return { n: Math.pow(base.n, e.n) };
                base = { s: wrap(base) + '^' + wrap(e) };
            }
            return base;
        }
        const wrap = (x) => 'n' in x ? num(x.n) : /^[a-z0-9.]+$|^[a-z]+\(.*\)$/.test(x.s) ? x.s : '(' + x.s + ')';
        function primary() {
            const c = peek();
            if (c === '(') { i++; const v = sum(); expect(')'); return v; }
            if (isNumStart(c)) {
                let j = i;
                while (i < src.length && isNumStart(src[i])) i++;
                const v = Number(src.slice(j, i));
                if (Number.isNaN(v)) throw 0;
                return { n: v };
            }
            if (isAlpha(c)) {
                const name = FUNCS.find((f) => src.startsWith(f, i));
                if (name) {
                    i += name.length;
                    let exp = null;
                    if (peek() === '^') { i++; exp = primary(); } // sin^2(x)
                    const arg = peek() === '(' ? (i++, (() => { const v = sum(); expect(')'); return v; })()) : power();
                    const call = 'n' in arg ? { n: FN[name](arg.n) } : { s: name + '(' + arg.s + ')' };
                    if (!exp) return call;
                    if ('n' in call && 'n' in exp) return { n: Math.pow(call.n, exp.n) };
                    return { s: wrap(call) + '^' + wrap(exp) };
                }
                if (src.startsWith('pi', i)) { i += 2; return { n: Math.PI }; }
                i++;
                return c === 'e' ? { n: Math.E } : { s: c };
            }
            throw 0;
        }
        function expect(ch) { if (src[i] !== ch) throw 0; i++; }

        const v = sum();
        if (i !== src.length) throw 0;
        return 'n' in v ? num(v.n) : v.s;
    }

    const SUP = { 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079', '-': '\u207b', n: '\u207f', x: '\u02e3', i: '\u2071' };
    const UNSUP = Object.fromEntries(Object.entries(SUP).map(([k, v]) => [v, k]));

    // Display only: "sqrt(72)" reads as √72, "x^2" as x², "3pi/2" as 3π/2. Stored answers stay ASCII,
    // and clean() maps every one of these back, so a typed "x²" grades like "x^2".
    function prettyMath(s) {
        return String(s)
            .replace(/sqrt\(([a-z0-9.]+)\)/gi, '\u221a$1').replace(/sqrt\(/gi, '\u221a(')
            .replace(/\^(-?[0-9]+|[nxi])(?![0-9a-z])/g, (m, e) => [...e].map((c) => SUP[c]).join(''))
            .replace(/(^|[^a-z])pi(?![a-z])/gi, '$1\u03c0')
            .replace(/\s?>=\s?/g, ' \u2265 ').replace(/\s?<=\s?/g, ' \u2264 ').replace(/\s?!=\s?/g, ' \u2260 ')
            .replace(/\+\/-/g, '\u00b1').replace(/\*/g, '\u00b7');
    }

    function clean(s) {
        return String(s).replace(/[\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u207b\u207f\u02e3\u2071]+/g, (m) => '^(' + [...m].map((c) => UNSUP[c]).join('') + ')')
            .replace(/[\u00b7\u00d7]/g, '*').replace(/\u2265/g, '>=').replace(/\u2264/g, '<=')
            .toLowerCase()
            .replace(/\b(or|and)\b/g, ',')
            .replace(/\s+/g, '')
            .replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/−/g, '-')
            .replace(/\|([^|]*)\|/g, 'abs($1)');
    }
    // "[4,6]" is an ordered list; "x = 6 or x = -1" and "pi/6, 5pi/6" are sets of answers.
    function items(s) {
        let ordered = false;
        if (/^[[(].*[\])]$/.test(s) && s.includes(',') && depthOk(s.slice(1, -1))) { ordered = s[0] === '['; s = s.slice(1, -1); }
        const out = [];
        let d = 0, start = 0;
        for (let k = 0; k <= s.length; k++) {
            const ch = s[k];
            if (ch === '(' || ch === '[') d++;
            else if (ch === ')' || ch === ']') d--;
            else if ((ch === ',' || ch === undefined) && d === 0) { out.push(s.slice(start, k).replace(/^[a-z]=/, '')); start = k + 1; }
        }
        return { ordered, list: out.filter(Boolean) };
    }
    function depthOk(s) { let d = 0; for (const ch of s) { if (ch === '(') d++; if (ch === ')' && --d < 0) return false; } return d === 0; }
    function canon(item) { try { return parse(item); } catch (e) { return '\u0000' + item; } }

    function mathEquivalent(input, answer) {
        const a = clean(answer), g = clean(input);
        if (!g) return false;
        if (g === a) return true;
        if (/^[a-z]{2,}$/.test(a) && a !== 'pi') return false; // a word answer such as TRUE: spelling only
        const A = items(a), G = items(g);
        if (A.list.length !== G.list.length) return false;
        const ca = A.list.map(canon), cg = G.list.map(canon);
        if (A.ordered) return ca.every((x, k) => x === cg[k]);
        return ca.slice().sort().join('\u0001') === cg.slice().sort().join('\u0001');
    }

    root.mathEquivalent = mathEquivalent;
    root.prettyMath = prettyMath;
    if (typeof module !== 'undefined') module.exports = { mathEquivalent, prettyMath };
})(typeof window !== 'undefined' ? window : globalThis);
