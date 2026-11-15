package com.example.citytrail.trips;

import java.util.List;

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
