package com.nulljosh.patois

import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ContentTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test fun decodesCatalogShape() {
        val sample = """{"version":1,"categories":{"languages":{"title":"Choose a language","subjects":[{"id":"spanish","name":"Spanish","icon":"fa","level":"Beginner","packPath":"/content/courses/spanish.json","lang":"es-ES"}]}}}"""
        val catalog = json.decodeFromString<Catalog>(sample)
        assertEquals(1, catalog.version)
        assertEquals("spanish", catalog.categories.getValue("languages").subjects.first().id)
    }

    @Test fun decodesCourseWithChoiceAndWordBankExercises() {
        val sample = """{"id":"spanish","name":"Spanish","lang":"es-ES","units":[{"id":"u1","title":"Basics","lessons":[{"id":"u1l1","title":"Greetings","exercises":[{"type":"translation","question":"Hello","answer":"Hola","choices":["Hola","Adios"],"id":"spanish_0"},{"type":"sentence","question":"Good night","answer":"Buenas noches","words":["Buenas","noches"],"id":"spanish_4"}]}]}]}"""
        val course = json.decodeFromString<Course>(sample)
        val exercises = course.units.flatMap { it.lessons }.flatMap { it.exercises }
        assertEquals(2, exercises.size)
        assertTrue(exercises[0].choices.isNotEmpty())
        assertTrue(exercises[1].words.isNotEmpty())
    }
}
