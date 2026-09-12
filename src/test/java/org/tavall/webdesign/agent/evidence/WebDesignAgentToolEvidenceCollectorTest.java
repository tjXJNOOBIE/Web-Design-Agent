package org.tavall.webdesign.agent.evidence;

import org.junit.jupiter.api.Test;
import org.tavall.ai.agent.strands.StrandsObservedToolEvent;
import org.tavall.webdesign.design.data.DesignCandidateId;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WebDesignAgentToolEvidenceCollectorTest {
    @Test
    void bindsBrowserInspectionToSuccessfulNavigationAndCandidateIdentity() {
        WebDesignAgentToolEvidenceCollector collector = new WebDesignAgentToolEvidenceCollector();
        collector.recordAll(List.of(
                event("web-design-agent-candidate-a", "browser_navigate", Map.of("url", "https://example.com/source#fragment"), "success", null),
                event("web-design-agent-candidate-a", "browser_snapshot", Map.of(), "success", null),
                event("web-design-agent-candidate-a", "components_search", Map.of("query", "hero"), "success", null),
                event("web-design-agent-candidate-b", "browser_navigate", Map.of("url", "https://example.com/source"), "error", "navigation failed"),
                event("web-design-agent-candidate-b", "browser_snapshot", Map.of(), "success", null),
                event("web-design-agent-concept", "assets_generate", Map.of(), "success", null)
        ));

        assertThat(collector.hasBrowserInspection(DesignCandidateId.A, "https://example.com/source")).isTrue();
        assertThat(collector.hasBrowserInspection(DesignCandidateId.B, "https://example.com/source")).isFalse();
        assertThat(collector.browserEvidence(DesignCandidateId.A))
                .containsExactly("browser_snapshot executed successfully for https://example.com/source.");
        assertThat(collector.hasComponentResearch(DesignCandidateId.A)).isTrue();
        assertThat(collector.hasComponentResearch(DesignCandidateId.B)).isFalse();
        assertThat(collector.hasConceptProviderCall()).isTrue();
        assertThat(collector.conceptProviderEvidence())
                .containsExactly("assets_generate executed successfully.");
    }

    @Test
    void failedLaterNavigationClearsPreviouslyBoundTarget() {
        WebDesignAgentToolEvidenceCollector collector = new WebDesignAgentToolEvidenceCollector();
        collector.record(event("web-design-agent-candidate-c", "browser_navigate", Map.of("url", "https://example.com/first"), "success", null));
        collector.record(event("web-design-agent-candidate-c", "browser_navigate", Map.of("url", "https://example.com/second"), "error", "blocked"));
        collector.record(event("web-design-agent-candidate-c", "browser_take_screenshot", Map.of(), "success", null));

        assertThat(collector.hasBrowserInspection(DesignCandidateId.C)).isFalse();
    }

    private static StrandsObservedToolEvent event(
            String agentId,
            String toolName,
            Map<String, Object> input,
            String status,
            String error
    ) {
        return new StrandsObservedToolEvent(agentId, toolName, input, status, error);
    }
}
