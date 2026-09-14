package org.tavall.webdesign.design.preview;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignCandidateId;
import org.tavall.webdesign.design.data.DesignExport;
import org.tavall.webdesign.design.export.DesignExportBuilder;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class WebDesignAgentPreviewRuntime implements AutoCloseable {
    public static final String CONTENT_SECURITY_POLICY = String.join("; ",
            "sandbox allow-scripts",
            "default-src 'none'",
            "script-src 'unsafe-inline'",
            "style-src 'unsafe-inline'",
            "img-src data: blob:",
            "font-src data:",
            "media-src data: blob:",
            "connect-src 'none'",
            "object-src 'none'",
            "frame-src 'none'",
            "worker-src 'none'",
            "base-uri 'none'",
            "form-action 'none'"
    );

    private final int maximumActivePublications;
    private final int maximumPublicationBytes;
    private final DesignExportBuilder exportBuilder;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom;
    private final Map<String, PreviewDocumentEntry> documents = new LinkedHashMap<>();
    private final Map<String, List<String>> publicationPaths = new LinkedHashMap<>();

    public WebDesignAgentPreviewRuntime() {
        this(4);
    }

    public WebDesignAgentPreviewRuntime(int maximumActivePublications) {
        this(maximumActivePublications, 2_000_000, new DesignExportBuilder(), new ObjectMapper(), new SecureRandom());
    }

    WebDesignAgentPreviewRuntime(
            int maximumActivePublications,
            int maximumPublicationBytes,
            DesignExportBuilder exportBuilder,
            ObjectMapper objectMapper,
            SecureRandom secureRandom
    ) {
        if (maximumActivePublications <= 0 || maximumPublicationBytes <= 0) {
            throw new IllegalArgumentException("Preview publication limits must be positive");
        }
        this.maximumActivePublications = maximumActivePublications;
        this.maximumPublicationBytes = maximumPublicationBytes;
        this.exportBuilder = exportBuilder;
        this.objectMapper = objectMapper;
        this.secureRandom = secureRandom;
    }

    public synchronized Publication publish(List<DesignCandidate> candidates, String publicBaseUrl) {
        if (publicationPaths.size() >= maximumActivePublications) {
            throw new IllegalStateException("Web Design Agent preview publication capacity is exhausted.");
        }
        URI baseUri = normalizeBaseUrl(publicBaseUrl);
        String publicationId = publicationId();
        Map<DesignCandidateId, Target> targets = new EnumMap<>(DesignCandidateId.class);
        List<PendingDocument> pending = new ArrayList<>();
        int publicationBytes = 0;

        for (DesignCandidate candidate : candidates) {
            DesignExport exported = exportBuilder.build(candidate, candidate.visualState());
            String fingerprint = fingerprint(exported);
            String path = "/preview/" + publicationId + "/"
                    + candidate.id().name().toLowerCase() + "/" + fingerprint + "/";
            publicationBytes += exported.standaloneHtml().getBytes(StandardCharsets.UTF_8).length;
            pending.add(new PendingDocument(path, exported.standaloneHtml()));
            targets.put(candidate.id(), new Target(
                    candidate.id(),
                    fingerprint,
                    baseUri.resolve(path).toASCIIString()
            ));
        }

        if (publicationBytes > maximumPublicationBytes) {
            throw new IllegalStateException(
                    "Web Design Agent final preview exceeds " + maximumPublicationBytes + " bytes."
            );
        }

        List<String> paths = pending.stream().map(PendingDocument::path).toList();
        pending.forEach(document -> documents.put(
                document.path(),
                new PreviewDocumentEntry(publicationId, document.html())
        ));
        publicationPaths.put(publicationId, paths);
        return new Publication(Map.copyOf(targets), () -> release(publicationId));
    }

    public synchronized Response read(String path) {
        PreviewDocumentEntry entry = documents.get(path);
        return entry == null ? null : new Response(entry.html(), CONTENT_SECURITY_POLICY);
    }

    @Override
    public synchronized void close() {
        documents.clear();
        publicationPaths.clear();
    }

    private synchronized void release(String publicationId) {
        List<String> paths = publicationPaths.get(publicationId);
        if (paths == null) {
            return;
        }
        for (String path : paths) {
            PreviewDocumentEntry entry = documents.get(path);
            if (entry != null && entry.publicationId().equals(publicationId)) {
                documents.remove(path);
            }
        }
        publicationPaths.remove(publicationId);
    }

    private URI normalizeBaseUrl(String value) {
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
                throw new IllegalArgumentException("Web Design Agent public base URL must use HTTP(S).");
            }
            if (uri.getRawUserInfo() != null) {
                throw new IllegalArgumentException("Web Design Agent public base URL must not contain credentials.");
            }
            if (uri.getRawQuery() != null || uri.getRawFragment() != null) {
                throw new IllegalArgumentException("Web Design Agent public base URL must not contain query or fragment data.");
            }
            String path = uri.getRawPath();
            if (path != null && !path.isEmpty() && !path.equals("/")) {
                throw new IllegalArgumentException("Web Design Agent public base URL must be an origin without a path prefix.");
            }
            if (uri.getHost() == null) {
                throw new IllegalArgumentException("Web Design Agent public base URL requires a host.");
            }
            return new URI(
                    scheme.toLowerCase(),
                    null,
                    uri.getHost(),
                    uri.getPort(),
                    "/",
                    null,
                    null
            );
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("Web Design Agent public base URL must be a valid URI.", exception);
        }
    }

    private String publicationId() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String fingerprint(DesignExport exported) {
        List<Map<String, String>> pages = exported.pages().stream()
                .sorted(Comparator.comparing(DesignExport.PageExport::path))
                .map(page -> {
                    Map<String, String> value = new LinkedHashMap<>();
                    value.put("path", page.path());
                    value.put("title", page.title());
                    value.put("standaloneHtml", page.standaloneHtml());
                    return Map.copyOf(value);
                })
                .toList();
        Map<String, Object> artifact = new LinkedHashMap<>();
        artifact.put("home", exported.standaloneHtml());
        artifact.put("pages", pages);
        try {
            byte[] serialized = objectMapper.writeValueAsBytes(artifact);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(serialized));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Failed to fingerprint Web Design Agent preview artifact", exception);
        }
    }

    public record Target(
            DesignCandidateId candidateId,
            String fingerprint,
            String url
    ) {
    }

    public record Response(String html, String contentSecurityPolicy) {
    }

    public static final class Publication implements AutoCloseable {
        private final Map<DesignCandidateId, Target> targets;
        private final Runnable release;
        private boolean closed;

        private Publication(Map<DesignCandidateId, Target> targets, Runnable release) {
            this.targets = targets;
            this.release = release;
        }

        public Map<DesignCandidateId, Target> targets() {
            return targets;
        }

        @Override
        public synchronized void close() {
            if (closed) {
                return;
            }
            closed = true;
            release.run();
        }
    }

    private record PreviewDocumentEntry(String publicationId, String html) {
    }

    private record PendingDocument(String path, String html) {
    }
}
