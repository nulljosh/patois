import XCTest
@testable import Lingo_iOS

/// The grader is a bundled JS file run through JavaScriptCore; this fails if it is not in the app bundle.
final class MathGraderTests: XCTestCase {
    func testEquivalentAnswersPass() {
        XCTAssertEqual(MathGrader.equivalent("(x-3)(x-2)", "(x-2)(x-3)"), true)
        XCTAssertEqual(MathGrader.equivalent("-1, 6", "x = 6 or x = -1"), true)
        XCTAssertEqual(MathGrader.equivalent("x^2-5x+6", "(x-2)(x-3)"), false)
    }
}

final class MathDisplayTests: XCTestCase {
    func testPrettyAndStillGrades() {
        XCTAssertEqual(MathGrader.pretty("sqrt(72) = 6sqrt(2)"), "\u{221A}72 = 6\u{221A}2")
        XCTAssertEqual(MathGrader.pretty("x^2"), "x\u{00B2}")
        XCTAssertEqual(MathGrader.equivalent("x^2-25", MathGrader.pretty("x^2 - 25")), true)
    }
}
