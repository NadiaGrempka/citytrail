package com.example.citytrail.places;

import java.util.List;

public record District(String id, String name, List<Double> center, int radiusM) {
}
