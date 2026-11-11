import Foundation
import JavaScriptCore

/// Grades typed math answers with the web app's own grader (content/math-equiv.js), so
/// "(x-3)(x-2)" passes for "(x-2)(x-3)" on every platform, not just the web.
enum MathGrader {
    private static let context: JSContext? = {
        guard let url = Bundle.main.url(forResource: "math-equiv", withExtension: "js", subdirectory: "content")
                ?? Bundle.main.url(forResource: "math-equiv", withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8),
              let context = JSContext() else { return nil }
        context.evaluateScript(source)
        return context
    }()
    private static let fn = context?.objectForKeyedSubscript("mathEquivalent")
    private static let prettyFn = context?.objectForKeyedSubscript("prettyMath")

    /// "x^2" as x², "sqrt(2)" as √2, the same as the web. Unchanged if the script did not load.
    static func pretty(_ text: String) -> String {
        guard let prettyFn, !prettyFn.isUndefined, let out = prettyFn.call(withArguments: [text])?.toString() else { return text }
        return out
    }

    /// Nil when the grader could not load; the caller falls back to an exact compare.
    static func equivalent(_ input: String, _ answer: String) -> Bool? {
        guard let fn, !fn.isUndefined, let result = fn.call(withArguments: [input, answer]) else { return nil }
        return result.toBool()
    }
}

extension CoursePack {
    /// Math packs show their notation nicely. Answers and choices change together, so a tapped
    /// choice still equals the answer, and the grader maps x² back to x^2 for typed answers.
    func prettified() -> CoursePack {
        guard category == "math" else { return self }
        let p = MathGrader.pretty
        return CoursePack(id: id, name: name, category: category, level: level, lang: lang, units: units.map { u in
            Unit(id: u.id, title: u.title, tip: u.tip.map(p), preview: u.preview, lessons: u.lessons.map { l in
                Lesson(id: l.id, title: l.title, exercises: l.exercises.map { e in
                    Exercise(type: e.type, question: p(e.question), answer: p(e.answer), choices: e.choices?.map(p),
                             words: e.words, audio: e.audio, pairs: e.pairs, fen: e.fen, explain: e.explain.map(p), id: e.id)
                })
            })
        })
    }
}
