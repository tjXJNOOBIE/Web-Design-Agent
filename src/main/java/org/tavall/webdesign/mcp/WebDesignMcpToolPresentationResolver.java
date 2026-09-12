package org.tavall.webdesign.mcp;

import org.tavall.ai.mcp.server.AIFunctionMcpToolPublisher;

import java.util.LinkedHashMap;
import java.util.Map;

/** Resolves the transport-only presentation layer shared by WDA HTTP and stdio MCP. */
public final class WebDesignMcpToolPresentationResolver {
    private static final String TEXT_DATA_POINTER = "/data";

    public Map<String, AIFunctionMcpToolPublisher.ToolPresentation> resolve() {
        Map<String, Object> uiMeta = WebDesignMcpAppResource.toolMeta();
        Map<String, AIFunctionMcpToolPublisher.ToolPresentation> presentations = new LinkedHashMap<>();
        presentations.put("design", presentation("Design website A/B/C", uiMeta));
        presentations.put("refine-design", presentation("Refine selected design", uiMeta));
        presentations.put("create-design-concepts", presentation("Explore visual concepts", uiMeta));
        presentations.put("design-from-concept", presentation("Build A/B/C from concept", uiMeta));
        presentations.put("export-design", presentation("Export selected design", uiMeta));
        presentations.put("extract-design-system", dataProjection());
        presentations.put("build-design-preference-profile", dataProjection());
        presentations.put("web-design-capabilities", dataProjection());
        return Map.copyOf(presentations);
    }

    private static AIFunctionMcpToolPublisher.ToolPresentation presentation(
            String title,
            Map<String, Object> meta
    ) {
        return new AIFunctionMcpToolPublisher.ToolPresentation(title, meta, TEXT_DATA_POINTER);
    }

    private static AIFunctionMcpToolPublisher.ToolPresentation dataProjection() {
        return new AIFunctionMcpToolPublisher.ToolPresentation("", Map.of(), TEXT_DATA_POINTER);
    }
}
