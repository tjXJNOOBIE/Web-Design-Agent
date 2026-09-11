package org.tavall.webdesign.mcp;

import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.tavall.webdesign.design.preview.WebDesignAgentPreviewRuntime;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

/** Serves only ephemeral render-bound preview documents owned by the Java preview runtime. */
public final class WebDesignPreviewServlet extends HttpServlet {
    private final WebDesignAgentPreviewRuntime previewRuntime;

    public WebDesignPreviewServlet(WebDesignAgentPreviewRuntime previewRuntime) {
        this.previewRuntime = Objects.requireNonNull(previewRuntime, "previewRuntime");
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String requestUri = request.getRequestURI();
        String contextPath = request.getContextPath();
        String path = contextPath == null || contextPath.isEmpty()
                ? requestUri
                : requestUri.substring(contextPath.length());
        WebDesignAgentPreviewRuntime.Response preview = previewRuntime.read(path);
        if (preview == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        byte[] body = preview.html().getBytes(StandardCharsets.UTF_8);
        response.setStatus(HttpServletResponse.SC_OK);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("text/html");
        response.setHeader("Content-Security-Policy", preview.contentSecurityPolicy());
        response.setHeader("Cache-Control", "no-store, max-age=0");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setContentLength(body.length);
        response.getOutputStream().write(body);
    }
}
