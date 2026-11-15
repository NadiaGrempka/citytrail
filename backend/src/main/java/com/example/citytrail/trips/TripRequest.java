package com.example.citytrail.trips;

import java.util.List;

public record TripRequest(
        String title,
        List<String> stopIds,
        Boolean returnHome,
        Double startLat,
        Double startLng,
        String prompt) {
}
