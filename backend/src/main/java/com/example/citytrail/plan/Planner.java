package com.example.citytrail.plan;

import com.example.citytrail.places.Place;
import com.example.citytrail.places.PlaceRepository;
import com.example.citytrail.places.Transit;
import com.example.citytrail.places.UpcomingEvent;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Deterministic planner (no AI): picks real places for each slot, estimates travel, and builds a timeline.
 *
 * Rules:
 *  - If the intent has an event slot, that event is chosen first and becomes the anchor. The plan is
 *    scheduled on the event's day and every other stop is picked near the event venue ("what's nearby").
 *  - Without an event, each stop is picked near the previous stop (the start point for the first one).
 *  - Score = 10 per matching tag, minus 1 per 100 m from the reference point (events: minus 1 per day away).
 *  - Places tagged "sunday-only" are skipped unless the plan day is a Sunday.
 *  - Travel times are estimates from distance and each place's mocked nearest-stop info.
 */
@Component
public class Planner {

    private static final int WALK_M_PER_MIN = 80;
    private static final int WALK_ONLY_MAX_M = 1200;
    private static final int TRANSIT_M_PER_MIN = 450;
    private static final int TRANSIT_WAIT_MIN = 4;
    private static final int DEFAULT_END_WALK_MIN = 5;
    private static final int LATE_FINISH_MINUTES = 23 * 60;

    private final PlaceRepository repository;
    private final Clock clock;

    public Planner(PlaceRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    private record Candidate(Place place, UpcomingEvent event) {
    }

    public Plan plan(Intent intent, double startLat, double startLng, int startMinutes, String parsedBy) {
        List<String> warnings = new ArrayList<>();
        Set<String> used = new HashSet<>();
        List<Slot> slots = intent.slots();

        Candidate anchor = null;
        int anchorIndex = -1;
        for (int i = 0; i < slots.size(); i++) {
            if ("event".equals(slots.get(i).category())) {
                anchor = bestEvent(slots.get(i), used, null);
                anchorIndex = i;
                break;
            }
        }
        int planDay = anchor != null ? anchor.event().dayOffset() : 0;
        Place anchorPlace = anchor != null ? anchor.place() : null;
        boolean sunday = LocalDate.now(clock).plusDays(planDay).getDayOfWeek() == DayOfWeek.SUNDAY;

        List<Stop> stops = new ArrayList<>();
        double curLat = startLat;
        double curLng = startLng;
        Transit curTransit = null;
        int minute = startMinutes;

        for (int i = 0; i < slots.size(); i++) {
            Slot slot = slots.get(i);
            Candidate chosen;
            if ("event".equals(slot.category())) {
                chosen = (i == anchorIndex) ? anchor : bestEvent(slot, used, planDay);
            } else {
                double refLat = anchorPlace != null ? anchorPlace.lat() : curLat;
                double refLng = anchorPlace != null ? anchorPlace.lng() : curLng;
                Place place = bestPlace(slot, used, refLat, refLng, sunday);
                chosen = place == null ? null : new Candidate(place, null);
            }
            if (chosen == null) {
                warnings.add("Nothing found for: " + describe(slot));
                continue;
            }

            Place place = chosen.place();
            UpcomingEvent event = chosen.event();
            used.add(place.id());

            Leg leg = leg(curLat, curLng, curTransit, place.lat(), place.lng(), place.transit());
            int arrive = minute + leg.minutes();
            List<String> notes = new ArrayList<>();
            if (event != null) {
                int start = toMinutes(event.time());
                if (arrive <= start) {
                    if (start - arrive >= 30) {
                        notes.add("Starts at " + event.time() + ", so you have about " + (start - arrive)
                                + " min to spare before it.");
                    }
                    arrive = start;
                } else if (arrive - start > 10) {
                    notes.add("You would arrive about " + (arrive - start) + " min after the start.");
                }
            }
            int depart = arrive + place.visitMinutes();

            stops.add(new Stop(place, format(arrive), format(depart), leg, event, List.copyOf(notes)));
            minute = depart;
            curLat = place.lat();
            curLng = place.lng();
            curTransit = place.transit();
        }

        Leg returnLeg = null;
        int end = minute;
        if (intent.returnHome() && !stops.isEmpty()) {
            returnLeg = leg(curLat, curLng, curTransit, startLat, startLng, null);
            end = minute + returnLeg.minutes();
        }
        if (end >= LATE_FINISH_MINUTES) {
            warnings.add("Late finish: check the last departures before you go.");
        }

        return new Plan(
                parsedBy,
                intent,
                planDay,
                LocalDate.now(clock).plusDays(planDay).toString(),
                format(startMinutes),
                format(end),
                end - startMinutes,
                List.copyOf(stops),
                returnLeg,
                List.copyOf(warnings));
    }

    private Place bestPlace(Slot slot, Set<String> used, double refLat, double refLng, boolean sunday) {
        return repository.findAll().stream()
                .filter(p -> p.category().equals(slot.category()))
                .filter(p -> !used.contains(p.id()))
                .filter(p -> sunday || !p.tags().contains("sunday-only"))
                .max(Comparator
                        .comparingDouble((Place p) -> overlap(slot, p, null) * 10.0
                                - Geo.meters(refLat, refLng, p.lat(), p.lng()) / 100.0)
                        .thenComparing(Place::name, Comparator.reverseOrder()))
                .orElse(null);
    }

    /** Best (venue, event) pair for the slot. If day is not null, only events on that day are considered. */
    private Candidate bestEvent(Slot slot, Set<String> used, Integer day) {
        Candidate best = null;
        double bestScore = Double.NEGATIVE_INFINITY;
        for (Place place : repository.findAll()) {
            if (!"event".equals(place.category()) || used.contains(place.id()) || place.upcomingEvents() == null) {
                continue;
            }
            for (UpcomingEvent event : place.upcomingEvents()) {
                if (day != null && event.dayOffset() != day) {
                    continue;
                }
                double score = overlap(slot, place, event) * 10.0 - event.dayOffset();
                if (score > bestScore) {
                    bestScore = score;
                    best = new Candidate(place, event);
                }
            }
        }
        return best;
    }

    private static int overlap(Slot slot, Place place, UpcomingEvent event) {
        Set<String> placeTags = new HashSet<>(place.tags());
        if (event != null) {
            placeTags.add(event.genre());
        }
        int count = 0;
        for (String tag : slot.tags()) {
            if (placeTags.contains(tag)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Estimate: short hops are walked; longer ones are a walk to the nearest stop, a ride at ~27 km/h,
     * a wait, and a walk from the stop. A null Transit means "assume a short walk at that end".
     */
    private static Leg leg(double fromLat, double fromLng, Transit fromTransit,
                           double toLat, double toLng, Transit toTransit) {
        int distance = (int) Math.round(Geo.meters(fromLat, fromLng, toLat, toLng));
        if (distance <= WALK_ONLY_MAX_M) {
            int minutes = (int) Math.ceil(distance / (double) WALK_M_PER_MIN);
            return new Leg("walk", minutes, distance, "Walk " + minutes + " min");
        }
        int fromWalk = fromTransit == null ? DEFAULT_END_WALK_MIN : fromTransit.walkMin();
        int toWalk = toTransit == null ? DEFAULT_END_WALK_MIN : toTransit.walkMin();
        int ride = (int) Math.ceil(distance / (double) TRANSIT_M_PER_MIN);
        int minutes = fromWalk + TRANSIT_WAIT_MIN + ride + toWalk;

        String fromPart = fromTransit == null
                ? "Walk to the nearest stop"
                : "Walk " + fromWalk + " min to " + fromTransit.stop();
        String toPart = toTransit == null
                ? "ride, then walk the last bit"
                : "ride to " + toTransit.stop() + ", walk " + toWalk + " min";
        return new Leg("transit", minutes, distance, fromPart + ", " + toPart);
    }

    private static String describe(Slot slot) {
        return slot.tags().isEmpty() ? slot.category() : slot.category() + " (" + String.join(", ", slot.tags()) + ")";
    }

    static int toMinutes(String hhmm) {
        LocalTime time = LocalTime.parse(hhmm);
        return time.getHour() * 60 + time.getMinute();
    }

    static String format(int minutes) {
        return String.format("%02d:%02d", (minutes / 60) % 24, minutes % 60);
    }
}
