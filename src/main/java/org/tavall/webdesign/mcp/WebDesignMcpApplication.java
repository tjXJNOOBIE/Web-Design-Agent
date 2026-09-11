package org.tavall.webdesign.mcp;

import java.util.Map;
import java.util.concurrent.CountDownLatch;

/** Java-first Web Design Agent MCP application entrypoint. */
public final class WebDesignMcpApplication {
    private WebDesignMcpApplication() {
    }

    public static void main(String[] args) {
        CountDownLatch shutdown = new CountDownLatch(1);
        try (WebDesignMcpRuntime runtime = new WebDesignMcpRuntimeBuilder(Map.copyOf(System.getenv())).build()) {
            System.out.println("Web Design Agent Java MCP listening on " + runtime.localEndpointUri());
            Runtime.getRuntime().addShutdownHook(new Thread(shutdown::countDown, "web-design-agent-shutdown"));
            shutdown.await();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Web Design Agent Java MCP runtime interrupted.", exception);
        }
    }
}
