package com.example.citytrail.plan;

import java.util.List;

public record PlanRequest(
        String text,
        Double startLat,
        Double startLng,
        String startTime,
        List<String> previousStopIds,
        Boolean previousReturnHome,
        String walkPace) {
}
