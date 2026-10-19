import SwiftUI
import AVFoundation

/// One synthesizer for the whole app: AVSpeechSynthesizer stops speaking if it is
/// deallocated mid-utterance, which is exactly what happens to a @State instance
/// when SwiftUI re-renders the exercise.
enum Speech {
    private static let synthesizer = AVSpeechSynthesizer()

    static func speak(_ text: String, lang: String?, slow: Bool = false) {
        guard !text.isEmpty else { return }
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        if let lang { utterance.voice = AVSpeechSynthesisVoice(language: lang) }
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * (slow ? 0.4 : 0.9)
        synthesizer.speak(utterance)
    }
}

struct LessonView: View {
    var store: ContentStore
    var subjectId: String
    var lesson: Lesson
    /// Course language for TTS. Nil on non-language packs, where it is unused.
    var lang: String?

    @State private var index = 0
    @State private var input = ""
    @State private var selected: String?
    @State private var picked: [String] = []
    @State private var feedback: FeedbackState?
    @State private var exerciseKey = UUID()
    @State private var pressedChoice: String?
    @State private var correctCount = 0
    @State private var matchedCount = 0
    @State private var matchMissed = false
    /// Web parity (js/lingo-app.js): a miss comes back once at the end of the lesson,
    /// and a first attempt opens on a "Learn this first" card.
    @State private var queue: [Exercise] = []
    @State private var retried: Set<String> = []
    @State private var learning = false
    /// Duolingo-style feedback: a miss shakes the card, a run of right answers builds a combo.
    @State private var shakes: CGFloat = 0
    @State private var combo = 0
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 16) {
                if learning {
                    LearnCard(rows: learnRows, lang: lang) { withAnimation { learning = false } }
                } else if index < queue.count {
                    let exercise = queue[index]
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 12) {
                            ProgressTrack(fraction: Double(index) / Double(max(queue.count, 1)))
                            if combo >= 2 { ComboBadge(count: combo) }
                            HeartsRow(hearts: store.progress.hearts)
                        }
                        Text(prompt(for: exercise)).font(.title3.bold())
                        if let fen = exercise.fen { ChessBoard(fen: fen) }

                        switch exercise.type {
                        case "sentence":
                            WordBank(
                                words: exercise.words ?? [],
                                picked: $picked,
                                locked: feedback != nil
                            )
                        case "match":
                            MatchGrid(
                                pairs: exercise.pairs ?? [],
                                matchedCount: $matchedCount,
                                missed: $matchMissed
                            )
                        case "listening":
                            HStack(spacing: 10) {
                                Button {
                                    Speech.speak(exercise.audio ?? exercise.answer, lang: lang)
                                } label: {
                                    Label("Play", systemImage: "speaker.wave.2.fill")
                                }
                                Button {
                                    Speech.speak(exercise.audio ?? exercise.answer, lang: lang, slow: true)
                                } label: {
                                    Label("Slow", systemImage: "tortoise.fill")
                                }
                            }
                            .buttonStyle(.bordered)
                            TextField("Type what you hear", text: $input)
                                .textFieldStyle(.roundedBorder)
                                .disabled(feedback != nil)
                        default:
                            if let choices = exercise.choices {
                                ForEach(choices, id: \.self) { choice in
                                    ChoiceButton(
                                        choice: choice,
                                        isSelected: selected == choice,
                                        isPressed: pressedChoice == choice
                                    ) {
                                        guard feedback == nil else { return }
                                        pressedChoice = choice
                                        withAnimation(.spring(response: 0.25, dampingFraction: 0.6)) {
                                            selected = choice
                                        }
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { pressedChoice = nil }
                                    }
                                }
                            } else {
                                TextField("Your answer", text: $input)
                                    .textFieldStyle(.roundedBorder)
                                    .disabled(feedback != nil)
                                // Web parity: the keypad in js/lingo-app.js. Each key types the exact
                                // ASCII the answer key uses, so a tap never produces a wrong answer.
                                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 8) {
                                    ForEach(["sqrt(", "pi", "^", "/", "(", ")", "-", ","], id: \.self) { key in
                                        Button(key) { input += key }
                                            .buttonStyle(.bordered)
                                            .accessibilityLabel("Insert \(key)")
                                            .disabled(feedback != nil)
                                    }
                                }
                            }
                        }

                        Button(feedback == nil ? "Check" : "Continue") {
                            feedback == nil ? check(exercise) : advance()
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(feedback == nil && given(for: exercise).isEmpty)
                    }
                    .modifier(Shake(travel: shakes))
                    .id(exerciseKey)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
                    .onAppear {
                        if exercise.type == "listening", !learning {
                            Speech.speak(exercise.audio ?? exercise.answer, lang: lang)
                        }
                    }
                } else {
                    LessonSummary(
                        passed: store.lessonPassed(correct: correctCount, total: lesson.exercises.count),
                        correct: correctCount,
                        total: lesson.exercises.count
                    ) {
                        if store.lessonPassed(correct: correctCount, total: lesson.exercises.count) {
                            store.completeLesson(subjectId, lesson.id)
                        }
                        dismiss()
                    }
                }
                Spacer()
            }
            .padding()

            if let fb = feedback {
                FeedbackBanner(state: fb)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .navigationTitle(lesson.title)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .onAppear {
            store.startLesson()
            guard queue.isEmpty else { return }
            queue = lesson.exercises
            learning = !store.progress.completedLessonIds.contains("\(subjectId):\(lesson.id)") && !learnRows.isEmpty
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: feedback)
        // ponytail: driven off the existing feedback state, so the wrong-answer buzz is free.
        // .sensoryFeedback is cross-platform and simply no-ops on macOS, hence no #if fence.
        .sensoryFeedback(trigger: feedback) { _, new in
            guard let new else { return nil }
            return new.isCorrect ? .success : .error
        }
    }

    /// Web parity: the listening prompt is the instruction, not the answer text.
    private func prompt(for exercise: Exercise) -> String {
        exercise.type == "listening" ? "Type what you hear" : exercise.question
    }

    private func given(for exercise: Exercise) -> String {
        switch exercise.type {
        case "sentence": return picked.joined(separator: " ")
        case "match":
            // Enables Check only once every pair is placed; `missed` decides the grade.
            return matchedCount == (exercise.pairs?.count ?? 0) ? exercise.answer : ""
        case "listening": return input.trimmingCharacters(in: .whitespaces)
        default: return exercise.choices != nil
            ? (selected ?? "")
            : input.trimmingCharacters(in: .whitespaces)
        }
    }

    private func check(_ exercise: Exercise) {
        let correct = exercise.type == "match"
            ? !matchMissed
            // A tapped choice is compared exactly: normalizing made "# comment" equal
            // "// comment" and "String" equal "string", so wrong choices graded as right.
            : exercise.choices != nil && exercise.type != "sentence"
                ? given(for: exercise) == exercise.answer
                : normalize(given(for: exercise)) == normalize(exercise.answer)
        // A recovered miss counts, but never past the lesson's real length.
        if correct { correctCount = min(correctCount + 1, lesson.exercises.count) }
        if correct {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) { combo += 1 }
        } else {
            combo = 0
            withAnimation(.linear(duration: 0.4)) { shakes += 1 }
        }
        if !correct, !retried.contains(exercise.id) {
            retried.insert(exercise.id)
            queue.append(exercise)
        }
        store.recordAnswer(correct: correct, exerciseId: exercise.id, lessonId: lesson.id, subjectId: subjectId, exercise: exercise)
        withAnimation {
            feedback = correct
                ? .correct(teach(exercise))
                : .incorrect(exercise.answer, teach(exercise))
        }
    }

    /// Answers are compared ignoring spacing, case, and trailing punctuation so a
    /// word-bank answer and a typed one grade the same way.
    private func normalize(_ text: String) -> String {
        text.lowercased()
            .trimmingCharacters(in: CharacterSet.punctuationCharacters.union(.whitespaces))
            .replacingOccurrences(of: " ", with: "")
    }

    /// What the answer means, from this lesson's own translation and match exercises.
    private func meaning(of target: String) -> String? {
        let key = normalize(target)
        for e in lesson.exercises {
            if e.type == "translation" || e.type == "sentence", normalize(e.answer) == key { return e.question }
            for pair in e.pairs ?? [] where pair.count == 2 && normalize(pair[1]) == key { return pair[0] }
        }
        return nil
    }

    /// The line under the verdict: the written "why" if there is one, else for a
    /// language answer what it means, so a miss teaches instead of only marking.
    private func teach(_ exercise: Exercise) -> String? {
        if let explain = exercise.explain { return explain }
        guard lang != nil, exercise.type != "match" else { return nil }
        let said = exercise.type == "cloze"
            ? exercise.question.replacingOccurrences(of: "_{2,}", with: exercise.answer, options: .regularExpression)
            : exercise.answer
        let means = exercise.type == "translation" || exercise.type == "sentence" ? exercise.question : meaning(of: said)
        if let means { return "\(said) means \"\(means)\"" }
        return exercise.type == "cloze" ? said : nil
    }

    private var learnRows: [LearnRow] {
        var rows: [LearnRow] = []
        for e in lesson.exercises {
            if let pairs = e.pairs {
                for pair in pairs where pair.count == 2 { rows.append(LearnRow(term: pair[1], meaning: pair[0], sayable: true)) }
            } else if e.type == "translation" || e.type == "sentence" {
                rows.append(LearnRow(term: e.answer, meaning: e.question, sayable: true))
            } else if e.type == "listening" {
                rows.append(LearnRow(term: e.answer, meaning: meaning(of: e.answer) ?? "", sayable: true))
            } else if e.type == "cloze" {
                let full = e.question.replacingOccurrences(of: "_{2,}", with: e.answer, options: .regularExpression)
                rows.append(LearnRow(term: full, meaning: meaning(of: full) ?? "", sayable: true))
            } else {
                rows.append(LearnRow(term: e.question, meaning: e.answer + (e.explain.map { ". \($0)" } ?? ""), sayable: false))
            }
        }
        var seen: Set<String> = []
        return Array(rows.filter { seen.insert($0.term).inserted }.prefix(8))
    }

    private func advance() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
            feedback = nil; exerciseKey = UUID(); index += 1
            input = ""; selected = nil; picked = []
            matchedCount = 0; matchMissed = false
        }
    }
}

/// Tap-to-build word bank, mirroring the web renderer in js/lingo-app.js.
private struct WordBank: View {
    let words: [String]
    @Binding var picked: [String]
    let locked: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            FlowRow {
                ForEach(Array(picked.enumerated()), id: \.offset) { offset, word in
                    Chip(word) { guard !locked else { return }; picked.remove(at: offset) }
                }
            }
            .frame(minHeight: 44, alignment: .topLeading)
            .overlay(alignment: .bottom) { Divider() }

            FlowRow {
                ForEach(Array(words.enumerated()), id: \.offset) { offset, word in
                    if !usedOffsets.contains(offset) {
                        Chip(word) { guard !locked else { return }; picked.append(word) }
                    }
                }
            }
        }
    }

    /// A word can legitimately appear twice in one sentence, so consume by position:
    /// match each picked word to the first not-yet-consumed bank slot holding it.
    private var usedOffsets: Set<Int> {
        var used: Set<Int> = []
        for word in picked {
            if let offset = words.indices.first(where: { words[$0] == word && !used.contains($0) }) {
                used.insert(offset)
            }
        }
        return used
    }
}

/// Two columns; tap one side then the other. A mispair is remembered in `missed` so
/// the exercise still grades as incorrect while the user keeps going. Web parity:
/// `selectMatch` in js/lingo-app.js.
private struct MatchGrid: View {
    let pairs: [[String]]
    @Binding var matchedCount: Int
    @Binding var missed: Bool

    @State private var selection: Cell?
    @State private var matched: Set<Int> = []
    @State private var shuffled: [Int] = []

    private struct Cell: Equatable { let key: Int; let isPrompt: Bool }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            column(keys: pairs.indices.map { $0 }, isPrompt: true)
            column(keys: shuffled, isPrompt: false)
        }
        .onAppear { if shuffled.isEmpty { shuffled = pairs.indices.shuffled() } }
    }

    private func column(keys: [Int], isPrompt: Bool) -> some View {
        VStack(spacing: 12) {
            ForEach(keys, id: \.self) { key in
                let cell = Cell(key: key, isPrompt: isPrompt)
                let text = isPrompt ? pairs[key].first ?? "" : pairs[key].last ?? ""
                Button { tap(cell) } label: {
                    Text(text)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(background(for: cell))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(matched.contains(key))
                .opacity(matched.contains(key) ? 0.55 : 1)
            }
        }
    }

    private func background(for cell: Cell) -> Color {
        if matched.contains(cell.key) { return Color(hex: "f5f5e6") }
        if selection == cell { return Color(hex: "5B9BD5").opacity(0.15) }
        return Color.secondary.opacity(0.12)
    }

    private func tap(_ cell: Cell) {
        guard let previous = selection else { selection = cell; return }
        if previous == cell { selection = nil; return }
        selection = nil
        guard previous.isPrompt != cell.isPrompt else { return }

        if previous.key == cell.key {
            matched.insert(cell.key)
            matchedCount = matched.count
        } else {
            missed = true
        }
    }
}

private struct Chip: View {
    let text: String
    let action: () -> Void

    init(_ text: String, action: @escaping () -> Void) {
        self.text = text
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Text(text)
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(Color.secondary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

/// ponytail: SwiftUI has no wrapping HStack, and Layout is ~20 lines. Not worth a package.
private struct FlowRow: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for size in subviews.map({ $0.sizeThatFits(.unspecified) }) {
            if x + size.width > width, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: proposal.width ?? x, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX; y += rowHeight + spacing; rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

private struct HeartsRow: View {
    let hearts: Int

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<5, id: \.self) { index in
                Image(systemName: index < hearts ? "heart.fill" : "heart")
                    .foregroundStyle(index < hearts ? Color(hex: "c44040") : Color.secondary.opacity(0.4))
                    .symbolEffect(.bounce, value: hearts)
            }
        }
        .font(.footnote)
        .accessibilityLabel("\(hearts) hearts remaining")
    }
}

private struct LessonSummary: View {
    let passed: Bool
    let correct: Int
    let total: Int
    let done: () -> Void
    @State private var shown = false

    var body: some View {
        ZStack {
            if passed { Confetti() }
            VStack(spacing: 12) {
                Image(systemName: passed ? "checkmark.circle.fill" : "arrow.counterclockwise.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(Color(hex: passed ? "5B9BD5" : "c44040"))
                    .scaleEffect(shown ? 1 : 0.2)
                    .symbolEffect(.bounce, value: shown)
                Text(passed ? "Lesson complete!" : "Try again").font(.title.bold())
                Text("\(correct) of \(total) correct").foregroundStyle(.secondary)
                if passed {
                    Label("+\(correct * 10) XP", systemImage: "bolt.fill")
                        .font(.headline).foregroundStyle(Color(hex: "5B9BD5"))
                }
                Button("Done", action: done).buttonStyle(.borderedProminent)
            }
            .frame(maxWidth: .infinity)
        }
        .onAppear { withAnimation(.spring(response: 0.5, dampingFraction: 0.45)) { shown = true } }
    }
}

/// The bar across the top of a lesson: fills as you go.
private struct ProgressTrack: View {
    let fraction: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.secondary.opacity(0.18))
                Capsule().fill(Color(hex: "5B9BD5"))
                    .frame(width: max(geo.size.height, geo.size.width * fraction))
            }
        }
        .frame(height: 12)
        .animation(.spring(response: 0.5, dampingFraction: 0.8), value: fraction)
        .accessibilityLabel("Lesson progress")
        .accessibilityValue("\(Int(fraction * 100)) percent")
    }
}

private struct ComboBadge: View {
    let count: Int
    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: "flame.fill").symbolEffect(.bounce, value: count)
            Text("\(count)").contentTransition(.numericText())
        }
        .font(.footnote.bold())
        .foregroundStyle(Color(hex: "5B9BD5"))
        .accessibilityLabel("\(count) correct in a row")
    }
}

/// Sideways wobble driven by an ever-growing counter, so each miss shakes once.
private struct Shake: GeometryEffect {
    var travel: CGFloat
    var animatableData: CGFloat {
        get { travel }
        set { travel = newValue }
    }
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: 10 * sin(travel * .pi * 4), y: 0))
    }
}

/// A short burst of blue and green pieces behind the lesson-complete card.
private struct Confetti: View {
    @State private var fired = false
    private let pieces: [(x: CGFloat, y: CGFloat, size: CGFloat, hex: String)] = (0..<28).map { i in
        let a = Double(i) / 28 * 2 * .pi
        let r = CGFloat(90 + (i * 37) % 90)
        return (cos(a) * r, sin(a) * r, CGFloat(6 + i % 5 * 2), ["5B9BD5", "2e86de", "8FC1E8", "4CAF7A"][i % 4])
    }

    var body: some View {
        ZStack {
            ForEach(pieces.indices, id: \.self) { i in
                let p = pieces[i]
                Circle().fill(Color(hex: p.hex))
                    .frame(width: p.size, height: p.size)
                    .offset(x: fired ? p.x : 0, y: fired ? p.y : 0)
                    .opacity(fired ? 0 : 1)
            }
        }
        .allowsHitTesting(false)
        .onAppear { withAnimation(.easeOut(duration: 1.1)) { fired = true } }
    }
}

private struct ChoiceButton: View {
    let choice: String
    let isSelected: Bool
    let isPressed: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack { Text(choice); Spacer() }
                .padding()
                .background(isSelected ? Color(hex: "5B9BD5").opacity(0.15) : Color.secondary.opacity(0.12))
                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(isSelected ? Color(hex: "5B9BD5") : .clear, lineWidth: 2))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressed ? 0.96 : 1.0)
        .animation(.spring(response: 0.2, dampingFraction: 0.6), value: isPressed)
    }
}

struct LearnRow: Identifiable {
    let term: String
    let meaning: String
    let sayable: Bool
    var id: String { term }
}

/// "Learn this first": the lesson's answers before its quiz.
private struct LearnCard: View {
    let rows: [LearnRow]
    let lang: String?
    let start: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("LEARN THIS FIRST").font(.caption).foregroundStyle(.secondary)
                ForEach(rows) { row in
                    HStack(alignment: .top, spacing: 10) {
                        if lang != nil, row.sayable {
                            Button { Speech.speak(row.term, lang: lang) } label: {
                                Image(systemName: "speaker.wave.2.fill")
                            }
                            .buttonStyle(.bordered)
                            .accessibilityLabel("Hear \(row.term)")
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.term).font(.body.weight(.semibold))
                            if !row.meaning.isEmpty {
                                Text(row.meaning).font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                Button("Start the quiz", action: start).buttonStyle(.borderedProminent)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

enum FeedbackState: Equatable {
    case correct(String?)
    case incorrect(String, String?)

    var isCorrect: Bool { if case .correct = self { return true }; return false }
}

private struct FeedbackBanner: View {
    let state: FeedbackState
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: state.isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.title2)
            VStack(alignment: .leading, spacing: 2) {
                Text(state.isCorrect ? "Correct!" : "Incorrect").font(.headline)
                if case .incorrect(let answer, _) = state {
                    Text("Answer: \(answer)").font(.subheadline)
                }
                // The "why" behind the answer, shown either way so a correct
                // guess still teaches the rule behind it.
                if let explain {
                    Text(explain).font(.subheadline).opacity(0.85)
                }
            }
            Spacer()
        }
        .foregroundStyle(state.isCorrect ? Color(hex: "5c6f1f") : Color(hex: "c44040"))
        .padding()
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous)
            .fill(state.isCorrect ? Color(hex: "f5f5e6") : Color(hex: "faf0f0")))
        .padding()
    }

    private var explain: String? {
        switch state {
        case .correct(let explain): return explain
        case .incorrect(_, let explain): return explain
        }
    }
}

/// Board for a `chess` exercise, drawn from its FEN with the side to move at the
/// bottom. Both sides use the solid glyphs, told apart by colour and outline.
/// U+FE0E keeps the pawn from rendering as a colour emoji.
struct ChessBoard: View {
    let fen: String
    private static let glyphs: [Character: String] = [
        "k": "\u{265A}", "q": "\u{265B}", "r": "\u{265C}", "b": "\u{265D}", "n": "\u{265E}", "p": "\u{265F}",
    ]

    private var parts: (rows: [[Character]], black: Bool) {
        let fields = fen.split(separator: " ")
        let rows = (fields.first ?? "").split(separator: "/").map { rank in
            rank.flatMap { c -> [Character] in c.isNumber ? Array(repeating: ".", count: c.wholeNumberValue ?? 0) : [c] }
        }
        return (rows, fields.count > 1 && fields[1] == "b")
    }

    var body: some View {
        let (rows, black) = parts
        Grid(horizontalSpacing: 0, verticalSpacing: 0) {
            ForEach(0..<8, id: \.self) { r in
                GridRow {
                    ForEach(0..<8, id: \.self) { f in
                        let rank = black ? 7 - r : r, file = black ? 7 - f : f
                        let piece: Character = rows.indices.contains(rank) && rows[rank].indices.contains(file) ? rows[rank][file] : "."
                        ZStack {
                            Rectangle().fill((rank + file) % 2 == 1 ? Color(hex: "9fb6cd") : Color(hex: "eef2f7"))
                            if let glyph = Self.glyphs[Character(piece.lowercased())] {
                                let text = Text(glyph + "\u{FE0E}").font(.system(size: 30))
                                if piece.isUppercase {
                                    // Outline: the glyph in near-black under a slightly smaller white one.
                                    ZStack {
                                        text.foregroundStyle(Color(hex: "18181b")).scaleEffect(1.12)
                                        text.foregroundStyle(Color.white)
                                    }
                                } else {
                                    text.foregroundStyle(Color(hex: "18181b"))
                                }
                            }
                        }
                        .aspectRatio(1, contentMode: .fit)
                    }
                }
            }
        }
        .frame(maxWidth: 360)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity)
        .accessibilityElement()
        .accessibilityLabel("Chess position, \(black ? "Black" : "White") to move")
    }
}
