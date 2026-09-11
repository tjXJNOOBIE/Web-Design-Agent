package org.tavall.webdesign.mcp;

import io.modelcontextprotocol.server.McpServerFeatures.SyncResourceSpecification;
import io.modelcontextprotocol.spec.McpSchema;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Immutable MCP App resource backed by the Vite single-file browser artifact. */
public final class WebDesignMcpAppResource {
    public static final String RESOURCE_URI = "ui://web-design-agent/abc-review.html";
    public static final String MIME_TYPE = "text/html;profile=mcp-app";

    private final String document;
    private final List<String> resourceDomains;

    public WebDesignMcpAppResource(Path documentPath, List<String> resourceDomains) {
        Path safeDocumentPath = Objects.requireNonNull(documentPath, "documentPath").toAbsolutePath().normalize();
        if (!Files.isRegularFile(safeDocumentPath) || !Files.isReadable(safeDocumentPath)) {
            throw new IllegalArgumentException("MCP App document is not a readable file: " + safeDocumentPath);
        }
        try {
            this.document = Files.readString(safeDocumentPath, StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read MCP App document: " + safeDocumentPath, exception);
        }
        if (document.isBlank()) {
            throw new IllegalArgumentException("MCP App document must not be blank: " + safeDocumentPath);
        }
        this.resourceDomains = List.copyOf(Objects.requireNonNull(resourceDomains, "resourceDomains"));
    }

    public SyncResourceSpecification specification() {
        Map<String, Object> meta = Map.of(
                "ui",
                Map.of("csp", Map.of("resourceDomains", resourceDomains))
        );
        McpSchema.Resource resource = McpSchema.Resource.builder()
                .uri(RESOURCE_URI)
                .name("abc-review-ui")
                .description("Interactive A/B/C review UI for Web Design Agent results")
                .mimeType(MIME_TYPE)
                .meta(meta)
                .build();
        return new SyncResourceSpecification(
                resource,
                (exchange, request) -> new McpSchema.ReadResourceResult(
                        List.of(new McpSchema.TextResourceContents(RESOURCE_URI, MIME_TYPE, document)),
                        null
                )
        );
    }

    public static Map<String, Object> toolMeta() {
        return Map.of("ui", Map.of("resourceUri", RESOURCE_URI));
    }
}
