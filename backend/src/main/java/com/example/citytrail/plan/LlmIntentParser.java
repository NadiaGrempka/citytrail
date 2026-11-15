package com.example.citytrail.plan;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.example.citytrail.places.Place;
import com.example.citytrail.places.PlaceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Calls any OpenAI-compatible /chat/completions endpoint (Groq, Gemini's OpenAI-compatible endpoint,
 * OpenRouter, a local Ollama...). Active only when citytrail.llm.enabled=true AND an API key is set, so
 * adding the key is all it takes to switch the AI parser on. The model sees the place list and the route
 * built so far, so it can resolve place names, "near X" and follow-ups. Its answer is treated as untrusted:
 * it is parsed and then sanitized against the dataset (unknown ids and tags are dropped).
 */
@Component
@ConditionalOnExpression("${citytrail.llm.enabled:false} and '${citytrail.llm.api-key:}' != ''")
public class LlmIntentParser implements IntentParser {

    private static final Logger log = LoggerFactory.getLogger(LlmIntentParser.class);
    private static final String PROMPT_RESOURCE = "prompts/intent-system.txt";

    private final RestClient client;
    private final String model;
    private final String systemPrompt;
    private final ObjectMapper objectMapper;
    private final IntentVocabulary vocabulary;

    public LlmIntentParser(
            ObjectMapper objectMapper,
            IntentVocabulary vocabulary,
            PlaceRepository repository,
            @Value("${citytrail.llm.base-url}") String baseUrl,
            @Value("${citytrail.llm.api-key}") String apiKey,
            @Value("${citytrail.llm.model}") String model) {
        if (baseUrl.isBlank() || apiKey.isBlank() || model.isBlank()) {
            throw new IllegalStateException(
                    "The AI parser needs citytrail.llm.base-url, api-key and model to be set");
        }
        this.objectMapper = objectMapper;
        this.vocabulary = vocabulary;
        this.model = model;
        this.systemPrompt = loadPrompt(vocabulary, repository);

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.client = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl.replaceAll("/+$", ""))
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .build();
        log.info("AI intent parser is on: model {} at {}", model, baseUrl);
    }

    @Override
    public Intent parse(String text) {
        return parse(text, List.of());
    }

    /** route: the stops already planned, so "near the museum" and follow-ups can be resolved. */
    public Intent parse(String text, List<Place> route) {
        ChatRequest request = new ChatRequest(
                model,
                List.of(new ChatMessage("system", systemPrompt), new ChatMessage("user", userMessage(text, route))),
                0.0,
                new ResponseFormat("json_object"));

        ChatResponse response = client.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ChatResponse.class);

        String content = firstContent(response);
        RawIntent raw = objectMapper.readValue(stripFences(content), RawIntent.class);
        return vocabulary.sanitize(raw);
    }

    /** The visitor's text is only ever sent as the user message, never mixed into the instructions. */
    static String userMessage(String text, List<Place> route) {
        String stops = route.isEmpty()
                ? "none"
                : route.stream().map(p -> p.id() + " (" + p.name() + ")").collect(Collectors.joining(", "));
        return "Current route: " + stops + "\nRequest: " + text;
    }

    private static String firstContent(ChatResponse response) {
        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            throw new IllegalStateException("LLM returned no choices");
        }
        ChatMessage message = response.choices().get(0).message();
        if (message == null || message.content() == null || message.content().isBlank()) {
            throw new IllegalStateException("LLM returned an empty message");
        }
        return message.content();
    }

    /** Some models wrap JSON in ```json fences even when told not to. */
    private static String stripFences(String content) {
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline) {
                return trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return trimmed;
    }

    private static String loadPrompt(IntentVocabulary vocabulary, PlaceRepository repository) {
        try (InputStream in = new ClassPathResource(PROMPT_RESOURCE).getInputStream()) {
            String template = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            String places = repository.findAll().stream()
                    .map(p -> p.id() + ": " + p.name() + ", " + p.category() + "/" + p.subcategory())
                    .collect(Collectors.joining("\n"));
            return template
                    .replace("{{TAGS}}", String.join(", ", vocabulary.sortedTags()))
                    .replace("{{PLACES}}", places);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot load " + PROMPT_RESOURCE, e);
        }
    }

    public record ChatRequest(
            String model,
            List<ChatMessage> messages,
            double temperature,
            @JsonProperty("response_format") ResponseFormat responseFormat) {
    }

    public record ResponseFormat(String type) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChatMessage(String role, String content) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChatResponse(List<Choice> choices) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Choice(ChatMessage message) {
    }
}
