package com.example.citytrail.trips;

import java.util.List;

/** Body of POST /api/trips. Everything but stopIds is optional. */
public record TripRequest(
        String title,
        List<String> stopIds,
        Boolean returnHome,
        Double startLat,
        Double startLng,
        String prompt) {
}
