package com.example.citytrail.plan;

import com.example.citytrail.places.Place;
import com.example.citytrail.places.PlaceRepository;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlannerTest {

    private static final double START_LAT = 54.3495;
    private static final double START_LNG = 18.6510;

    private final PlaceRepository repository = new PlaceRepository(JsonMapper.builder().build());
    // Thursday 2026-11-12, Gdańsk time
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-12T10:00:00Z"), ZoneId.of("Europe/Warsaw"));
    private final Planner planner = new Planner(repository, clock);

    private static Intent cafeThriftRock(boolean returnHome) {
        return new Intent(List.of(
                new Slot("food", List.of("coffee")),
                new Slot("store", List.of("thrift")),
                new Slot("event", List.of("rock"))), returnHome);
    }

    @Test
    void plansCafeThriftShopRockEventAndRideHome() {
        Plan plan = planner.plan(cafeThriftRock(true), START_LAT, START_LNG, 14 * 60, "test");

        assertEquals(List.of("food", "store", "event"),
                plan.stops().stream().map(s -> s.place().category()).toList());
        assertEquals(3, plan.stops().stream().map(s -> s.place().id()).distinct().count());
        assertNotNull(plan.stops().get(2).event());
        assertNotNull(plan.returnLeg());
        assertEquals("14:00", plan.startTime());
        assertTrue(plan.totalMinutes() > 0);
    }

    @Test
    void keepsOtherStopsNearTheEventVenue() {
        Plan plan = planner.plan(cafeThriftRock(false), START_LAT, START_LNG, 14 * 60, "test");

        Place venue = plan.stops().get(2).place();
        for (int i = 0; i < 2; i++) {
            Place p = plan.stops().get(i).place();
            assertTrue(Geo.meters(p.lat(), p.lng(), venue.lat(), venue.lng()) < 3000,
                    p.name() + " should be near " + venue.name());
        }
        assertNull(plan.returnLeg());
    }

    @Test
    void slowPaceTakesLongerToWalkThanFast() {
        Intent intent = new Intent(List.of(new Slot("landmark", List.of("historic"))), false);

        Plan slow = planner.plan(intent, START_LAT, START_LNG, 10 * 60, "test", Planner.walkSpeed("slow"));
        Plan fast = planner.plan(intent, START_LAT, START_LNG, 10 * 60, "test", Planner.walkSpeed("fast"));

        Leg slowLeg = slow.stops().get(0).legFromPrevious();
        Leg fastLeg = fast.stops().get(0).legFromPrevious();
        assertEquals("walk", slowLeg.mode());
        assertEquals((int) Math.ceil(slowLeg.distanceM() / 60.0), slowLeg.minutes());
        assertEquals((int) Math.ceil(fastLeg.distanceM() / 100.0), fastLeg.minutes());
        assertTrue(slowLeg.minutes() >= fastLeg.minutes());
    }

    @Test
    void walksShortHops() {
        Intent intent = new Intent(List.of(new Slot("landmark", List.of("historic"))), false);

        Plan plan = planner.plan(intent, START_LAT, START_LNG, 10 * 60, "test");

        assertEquals("walk", plan.stops().get(0).legFromPrevious().mode());
    }

    @Test
    void eventStopStartsNoEarlierThanTheEvent() {
        Plan plan = planner.plan(cafeThriftRock(false), START_LAT, START_LNG, 14 * 60, "test");

        Stop eventStop = plan.stops().get(2);
        assertTrue(Planner.toMinutes(eventStop.arrive()) >= Planner.toMinutes(eventStop.event().time()));
    }

    @Test
    void plansANamedCafeThenANearbyMuseumWithoutPickingAGig() {
        Intent intent = new Intent(List.of(
                new Slot("food", List.of(), "jozef-k"),
                new Slot("event", List.of("museum"))), false);

        Plan plan = planner.plan(intent, START_LAT, START_LNG, 14 * 60, "test");

        assertEquals(List.of("jozef-k", plan.stops().get(1).place().id()),
                plan.stops().stream().map(s -> s.place().id()).toList());
        assertEquals("museum", plan.stops().get(1).place().subcategory());
        assertNull(plan.stops().get(1).event());
        assertEquals(0, plan.dayOffset());
        assertTrue(plan.warnings().isEmpty());
    }

    @Test
    void doesNotSubstituteAnUnrelatedPlaceWhenNoEventMatches() {
        Intent intent = new Intent(List.of(new Slot("event", List.of("ballet", "rock", "jazz", "no-such-tag"))), false);

        Plan plan = planner.plan(intent, START_LAT, START_LNG, 14 * 60, "test");

        assertTrue(plan.stops().size() <= 1);
    }
}
