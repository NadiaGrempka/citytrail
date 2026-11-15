package com.example.citytrail.trips;

import java.util.List;

/** A saved trip: the stops (place ids, in order) are enough to re-plan it. createdAt is an ISO-8601 instant. */
public record Trip(
        String id,
        String title,
        List<String> stopIds,
        boolean returnHome,
        double startLat,
        double startLng,
        String prompt,
        String createdAt) {
}
