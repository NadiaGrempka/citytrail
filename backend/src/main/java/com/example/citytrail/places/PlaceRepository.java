package com.example.citytrail.places;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class PlaceRepository {

    static final String RESOURCE = "data/gdansk_places.json";

    private final List<Place> places;
    private final List<District> districts;
    private final Map<String, Place> byId;

    public PlaceRepository(ObjectMapper objectMapper) {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            PlaceDataset dataset = objectMapper.readValue(in, PlaceDataset.class);
            this.places = List.copyOf(dataset.places());
            this.districts = List.copyOf(dataset.districts());
            this.byId = places.stream().collect(Collectors.toUnmodifiableMap(Place::id, Function.identity()));
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot load " + RESOURCE, e);
        }
    }

    public List<Place> findAll() {
        return places;
    }

    public Optional<Place> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }

    public List<District> findAllDistricts() {
        return districts;
    }
}
