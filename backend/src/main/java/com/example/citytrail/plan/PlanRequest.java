package com.example.citytrail.plan;

import java.util.List;

/**
 * Body of POST /api/plan.
 * text: the visitor's wish, e.g. "a local cafe, a thrift shop, then a rock gig and a ride home".
 * startLat/startLng: optional start and "home" point (defaults to the Old Town).
 * startTime: optional "HH:mm" (defaults to 14:00).
 * walkPace: optional "slow", "normal" or "fast" (defaults to normal); changes the walking time estimates.
 * previousStopIds/previousReturnHome: the route built so far. When present, the text is a follow-up
 * ("and then a park near the museum"): those stops are kept in order and the new ones are added after them.
 */
public record PlanRequest(
        String text,
        Double startLat,
        Double startLng,
        String startTime,
        List<String> previousStopIds,
        Boolean previousReturnHome,
        String walkPace) {
}
