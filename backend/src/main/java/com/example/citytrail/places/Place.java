package com.example.citytrail.places;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * category is one of: food, store, event, landmark.
 * coordsAccuracy is "landmark" or "approx" (approx = verify on a map before relying on it).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Place(
        String id,
        String name,
        String category,
        String subcategory,
        String district,
        String address,
        double lat,
        double lng,
        String coordsAccuracy,
        List<String> tags,
        String description,
        int visitMinutes,
        int priceLevel,
        String hoursNote,
        Transit transit,
        List<UpcomingEvent> upcomingEvents) {
}
