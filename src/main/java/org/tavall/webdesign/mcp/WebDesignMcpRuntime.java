package org.tavall.webdesign.mcp;

import org.tavall.ai.mcp.server.AIFunctionMcpStandaloneHttpServer;
import org.tavall.webdesign.design.preview.WebDesignAgentPreviewRuntime;

import java.net.URI;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

/** Product runtime lifecycle for the Java MCP server and optional final-preview store. */
public final class WebDesignMcpRuntime implements AutoCloseable {
    private final AIFunctionMcpStandaloneHttpServer server;
    private final WebDesignAgentPreviewRuntime previewRuntime;
    private final AtomicBoolean closed = new AtomicBoolean();

    WebDesignMcpRuntime(
            AIFunctionMcpStandaloneHttpServer server,
            WebDesignAgentPreviewRuntime previewRuntime
    ) {
        this.server = Objects.requireNonNull(server, "server");
        this.previewRuntime = previewRuntime;
    }

    public URI localEndpointUri() {
        return server.localEndpointUri();
    }

    @Override
    public void close() {
        if (!closed.compareAndSet(false, true)) {
            return;
        }
        RuntimeException failure = null;
        try {
            server.close();
        } catch (RuntimeException exception) {
            failure = exception;
        }
        if (previewRuntime != null) {
            try {
                previewRuntime.close();
            } catch (RuntimeException exception) {
                if (failure == null) {
                    failure = exception;
                } else {
                    failure.addSuppressed(exception);
                }
            }
        }
        if (failure != null) {
            throw failure;
        }
    }
}
