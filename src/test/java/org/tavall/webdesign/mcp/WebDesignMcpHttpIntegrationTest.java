package org.tavall.webdesign.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.client.McpClient;
import io.modelcontextprotocol.client.McpSyncClient;
import io.modelcontextprotocol.client.transport.HttpClientStreamableHttpTransport;
import io.modelcontextprotocol.spec.McpSchema;
import org.junit.jupiter.api.Test;
import org.tavall.ai.core.catalog.AIFunctionCatalog;
import org.tavall.ai.mcp.server.AIFunctionMcpStandaloneHttpServer;
import org.tavall.ai.mcp.server.AIFunctionMcpToolPublisher;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

class WebDesignMcpHttpIntegrationTest {
    private static final String DATA_POINTER = "/data";

    @Test
    void officialJavaClientCanUsePublicWdaOverStreamableHttp() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        AIFunctionCatalog catalog = new AIFunctionCatalog(objectMapper);
        catalog.registerInstances(WebDesignMcpFunctionsTest.functions(objectMapper));

        WebDesignMcpAppResource appResource = new WebDesignMcpAppResource(
                "<!doctype html><html><body><main id=\"app\"></main></body></html>",
                List.of()
        );
        Map<String, Object> uiMeta = WebDesignMcpAppResource.toolMeta();
        Map<String, AIFunctionMcpToolPublisher.ToolPresentation> presentations = Map.of(
                "design", presentation("Design website A/B/C", uiMeta),
                "refine-design", presentation("Refine selected design", uiMeta),
                "create-design-concepts", presentation("Explore visual concepts", uiMeta),
                "design-from-concept", presentation("Build A/B/C from concept", uiMeta),
                "export-design", presentation("Export selected design", uiMeta),
                "extract-design-system", dataProjection(),
                "build-design-preference-profile", dataProjection(),
                "web-design-capabilities", dataProjection()
        );
        AIFunctionMcpStandaloneHttpServer.Configuration configuration =
                new AIFunctionMcpStandaloneHttpServer.Configuration(
                        "127.0.0.1",
                        0,
                        "",
                        "/mcp",
                        "web-design-agent",
                        "0.2.0",
                        "WDA Streamable HTTP integration test"
                );

        try (AIFunctionMcpStandaloneHttpServer server = AIFunctionMcpStandaloneHttpServer.start(
                catalog,
                configuration,
                List.of(appResource.specification()),
                List.of(),
                presentations
        )) {
            HttpClientStreamableHttpTransport transport = HttpClientStreamableHttpTransport
                    .builder("http://127.0.0.1:" + server.port())
                    .endpoint(server.endpointPath())
                    .build();
            try (McpSyncClient client = McpClient.sync(transport)
                    .requestTimeout(Duration.ofSeconds(10))
                    .initializationTimeout(Duration.ofSeconds(10))
                    .clientInfo(new McpSchema.Implementation("WDA Java HTTP integration test", "1.0.0"))
                    .build()) {
                McpSchema.InitializeResult initialized = client.initialize();
                assertThat(initialized.serverInfo().name()).isEqualTo("web-design-agent");

                McpSchema.ListToolsResult tools = client.listTools();
                assertThat(tools.tools()).extracting(McpSchema.Tool::name).containsExactlyInAnyOrder(
                        "design",
                        "refine-design",
                        "create-design-concepts",
                        "design-from-concept",
                        "export-design",
                        "extract-design-system",
                        "build-design-preference-profile",
                        "web-design-capabilities"
                );
                McpSchema.Tool designTool = tools.tools().stream()
                        .filter(tool -> "design".equals(tool.name()))
                        .findFirst()
                        .orElseThrow();
                assertThat(designTool.meta()).isEqualTo(uiMeta);
                JsonNode designSchema = objectMapper.valueToTree(designTool.inputSchema());
                assertThat(StreamSupport.stream(
                        designSchema.path("properties").path("sourceMode").path("enum").spliterator(),
                        false
                ).map(JsonNode::asText).toList())
                        .containsExactly("code-first", "existing-site", "reference-image");

                McpSchema.ReadResourceResult app = client.readResource(
                        new McpSchema.ReadResourceRequest(WebDesignMcpAppResource.RESOURCE_URI)
                );
                assertThat(app.contents()).hasSize(1);
                assertThat(app.contents().getFirst()).isInstanceOf(McpSchema.TextResourceContents.class);
                McpSchema.TextResourceContents appContents = (McpSchema.TextResourceContents) app.contents().getFirst();
                assertThat(appContents.mimeType()).isEqualTo(WebDesignMcpAppResource.MIME_TYPE);
                assertThat(appContents.text()).contains("<main id=\"app\"></main>");

                McpSchema.CallToolResult capabilities = client.callTool(
                        new McpSchema.CallToolRequest("web-design-capabilities", Map.of())
                );
                assertThat(capabilities.isError()).isNotEqualTo(Boolean.TRUE);
                assertThat(capabilities.structuredContent()).isInstanceOf(Map.class);
                Map<?, ?> structured = (Map<?, ?>) capabilities.structuredContent();
                assertThat(structured.get("kind")).isEqualTo("capabilities");
                assertThat(structured.get("data")).isInstanceOf(Map.class);
                assertThat(capabilities.content().getFirst()).isInstanceOf(McpSchema.TextContent.class);
                McpSchema.TextContent text = (McpSchema.TextContent) capabilities.content().getFirst();
                assertThat(objectMapper.readTree(text.text()))
                        .isEqualTo(objectMapper.valueToTree(structured.get("data")));
            } catch (java.io.IOException exception) {
                throw new IllegalStateException("Failed to parse MCP smoke-test text content", exception);
            }
        }
    }

    private static AIFunctionMcpToolPublisher.ToolPresentation presentation(
            String title,
            Map<String, Object> meta
    ) {
        return new AIFunctionMcpToolPublisher.ToolPresentation(title, meta, DATA_POINTER);
    }

    private static AIFunctionMcpToolPublisher.ToolPresentation dataProjection() {
        return new AIFunctionMcpToolPublisher.ToolPresentation("", Map.of(), DATA_POINTER);
    }
}
