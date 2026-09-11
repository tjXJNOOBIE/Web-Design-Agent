package org.tavall.webdesign.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.tavall.webdesign.design.data.DesignGenerationRequest;

import java.util.ArrayList;
import java.util.List;

public final class WebDesignGenerationPromptBuilder {
    private final ObjectMapper objectMapper;
    private final WebDesignAgentRoleConfigurationBuilder.WebDesignAgentCapabilities capabilities;

    public WebDesignGenerationPromptBuilder(
            ObjectMapper objectMapper,
            WebDesignAgentRoleConfigurationBuilder.WebDesignAgentCapabilities capabilities
    ) {
        this.objectMapper = objectMapper;
        this.capabilities = capabilities;
    }

    public String build(DesignGenerationRequest request, String suffix) {
        List<String> lines = new ArrayList<>();
        lines.add("OPERATION: generate-real-abc");
        lines.add("Prompt: " + request.prompt());
        lines.add("Source mode: " + request.sourceMode().wireValue());
        lines.add("Capabilities: " + json(capabilities));
        lines.add("Infer the hidden brief. Create distinct Design Genomes, invoke all candidate specialists, critique real outputs, repair with evidence, and return generation JSON.");

        if (request.referenceImageUrl() != null) {
            lines.add("Reference image URL: " + request.referenceImageUrl());
            lines.add("Each candidate must navigate to and inspect this exact validated public reference target before claiming source-grounded browser evidence.");
        }
        if (request.targetUrl() != null) {
            lines.add("Existing site target URL: " + request.targetUrl());
            lines.add("Each candidate must navigate to and inspect this exact validated public target before claiming source-grounded browser evidence.");
        }
        if (request.selectedConcept() != null) {
            lines.add("Selected concept: " + json(request.selectedConcept()));
            lines.add("Selected concept image target: " + request.selectedConcept().imageUrl());
            lines.add("Each candidate must navigate to and inspect this exact validated concept image target before claiming concept-grounded browser evidence.");
        }
        if (!request.pages().isEmpty()) {
            lines.add("Requested pages: " + json(request.pages()));
        }
        if (request.preferenceProfile() != null) {
            lines.add("Portable preference profile: " + json(request.preferenceProfile()));
        }
        if (suffix != null && !suffix.isBlank()) {
            lines.add(suffix.trim());
        }
        return String.join("\n", lines);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize Web Design Agent prompt data", exception);
        }
    }
}
