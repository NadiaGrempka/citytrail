package com.example.citytrail.plan;

import com.example.citytrail.places.Place;
import com.example.citytrail.places.PlaceRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

/** The closed set of categories and tags the planner understands, derived from the dataset. */
@Component
public class IntentVocabulary {

    public static final Set<String> CATEGORIES = Set.of("food", "store", "event", "landmark");
    public static final int MAX_SLOTS = 6;
    private static final int MAX_TAGS_PER_SLOT = 3;

    private final Set<String> knownTags;
    private final Map<String, String> idByKey = new HashMap<>();   // lower-case id or name -> place id
    private final Map<String, String> categoryById = new HashMap<>();

    public IntentVocabulary(PlaceRepository repository) {
        Set<String> tags = new TreeSet<>();
        for (Place place : repository.findAll()) {
            tags.addAll(place.tags());
            idByKey.put(place.id().toLowerCase(Locale.ROOT), place.id());
            idByKey.put(place.name().toLowerCase(Locale.ROOT), place.id());
            categoryById.put(place.id(), place.category());
        }
        this.knownTags = Set.copyOf(tags);
    }

    /** The place id for a model-supplied id (or exact name), or null when it is not in the dataset. */
    public String knownPlaceId(String idOrName) {
        if (idOrName == null) {
            return null;
        }
        return idByKey.get(idOrName.trim().toLowerCase(Locale.ROOT));
    }

    /** Sorted list, used to fill the {{TAGS}} placeholder in the LLM prompt. */
    public List<String> sortedTags() {
        return new ArrayList<>(new TreeSet<>(knownTags));
    }

    public List<String> filterTags(Collection<String> tags) {
        return tags.stream()
                .filter(Objects::nonNull)
                .map(t -> t.trim().toLowerCase(Locale.ROOT))
                .filter(knownTags::contains)
                .distinct()
                .limit(MAX_TAGS_PER_SLOT)
                .toList();
    }

    /** Drops anything that is not a known category or tag, and caps the number of slots. */
    public Intent sanitize(RawIntent raw) {
        List<Slot> slots = new ArrayList<>();
        if (raw != null && raw.slots() != null) {
            for (RawIntent.RawSlot rawSlot : raw.slots()) {
                if (rawSlot == null) {
                    continue;
                }
                String placeId = knownPlaceId(rawSlot.place());
                String nearId = knownPlaceId(rawSlot.near());
                // A named place decides the category; otherwise the model's category must be a known one.
                String category = placeId != null
                        ? categoryById.get(placeId)
                        : (rawSlot.category() == null ? null : rawSlot.category().trim().toLowerCase(Locale.ROOT));
                if (category == null || !CATEGORIES.contains(category)) {
                    continue;
                }
                List<String> tags = placeId != null || rawSlot.tags() == null ? List.of() : filterTags(rawSlot.tags());
                slots.add(new Slot(category, tags, placeId, nearId));
                if (slots.size() >= MAX_SLOTS) {
                    break;
                }
            }
        }
        boolean returnHome = raw != null && Boolean.TRUE.equals(raw.returnHome());
        return new Intent(List.copyOf(slots), returnHome);
    }
}
