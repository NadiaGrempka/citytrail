package com.example.citytrail.places;

/** Mocked event, expressed as days from "today" so the dataset never expires. */
public record UpcomingEvent(String title, int dayOffset, String time, String genre) {
}
