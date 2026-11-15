package com.example.citytrail.plan;

import java.util.List;

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
