package org.tavall.webdesign.agent;

import org.tavall.ai.agent.strands.StrandsAgentProviderConfiguration;

import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Resolves the deliberately narrow environment inherited by the standalone Strands process. */
public final class WebDesignStrandsConfigurationResolver {
    public static final String NODE_EXECUTABLE_ENV = "WEB_DESIGN_AGENT_STRANDS_NODE";
    public static final String BRIDGE_ENTRYPOINT_ENV = "WEB_DESIGN_AGENT_STRANDS_ENTRYPOINT";

    private static final Set<String> ALLOWED_STRANDS_ENVIRONMENT = Set.of(
            "PATH",
            "HOME",
            "TMPDIR",
            "TMP",
            "TEMP",
            "NODE_EXTRA_CA_CERTS",
            "SSL_CERT_FILE",
            "AWS_REGION",
            "AWS_DEFAULT_REGION",
            "AWS_ACCESS_KEY_ID",
            "AWS_SECRET_ACCESS_KEY",
            "AWS_SESSION_TOKEN",
            "AWS_PROFILE",
            "AWS_SDK_LOAD_CONFIG",
            "ANTHROPIC_API_KEY",
            "OPENAI_API_KEY",
            "GOOGLE_API_KEY",
            "GEMINI_API_KEY",
            "STRANDS_BRIDGE_USE_CODEX_SUBSCRIPTION",
            "STRANDS_BRIDGE_CODEX_COMMAND",
            "STRANDS_BRIDGE_CODEX_MODEL",
            "STRANDS_BRIDGE_CODEX_TIMEOUT_MS",
            "STRANDS_BRIDGE_CODEX_REASONING_EFFORT"
    );

    private final Map<String, String> environment;

    public WebDesignStrandsConfigurationResolver(Map<String, String> environment) {
        this.environment = Map.copyOf(Objects.requireNonNull(environment, "environment"));
    }

    public StrandsAgentProviderConfiguration resolve() {
        Path nodeExecutable = Path.of(requiredEnvironment(NODE_EXECUTABLE_ENV));
        Path bridgeEntrypoint = Path.of(requiredEnvironment(BRIDGE_ENTRYPOINT_ENV));
        Map<String, String> strandsEnvironment = new LinkedHashMap<>();
        for (String name : ALLOWED_STRANDS_ENVIRONMENT) {
            String value = environment.get(name);
            if (value != null && !value.isBlank()) {
                strandsEnvironment.put(name, value);
            }
        }
        return StrandsAgentProviderConfiguration.node(
                nodeExecutable,
                bridgeEntrypoint,
                strandsEnvironment,
                Duration.ofMillis(nonnegativeLong(
                        "WEB_DESIGN_AGENT_STRANDS_TIMEOUT_MS",
                        Duration.ZERO.toMillis()
                )),
                optionalEnvironment("WEB_DESIGN_AGENT_MODEL_ID")
        );
    }

    private String requiredEnvironment(String name) {
        String value = environment.get(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " must point to the standalone Strands runtime installation");
        }
        return value.trim();
    }

    private String optionalEnvironment(String name) {
        String value = environment.get(name);
        return value == null ? "" : value.trim();
    }

    private long nonnegativeLong(String name, long fallback) {
        String value = optionalEnvironment(name);
        if (value.isBlank()) {
            return fallback;
        }
        try {
            long parsed = Long.parseLong(value);
            if (parsed < 0) {
                throw new NumberFormatException();
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(name + " must be a non-negative integer in milliseconds; use 0 for unlimited", exception);
        }
    }
}
