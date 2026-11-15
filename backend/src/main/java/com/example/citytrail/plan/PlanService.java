package com.example.citytrail.plan;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;

@Service
public class PlanService {

    private static final Logger log = LoggerFactory.getLogger(PlanService.class);
    private static final int MAX_TEXT_LENGTH = 500;
    private static final int DEFAULT_START_MINUTES = 14 * 60;

    // Rough bounding box around Gdańsk; start points outside it fall back to the default.
    private static final double MIN_LAT = 54.28;
    private static final double MAX_LAT = 54.46;
    private static final double MIN_LNG = 18.45;
    private static final double MAX_LNG = 18.75;

    private record Parsed(Intent intent, String by) {
    }

    private final KeywordIntentParser keywordParser;
    private final ObjectProvider<LlmIntentParser> llmParser;
    private final Planner planner;
    private final double defaultStartLat;
    private final double defaultStartLng;

    public PlanService(
            KeywordIntentParser keywordParser,
            ObjectProvider<LlmIntentParser> llmParser,
            Planner planner,
            @Value("${citytrail.default-start.lat}") double defaultStartLat,
            @Value("${citytrail.default-start.lng}") double defaultStartLng) {
        this.keywordParser = keywordParser;
        this.llmParser = llmParser;
        this.planner = planner;
        this.defaultStartLat = defaultStartLat;
        this.defaultStartLng = defaultStartLng;
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

        Parsed parsed = parse(text);
        if (parsed.intent().slots().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "I could not find anything to plan. Try mentioning a cafe, a shop, an event or a sight.");
        }

        double lat = defaultStartLat;
        double lng = defaultStartLng;
        if (request.startLat() != null && request.startLng() != null
                && request.startLat() >= MIN_LAT && request.startLat() <= MAX_LAT
                && request.startLng() >= MIN_LNG && request.startLng() <= MAX_LNG) {
            lat = request.startLat();
            lng = request.startLng();
        }

        return planner.plan(parsed.intent(), lat, lng, startMinutes(request.startTime()), parsed.by());
    }

    private Parsed parse(String text) {
        LlmIntentParser llm = llmParser.getIfAvailable();
        if (llm != null) {
            try {
                Intent intent = llm.parse(text);
                if (!intent.slots().isEmpty()) {
                    return new Parsed(intent, "llm");
                }
                log.info("LLM returned no slots; falling back to keyword parser");
            } catch (RuntimeException e) {
                log.warn("LLM intent parsing failed, falling back to keyword parser: {}", e.toString());
            }
        }
        return new Parsed(keywordParser.parse(text), "keyword");
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
