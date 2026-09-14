package org.tavall.webdesign.mcp;

import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Small public discovery document retained from the previous Node HTTP endpoint. */
public final class WebDesignStatusServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!"/".equals(request.getRequestURI())
                && !"/healthz".equals(request.getRequestURI())
                && !"/readyz".equals(request.getRequestURI())) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        response.setStatus(HttpServletResponse.SC_OK);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/json");
        response.setHeader("Cache-Control", "no-store");
        response.getWriter().write(
                "{\"status\":\"ok\",\"name\":\"Web Design Agent\",\"version\":\"0.3.0\",\"mcp\":\"/mcp\",\"authentication\":\"none\"}"
        );
    }
}
