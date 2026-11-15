package com.example.citytrail.plan;

import java.util.List;

/**
 * One wanted stop: a category (food, store, event, landmark) plus preferred tags from the dataset.
 * placeId is set when the visitor asked for a specific place by name (e.g. "Józef K."); otherwise null.
 * nearPlaceId is set when the visitor said "near X": the stop is then picked near that place instead of
 * near the previous stop.
 */
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
