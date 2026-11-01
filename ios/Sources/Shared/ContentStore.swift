import Foundation
import WidgetKit

@Observable
final class ContentStore {
    var catalog: Catalog?
    var progress: LingoProgress

    private let progressKey = "lingo.progress"

    init() {
        progress = ContentStore.loadProgress(key: progressKey)
        catalog = ContentStore.loadJSON("catalog", as: Catalog.self)
        Task { await syncFromCloud() }
    }

    func syncFromCloud() async {
        guard let session = await AuthStore.currentSession(),
              let data = try? await Backend.call("GET", "/rest/lingo_progress", token: session.accessToken),
              let row = (try? JSONDecoder().decode([DBProgress].self, from: data))?.first else { return }
        progress.xp = row.xp
        progress.streak = row.streak
        progress.hearts = row.hearts
        progress.lastPlayed = row.last_played ?? ""
        progress.completedLessonIds = Set(row.lessons_completed.keys)
        progress.srs = row.srs
        save()
    }

    func loadCourse(_ subject: Subject) -> CoursePack? {
        guard let packPath = subject.packPath else { return nil }
        let name = (packPath as NSString).lastPathComponent.replacingOccurrences(of: ".json", with: "")
        return ContentStore.loadJSON(name, subdir: "courses", as: CoursePack.self)
    }

    func loadNotes(_ subject: Subject) -> Notes? {
        guard let notesPath = subject.notesPath else { return nil }
        let name = (notesPath as NSString).lastPathComponent.replacingOccurrences(of: ".json", with: "")
        return ContentStore.loadJSON(name, subdir: "notes", as: Notes.self)
    }

    func recordAnswer(correct: Bool, exerciseId: String, lessonId: String, subjectId: String = "", exercise: Exercise? = nil) {
        if correct { progress.xp += 10 } else { progress.hearts = max(0, progress.hearts - 1) }
        updateSrs(exerciseId, correct: correct)
        if let exercise { updateWords(subjectId, exercise, correct: correct) }
        save()
    }

    /// Word strength, web parity with `updateWords` in js/lingo-app.js: per-subject
    /// { word: [seen, correct] }, local-only (UserDefaults, never synced).
    /// ponytail: recorded but no weak-word session on iOS yet; weak = seen >= 2, under 60% right.
    private static let wordsKey = "lingo.words"

    private func updateWords(_ subjectId: String, _ exercise: Exercise, correct: Bool) {
        guard !subjectId.isEmpty, ["translation", "cloze", "listening", "sentence"].contains(exercise.type) else { return }
        var all = UserDefaults.standard.dictionary(forKey: ContentStore.wordsKey) as? [String: [String: [Int]]] ?? [:]
        var subject = all[subjectId] ?? [:]
        let words = Set(exercise.answer.lowercased().split { !$0.isLetter && !$0.isNumber }.map(String.init))
        for word in words {
            var entry = subject[word] ?? [0, 0]
            entry[0] += 1
            if correct { entry[1] += 1 }
            subject[word] = entry
        }
        all[subjectId] = subject
        UserDefaults.standard.set(all, forKey: ContentStore.wordsKey)
    }

    /// Web parity: `LESSON_PASS_RATIO` / `lessonPassed` in js/lingo-app.js.
    static let lessonPassRatio = 0.6

    func lessonPassed(correct: Int, total: Int) -> Bool {
        guard progress.hearts > 0, total > 0 else { return false }
        return Double(correct) / Double(total) >= ContentStore.lessonPassRatio
    }

    func startLesson() {
        progress.hearts = 5
    }

    /// SM-2, ported verbatim from `updateSrs` in js/lingo-app.js so cards written on
    /// either platform stay interchangeable through the shared `srs` column.
    private func updateSrs(_ exerciseId: String, correct: Bool) {
        var card = progress.srs[exerciseId] ?? SrsCard(nextReview: ContentStore.isoDay(Date()))
        if correct {
            if card.repetitions == 0 { card.interval = 1 }
            else if card.repetitions == 1 { card.interval = 6 }
            else { card.interval = Int((Double(card.interval) * card.easiness).rounded()) }
            card.repetitions += 1
        } else {
            card.repetitions = 0
            card.interval = 1
        }
        let quality = correct ? 5.0 : 2.0
        card.easiness = max(1.3, card.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
        let next = Calendar.current.date(byAdding: .day, value: card.interval, to: Date()) ?? Date()
        card.nextReview = ContentStore.isoDay(next)
        progress.srs[exerciseId] = card
    }

    var dueCount: Int {
        let now = Date()
        return progress.srs.values.filter {
            (ISO8601DateFormatter().date(from: $0.nextReview) ?? now) <= now
        }.count
    }

    private static func isoDay(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    func completeLesson(_ subjectId: String, _ lessonId: String) {
        progress.completedLessonIds.insert("\(subjectId):\(lessonId)")
        updateStreak()
        save()
        DailyReminder.lessonCompleted()
    }

    var playedToday: Bool {
        let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
        return progress.lastPlayed == fmt.string(from: Date())
    }

    private func updateStreak() {
        let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
        let today = fmt.string(from: Date())
        guard progress.lastPlayed != today else { return }
        if let prev = fmt.date(from: progress.lastPlayed) {
            let days = Calendar.current.dateComponents([.day], from: prev, to: Date()).day ?? 0
            progress.streak = days > 1 ? 1 : progress.streak + 1
        } else {
            progress.streak += 1
        }
        progress.lastPlayed = today
    }

    private func save() {
        if let data = try? JSONEncoder().encode(progress) {
            UserDefaults.standard.set(data, forKey: progressKey)
        }
        let snap = progress

        if let shared = UserDefaults(suiteName: "group.com.nulljosh.lingo") {
            shared.set(snap.streak, forKey: "widget.streak")
            shared.set(snap.xp, forKey: "widget.xp")
        }
        WidgetCenter.shared.reloadAllTimelines()

        Task {
            guard let session = await AuthStore.currentSession() else { return }
            let uid = session.user.id
            let row = DBProgress(
                id: uid, xp: snap.xp, streak: snap.streak, hearts: snap.hearts,
                completed_subjects: [], trophy_ids: [],
                lessons_completed: Dictionary(uniqueKeysWithValues: snap.completedLessonIds.map { ($0, true) }),
                last_played: snap.lastPlayed.isEmpty ? nil : snap.lastPlayed,
                srs: snap.srs,
                updated_at: ISO8601DateFormatter().string(from: Date())
            )
            guard let body = try? JSONSerialization.jsonObject(with: JSONEncoder().encode(row)) else { return }
            _ = try? await Backend.call("POST", "/rest/lingo_progress", body: body, token: session.accessToken, prefer: "resolution=merge-duplicates")
        }
    }

    private static func loadProgress(key: String) -> LingoProgress {
        guard let data = UserDefaults.standard.data(forKey: key),
              let p = try? JSONDecoder().decode(LingoProgress.self, from: data) else {
            return LingoProgress()
        }
        return p
    }

    private static func loadJSON<T: Decodable>(_ name: String, subdir: String? = nil, as type: T.Type) -> T? {
        // ponytail: xcodegen flattens resource folders, so fall back to bundle root
        guard let url = Bundle.main.url(forResource: name, withExtension: "json", subdirectory: subdir)
                ?? Bundle.main.url(forResource: name, withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(T.self, from: data) else {
            return nil
        }
        return decoded
    }
}
