package com.example.citytrail.places;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PlaceController {

    private final PlaceRepository repository;

    public PlaceController(PlaceRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/places")
    public List<Place> places(@RequestParam(required = false) String category) {
        if (category == null || category.isBlank()) {
            return repository.findAll();
        }
        return repository.findAll().stream()
                .filter(p -> p.category().equalsIgnoreCase(category))
                .toList();
    }

    @GetMapping("/places/{id}")
    public Place place(@PathVariable String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown place: " + id));
    }

    @GetMapping("/districts")
    public List<District> districts() {
        return repository.findAllDistricts();
    }
}
