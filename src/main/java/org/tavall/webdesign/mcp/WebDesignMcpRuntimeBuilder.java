package org.tavall.webdesign.mcp;

import org.tavall.ai.core.catalog.AIFunctionCatalog;
import org.tavall.ai.mcp.server.AIFunctionMcpStandaloneHttpServer;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.application.WebDesignApplicationServices;
import org.tavall.webdesign.application.WebDesignApplicationServicesBuilder;
import org.tavall.webdesign.design.preview.WebDesignAgentPreviewRuntime;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Explicit composition root for the Java-owned Web Design Agent product runtime. */
public final class WebDesignMcpRuntimeBuilder {
    private static final int DEFAULT_PORT = 3001;
    private static final int DEFAULT_MAX_CONCURRENT_REQUESTS = 4;
    private static final int DEFAULT_MAX_REQUEST_BODY_BYTES = 1_048_576;
    private static final int DEFAULT_REQUEST_RECEIVE_TIMEOUT_MILLIS = 30_000;
    private static final int DEFAULT_HEADERS_TIMEOUT_MILLIS = 15_000;

    private final Map<String, String> environment;

    public WebDesignMcpRuntimeBuilder(Map<String, String> environment) {
        this.environment = Map.copyOf(Objects.requireNonNull(environment, "environment"));
    }

    public WebDesignMcpRuntime build() {
        WebDesignApplicationServicesBuilder servicesBuilder = new WebDesignApplicationServicesBuilder(environment);
        WebDesignAgentRoleConfigurationBuilder.WebDesignAgentCapabilities capabilities = servicesBuilder.capabilities();
        new WebDesignPublicDeploymentValidator().validate(capabilities, environment);

        int maximumConcurrentRequests = positiveInteger(
                "WEB_DESIGN_AGENT_MAX_CONCURRENT_REQUESTS",
                DEFAULT_MAX_CONCURRENT_REQUESTS
        );
        int maximumRequestBodyBytes = positiveInteger(
                "WEB_DESIGN_AGENT_MAX_REQUEST_BODY_BYTES",
                DEFAULT_MAX_REQUEST_BODY_BYTES
        );
        int requestReceiveTimeoutMillis = positiveInteger(
                "WEB_DESIGN_AGENT_REQUEST_RECEIVE_TIMEOUT_MS",
                DEFAULT_REQUEST_RECEIVE_TIMEOUT_MILLIS
        );
        int headersTimeoutMillis = positiveInteger(
                "WEB_DESIGN_AGENT_HEADERS_TIMEOUT_MS",
                DEFAULT_HEADERS_TIMEOUT_MILLIS
        );
        if (headersTimeoutMillis > requestReceiveTimeoutMillis) {
            throw new IllegalArgumentException(
                    "WEB_DESIGN_AGENT_HEADERS_TIMEOUT_MS must not exceed WEB_DESIGN_AGENT_REQUEST_RECEIVE_TIMEOUT_MS"
            );
        }

        WebDesignAgentPreviewRuntime previewRuntime = capabilities.browser()
                ? new WebDesignAgentPreviewRuntime(maximumConcurrentRequests)
                : null;
        WebDesignApplicationServices services = servicesBuilder.build(
                previewRuntime,
                optional("WEB_DESIGN_AGENT_PUBLIC_BASE_URL")
        );
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
        Map<String, String> connectorProperties = Map.of(
                "connectionTimeout", Integer.toString(headersTimeoutMillis),
                "connectionUploadTimeout", Integer.toString(requestReceiveTimeoutMillis),
                "disableUploadTimeout", "false",
                "maxPostSize", Integer.toString(maximumRequestBodyBytes),
                "maxSwallowSize", Integer.toString(maximumRequestBodyBytes)
        );
        AIFunctionMcpStandaloneHttpServer.Configuration serverConfiguration =
                new AIFunctionMcpStandaloneHttpServer.Configuration(
                        optionalOrDefault("WEB_DESIGN_AGENT_HOST", "0.0.0.0"),
                        port(),
                        "",
                        "/mcp",
                        "web-design-agent",
                        "0.2.0",
                        "Generate, compare, refine, inspect, and export real A/B/C web designs.",
                        connectorProperties
                );

        List<AIFunctionMcpStandaloneHttpServer.ServletRegistration> supplementalServlets = new ArrayList<>();
        supplementalServlets.add(new AIFunctionMcpStandaloneHttpServer.ServletRegistration(
                "webDesignStatus",
                new WebDesignStatusServlet(),
                List.of("/")
        ));
        if (previewRuntime != null) {
            supplementalServlets.add(new AIFunctionMcpStandaloneHttpServer.ServletRegistration(
                    "webDesignFinalPreview",
                    new WebDesignPreviewServlet(previewRuntime),
                    List.of("/preview/*")
            ));
        }
        List<AIFunctionMcpStandaloneHttpServer.FilterRegistration> filters = List.of(
                new AIFunctionMcpStandaloneHttpServer.FilterRegistration(
                        "webDesignAnonymousMcpGuard",
                        new WebDesignMcpRequestGuardFilter(maximumConcurrentRequests, maximumRequestBodyBytes),
                        List.of("/mcp", "/mcp/*")
                )
        );

        try {
            AIFunctionMcpStandaloneHttpServer server = AIFunctionMcpStandaloneHttpServer.start(
                    catalog,
                    serverConfiguration,
                    List.of(appResource.specification()),
                    List.of(),
                    new WebDesignMcpToolPresentationResolver().resolve(),
                    supplementalServlets,
                    filters
            );
            return new WebDesignMcpRuntime(server, previewRuntime);
        } catch (RuntimeException exception) {
            if (previewRuntime != null) {
                previewRuntime.close();
            }
            throw exception;
        }
    }

    private List<String> resourceDomains() {
        String configured = optional("WEB_DESIGN_AGENT_APP_RESOURCE_DOMAINS");
        if (configured == null) {
            return List.of();
        }
        return java.util.Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    private int port() {
        int configuredPort = positiveInteger("WEB_DESIGN_AGENT_PORT", DEFAULT_PORT);
        if (configuredPort > 65_535) {
            throw new IllegalArgumentException("WEB_DESIGN_AGENT_PORT must be between 1 and 65535");
        }
        return configuredPort;
    }

    private int positiveInteger(String name, int fallback) {
        String configured = optional(name);
        if (configured == null) {
            return fallback;
        }
        try {
            int parsed = Integer.parseInt(configured);
            if (parsed <= 0) {
                throw new NumberFormatException();
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(name + " must be a positive integer", exception);
        }
    }

    private String optionalOrDefault(String name, String fallback) {
        String value = optional(name);
        return value == null ? fallback : value;
    }

    private String optional(String name) {
        String value = environment.get(name);
        return value == null || value.isBlank() ? null : value.trim();
    }
}
