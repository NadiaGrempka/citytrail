package com.example.citytrail.plan;

/** Estimated way between two points. mode is "walk" or "transit"; via is a human-readable summary. */
public record Leg(String mode, int minutes, int distanceM, String via) {
}
