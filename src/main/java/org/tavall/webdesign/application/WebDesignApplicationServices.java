package org.tavall.webdesign.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.design.export.DesignExportBuilder;
import org.tavall.webdesign.design.handler.WebDesignConceptGenerationHandler;
import org.tavall.webdesign.design.handler.WebDesignGenerationHandler;
import org.tavall.webdesign.design.handler.WebDesignRefinementHandler;

import java.util.Objects;

/** Immutable application-service graph shared by Java entry points. */
public record WebDesignApplicationServices(
        ObjectMapper objectMapper,
        WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder,
        WebDesignGenerationHandler generationHandler,
        WebDesignRefinementHandler refinementHandler,
        WebDesignConceptGenerationHandler conceptGenerationHandler,
        DesignExportBuilder exportBuilder
) {
    public WebDesignApplicationServices {
        objectMapper = Objects.requireNonNull(objectMapper, "objectMapper");
        roleConfigurationBuilder = Objects.requireNonNull(roleConfigurationBuilder, "roleConfigurationBuilder");
        generationHandler = Objects.requireNonNull(generationHandler, "generationHandler");
        refinementHandler = Objects.requireNonNull(refinementHandler, "refinementHandler");
        conceptGenerationHandler = Objects.requireNonNull(conceptGenerationHandler, "conceptGenerationHandler");
        exportBuilder = Objects.requireNonNull(exportBuilder, "exportBuilder");
    }
}
