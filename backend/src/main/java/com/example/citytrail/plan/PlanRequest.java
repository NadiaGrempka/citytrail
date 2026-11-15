package com.example.citytrail.plan;

/**
 * Body of POST /api/plan.
 * text: the visitor's wish, e.g. "a local cafe, a thrift shop, then a rock gig and a ride home".
 * startLat/startLng: optional start and "home" point (defaults to the Old Town).
 * startTime: optional "HH:mm" (defaults to 14:00).
 */
public record PlanRequest(String text, Double startLat, Double startLng, String startTime) {
}
