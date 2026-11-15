package com.example.citytrail.trips;

import com.example.citytrail.places.PlaceRepository;
import com.example.citytrail.plan.PlanService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TripServiceTest {

    private EmbeddedDatabase database;
    private TripService service;

    @BeforeEach
    void setUp() {
        database = new EmbeddedDatabaseBuilder()
                .setType(EmbeddedDatabaseType.H2)
                .generateUniqueName(true)
                .addScript("schema.sql")
                .build();
        PlaceRepository places = new PlaceRepository(JsonMapper.builder().build());
        service = new TripService(
                new TripRepository(JdbcClient.create(database)), places, Mockito.mock(PlanService.class));
    }

    @AfterEach
    void tearDown() {
        database.shutdown();
    }

    private static TripRequest request(String title, List<String> stops) {
        return new TripRequest(title, stops, true, 54.35, 18.65, "a cafe then a museum");
    }

    @Test
    void createsListsRenamesAndDeletes() {
        Trip created = service.create(request("My day", List.of("jozef-k", "ecs", "no-such-place")));

        assertEquals("My day", created.title());
        assertEquals(List.of("jozef-k", "ecs"), created.stopIds());   // unknown id dropped, order kept
        assertTrue(created.returnHome());
        assertEquals(List.of(created.id()), service.list().stream().map(Trip::id).toList());

        Trip renamed = service.rename(created.id(), new TripRename("  Rainy day  "));
        assertEquals("Rainy day", renamed.title());

        service.delete(created.id());
        assertTrue(service.list().isEmpty());
    }

    @Test
    void blankTitleBecomesStopNames() {
        Trip created = service.create(request("  ", List.of("jozef-k", "ecs")));

        assertTrue(created.title().contains("→"));
        assertFalse(created.title().isBlank());
    }

    @Test
    void rejectsTripsWithoutKnownStops() {
        assertThrows(ResponseStatusException.class, () -> service.create(request("x", List.of("nope"))));
        assertThrows(ResponseStatusException.class, () -> service.create(request("x", null)));
    }

    @Test
    void missingTripIsNotFound() {
        assertThrows(ResponseStatusException.class, () -> service.delete("missing"));
        assertThrows(ResponseStatusException.class, () -> service.rename("missing", new TripRename("a")));
        assertThrows(ResponseStatusException.class, () -> service.rename("missing", new TripRename(" ")));
    }
}
