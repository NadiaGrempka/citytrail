package com.example.citytrail.plan;

import com.example.citytrail.places.Place;
import com.example.citytrail.places.PlaceRepository;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LlmIntentSanitizeTest {

    private final PlaceRepository repository = new PlaceRepository(JsonMapper.builder().build());
    private final IntentVocabulary vocabulary = new IntentVocabulary(repository);

    private Place anyPlace(String category) {
        return repository.findAll().stream().filter(p -> p.category().equals(category)).findFirst().orElseThrow();
    }

    @Test
    void keepsKnownPlaceAndNearIdsAndTakesCategoryFromPlace() {
        Place cafe = anyPlace("food");
        Place sight = anyPlace("landmark");
        RawIntent raw = new RawIntent(List.of(
                new RawIntent.RawSlot("store", List.of("nonsense-tag"), cafe.id(), null),
                new RawIntent.RawSlot("landmark", List.of(), null, sight.id().toUpperCase())), false);

        Intent intent = vocabulary.sanitize(raw);

        assertEquals(2, intent.slots().size());
        assertEquals("food", intent.slots().get(0).category());
        assertEquals(cafe.id(), intent.slots().get(0).placeId());
        assertTrue(intent.slots().get(0).tags().isEmpty());
        assertEquals(sight.id(), intent.slots().get(1).nearPlaceId());
    }

    @Test
    void dropsInventedIdsAndUnknownCategories() {
        RawIntent raw = new RawIntent(List.of(
                new RawIntent.RawSlot("food", List.of(), "no-such-place", "also-invented"),
                new RawIntent.RawSlot("spaceport", List.of(), null, null)), true);

        Intent intent = vocabulary.sanitize(raw);

        assertEquals(1, intent.slots().size());
        assertNull(intent.slots().get(0).placeId());
        assertNull(intent.slots().get(0).nearPlaceId());
        assertTrue(intent.returnHome());
    }

    @Test
    void userMessageListsRouteAndRequest() {
        Place cafe = anyPlace("food");
        String message = LlmIntentParser.userMessage("a park near it", List.of(cafe));

        assertTrue(message.contains(cafe.id() + " (" + cafe.name() + ")"));
        assertTrue(message.endsWith("Request: a park near it"));
        assertTrue(LlmIntentParser.userMessage("x", List.of()).startsWith("Current route: none"));
    }
}
