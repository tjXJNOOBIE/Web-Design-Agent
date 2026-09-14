package org.tavall.webdesign.agent;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Builds serializable standalone-Strands configurations from Java-owned WDA role policy. */
public final class WebDesignAgentRoleConfigurationBuilder {
    public static final String DEFAULT_MODEL_ID = "global.anthropic.claude-sonnet-4-6";
    public static final WebDesignInvocationPolicy DEFAULT_INVOCATION_POLICY =
            new WebDesignInvocationPolicy(0, 16, 60_000, 200_000);

    private final Map<String, String> environment;

    public WebDesignAgentRoleConfigurationBuilder(Map<String, String> environment) {
        this.environment = Map.copyOf(Objects.requireNonNull(environment, "environment"));
    }

    public WebDesignAgentCapabilities capabilities() {
        String browserUrl = optionalString("WEB_DESIGN_AGENT_BROWSER_MCP_URL");
        boolean localPlaywright = browserUrl == null && optionalBoolean("WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT");
        return new WebDesignAgentCapabilities(
                optionalString("API_KEY_21ST") != null,
                browserUrl != null || localPlaywright,
                optionalBoolean("WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD")
        );
    }

    public WebDesignInvocationPolicy invocationPolicy() {
        return new WebDesignInvocationPolicy(
                nonnegativeLong("WEB_DESIGN_AGENT_INVOCATION_TIMEOUT_MS", DEFAULT_INVOCATION_POLICY.timeoutMs()),
                positiveInt("WEB_DESIGN_AGENT_MAX_TURNS", DEFAULT_INVOCATION_POLICY.maxTurns()),
                positiveInt("WEB_DESIGN_AGENT_MAX_OUTPUT_TOKENS", DEFAULT_INVOCATION_POLICY.maxOutputTokens()),
                positiveInt("WEB_DESIGN_AGENT_MAX_TOTAL_TOKENS", DEFAULT_INVOCATION_POLICY.maxTotalTokens())
        );
    }

    public Map<String, Object> candidate(String candidateId) {
        String safeId = requireCandidateId(candidateId);
        return buildRuntime(
                "web-design-agent-candidate-" + safeId.toLowerCase(),
                "Web Design Candidate " + safeId,
                WebDesignAgentPrompt.candidate(safeId),
                new ToolPolicy(true, true, false)
        );
    }

    public Map<String, Object> critic() {
        return buildRuntime(
                "web-design-agent-critic",
                "Web Design Agent Visual Critic",
                WebDesignAgentPrompt.CRITIC,
                new ToolPolicy(false, false, false)
        );
    }

    public Map<String, Object> conceptArtist() {
        return buildRuntime(
                "web-design-agent-concept",
                "Web Design Agent Concept Artist",
                WebDesignAgentPrompt.CONCEPT,
                new ToolPolicy(false, false, true)
        );
    }

    public Map<String, Object> director() {
        return buildRuntime(
                "web-design-agent-director",
                "Web Design Agent Director",
                WebDesignAgentPrompt.DIRECTOR,
                new ToolPolicy(false, false, false)
        );
    }

    private Map<String, Object> buildRuntime(
            String id,
            String name,
            String systemPrompt,
            ToolPolicy toolPolicy
    ) {
        Map<String, Object> agent = new LinkedHashMap<>();
        agent.put("id", id);
        agent.put("name", name);
        agent.put("model", optionalString("WEB_DESIGN_AGENT_MODEL_ID") == null
                ? DEFAULT_MODEL_ID
                : optionalString("WEB_DESIGN_AGENT_MODEL_ID"));
        agent.put("systemPrompt", systemPrompt);
        agent.put("printer", false);
        agent.put("traceAttributes", Map.of("product", "web-design-agent", "role", id));

        Map<String, Object> mcpServers = new LinkedHashMap<>();
        if (toolPolicy.components()) {
            addComponentServer(mcpServers);
        }
        if (toolPolicy.browser()) {
            addBrowserServer(mcpServers);
        }
        if (toolPolicy.conceptImages()) {
            addConceptImageServer(mcpServers);
        }

        Map<String, Object> runtime = new LinkedHashMap<>();
        runtime.put("agent", Map.copyOf(agent));
        if (!mcpServers.isEmpty()) {
            runtime.put("mcpServers", Map.copyOf(mcpServers));
            runtime.put("mcpDefaults", Map.of(
                    "applicationName", "web-design-agent",
                    "applicationVersion", "0.3.0",
                    "continueOnError", true
            ));
        }
        return Map.copyOf(runtime);
    }

    private void addComponentServer(Map<String, Object> mcpServers) {
        String apiKey = optionalString("API_KEY_21ST");
        if (apiKey == null) {
            return;
        }
        String configuredUrl = optionalString("WEB_DESIGN_AGENT_21ST_MCP_URL");
        mcpServers.put("components", Map.of(
                "url", configuredUrl == null ? "https://21st.dev/api/mcp" : configuredUrl,
                "headers", Map.of("x-api-key", apiKey),
                "prefix", "components",
                "continueOnError", true
        ));
    }

    private void addBrowserServer(Map<String, Object> mcpServers) {
        String browserUrl = optionalString("WEB_DESIGN_AGENT_BROWSER_MCP_URL");
        if (browserUrl != null) {
            Map<String, Object> browser = new LinkedHashMap<>();
            browser.put("url", browserUrl);
            String authorization = optionalString("WEB_DESIGN_AGENT_BROWSER_MCP_AUTHORIZATION");
            if (authorization != null) {
                browser.put("headers", Map.of("Authorization", authorization));
            }
            browser.put("continueOnError", false);
            mcpServers.put("browser", Map.copyOf(browser));
            return;
        }

        if (!optionalBoolean("WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT")) {
            return;
        }

        Map<String, Object> browser = new LinkedHashMap<>();
        String command = optionalString("WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_COMMAND");
        browser.put("command", command == null ? "npx" : command);
        browser.put("args", playwrightArguments());
        String browsersPath = optionalString("WEB_DESIGN_AGENT_PLAYWRIGHT_BROWSERS_PATH");
        if (browsersPath == null) {
            browsersPath = optionalString("PLAYWRIGHT_BROWSERS_PATH");
        }
        if (browsersPath != null) {
            browser.put("env", Map.of("PLAYWRIGHT_BROWSERS_PATH", browsersPath));
        }
        browser.put("continueOnError", false);
        mcpServers.put("browser", Map.copyOf(browser));
    }

    private List<String> playwrightArguments() {
        String packageSpec = optionalString("WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_PACKAGE");
        if (packageSpec == null) {
            packageSpec = "@playwright/mcp@0.0.80";
        }
        String executablePath = optionalString("WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH");
        List<String> arguments = new ArrayList<>();
        arguments.add("-y");
        arguments.add(packageSpec);
        arguments.add(executablePath == null ? "--browser=chromium" : "--executable-path=" + executablePath);
        arguments.add("--headless");
        arguments.add("--isolated");
        arguments.add("--block-service-workers");
        return List.copyOf(arguments);
    }

    private void addConceptImageServer(Map<String, Object> mcpServers) {
        if (!optionalBoolean("WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD")) {
            return;
        }
        Map<String, Object> server = new LinkedHashMap<>();
        String configuredUrl = optionalString("WEB_DESIGN_AGENT_HIGGSFIELD_MCP_URL");
        server.put("url", configuredUrl == null ? "https://mcp.higgsfield.ai/mcp" : configuredUrl);
        String authorization = optionalString("WEB_DESIGN_AGENT_HIGGSFIELD_MCP_AUTHORIZATION");
        if (authorization != null) {
            server.put("headers", Map.of("Authorization", authorization));
        }
        server.put("prefix", "assets");
        server.put("continueOnError", false);
        mcpServers.put("higgsfield", Map.copyOf(server));
    }

    private int positiveInt(String name, int fallback) {
        String value = optionalString(name);
        if (value == null) {
            return fallback;
        }
        try {
            int parsed = Integer.parseInt(value);
            if (parsed <= 0) {
                throw new NumberFormatException();
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(name + " must be a positive integer", exception);
        }
    }

    private long nonnegativeLong(String name, long fallback) {
        String value = optionalString(name);
        if (value == null) {
            return fallback;
        }
        try {
            long parsed = Long.parseLong(value);
            if (parsed < 0) {
                throw new NumberFormatException();
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(name + " must be a non-negative integer; use 0 for unlimited", exception);
        }
    }

    private boolean optionalBoolean(String name) {
        String value = optionalString(name);
        return value != null && (
                "true".equalsIgnoreCase(value)
                        || "1".equals(value)
                        || "yes".equalsIgnoreCase(value)
        );
    }

    private String optionalString(String name) {
        String value = environment.get(name);
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String requireCandidateId(String candidateId) {
        if ("A".equals(candidateId) || "B".equals(candidateId) || "C".equals(candidateId)) {
            return candidateId;
        }
        throw new IllegalArgumentException("candidateId must be A, B, or C");
    }

    private record ToolPolicy(boolean components, boolean browser, boolean conceptImages) {
    }

    public record WebDesignAgentCapabilities(
            boolean components,
            boolean browser,
            boolean conceptImages
    ) {
    }

    public record WebDesignInvocationPolicy(
            long timeoutMs,
            int maxTurns,
            int maxOutputTokens,
            int maxTotalTokens
    ) {
    }
}
