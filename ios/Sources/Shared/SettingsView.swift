import SwiftUI

struct SettingsView: View {
    @AppStorage(DailyReminder.enabledKey) private var dailyReminder = true
    var auth: AuthStore
    var store: ContentStore
    @State private var confirmingDelete = false
    @State private var deleting = false
    @State private var deleteError: String?
    @State private var showingAuth = false
    @State private var avatarId = ""
    @State private var profile: LingoProfile?

    var body: some View {
        List {
            if auth.isSignedIn {
                accountSection
                progressSection

                Section("Avatar") {
                    HStack {
                        AvatarPickerView(avatarId: $avatarId)
                        Text("Tap to generate a new avatar").font(.footnote).foregroundStyle(.secondary)
                    }
                    .onChange(of: avatarId) { _, newValue in
                        guard !newValue.isEmpty, newValue != profile?.avatar_id else { return }
                        Task { try? await auth.updateAvatar(newValue) }
                    }
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        Task {
                            try? await auth.signOut()
                            profile = nil
                        }
                    }
                }

                Section {
                    Button("Delete Account", role: .destructive) {
                        confirmingDelete = true
                    }
                    .disabled(deleting)
                } footer: {
                    Text("Permanently deletes your account and progress. This cannot be undone.")
                }
            } else {
                Section {
                    Button("Sign In") {
                        showingAuth = true
                    }
                    .accessibilityIdentifier("settingsSignIn")
                } footer: {
                    Text("Sign in to sync your progress across devices.")
                }
            }
            #if os(iOS)
            Section {
                Toggle("Daily reminder", isOn: $dailyReminder)
                    .onChange(of: dailyReminder) { _, _ in
                        Task { await DailyReminder.reschedule(playedToday: store.playedToday) }
                    }
            } footer: {
                Text("A nudge at 7 pm on days you have not done a lesson.")
            }
            #endif
            Section {
                Link("Sentence credits", destination: URL(string: "https://github.com/nulljosh/patois/blob/main/ATTRIBUTION.md")!)
            } footer: {
                Text("Language sentences come from the Tatoeba Project, licensed CC-BY 2.0 FR.")
            }
        }
        .navigationTitle("Settings")
        .task(id: auth.isSignedIn) { await loadProfile() }
        .sheet(isPresented: $showingAuth) {
            AuthView(auth: auth)
        }
        .confirmationDialog(
            "Delete your account?",
            isPresented: $confirmingDelete,
            titleVisibility: .visible
        ) {
            Button("Delete Account", role: .destructive) {
                deleting = true
                Task {
                    do {
                        try await auth.deleteAccount()
                    } catch {
                        deleteError = error.localizedDescription
                    }
                    deleting = false
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently deletes your account and progress. This cannot be undone.")
        }
        .alert("Couldn't Delete Account", isPresented: .constant(deleteError != nil), actions: {
            Button("OK") { deleteError = nil }
        }, message: {
            Text(deleteError ?? "")
        })
    }

    /// Signed-in state used to show nothing but a Sign Out button — no indication the
    /// login had actually attached to an account.
    private var accountSection: some View {
        Section("Account") {
            LabeledContent("Signed in as", value: profile?.display_name ?? "Learner")
            if let email = auth.session?.user.email {
                LabeledContent("Email", value: email)
            }
            if let joined = auth.session?.user.createdAt {
                LabeledContent("Member since", value: joined.formatted(date: .abbreviated, time: .omitted))
            }
        }
    }

    private var progressSection: some View {
        Section("Progress") {
            LabeledContent("XP", value: "\(store.progress.xp)")
            LabeledContent("Streak", value: store.progress.streak == 1 ? "1 day" : "\(store.progress.streak) days")
            LabeledContent("Lessons completed", value: "\(store.progress.completedLessonIds.count)")
        }
    }

    private func loadProfile() async {
        guard auth.isSignedIn else { return }
        profile = await auth.loadProfile()
        if let existing = profile?.avatar_id, !existing.isEmpty { avatarId = existing }
        await store.syncFromCloud()
    }
}
