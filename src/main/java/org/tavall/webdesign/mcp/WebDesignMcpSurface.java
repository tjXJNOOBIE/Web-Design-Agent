package org.tavall.webdesign.mcp;

import io.modelcontextprotocol.server.McpServerFeatures.SyncPromptSpecification;
import io.modelcontextprotocol.server.McpServerFeatures.SyncResourceSpecification;
import org.tavall.ai.core.catalog.AIFunctionCatalog;
import org.tavall.ai.mcp.server.AIFunctionMcpToolPublisher;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Transport-neutral MCP projection of the Java-owned WDA application graph. */
public record WebDesignMcpSurface(
        AIFunctionCatalog catalog,
        List<SyncResourceSpecification> resources,
        List<SyncPromptSpecification> prompts,
        Map<String, AIFunctionMcpToolPublisher.ToolPresentation> presentations
) {
    public WebDesignMcpSurface {
        catalog = Objects.requireNonNull(catalog, "catalog");
        resources = List.copyOf(Objects.requireNonNull(resources, "resources"));
        prompts = List.copyOf(Objects.requireNonNull(prompts, "prompts"));
        presentations = Map.copyOf(Objects.requireNonNull(presentations, "presentations"));
    }
}
