import SwiftUI

struct PatoisMark: View {
    var size: CGFloat = 64

    var body: some View {
        Image(systemName: "graduationcap.fill")
            .font(.system(size: size * 0.45, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Color(hex: "5B9BD5"), in: .circle)
    }
}

struct SplashView: View {
    @State private var animateIn = false

    var body: some View {
        VStack(spacing: 16) {
            PatoisMark()
                .scaleEffect(animateIn ? 1 : 0.7)
                .opacity(animateIn ? 1 : 0)
            Text("Patois").font(.title2.bold())
                .opacity(animateIn ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                animateIn = true
            }
        }
    }
}
