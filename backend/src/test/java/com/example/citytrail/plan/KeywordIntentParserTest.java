package com.example.citytrail.plan;

import com.example.citytrail.places.PlaceRepository;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KeywordIntentParserTest {

    private final PlaceRepository repository = new PlaceRepository(JsonMapper.builder().build());
    private final KeywordIntentParser parser = new KeywordIntentParser(new IntentVocabulary(repository));

    private static List<String> categories(Intent intent) {
        return intent.slots().stream().map(Slot::category).toList();
    }

    @Test
    void parsesCafeThriftShopAndRideHome() {
        Intent intent = parser.parse(
                "i want to go to a local caffè, find a thriftshop worth visiting and take a ride home");

        assertEquals(List.of("food", "store"), categories(intent));
        assertEquals(List.of("coffee"), intent.slots().get(0).tags());
        assertTrue(intent.returnHome());
    }

    @Test
    void addsRockEventAsThirdStop() {
        Intent intent = parser.parse("a cafe, a thrift shop, and also a local music rock event, then home");

        assertEquals(List.of("food", "store", "event"), categories(intent));
        List<String> eventTags = intent.slots().get(2).tags();
        assertTrue(eventTags.contains("rock"));
        assertTrue(eventTags.contains("concert"));
        assertTrue(intent.returnHome());
    }

    @Test
    void keepsTheOrderTheVisitorWrote() {
        Intent intent = parser.parse("something historic first, then rock concert");

        assertEquals(List.of("landmark", "event"), categories(intent));
    }

    @Test
    void returnsNoSlotsWhenNothingIsRecognised() {
        Intent intent = parser.parse("hello there");

        assertTrue(intent.slots().isEmpty());
        assertFalse(intent.returnHome());
    }
}
