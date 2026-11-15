package com.example.citytrail.plan;

import java.util.List;

public record Slot(String category, List<String> tags, String placeId, String nearPlaceId) {

    public Slot(String category, List<String> tags) {
        this(category, tags, null, null);
    }

    public Slot(String category, List<String> tags, String placeId) {
        this(category, tags, placeId, null);
    }

    public Slot withNear(String nearPlaceId) {
        return new Slot(category, tags, placeId, nearPlaceId);
    }
}
