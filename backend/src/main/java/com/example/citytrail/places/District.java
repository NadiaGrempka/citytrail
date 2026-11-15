package com.example.citytrail.places;

import java.util.List;

/** An area of the map that can be "unlocked". center is [lat, lng]. */
public record District(String id, String name, List<Double> center, int radiusM) {
}
