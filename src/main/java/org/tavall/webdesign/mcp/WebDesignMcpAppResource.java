package org.tavall.webdesign.mcp;

import io.modelcontextprotocol.server.McpServerFeatures.SyncResourceSpecification;
import io.modelcontextprotocol.spec.McpSchema;

import java.io.IOException;
import java.io.InputStream;
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
    public static final String CLASSPATH_RESOURCE = "/web-design-agent/mcp-app.html";

    private final String document;
    private final List<String> resourceDomains;

    public WebDesignMcpAppResource(Path documentPath, List<String> resourceDomains) {
        this(readPath(documentPath), resourceDomains);
    }

    public WebDesignMcpAppResource(String document, List<String> resourceDomains) {
        this.document = requireDocument(document);
        this.resourceDomains = List.copyOf(Objects.requireNonNull(resourceDomains, "resourceDomains"));
    }

    public static WebDesignMcpAppResource fromClasspath(List<String> resourceDomains) {
        try (InputStream input = WebDesignMcpAppResource.class.getResourceAsStream(CLASSPATH_RESOURCE)) {
            if (input == null) {
                throw new IllegalStateException("Packaged MCP App resource is missing: " + CLASSPATH_RESOURCE);
            }
            return new WebDesignMcpAppResource(
                    new String(input.readAllBytes(), StandardCharsets.UTF_8),
                    resourceDomains
            );
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read packaged MCP App resource.", exception);
        }
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
                .build();
        return new SyncResourceSpecification(
                resource,
                (exchange, request) -> new McpSchema.ReadResourceResult(
                        List.of(new McpSchema.TextResourceContents(RESOURCE_URI, MIME_TYPE, document, meta)),
                        null
                )
        );
    }

    public static Map<String, Object> toolMeta() {
        return Map.of("ui", Map.of("resourceUri", RESOURCE_URI));
    }

    private static String readPath(Path documentPath) {
        Path safeDocumentPath = Objects.requireNonNull(documentPath, "documentPath").toAbsolutePath().normalize();
        if (!Files.isRegularFile(safeDocumentPath) || !Files.isReadable(safeDocumentPath)) {
            throw new IllegalArgumentException("MCP App document is not a readable file: " + safeDocumentPath);
        }
        try {
            return Files.readString(safeDocumentPath, StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read MCP App document: " + safeDocumentPath, exception);
        }
    }

    private static String requireDocument(String value) {
        String safeValue = Objects.requireNonNull(value, "document");
        if (safeValue.isBlank()) {
            throw new IllegalArgumentException("MCP App document must not be blank.");
        }
        return safeValue;
    }
}
