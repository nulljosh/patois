package com.nulljosh.patois

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class Subject(
    val id: String,
    val name: String,
    val icon: String = "",
    val level: String = "",
    val packPath: String,
    val lang: String = "",
)

@Serializable
data class Category(val title: String, val subjects: List<Subject>)

@Serializable
data class Catalog(val version: Int, val categories: Map<String, Category>)

@Serializable
data class Exercise(
    val id: String,
    val type: String,
    val question: String,
    val answer: String,
    val choices: List<String> = emptyList(),
    val words: List<String> = emptyList(),
    val audio: String? = null,
    /** Position for a `chess` exercise, drawn as a board above the choices. */
    val fen: String? = null,
)

@Serializable
data class Lesson(val id: String, val title: String, val exercises: List<Exercise>)

@Serializable
data class CourseUnit(val id: String, val title: String, val lessons: List<Lesson>)

@Serializable
data class Course(
    val id: String,
    val name: String,
    val category: String = "",
    val level: String = "",
    val lang: String = "",
    val version: Int = 1,
    val units: List<CourseUnit>,
)

// Content is public and static, same as the web app's practice mode and
// exactly what iOS/macOS already do: no login wall in front of lesson
// content. Sign-in (not built here) buys cross-device progress sync only --
// see CLAUDE.md's "Auth differs by platform, on purpose".
class PatoisClient(private val baseUrl: String = "https://patois.jaybulb.com") {
    private val http = HttpClient {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun catalog(): Catalog = http.get("$baseUrl/content/catalog.json").body()
    suspend fun course(packPath: String): Course = http.get("$baseUrl$packPath").body()
}
