package org.tavall.webdesign.agent;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebDesignStrandsConfigurationResolverTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void leavesBridgeRequestDeadlineUnlimitedByDefault() throws IOException {
        Map<String, String> required = required();
        assertThat(new WebDesignStrandsConfigurationResolver(required).resolve().requestTimeout())
                .isEqualTo(Duration.ZERO);
        assertThat(new WebDesignStrandsConfigurationResolver(with(required, "WEB_DESIGN_AGENT_STRANDS_TIMEOUT_MS", "0"))
                .resolve().requestTimeout()).isEqualTo(Duration.ZERO);
    }

    @Test
    void acceptsAnExplicitPositiveBridgeRequestDeadline() throws IOException {
        assertThat(new WebDesignStrandsConfigurationResolver(
                with(required(), "WEB_DESIGN_AGENT_STRANDS_TIMEOUT_MS", "1234")
        ).resolve().requestTimeout()).isEqualTo(Duration.ofMillis(1234));
    }

    @Test
    void rejectsNegativeBridgeRequestDeadlines() throws IOException {
        assertThatThrownBy(() -> new WebDesignStrandsConfigurationResolver(
                with(required(), "WEB_DESIGN_AGENT_STRANDS_TIMEOUT_MS", "-1")
        ).resolve()).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("non-negative");
    }

    private Map<String, String> required() throws IOException {
        String executable = System.getProperty("os.name", "").toLowerCase().contains("win")
                ? "java.exe"
                : "java";
        Path node = Path.of(System.getProperty("java.home"), "bin", executable);
        assertThat(Files.isRegularFile(node)).isTrue();
        assertThat(Files.isExecutable(node)).isTrue();
        Path bridge = Files.createFile(temporaryDirectory.resolve("main.js"));
        return Map.of(
                WebDesignStrandsConfigurationResolver.NODE_EXECUTABLE_ENV, node.toString(),
                WebDesignStrandsConfigurationResolver.BRIDGE_ENTRYPOINT_ENV, bridge.toString()
        );
    }

    private static Map<String, String> with(Map<String, String> required, String name, String value) {
        java.util.LinkedHashMap<String, String> values = new java.util.LinkedHashMap<>(required);
        values.put(name, value);
        return Map.copyOf(values);
    }
}
