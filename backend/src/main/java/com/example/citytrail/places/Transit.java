package com.example.citytrail.places;

/** Mocked nearest-stop info: mode is "tram", "rail" or "bus". */
public record Transit(String mode, String stop, int walkMin) {
}
