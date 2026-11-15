package com.example.citytrail.plan;

import com.example.citytrail.places.PlaceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class PlanServiceTest {

    private final PlaceRepository repository = new PlaceRepository(JsonMapper.builder().build());
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-12T10:00:00Z"), ZoneId.of("Europe/Warsaw"));
    private final ObjectProvider<LlmIntentParser> noLlm =
            new DefaultListableBeanFactory().getBeanProvider(LlmIntentParser.class);
    private final PlanService service = new PlanService(
            new KeywordIntentParser(new IntentVocabulary(repository), repository),
            noLlm,
            new Planner(repository, clock),
            repository,
            54.3493,
            18.65);

    private static List<String> ids(Plan plan) {
        return plan.stops().stream().map(s -> s.place().id()).toList();
    }

    @Test
    void aFollowUpAddsToTheRouteInsteadOfStartingOver() {
        Plan first = service.plan(new PlanRequest(
                "I would like to go to Jozef k and then to a nearby museum", null, null, null, null, null, null));
        assertEquals(2, first.stops().size());
        assertEquals("jozef-k", first.stops().get(0).place().id());

        Plan second = service.plan(new PlanRequest(
                "and then I would like to go to a park near the museum", null, null, null, ids(first), false, null));

        assertEquals(3, second.stops().size());
        assertEquals(ids(first), ids(second).subList(0, 2));
        assertEquals("park", second.stops().get(2).place().subcategory());
        assertNull(second.stops().get(2).event());
    }

    @Test
    void aFollowUpKeepsTheRideHome() {
        Plan first = service.plan(new PlanRequest("Jozef K and then home", null, null, null, null, null, null));
        assertNotNull(first.returnLeg());

        Plan second = service.plan(new PlanRequest("then a park", null, null, null, ids(first), true, null));

        assertEquals(2, second.stops().size());
        assertNotNull(second.returnLeg());
    }

    @Test
    void nearANamedPlaceMeansNearThatPlaceNotTheLastStop() {
        Plan first = service.plan(new PlanRequest(
                "Jozef k and then a nearby museum", null, null, null, null, null, null));

        // Without "near", the bookshop would be picked next to the museum (Antykwariat Naukowy).
        Plan plain = service.plan(new PlanRequest(
                "and then a bookshop", null, null, null, ids(first), false, null));
        assertEquals("antykwariat-naukowy", plain.stops().get(2).place().id());

        Plan near = service.plan(new PlanRequest(
                "and then a bookshop near Dwor Artusa", null, null, null, ids(first), false, null));
        assertEquals(3, near.stops().size());
        assertEquals("firmin-bookshop", near.stops().get(2).place().id());
    }

    @Test
    void nearAKindOfPlaceMeansThatStopOfTheRoute() {
        Plan first = service.plan(new PlanRequest(
                "Jozef k and then a nearby museum", null, null, null, null, null, null));

        // "the cafe" is Józef K., the first stop; plain, the sight would be picked next to the museum.
        Plan plain = service.plan(new PlanRequest(
                "and a historic sight", null, null, null, ids(first), false, null));
        assertEquals("gora-gradowa", plain.stops().get(2).place().id());

        Plan near = service.plan(new PlanRequest(
                "and a historic sight near the cafe", null, null, null, ids(first), false, null));
        assertEquals("bazylika-mariacka", near.stops().get(2).place().id());
    }

    @Test
    void nearInTheFirstMessageWorksForANamedPlace() {
        Plan plan = service.plan(new PlanRequest(
                "a bookshop near Dwor Artusa", null, null, null, null, null, null));

        assertEquals(List.of("firmin-bookshop"), ids(plan));
    }
}
