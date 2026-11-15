package com.example.citytrail.plan;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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

/**
 * Calls any OpenAI-compatible /chat/completions endpoint (Groq, OpenRouter, Gemini's OpenAI-compatible
 * endpoint, a local Ollama...). Enabled only when citytrail.llm.enabled=true. The model's answer is
 * treated as untrusted: it is parsed and then sanitized against the dataset vocabulary.
 */
@Component
@ConditionalOnProperty(name = "citytrail.llm.enabled", havingValue = "true")
public class LlmIntentParser implements IntentParser {

    private static final String PROMPT_RESOURCE = "prompts/intent-system.txt";

    private final RestClient client;
    private final String model;
    private final String systemPrompt;
    private final ObjectMapper objectMapper;
    private final IntentVocabulary vocabulary;

    public LlmIntentParser(
            ObjectMapper objectMapper,
            IntentVocabulary vocabulary,
            @Value("${citytrail.llm.base-url}") String baseUrl,
            @Value("${citytrail.llm.api-key}") String apiKey,
            @Value("${citytrail.llm.model}") String model) {
        if (baseUrl.isBlank() || apiKey.isBlank() || model.isBlank()) {
            throw new IllegalStateException(
                    "citytrail.llm.enabled=true requires citytrail.llm.base-url, api-key and model to be set");
        }
        this.objectMapper = objectMapper;
        this.vocabulary = vocabulary;
        this.model = model;
        this.systemPrompt = loadPrompt(vocabulary);

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.client = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl.replaceAll("/+$", ""))
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .build();
    }

    @Override
    public Intent parse(String text) {
        ChatRequest request = new ChatRequest(
                model,
                List.of(new ChatMessage("system", systemPrompt), new ChatMessage("user", text)),
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

    private static String loadPrompt(IntentVocabulary vocabulary) {
        try (InputStream in = new ClassPathResource(PROMPT_RESOURCE).getInputStream()) {
            String template = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            return template.replace("{{TAGS}}", String.join(", ", vocabulary.sortedTags()));
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
