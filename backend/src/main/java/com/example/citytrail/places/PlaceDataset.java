package com.example.citytrail.places;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Shape of data/gdansk_places.json (the "meta" block is ignored). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PlaceDataset(List<District> districts, List<Place> places) {
}
