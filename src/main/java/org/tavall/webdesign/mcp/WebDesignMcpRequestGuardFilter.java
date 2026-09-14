package org.tavall.webdesign.mcp;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

/** Anonymous public MCP request guard preserving the previous Node transport limits. */
public final class WebDesignMcpRequestGuardFilter implements Filter {
    private final int maximumConcurrentRequests;
    private final int maximumRequestBodyBytes;
    private final AtomicInteger activeRequests = new AtomicInteger();

    public WebDesignMcpRequestGuardFilter(int maximumConcurrentRequests, int maximumRequestBodyBytes) {
        if (maximumConcurrentRequests <= 0 || maximumRequestBodyBytes <= 0) {
            throw new IllegalArgumentException("Public MCP request limits must be positive");
        }
        this.maximumConcurrentRequests = maximumConcurrentRequests;
        this.maximumRequestBodyBytes = maximumRequestBodyBytes;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (!(request instanceof HttpServletRequest httpRequest)
                || !(response instanceof HttpServletResponse httpResponse)) {
            chain.doFilter(request, response);
            return;
        }
        applyCors(httpResponse);
        if ("OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
            httpResponse.setStatus(HttpServletResponse.SC_NO_CONTENT);
            return;
        }
        if (!"POST".equalsIgnoreCase(httpRequest.getMethod())) {
            httpResponse.setHeader("Allow", "POST, OPTIONS");
            writeJsonRpcError(httpResponse, HttpServletResponse.SC_METHOD_NOT_ALLOWED, -32600, "Method not allowed.");
            return;
        }
        if (!identityEncoding(httpRequest.getHeader("Content-Encoding"))) {
            writeJsonRpcError(
                    httpResponse,
                    HttpServletResponse.SC_UNSUPPORTED_MEDIA_TYPE,
                    -32000,
                    "Compressed MCP request bodies are not supported."
            );
            return;
        }
        long declaredLength = httpRequest.getContentLengthLong();
        if (declaredLength > maximumRequestBodyBytes) {
            writeBodyTooLarge(httpResponse);
            return;
        }

        int active = activeRequests.incrementAndGet();
        if (active > maximumConcurrentRequests) {
            activeRequests.decrementAndGet();
            httpResponse.setHeader("Retry-After", "5");
            writeJsonRpcError(
                    httpResponse,
                    429,
                    -32001,
                    "Web Design Agent is at its anonymous request concurrency limit."
            );
            return;
        }

        try {
            chain.doFilter(new BoundedRequest(httpRequest, maximumRequestBodyBytes), response);
        } catch (RequestBodyTooLargeException exception) {
            if (!httpResponse.isCommitted()) {
                httpResponse.resetBuffer();
                applyCors(httpResponse);
                writeBodyTooLarge(httpResponse);
            } else {
                throw exception;
            }
        } finally {
            activeRequests.decrementAndGet();
        }
    }

    private void writeBodyTooLarge(HttpServletResponse response) throws IOException {
        writeJsonRpcError(
                response,
                HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                -32002,
                "MCP request body exceeds " + maximumRequestBodyBytes + " bytes."
        );
    }

    private static boolean identityEncoding(String value) {
        return value == null || value.isBlank() || "identity".equals(value.trim().toLowerCase(Locale.ROOT));
    }

    private static void applyCors(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader(
                "Access-Control-Allow-Headers",
                "accept,content-type,mcp-method,mcp-name,mcp-protocol-version,mcp-session-id"
        );
        response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        response.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
    }

    private static void writeJsonRpcError(
            HttpServletResponse response,
            int statusCode,
            int rpcCode,
            String message
    ) throws IOException {
        response.setStatus(statusCode);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"jsonrpc\":\"2.0\",\"error\":{\"code\":" + rpcCode
                        + ",\"message\":\"" + escapeJson(message) + "\"},\"id\":null}"
        );
    }

    private static String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static final class BoundedRequest extends HttpServletRequestWrapper {
        private final int maximumBytes;
        private ServletInputStream boundedInputStream;

        private BoundedRequest(HttpServletRequest request, int maximumBytes) {
            super(request);
            this.maximumBytes = maximumBytes;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            if (boundedInputStream == null) {
                boundedInputStream = new BoundedServletInputStream(super.getInputStream(), maximumBytes);
            }
            return boundedInputStream;
        }

        @Override
        public BufferedReader getReader() throws IOException {
            String encoding = getCharacterEncoding();
            java.nio.charset.Charset charset = encoding == null
                    ? StandardCharsets.UTF_8
                    : java.nio.charset.Charset.forName(encoding);
            return new BufferedReader(new InputStreamReader(getInputStream(), charset));
        }
    }

    private static final class BoundedServletInputStream extends ServletInputStream {
        private final ServletInputStream delegate;
        private final int maximumBytes;
        private int bytesRead;

        private BoundedServletInputStream(ServletInputStream delegate, int maximumBytes) {
            this.delegate = delegate;
            this.maximumBytes = maximumBytes;
        }

        @Override
        public boolean isFinished() {
            return delegate.isFinished();
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            delegate.setReadListener(readListener);
        }

        @Override
        public int read() throws IOException {
            int value = delegate.read();
            if (value >= 0) {
                account(1);
            }
            return value;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            int count = delegate.read(buffer, offset, length);
            if (count > 0) {
                account(count);
            }
            return count;
        }

        private void account(int count) throws RequestBodyTooLargeException {
            bytesRead += count;
            if (bytesRead > maximumBytes) {
                throw new RequestBodyTooLargeException();
            }
        }
    }

    private static final class RequestBodyTooLargeException extends IOException {
        private RequestBodyTooLargeException() {
            super("MCP request body exceeded configured limit");
        }
    }
}
