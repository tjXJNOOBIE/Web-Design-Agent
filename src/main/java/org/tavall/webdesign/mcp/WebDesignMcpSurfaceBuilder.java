package org.tavall.webdesign.mcp;

import org.tavall.ai.core.catalog.AIFunctionCatalog;
import org.tavall.webdesign.application.WebDesignApplicationServices;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Builds one canonical WDA MCP surface that can be served over HTTP or stdio. */
public final class WebDesignMcpSurfaceBuilder {
    private final WebDesignApplicationServices services;
    private final Map<String, String> environment;

    public WebDesignMcpSurfaceBuilder(
            WebDesignApplicationServices services,
            Map<String, String> environment
    ) {
        this.services = Objects.requireNonNull(services, "services");
        this.environment = Map.copyOf(Objects.requireNonNull(environment, "environment"));
    }

    public WebDesignMcpSurface build() {
        WebDesignMcpFunctions functions = new WebDesignMcpFunctions(
                services.generationHandler(),
                services.refinementHandler(),
                services.conceptGenerationHandler(),
                services.exportBuilder(),
                services.roleConfigurationBuilder()
        );
        AIFunctionCatalog catalog = new AIFunctionCatalog(services.objectMapper());
        catalog.registerInstances(functions);
        WebDesignMcpAppResource appResource = WebDesignMcpAppResource.fromClasspath(resourceDomains());
        return new WebDesignMcpSurface(
                catalog,
                List.of(appResource.specification()),
                List.of(),
                new WebDesignMcpToolPresentationResolver().resolve()
        );
    }

    private List<String> resourceDomains() {
        String configured = optional("WEB_DESIGN_AGENT_APP_RESOURCE_DOMAINS");
        if (configured == null) {
            return List.of();
        }
        return Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    private String optional(String name) {
        String value = environment.get(name);
        return value == null || value.isBlank() ? null : value.trim();
    }
}
