package org.tavall.webdesign.mcp;

import org.tavall.ai.mcp.server.AIFunctionMcpStandaloneStdioServer;
import org.tavall.webdesign.application.WebDesignApplicationServices;
import org.tavall.webdesign.application.WebDesignApplicationServicesBuilder;

import java.util.Map;

/** Local/private stdio projection of the same canonical Java WDA MCP surface. */
public final class WebDesignMcpStdioApplication {
    private WebDesignMcpStdioApplication() {
    }

    public static void main(String[] args) {
        Map<String, String> environment = System.getenv();
        WebDesignApplicationServices services = new WebDesignApplicationServicesBuilder(environment).build();
        WebDesignMcpSurface surface = new WebDesignMcpSurfaceBuilder(services, environment).build();
        AIFunctionMcpStandaloneStdioServer.Configuration configuration =
                new AIFunctionMcpStandaloneStdioServer.Configuration(
                        "web-design-agent",
                        "0.2.0",
                        "Generate, compare, refine, inspect, and export real A/B/C web designs."
                );

        try (AIFunctionMcpStandaloneStdioServer server = AIFunctionMcpStandaloneStdioServer.start(
                surface.catalog(),
                configuration,
                surface.resources(),
                surface.prompts(),
                surface.presentations()
        )) {
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    server.close();
                } catch (RuntimeException ignored) {
                    // Preserve normal process shutdown.
                }
            }, "web-design-agent-mcp-stdio-shutdown"));
            server.awaitTermination();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Web Design Agent stdio MCP server was interrupted.", exception);
        }
    }
}
