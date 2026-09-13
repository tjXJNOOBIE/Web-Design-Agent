package org.tavall.webdesign.agent;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebDesignStrandsConfigurationResolverTest {
    private static final Map<String, String> REQUIRED = Map.of(
            WebDesignStrandsConfigurationResolver.NODE_EXECUTABLE_ENV, "/usr/local/bin/node",
            WebDesignStrandsConfigurationResolver.BRIDGE_ENTRYPOINT_ENV, "/srv/workspace/strands-bridge/dist/mcp/main.js"
    );

    @Test
    void leavesBridgeRequestDeadlineUnlimitedByDefault() {
        assertThat(new WebDesignStrandsConfigurationResolver(REQUIRED).resolve().requestTimeout())
                .isEqualTo(Duration.ZERO);
        assertThat(new WebDesignStrandsConfigurationResolver(with("WEB_DESIGN_AGENT_STRANDS_TIMEOUT_MS", "0"))
                .resolve().requestTimeout()).isEqualTo(Duration.ZERO);
    }

    @Test
    void acceptsAnExplicitPositiveBridgeRequestDeadline() {
        assertThat(new WebDesignStrandsConfigurationResolver(
                with("WEB_DESIGN_AGENT_STRANDS_TIMEOUT_MS", "1234")
        ).resolve().requestTimeout()).isEqualTo(Duration.ofMillis(1234));
    }

    @Test
    void rejectsNegativeBridgeRequestDeadlines() {
        assertThatThrownBy(() -> new WebDesignStrandsConfigurationResolver(
                with("WEB_DESIGN_AGENT_STRANDS_TIMEOUT_MS", "-1")
        ).resolve()).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("non-negative");
    }

    private static Map<String, String> with(String name, String value) {
        java.util.LinkedHashMap<String, String> values = new java.util.LinkedHashMap<>(REQUIRED);
        values.put(name, value);
        return Map.copyOf(values);
    }
}
