package com.example.citytrail.plan;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class InfoController {

    public record Info(boolean aiParser, String model) {
    }

    private final ObjectProvider<LlmIntentParser> llmParser;
    private final String model;

    public InfoController(ObjectProvider<LlmIntentParser> llmParser, @Value("${citytrail.llm.model:}") String model) {
        this.llmParser = llmParser;
        this.model = model;
    }

    @GetMapping("/info")
    public Info info() {
        boolean on = llmParser.getIfAvailable() != null;
        return new Info(on, on ? model : null);
    }
}
