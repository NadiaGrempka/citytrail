package com.example.citytrail.plan;

import com.example.citytrail.places.Place;
import com.example.citytrail.places.PlaceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PlanService {

    private static final Logger log = LoggerFactory.getLogger(PlanService.class);
    private static final int MAX_TEXT_LENGTH = 500;
    private static final int DEFAULT_START_MINUTES = 14 * 60;

    private static final double MIN_LAT = 54.28;
    private static final double MAX_LAT = 54.46;
    private static final double MIN_LNG = 18.45;
    private static final double MAX_LNG = 18.75;

    private static final Pattern REFERENCE = Pattern.compile(
            "\\b(?:near|next to|close to|around|beside)\\s+(?:(?:the|that|this)\\s+)?(?<target>.*?)"
                    + "(?=\\s+(?:and|then|after|before)\\b|[,;.!?]|$)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern LAST_STOP_WORDS = Pattern.compile(
            "(?:it|there|here|that|this|that one|last stop|previous stop|last one)",
            Pattern.CASE_INSENSITIVE);

    private record Reference(int slotIndex, String placeId) {
    }

    private final KeywordIntentParser keywordParser;
    private final ObjectProvider<LlmIntentParser> llmParser;
    private final Planner planner;
    private final PlaceRepository repository;
    private final double defaultStartLat;
    private final double defaultStartLng;

    public PlanService(
            KeywordIntentParser keywordParser,
            ObjectProvider<LlmIntentParser> llmParser,
            Planner planner,
            PlaceRepository repository,
            @Value("${citytrail.default-start.lat}") double defaultStartLat,
            @Value("${citytrail.default-start.lng}") double defaultStartLng) {
        this.keywordParser = keywordParser;
        this.llmParser = llmParser;
        this.planner = planner;
        this.repository = repository;
        this.defaultStartLat = defaultStartLat;
        this.defaultStartLng = defaultStartLng;
        if (llmParser.getIfAvailable() == null) {
            log.info("AI parser is off (set CITYTRAIL_LLM_API_KEY to turn it on); using the keyword parser");
        }
    }

    public Plan plan(PlanRequest request) {
        String text = request == null || request.text() == null ? "" : request.text().trim();
        if (text.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tell me what you would like to do.");
        }
        if (text.length() > MAX_TEXT_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Please keep it under " + MAX_TEXT_LENGTH + " characters.");
        }

        List<Place> route = previousPlaces(request.previousStopIds());
        boolean followUp = !route.isEmpty();

        Intent wanted = fromLanguageModel(text, route);
        String parsedBy = "llm";
        if (wanted == null) {
            wanted = fromKeywords(text, route);
            parsedBy = "keyword";
        }
        if (wanted.slots().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "I could not find anything to plan. Try mentioning a cafe, a shop, an event, a park or a sight.");
        }

        List<Slot> slots = new ArrayList<>();
        for (Place place : route) {
            slots.add(new Slot(place.category(), List.of(), place.id()));
        }
        slots.addAll(wanted.slots());
        boolean returnHome = wanted.returnHome()
                || (followUp && Boolean.TRUE.equals(request.previousReturnHome()));
        Intent intent = new Intent(
                List.copyOf(slots.subList(0, Math.min(slots.size(), IntentVocabulary.MAX_SLOTS))), returnHome);

        double[] start = startPoint(request.startLat(), request.startLng());
        return planner.plan(intent, start[0], start[1], startMinutes(request.startTime()), parsedBy,
                Planner.walkSpeed(request.walkPace()));
    }

    public Plan replan(List<String> stopIds, boolean returnHome, Double startLat, Double startLng) {
        List<Place> route = previousPlaces(stopIds);
        if (route.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This trip has no known stops.");
        }
        List<Slot> slots = new ArrayList<>();
        for (Place place : route) {
            slots.add(new Slot(place.category(), List.of(), place.id()));
        }
        Intent intent = new Intent(
                List.copyOf(slots.subList(0, Math.min(slots.size(), IntentVocabulary.MAX_SLOTS))), returnHome);
        double[] start = startPoint(startLat, startLng);
        return planner.plan(intent, start[0], start[1], DEFAULT_START_MINUTES, "saved");
    }

    private double[] startPoint(Double lat, Double lng) {
        if (lat != null && lng != null
                && lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG) {
            return new double[] {lat, lng};
        }
        return new double[] {defaultStartLat, defaultStartLng};
    }

    private List<Place> previousPlaces(List<String> previousStopIds) {
        List<Place> places = new ArrayList<>();
        if (previousStopIds == null) {
            return places;
        }
        for (String id : previousStopIds) {
            Place place = id == null ? null : repository.findById(id).orElse(null);
            if (place != null) {
                places.add(place);
            }
        }
        return places;
    }

    private Place resolveReference(String phrase, List<Place> route) {
        String target = phrase == null ? "" : phrase.trim();
        if (target.isEmpty() || LAST_STOP_WORDS.matcher(target).matches()) {
            return route.isEmpty() ? null : route.get(route.size() - 1);
        }
        Place named = keywordParser.findNamedPlace(target);
        if (named != null) {
            return named;
        }
        List<Slot> wanted = keywordParser.parse(target).slots();
        if (wanted.isEmpty()) {
            return null;
        }
        Slot kind = wanted.get(0);
        for (int i = route.size() - 1; i >= 0; i--) {
            Place stop = route.get(i);
            boolean sameKind = stop.category().equals(kind.category())
                    && (kind.tags().isEmpty() || stop.tags().stream().anyMatch(kind.tags()::contains));
            if (sameKind) {
                return stop;
            }
        }
        return null;
    }

    private Intent fromLanguageModel(String text, List<Place> route) {
        LlmIntentParser llm = llmParser.getIfAvailable();
        if (llm == null) {
            return null;
        }
        try {
            Intent intent = llm.parse(text, route);
            if (!intent.slots().isEmpty()) {
                return intent;
            }
            log.info("LLM returned no slots; falling back to keyword parser");
        } catch (RuntimeException e) {
            log.warn("LLM intent parsing failed, falling back to keyword parser: {}", e.toString());
        }
        return null;
    }

    private Intent fromKeywords(String text, List<Place> route) {
        boolean followUp = !route.isEmpty();

        StringBuilder cleaned = new StringBuilder();
        List<Reference> references = new ArrayList<>();
        Matcher matcher = REFERENCE.matcher(text);
        int last = 0;
        while (matcher.find()) {
            Place target = resolveReference(matcher.group("target"), route);
            if (target == null && !followUp) {
                continue;
            }
            cleaned.append(text, last, matcher.start()).append(' ');
            last = matcher.end();
            if (target != null) {
                int stopsBefore = keywordParser.parse(cleaned.toString()).slots().size();
                references.add(new Reference(Math.max(0, stopsBefore - 1), target.id()));
            }
        }
        cleaned.append(text.substring(last));

        Intent parsed = keywordParser.parse(cleaned.toString());
        List<Slot> slots = new ArrayList<>(parsed.slots());
        for (Reference reference : references) {
            if (reference.slotIndex() < slots.size()) {
                slots.set(reference.slotIndex(), slots.get(reference.slotIndex()).withNear(reference.placeId()));
            }
        }
        return new Intent(List.copyOf(slots), parsed.returnHome());
    }

    private static int startMinutes(String startTime) {
        if (startTime == null || startTime.isBlank()) {
            return DEFAULT_START_MINUTES;
        }
        try {
            LocalTime time = LocalTime.parse(startTime.trim());
            return time.getHour() * 60 + time.getMinute();
        } catch (DateTimeParseException e) {
            return DEFAULT_START_MINUTES;
        }
    }
}
