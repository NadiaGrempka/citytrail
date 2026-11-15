package com.example.citytrail.plan;

import java.util.List;

/** One wanted stop: a category (food, store, event, landmark) plus preferred tags from the dataset. */
public record Slot(String category, List<String> tags) {
}
