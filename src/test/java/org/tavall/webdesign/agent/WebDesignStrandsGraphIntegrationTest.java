package org.tavall.webdesign.agent;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.tavall.ai.agent.strands.StrandsAgentProviderConfiguration;

import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Physical Java -> standalone bridge -> native Strands agent-as-tool composition. */
class WebDesignStrandsGraphIntegrationTest {
    private static final String NODE_ENV = "STRANDS_BRIDGE_INTEGRATION_NODE";
    private static final String ENTRYPOINT_ENV = "STRANDS_BRIDGE_INTEGRATION_ENTRYPOINT";
    private static final String REQUIRED_PROPERTY = "strands.bridge.integration.required";

    @Test
    void javaOwnedSpecialistTopologyBuildsAsNativeStrandsAgentTools() {
        String nodeExecutable = System.getenv(NODE_ENV);
        String bridgeEntrypoint = System.getenv(ENTRYPOINT_ENV);
        boolean required = Boolean.getBoolean(REQUIRED_PROPERTY);
        if (!required) {
            Assumptions.assumeTrue(
                    hasText(nodeExecutable) && hasText(bridgeEntrypoint),
                    "Standalone Strands bridge integration paths are not configured."
            );
        }

        assertThat(nodeExecutable).isNotBlank();
        assertThat(bridgeEntrypoint).isNotBlank();

        Map<String, String> bridgeEnvironment = new LinkedHashMap<>();
        copyEnvironment("HOME", bridgeEnvironment);
        copyEnvironment("PATH", bridgeEnvironment);
        copyEnvironment("TMPDIR", bridgeEnvironment);

        StrandsAgentProviderConfiguration bridgeConfiguration = StrandsAgentProviderConfiguration.node(
                Path.of(nodeExecutable),
                Path.of(bridgeEntrypoint),
                bridgeEnvironment,
                Duration.ofSeconds(30),
                ""
        );
        WebDesignAgentRoleConfigurationBuilder roleConfiguration =
                new WebDesignAgentRoleConfigurationBuilder(Map.of());

        try (WebDesignStrandsGraphRuntime graph = new WebDesignStrandsGraphRuntime(
                bridgeConfiguration,
                roleConfiguration
        )) {
            graph.start();
            assertThat(graph.activeAgentIds()).containsExactly(
                    WebDesignStrandsGraphRuntime.CANDIDATE_A_ID,
                    WebDesignStrandsGraphRuntime.CANDIDATE_B_ID,
                    WebDesignStrandsGraphRuntime.CANDIDATE_C_ID,
                    WebDesignStrandsGraphRuntime.CRITIC_ID,
                    WebDesignStrandsGraphRuntime.DIRECTOR_ID
            );
        }
    }

    @Test
    void roleCapabilitiesRemainScopedBeforeBridgeComposition() {
        WebDesignAgentRoleConfigurationBuilder configuration =
                new WebDesignAgentRoleConfigurationBuilder(Map.of(
                        "API_KEY_21ST", "component-key",
                        "WEB_DESIGN_AGENT_BROWSER_MCP_URL", "https://browser.example/mcp",
                        "WEB_DESIGN_AGENT_BROWSER_MCP_AUTHORIZATION", "Bearer browser-token",
                        "WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD", "true",
                        "WEB_DESIGN_AGENT_HIGGSFIELD_MCP_AUTHORIZATION", "Bearer image-token"
                ));

        assertThat(configuration.candidate("A")).containsKey("mcpServers");
        assertThat(configuration.critic()).doesNotContainKey("mcpServers");
        assertThat(configuration.director()).doesNotContainKey("mcpServers");
        assertThat(configuration.conceptArtist()).containsKey("mcpServers");
        assertThat(configuration.capabilities().components()).isTrue();
        assertThat(configuration.capabilities().browser()).isTrue();
        assertThat(configuration.capabilities().conceptImages()).isTrue();
    }

    private static void copyEnvironment(String name, Map<String, String> target) {
        String value = System.getenv(name);
        if (hasText(value)) {
            target.put(name, value);
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
