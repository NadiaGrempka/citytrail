package com.example.citytrail.plan;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Untrusted shape produced by the LLM. Always run it through IntentVocabulary.sanitize before use. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RawIntent(List<RawSlot> slots, Boolean returnHome) {

    /** place: a place id the visitor named; near: a place id the stop should be close to. Both may be null. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RawSlot(String category, List<String> tags, String place, String near) {
    }
}
