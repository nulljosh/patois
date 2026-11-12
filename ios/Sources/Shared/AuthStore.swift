import AuthenticationServices
import CryptoKit
import Foundation
import LocalAuthentication

@Observable
final class AuthStore {
    var session: Session?
    var isLoading = true
    // ponytail: App Store screenshot automation needs to skip the real auth
    // gate (demo credentials expire/rotate independently of this repo)
    private let mockSignedIn = CommandLine.arguments.contains("UITEST_SNAPSHOT")

    init() {
        if mockSignedIn {
            isLoading = false
            return
        }
        Task { await refresh() }
    }

    var isSignedIn: Bool { mockSignedIn || session != nil }

    func refresh() async {
        session = await AuthStore.currentSession()
        isLoading = false
    }

    /// The saved session, refreshed first when its access token is near expiry. Nil when signed out
    /// or when the refresh token is no longer accepted.
    static func currentSession() async -> Session? {
        guard let saved = SessionKeychainStorage.load() else { return nil }
        guard saved.expired else { return saved }
        guard let data = try? await Backend.call("POST", "/auth/token?grant_type=refresh_token", body: ["refresh_token": saved.refresh_token]),
              let fresh = try? Session.issued(data) else { return nil }
        SessionKeychainStorage.save(fresh)
        return fresh
    }

    /// Decodes and keeps a session the server just issued.
    private func adopt(_ data: Data) throws {
        let s = try Session.issued(data)
        SessionKeychainStorage.save(s)
        session = s
    }

    /// Returns true when the sign-up left us with a live session. False means the server
    /// requires email confirmation first — the caller should say so rather than looking
    /// like nothing happened.
    ///
    /// Deliberately writes no rows. The profile is created lazily by `loadProfile()` once a
    /// session exists, which is the only point every path reaches: this method has no
    /// session at all when confirmation is required, and a first sign-in on a new device
    /// never runs it. Progress is likewise owned by `ContentStore.save()`, which upserts the
    /// whole row on every lesson. The chosen name/avatar ride along in the auth user's
    /// metadata so they survive the round trip through a confirmation email.
    /// ponytail: avatar_id is a small PNG data URI, so it fits in the JWT's user_metadata;
    /// move it to its own fetch if avatars ever grow.
    @discardableResult
    func signUp(email: String, password: String, displayName: String, avatarId: String) async throws -> Bool {
        // jaybulb-api always confirms by email first, so sign-up never returns a session.
        _ = try await Backend.call("POST", "/auth/signup", body: [
            "email": email, "password": password, "redirect_to": "https://patois.jaybulb.com/app/",
            "data": ["display_name": displayName, "avatar_id": avatarId],
        ])
        return false
    }

    /// Uses the session `signIn` already returns rather than re-reading it through
    /// `try? auth.session` — that swallowed any storage/refresh failure, leaving
    /// `session` nil while the call still "succeeded", so the sheet closed and the UI
    /// stayed signed out with nothing shown. That silent path is what App Review saw as
    /// "Sign In will load briefly and then stops" (Guideline 2.1, macOS 1.1.1).
    func signIn(email: String, password: String) async throws {
        try adopt(try await Backend.call("POST", "/auth/token?grant_type=password", body: ["email": email, "password": password]))
        saveBiometricCredentials(email: email, password: password)
    }

    // MARK: Face ID convenience sign-in
    // Optional shortcut for a returning user -- never a gate. Content stays reachable
    // without it (see the file header note on why iOS/macOS don't wall off content).
    private static let savedEmailKey = "lexly.biometric.email"

    func hasSavedBiometricCredentials() -> Bool {
        guard let email = UserDefaults.standard.string(forKey: Self.savedEmailKey) else { return false }
        return KeychainHelper.load(key: email) != nil
    }

    func biometricLogin() async throws {
        let context = LAContext()
        try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Sign in to Patois")
        guard let email = UserDefaults.standard.string(forKey: Self.savedEmailKey),
              let data = KeychainHelper.load(key: email),
              let password = String(data: data, encoding: .utf8) else {
            throw NSError(domain: "AuthStore", code: -1, userInfo: [NSLocalizedDescriptionKey: "No saved sign-in found."])
        }
        try await signIn(email: email, password: password)
    }

    private func saveBiometricCredentials(email: String, password: String) {
        guard let data = password.data(using: .utf8) else { return }
        UserDefaults.standard.set(email, forKey: Self.savedEmailKey)
        KeychainHelper.save(key: email, data: data)
    }

    private func clearBiometricCredentials() {
        if let email = UserDefaults.standard.string(forKey: Self.savedEmailKey) {
            KeychainHelper.delete(key: email)
        }
        UserDefaults.standard.removeObject(forKey: Self.savedEmailKey)
    }

    /// Reads the profile, creating it first if it is missing. Create-if-missing lives here
    /// rather than in `signUp` so a user who confirmed by email, signed in on a new device,
    /// or was stranded by an earlier build still ends up with a row instead of a permanent
    /// nil. `ignoreDuplicates` makes it ON CONFLICT DO NOTHING, so concurrent launches can't
    /// collide and a later rename in Settings is never clobbered by stale signup metadata.
    func loadProfile() async -> LingoProfile? {
        guard let session else { return nil }
        if let existing = await fetchProfile(session) { return existing }
        // A plain insert (no merge): if a row appeared meanwhile it fails and the read below returns that row.
        _ = try? await Backend.call("POST", "/rest/lingo_profiles", body: [
            "display_name": session.user.meta("display_name") ?? "Learner",
            "avatar_id": session.user.meta("avatar_id") ?? "falcon",
        ], token: session.accessToken)
        return await fetchProfile(session)
    }

    /// The server only ever returns the caller's own row.
    private func fetchProfile(_ session: Session) async -> LingoProfile? {
        guard let data = try? await Backend.call("GET", "/rest/lingo_profiles", token: session.accessToken) else { return nil }
        return (try? JSONDecoder().decode([LingoProfile].self, from: data))?.first
    }

    func updateAvatar(_ avatarId: String) async throws {
        guard let session else { return }
        _ = try await Backend.call("PATCH", "/rest/lingo_profiles?id=eq.\(session.user.id)", body: ["avatar_id": avatarId], token: session.accessToken)
    }

    /// Every raw nonce handed to Apple since the last sign-in. The iPad sheet can fire the request
    /// twice, so the token that comes back may belong to an earlier one: match it by hash.
    private var issuedNonces: [String] = []

    /// Apple hashes the nonce into the identity token; the server compares it against the
    /// raw value we send back.
    func prepareAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = Self.randomNonce()
        issuedNonces = Array((issuedNonces + [nonce]).suffix(5))
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.hashed(nonce)
    }

    static func hashed(_ nonce: String) -> String {
        SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    /// The raw nonce whose hash Apple signed into this identity token, or nil if none of ours match.
    static func rawNonce(for idToken: String, among issued: [String]) -> String? {
        let parts = idToken.split(separator: ".")
        guard parts.count == 3 else { return nil }
        var b64 = parts[1].replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        b64 += String(repeating: "=", count: (4 - b64.count % 4) % 4)
        guard let data = Data(base64Encoded: b64),
              let claims = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let signed = claims["nonce"] as? String else { return nil }
        return issued.first { hashed($0) == signed }
    }

    func signInWithApple(result: Result<ASAuthorization, Error>) async throws {
        let auth = try result.get()
        guard let cred = auth.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken,
              let token = String(data: tokenData, encoding: .utf8),
              let nonce = Self.rawNonce(for: token, among: issuedNonces) else {
            throw URLError(.badServerResponse)
        }
        var body = ["provider": "apple", "id_token": token, "nonce": nonce]
        // Apple sends the name only on the first sign-in; keep it for the profile.
        if let name = cred.fullName.flatMap({ PersonNameComponentsFormatter().string(from: $0) }), !name.isEmpty { body["full_name"] = name }
        try adopt(try await Backend.call("POST", "/auth/token?grant_type=id_token", body: body))
        issuedNonces = []
    }

    static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        // ponytail: SecRandomCopyBytes can fail; a plain random fallback is fine because the
        // nonce only needs to be unguessable-per-request, not key material.
        if SecRandomCopyBytes(kSecRandomDefault, length, &bytes) != errSecSuccess {
            bytes = (0..<length).map { _ in UInt8.random(in: 0...255) }
        }
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    func signOut() async throws {
        if let token = session?.accessToken { _ = try? await Backend.call("POST", "/auth/logout", token: token) }
        SessionKeychainStorage.save(nil)
        session = nil
        clearBiometricCredentials()
    }

    /// Redirects to the web app (which already handles PASSWORD_RECOVERY) rather than
    /// building a second native new-password screen for a flow users complete over email anyway.
    func resetPassword(email: String) async throws {
        _ = try await Backend.call("POST", "/auth/recover", body: ["email": email, "redirect_to": "https://patois.jaybulb.com/app/"])
    }

    /// Deletes the account and everything it owns on the server.
    func deleteAccount() async throws {
        guard let currentSession = session else { return }
        _ = try await Backend.call("DELETE", "/auth/user", token: currentSession.accessToken)
        SessionKeychainStorage.save(nil)
        session = nil
        clearBiometricCredentials()
    }
}
