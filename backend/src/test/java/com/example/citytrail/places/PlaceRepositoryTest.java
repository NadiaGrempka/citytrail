package com.example.citytrail.places;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlaceRepositoryTest {

    private final PlaceRepository repository = new PlaceRepository(JsonMapper.builder().build());

    @Test
    void loadsAllThirtyPlaces() {
        assertEquals(31, repository.findAll().size());
    }

    @Test
    void everyPlaceBelongsToAKnownDistrict() {
        Set<String> districtIds = repository.findAllDistricts().stream()
                .map(District::id)
                .collect(Collectors.toSet());
        assertTrue(repository.findAll().stream().allMatch(p -> districtIds.contains(p.district())));
    }

    @Test
    void findsPlaceByIdAndReadsNestedFields() {
        Place b90 = repository.findById("b90-club").orElseThrow();
        assertEquals("event", b90.category());
        assertTrue(b90.tags().contains("rock"));
        assertTrue(b90.upcomingEvents().size() >= 1);
    }
}
