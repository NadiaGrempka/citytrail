package com.example.citytrail.plan;

import java.util.List;

/**
 * Result of planning. parsedBy is "llm" or "keyword". returnLeg is null when no ride home was requested.
 * dayOffset/date say which day the plan is for (days from today, Gdańsk time).
 */
public record Plan(
        String parsedBy,
        Intent intent,
        int dayOffset,
        String date,
        String startTime,
        String endTime,
        int totalMinutes,
        List<Stop> stops,
        Leg returnLeg,
        List<String> warnings) {
}
