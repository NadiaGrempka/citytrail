package com.example.citytrail.trips;

import com.example.citytrail.places.Place;
import com.example.citytrail.places.PlaceRepository;
import com.example.citytrail.plan.PlanService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/** Validation and orchestration for saved trips. */
@Service
public class TripService {

    static final int MAX_TITLE_LENGTH = 80;
    static final int MAX_STOPS = 6;
    private static final int MAX_PROMPT_LENGTH = 500;

    private final TripRepository trips;
    private final PlaceRepository places;
    private final PlanService planService;

    public TripService(TripRepository trips, PlaceRepository places, PlanService planService) {
        this.trips = trips;
        this.places = places;
        this.planService = planService;
    }

    public List<Trip> list() {
        return trips.findAll();
    }

    public Trip create(TripRequest request) {
        List<String> stopIds = knownStopIds(request == null ? null : request.stopIds());
        String title = cleanTitle(request.title());
        if (title.isEmpty()) {
            title = defaultTitle(stopIds);
        }
        String prompt = request.prompt() == null ? null : request.prompt().trim();
        if (prompt != null && prompt.length() > MAX_PROMPT_LENGTH) {
            prompt = prompt.substring(0, MAX_PROMPT_LENGTH);
        }
        double lat = request.startLat() == null ? 0 : request.startLat();
        double lng = request.startLng() == null ? 0 : request.startLng();
        return trips.insert(title, stopIds, Boolean.TRUE.equals(request.returnHome()), lat, lng, prompt);
    }

    public TripView get(String id) {
        Trip trip = find(id);
        // A start of 0,0 means "none was saved"; the planner then uses its default start point.
        Double lat = trip.startLat() == 0 ? null : trip.startLat();
        Double lng = trip.startLng() == 0 ? null : trip.startLng();
        return new TripView(trip, planService.replan(trip.stopIds(), trip.returnHome(), lat, lng));
    }

    public Trip rename(String id, TripRename request) {
        String title = cleanTitle(request == null ? null : request.title());
        if (title.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Give the trip a name.");
        }
        if (!trips.rename(id, title)) {
            throw notFound(id);
        }
        return find(id);
    }

    public void delete(String id) {
        if (!trips.delete(id)) {
            throw notFound(id);
        }
    }

    public void deleteAll() {
        trips.deleteAll();
    }

    private Trip find(String id) {
        return trips.findById(id).orElseThrow(() -> notFound(id));
    }

    private static ResponseStatusException notFound(String id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "No saved trip with id " + id);
    }

    private List<String> knownStopIds(List<String> requested) {
        List<String> ids = new ArrayList<>();
        if (requested != null) {
            for (String id : requested) {
                if (id != null && places.findById(id).isPresent()) {
                    ids.add(id);
                }
            }
        }
        if (ids.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A trip needs at least one known stop.");
        }
        if (ids.size() > MAX_STOPS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A trip can have at most " + MAX_STOPS + " stops.");
        }
        return ids;
    }

    private static String cleanTitle(String title) {
        String clean = title == null ? "" : title.trim();
        return clean.length() > MAX_TITLE_LENGTH ? clean.substring(0, MAX_TITLE_LENGTH) : clean;
    }

    private String defaultTitle(List<String> stopIds) {
        String title = stopIds.stream()
                .map(id -> places.findById(id).map(Place::name).orElse(id))
                .collect(Collectors.joining(" → "));
        return cleanTitle(title);
    }
}
