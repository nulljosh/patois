import Foundation
import Security

/// Talks to jaybulb-api (api.jaybulb.com), the Cloudflare Worker that replaced the old Supabase project.
/// Same shapes as before: `/auth/token?grant_type=...` and `/rest/<table>`, with no `/v1` in the path.
enum Backend {
    static let base = URL(string: "https://api.jaybulb.com")!

    struct Failure: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    /// One JSON call. `token` signs it as the user; a non-2xx answer throws the server's own message.
    static func call(_ method: String, _ path: String, body: Any? = nil, token: String? = nil, prefer: String? = nil) async throws -> Data {
        var r = URLRequest(url: URL(string: base.absoluteString + path)!)
        r.httpMethod = method
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let prefer { r.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if let body { r.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: r)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
            throw Failure(message: msg ?? "The server didn't answer. Try again.")
        }
        return data
    }
}

/// A signed-in session as jaybulb-api returns it.
struct Session: Codable {
    struct User: Codable {
        let id: String
        let email: String?
        let created_at: String?
        /// Only the string values of the server's metadata (display_name, avatar_id); anything else is skipped.
        let user_metadata: [String: String]

        private struct Key: CodingKey {
            var stringValue: String; var intValue: Int? { nil }
            init(stringValue: String) { self.stringValue = stringValue }
            init?(intValue: Int) { nil }
        }
        enum CodingKeys: String, CodingKey { case id, email, created_at, user_metadata }
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            email = try c.decodeIfPresent(String.self, forKey: .email)
            created_at = try c.decodeIfPresent(String.self, forKey: .created_at)
            var meta: [String: String] = [:]
            if let m = try? c.nestedContainer(keyedBy: Key.self, forKey: .user_metadata) {
                for k in m.allKeys { if let v = try? m.decode(String.self, forKey: k) { meta[k.stringValue] = v } }
            }
            user_metadata = meta
        }

        var createdAt: Date? {
            guard let s = created_at else { return nil }
            let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return f.date(from: s) ?? ISO8601DateFormatter().date(from: s) ?? Session.sqlDate.date(from: s)
        }
        func meta(_ key: String) -> String? { user_metadata[key] }
    }
    let access_token: String
    let refresh_token: String
    let expires_in: Double?
    let user: User
    /// When the server issued it, so a relaunch knows whether the access token needs refreshing. The server
    /// does not send it: `issued(_:)` stamps it.
    var savedAt: Date?

    /// Decodes a session the server just issued and stamps it with now.
    static func issued(_ data: Data) throws -> Session {
        var s = try JSONDecoder().decode(Session.self, from: data)
        s.savedAt = Date()
        return s
    }

    var accessToken: String { access_token }
    var expired: Bool { Date().timeIntervalSince(savedAt ?? .distantPast) > (expires_in ?? 3600) - 120 }

    static let sqlDate: DateFormatter = {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd HH:mm:ss"; return f
    }()
}

/// Stores the session in the **data-protection** keychain.
///
/// The legacy macOS login keychain binds items to the signing identity, so an App Store download could not read
/// what an earlier build wrote and macOS asked for the login password. App Review hit that on Patois Mac 1.1.3
/// (2.1(a), "unable to bypass the keychain request"). The data-protection keychain is scoped by entitlements and
/// never prompts; it is the default on iOS already.
enum SessionKeychainStorage {
    private static let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "com.nulljosh.lingo.session",
        kSecAttrAccount as String: "session",
        kSecUseDataProtectionKeychain as String: true,
    ]

    static func load() -> Session? {
        var q = query; q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(Session.self, from: data)
    }

    static func save(_ session: Session?) {
        SecItemDelete(query as CFDictionary)
        guard let session, let data = try? JSONEncoder().encode(session) else { return }
        var q = query
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(q as CFDictionary, nil)
    }
}
