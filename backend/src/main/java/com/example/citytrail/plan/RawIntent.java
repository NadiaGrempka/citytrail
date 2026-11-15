package com.example.citytrail.plan;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RawIntent(List<RawSlot> slots, Boolean returnHome) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RawSlot(String category, List<String> tags, String place, String near) {
    }
}
