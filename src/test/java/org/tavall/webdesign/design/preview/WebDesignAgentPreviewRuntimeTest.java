package org.tavall.webdesign.design.preview;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignCandidateId;
import org.tavall.webdesign.design.data.DesignGenome;
import org.tavall.webdesign.design.data.DesignSystem;
import org.tavall.webdesign.design.data.VisualState;
import org.tavall.webdesign.design.export.DesignExportBuilder;

import java.security.SecureRandom;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebDesignAgentPreviewRuntimeTest {
    @Test
    void publishesFingerprintBoundPreviewAndReleasesItOnClose() {
        WebDesignAgentPreviewRuntime runtime = new WebDesignAgentPreviewRuntime();
        WebDesignAgentPreviewRuntime.Publication publication = runtime.publish(
                List.of(candidate(DesignCandidateId.A, "alpha")),
                "https://design.example/"
        );
        WebDesignAgentPreviewRuntime.Target target = publication.targets().get(DesignCandidateId.A);

        assertThat(target.url()).startsWith("https://design.example/preview/");
        assertThat(target.url()).contains(target.fingerprint());
        String path = java.net.URI.create(target.url()).getPath();
        WebDesignAgentPreviewRuntime.Response response = runtime.read(path);
        assertThat(response).isNotNull();
        assertThat(response.html()).contains("alpha");
        assertThat(response.contentSecurityPolicy())
                .contains("sandbox allow-scripts")
                .contains("connect-src 'none'")
                .contains("form-action 'none'");

        publication.close();
        assertThat(runtime.read(path)).isNull();
    }

    @Test
    void changingFinalArtifactChangesFingerprint() {
        WebDesignAgentPreviewRuntime runtime = new WebDesignAgentPreviewRuntime();
        String first;
        String second;
        try (var publication = runtime.publish(List.of(candidate(DesignCandidateId.A, "alpha")), "https://design.example/")) {
            first = publication.targets().get(DesignCandidateId.A).fingerprint();
        }
        try (var publication = runtime.publish(List.of(candidate(DesignCandidateId.A, "beta")), "https://design.example/")) {
            second = publication.targets().get(DesignCandidateId.A).fingerprint();
        }
        assertThat(second).isNotEqualTo(first);
    }

    @Test
    void enforcesActivePublicationCapacity() {
        WebDesignAgentPreviewRuntime runtime = new WebDesignAgentPreviewRuntime(
                1,
                2_000_000,
                new DesignExportBuilder(),
                new ObjectMapper(),
                new SecureRandom()
        );
        try (var first = runtime.publish(List.of(candidate(DesignCandidateId.A, "alpha")), "https://design.example/")) {
            assertThatThrownBy(() -> runtime.publish(
                    List.of(candidate(DesignCandidateId.B, "beta")),
                    "https://design.example/"
            ))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("capacity");
        }
    }

    private static DesignCandidate candidate(DesignCandidateId id, String content) {
        return new DesignCandidate(
                id,
                "Candidate " + id,
                "thesis",
                new DesignGenome(
                        "stack", "top", "statement", "sans", 0.5,
                        "square", "flat", 0.5, "restrained", "steady", "product"
                ),
                new DesignSystem(
                        List.of(new DesignSystem.Token("space", "8px")),
                        List.of(new DesignSystem.Typography("body", "Inter", "400")),
                        List.of("button"),
                        List.of("clear hierarchy")
                ),
                new DesignCandidate.Document("<main>" + content + "</main>", "main{}", ""),
                List.of(new DesignCandidate.Page("/about", "About", "<main>about " + content + "</main>", "")),
                VisualState.DEFAULT,
                List.of(),
                List.of("model evidence must not survive")
        );
    }
}
