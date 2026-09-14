package org.tavall.webdesign.cli;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignGenerationResult;
import org.tavall.webdesign.design.handler.WebDesignGenerationHandler;

import java.util.Objects;

/** Executes one CLI generation through the canonical Java product handler. */
public final class WebDesignCliHandler {
    private final WebDesignGenerationHandler generationHandler;
    private final ObjectMapper objectMapper;

    public WebDesignCliHandler(
            WebDesignGenerationHandler generationHandler,
            ObjectMapper objectMapper
    ) {
        this.generationHandler = Objects.requireNonNull(generationHandler, "generationHandler");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
    }

    public String handle(DesignGenerationRequest request) {
        DesignGenerationResult result = generationHandler.generate(request);
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize Web Design Agent CLI result.", exception);
        }
    }
}
