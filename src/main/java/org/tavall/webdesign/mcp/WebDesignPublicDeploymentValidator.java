package org.tavall.webdesign.mcp;

import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/** Fails closed before exposing browser-capable NoAuth WDA over public HTTP. */
public final class WebDesignPublicDeploymentValidator {
    public void validate(
            WebDesignAgentRoleConfigurationBuilder.WebDesignAgentCapabilities capabilities,
            Map<String, String> environment
    ) {
        Objects.requireNonNull(capabilities, "capabilities");
        Map<String, String> safeEnvironment = Map.copyOf(Objects.requireNonNull(environment, "environment"));
        if (!capabilities.browser()) {
            return;
        }
        if (!enabled(safeEnvironment.get("WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED"))) {
            throw new IllegalStateException(
                    "Refusing to expose browser capability on the public NoAuth HTTP endpoint without "
                            + "WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED=true. The browser deployment must deny "
                            + "private, loopback, link-local, metadata, and internal control-network egress."
            );
        }
        validatePublicBaseUrl(safeEnvironment.get("WEB_DESIGN_AGENT_PUBLIC_BASE_URL"));
    }

    private static void validatePublicBaseUrl(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) {
            throw new IllegalStateException(
                    "Browser-enabled public Web Design Agent deployment requires WEB_DESIGN_AGENT_PUBLIC_BASE_URL "
                            + "so final candidate artifacts can be inspected through the public WDA origin."
            );
        }
        try {
            URI uri = new URI(normalized);
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                throw new IllegalStateException("WEB_DESIGN_AGENT_PUBLIC_BASE_URL must use HTTPS.");
            }
            if (uri.getHost() == null || uri.getRawUserInfo() != null) {
                throw new IllegalStateException(
                        "WEB_DESIGN_AGENT_PUBLIC_BASE_URL must be a valid HTTPS origin without credentials."
                );
            }
            String path = uri.getRawPath();
            if ((path != null && !path.isEmpty() && !"/".equals(path))
                    || uri.getRawQuery() != null
                    || uri.getRawFragment() != null) {
                throw new IllegalStateException(
                        "WEB_DESIGN_AGENT_PUBLIC_BASE_URL must be an origin without path, query, or fragment data."
                );
            }
        } catch (URISyntaxException exception) {
            throw new IllegalStateException("WEB_DESIGN_AGENT_PUBLIC_BASE_URL must be a valid HTTPS origin.", exception);
        }
    }

    private static boolean enabled(String value) {
        if (value == null) {
            return false;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return "true".equals(normalized) || "1".equals(normalized) || "yes".equals(normalized);
    }
}
