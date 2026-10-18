import AuthenticationServices
import SwiftUI

struct AuthView: View {
    var auth: AuthStore
    @Environment(\.dismiss) private var dismiss
    @State private var mode: Mode = .signIn
    @State private var notice = ""
    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var errorMessage = ""
    @State private var busy = false
    @State private var avatarId = "falcon"

    enum Mode { case signIn, signUp }

    var body: some View {
        VStack(spacing: 24) {
            LexlyMark(size: 72)
            Text("Patois").font(.largeTitle.bold())
            Text("Learn anything.").foregroundStyle(.secondary)

            if mode == .signIn && auth.hasSavedBiometricCredentials() {
                Button {
                    Task {
                        do { try await auth.biometricLogin(); dismiss() }
                        catch { errorMessage = error.localizedDescription }
                    }
                } label: {
                    Label("Sign in with Face ID", systemImage: "faceid")
                        .frame(maxWidth: .infinity)
                        .fontWeight(.semibold)
                }
                .buttonStyle(.bordered)
            }

            Picker("Mode", selection: $mode) {
                Text("Sign In").tag(Mode.signIn)
                    .accessibilityIdentifier("authModeSignIn")
                Text("Sign Up").tag(Mode.signUp)
                    .accessibilityIdentifier("authModeSignUp")
            }
            .pickerStyle(.segmented)

            VStack(spacing: 12) {
                if mode == .signUp {
                    AvatarPickerView(avatarId: $avatarId)
                    TextField("Display name", text: $displayName)
                        .textContentType(.name)
                        .textFieldStyle(.roundedBorder)
                }
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    #if os(iOS)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    #endif
                    .textFieldStyle(.roundedBorder)
                    .accessibilityIdentifier("emailField")
                SecureField("Password", text: $password)
                    .textContentType(mode == .signUp ? .newPassword : .password)
                    .textFieldStyle(.roundedBorder)
                    .accessibilityIdentifier("passwordField")

                if mode == .signIn {
                    HStack {
                        Spacer()
                        Button("Forgot password?") {
                            errorMessage = ""
                            Task {
                                do { try await auth.resetPassword(email: email); notice = "Check your email for a reset link." }
                                catch { errorMessage = error.localizedDescription }
                            }
                        }
                        .font(.footnote)
                        .disabled(email.isEmpty)
                    }
                }
            }

            if !errorMessage.isEmpty {
                Text(errorMessage).foregroundStyle(.red).font(.footnote)
            } else if !notice.isEmpty {
                Text(notice).foregroundStyle(.secondary).font(.footnote)
                    .multilineTextAlignment(.center)
            }

            HStack {

                Rectangle().frame(height: 1).foregroundStyle(.quaternary)

                Text("or").font(.caption).foregroundStyle(.secondary)

                Rectangle().frame(height: 1).foregroundStyle(.quaternary)

            }


            SignInWithAppleButton(.signIn) { request in

                auth.prepareAppleRequest(request)

            } onCompletion: { result in

                Task {

                    do { try await auth.signInWithApple(result: result) }
                    // A dismissed sheet is not an error. A device with no Apple ID signed in (typical of a
                    // review device) used to surface Apple's raw error text; point at the other options.
                    catch let error as ASAuthorizationError where error.code == .canceled { }
                    catch let error as ASAuthorizationError {
                        // The code (1000 unknown, 1001 canceled, 1002 invalid response, 1003 not handled, 1004 failed) says why.
                        errorMessage = "Sign in with Apple isn't available on this device right now (code \((error as NSError).code)). Use email or Google instead."
                    }
                    catch { errorMessage = error.localizedDescription }

                }

            }

            .signInWithAppleButtonStyle(.black)

            .frame(height: 44)


            Button {

                Task {

                    do { try await auth.signInWithGoogle() }

                    catch { errorMessage = error.localizedDescription }

                }

            } label: {

                Text("Continue with Google")

                    .fontWeight(.semibold)

                    .frame(maxWidth: .infinity)

                    .frame(height: 44)

                    .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(.quaternary))

            }

            .buttonStyle(.plain)


            Button(action: submit) {
                if busy {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text(mode == .signIn ? "Signing In…" : "Creating Account…")
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    Text(mode == .signIn ? "Sign In" : "Create Account").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(busy)
            .accessibilityIdentifier("authSubmit")
        }
        .padding(32)
    }

    /// Dismissing back to a Settings screen that now shows the account IS the success
    /// signal — the sheet used to just sit there after a good login, which read as
    /// "nothing happened".
    private func submit() {
        errorMessage = ""
        notice = ""
        busy = true
        Task {
            do {
                if mode == .signUp {
                    let signedIn = try await auth.signUp(email: email, password: password,
                                                         displayName: displayName.isEmpty ? "Learner" : displayName,
                                                         avatarId: avatarId)
                    busy = false
                    if signedIn {
                        dismiss()
                    } else {
                        mode = .signIn
                        password = ""
                        notice = "Account created. Check your email to confirm it, then sign in."
                    }
                    return
                }
                try await auth.signIn(email: email, password: password)
                busy = false
                dismiss()
                return
            } catch {
                errorMessage = error.localizedDescription
            }
            busy = false
        }
    }
}
