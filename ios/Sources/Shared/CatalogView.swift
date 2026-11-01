import SwiftUI

struct CatalogView: View {
    var store: ContentStore
    var auth: AuthStore
    #if os(macOS)
    @State private var showingSettings = false
    #endif
    #if os(iOS)
    @State private var selectedSubject: Subject?
    #endif

    /// Deliberate order, matching the web app's default of `languages` first
    /// (js/lingo-app.js). Alphabetical sorting put `books` at the top, so a language
    /// app opened as a list of book summaries -- which is also what a reviewer saw.
    private static let categoryOrder = [
        "languages", "school", "math", "science", "programming", "computer_science", "engineering", "skills", "computers", "books",
    ]

    private func orderedCategoryKeys(_ catalog: Catalog) -> [String] {
        let known = CatalogView.categoryOrder.filter { catalog.categories[$0] != nil }
        let rest = catalog.categories.keys.filter { !CatalogView.categoryOrder.contains($0) }.sorted()
        return known + rest
    }

    var body: some View {
        #if os(iOS)
        // NavigationSplitView collapses to a plain stack on iPhone's compact width, so
        // this is a no-op there. On iPad it gives the catalog a persistent sidebar
        // instead of a full-width list with nothing beside it.
        NavigationSplitView {
            catalogList
                .navigationTitle("Patois")
                // No big app title on Home (Joshua, 2026-10-25): the list starts at the top, Settings is a tab.
                .toolbar(.hidden, for: .navigationBar)
                // Store screenshots: `-shotSubject spanish` opens that course on launch.
                .onChange(of: store.catalog != nil, initial: true) { _, ready in
                    guard ready, selectedSubject == nil, let id = UserDefaults.standard.string(forKey: "shotSubject") else { return }
                    selectedSubject = store.catalog?.categories.values.flatMap(\.subjects).first { $0.id == id }
                }
        } detail: {
            if let selectedSubject {
                if selectedSubject.notesPath != nil {
                    NotesView(store: store, subject: selectedSubject)
                } else {
                    UnitsView(store: store, subject: selectedSubject)
                }
            } else {
                ContentUnavailableView("Select a Subject", systemImage: "book.closed")
            }
        }
        #else
        NavigationStack {
            catalogList
                .navigationTitle("Patois")
                .listStyle(.inset)
                // ponytail: Mac had no Settings surface at all, so sign-in was unreachable
                // there. One toolbar button reuses the same SettingsView as iOS.
                .toolbar {
                    Button {
                        showingSettings = true
                    } label: {
                        Label("Settings", systemImage: "gearshape")
                    }
                    .accessibilityIdentifier("settingsButton")
                }
                .sheet(isPresented: $showingSettings) {
                    NavigationStack {
                        SettingsView(auth: auth, store: store)
                            .toolbar {
                                Button("Done") { showingSettings = false }
                            }
                    }
                    .frame(minWidth: 420, minHeight: 480)
                }
        }
        #endif
    }

    @ViewBuilder
    private var catalogList: some View {
        if let catalog = store.catalog {
            #if os(iOS)
            List(selection: $selectedSubject) {
                ForEach(orderedCategoryKeys(catalog), id: \.self) { key in
                    let category = catalog.categories[key]!
                    Section(category.title) {
                        ForEach(category.subjects) { subject in
                            SubjectRow(subject: subject)
                                .tag(subject)
                        }
                    }
                }
            }
            #else
            List {
                ForEach(orderedCategoryKeys(catalog), id: \.self) { key in
                    let category = catalog.categories[key]!
                    Section(category.title) {
                        ForEach(category.subjects) { subject in
                            NavigationLink {
                                if subject.notesPath != nil {
                                    NotesView(store: store, subject: subject)
                                } else {
                                    UnitsView(store: store, subject: subject)
                                }
                            } label: {
                                SubjectRow(subject: subject)
                            }
                        }
                    }
                }
            }
            #endif
        } else {
            Text("Couldn't load catalog.")
        }
    }
}

/// Bottom tab bar wrapping Catalog + Settings — iOS only (macOS keeps CatalogView's
/// own window, no tab-bar idiom there).
struct RootTabView: View {
    var store: ContentStore
    var auth: AuthStore

    var body: some View {
        TabView {
            CatalogView(store: store, auth: auth)
                .tabItem { Label("Learn", systemImage: "book.fill") }
            NavigationStack {
                SettingsView(auth: auth, store: store)
            }
            .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}

private struct SubjectRow: View {
    let subject: Subject

    // ponytail: Mac rows carry their own metrics — the iOS sizes read cramped and
    // touch-targeted in a desktop window. Tune here, not by forking the whole view.
    #if os(macOS)
    private static let iconSize: CGFloat = 26
    private static let iconTextGap: CGFloat = 10
    private static let rowPadding: CGFloat = 7
    private static let titleFont: Font = .system(size: 13, weight: .medium)
    private static let subtitleFont: Font = .system(size: 11)
    #else
    private static let iconSize: CGFloat = 32
    private static let iconTextGap: CGFloat = 12
    private static let rowPadding: CGFloat = 2
    private static let titleFont: Font = .body.weight(.medium)
    private static let subtitleFont: Font = .caption
    #endif

    var body: some View {
        HStack(spacing: Self.iconTextGap) {
            icon
            VStack(alignment: .leading, spacing: 2) {
                Text(subject.name)
                    .font(Self.titleFont)
                Text(subject.level.capitalized)
                    .font(Self.subtitleFont)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, Self.rowPadding)
    }

    private var icon: some View {
        Image(systemName: sfSymbol(for: subject.icon))
            .font(.system(size: Self.iconSize * 0.5))
            .foregroundStyle(.white)
            .frame(width: Self.iconSize, height: Self.iconSize)
            .background(Color(hex: "5B9BD5"))
            .clipShape(RoundedRectangle(cornerRadius: Self.iconSize * 0.25, style: .continuous))
    }

    private func sfSymbol(for faIcon: String) -> String {
        let key = faIcon.components(separatedBy: " ").last?.replacingOccurrences(of: "fa-", with: "") ?? ""
        let map: [String: String] = [
            "book": "book.fill", "book-open": "book",
            "chalkboard-user": "graduationcap.fill",
            "atom": "staroflife.fill", "chess": "crown.fill",
            "computer": "desktopcomputer", "database": "cylinder.fill",
            "dna": "staroflife.fill", "draw-polygon": "pentagon.fill",
            "earth-africa": "globe.europe.africa.fill",
            "earth-americas": "globe.americas.fill",
            "earth-asia": "globe.asia.australia.fill",
            "earth-europe": "globe.europe.africa.fill",
            "flask": "flask.fill", "globe": "globe",
            "guitar": "guitars", "heart-pulse": "waveform.path.ecg",
            "infinity": "infinity", "landmark": "building.columns.fill",
            "language": "character.bubble.fill", "microchip": "cpu.fill",
            "music": "music.note", "chart-bar": "chart.bar.fill",
            "pizza-slice": "fork.knife", "plus": "plus.circle.fill",
            "puzzle-piece": "puzzlepiece.fill",
            "satellite": "antenna.radiowaves.left.and.right",
            "superscript": "x.squareroot", "table-cells": "tablecells.fill",
            "wave-square": "waveform", "golang": "chevron.left.forwardslash.chevron.right",
            "java": "curlybraces", "js": "curlybraces",
            "python": "curlybraces", "rust": "curlybraces",
        ]
        return map[key] ?? "book.fill"
    }
}
