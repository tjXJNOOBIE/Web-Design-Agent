package org.tavall.webdesign.agent.evidence;

import org.tavall.ai.agent.strands.StrandsObservedToolEvent;
import org.tavall.webdesign.design.data.DesignCandidateId;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class WebDesignAgentToolEvidenceCollector {
    private static final Map<String, DesignCandidateId> CANDIDATE_AGENT_IDS = Map.of(
            "web-design-agent-candidate-a", DesignCandidateId.A,
            "web-design-agent-candidate-b", DesignCandidateId.B,
            "web-design-agent-candidate-c", DesignCandidateId.C
    );
    private static final String CONCEPT_AGENT_ID = "web-design-agent-concept";
    private static final Set<String> BROWSER_INSPECTION_TOOLS = Set.of(
            "browser_snapshot",
            "browser_take_screenshot"
    );

    private final Map<DesignCandidateId, Set<String>> successfulCandidateTools =
            new EnumMap<>(DesignCandidateId.class);
    private final Map<DesignCandidateId, CandidateBrowserState> browserState =
            new EnumMap<>(DesignCandidateId.class);
    private final Set<String> successfulConceptTools = new HashSet<>();

    public void recordAll(List<StrandsObservedToolEvent> events) {
        events.forEach(this::record);
    }

    public void record(StrandsObservedToolEvent event) {
        DesignCandidateId candidateId = CANDIDATE_AGENT_IDS.get(event.agentId());
        if (candidateId != null) {
            recordCandidateTool(candidateId, event);
            return;
        }
        if (CONCEPT_AGENT_ID.equals(event.agentId())
                && event.toolName().startsWith("assets_")
                && event.succeeded()) {
            successfulConceptTools.add(event.toolName());
        }
    }

    public List<String> browserEvidence(DesignCandidateId candidateId) {
        CandidateBrowserState state = browserState.get(candidateId);
        if (state == null) {
            return List.of();
        }
        List<String> evidence = new ArrayList<>();
        state.inspections.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> entry.getValue().stream().sorted().forEach(tool ->
                        evidence.add(tool + " executed successfully for " + displayTarget(entry.getKey()) + ".")
                ));
        return List.copyOf(evidence);
    }

    public boolean hasBrowserInspection(DesignCandidateId candidateId) {
        return hasBrowserInspection(candidateId, null);
    }

    public boolean hasBrowserInspection(DesignCandidateId candidateId, String expectedTarget) {
        CandidateBrowserState state = browserState.get(candidateId);
        if (state == null || state.inspections.isEmpty()) {
            return false;
        }
        if (expectedTarget == null) {
            return true;
        }
        String normalized = normalizeBrowserTarget(expectedTarget);
        return normalized != null
                && state.inspections.containsKey(normalized)
                && !state.inspections.get(normalized).isEmpty();
    }

    public boolean hasComponentResearch(DesignCandidateId candidateId) {
        return successfulCandidateTools.getOrDefault(candidateId, Set.of()).stream()
                .anyMatch(tool -> tool.startsWith("components_"));
    }

    public List<DesignCandidateId> missingBrowserInspection(
            List<DesignCandidateId> candidateIds,
            String expectedTarget
    ) {
        return candidateIds.stream()
                .filter(candidateId -> !hasBrowserInspection(candidateId, expectedTarget))
                .toList();
    }

    public List<DesignCandidateId> missingComponentResearch(List<DesignCandidateId> candidateIds) {
        return candidateIds.stream()
                .filter(candidateId -> !hasComponentResearch(candidateId))
                .toList();
    }

    public boolean hasConceptProviderCall() {
        return !successfulConceptTools.isEmpty();
    }

    public List<String> conceptProviderEvidence() {
        return successfulConceptTools.stream()
                .sorted()
                .map(tool -> tool + " executed successfully.")
                .toList();
    }

    private void recordCandidateTool(DesignCandidateId candidateId, StrandsObservedToolEvent event) {
        String toolName = event.toolName();
        if ("browser_navigate".equals(toolName)) {
            CandidateBrowserState state = browserState.computeIfAbsent(candidateId, ignored -> new CandidateBrowserState());
            if (!event.succeeded()) {
                state.currentTarget = null;
                return;
            }
            Object url = event.input().get("url");
            state.currentTarget = url instanceof String text ? normalizeBrowserTarget(text) : null;
            return;
        }

        if (toolName.startsWith("browser_")) {
            if (!event.succeeded() || !BROWSER_INSPECTION_TOOLS.contains(toolName)) {
                return;
            }
            CandidateBrowserState state = browserState.computeIfAbsent(candidateId, ignored -> new CandidateBrowserState());
            if (state.currentTarget == null) {
                return;
            }
            state.inspections.computeIfAbsent(state.currentTarget, ignored -> new HashSet<>()).add(toolName);
            return;
        }

        if (toolName.startsWith("components_") && event.succeeded()) {
            successfulCandidateTools.computeIfAbsent(candidateId, ignored -> new HashSet<>()).add(toolName);
        }
    }

    private static String normalizeBrowserTarget(String value) {
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
                return null;
            }
            return new URI(
                    scheme.toLowerCase(),
                    uri.getRawUserInfo(),
                    uri.getHost(),
                    uri.getPort(),
                    uri.getRawPath(),
                    uri.getRawQuery(),
                    null
            ).toASCIIString();
        } catch (URISyntaxException exception) {
            return null;
        }
    }

    private static String displayTarget(String value) {
        try {
            URI uri = new URI(value);
            StringBuilder target = new StringBuilder()
                    .append(uri.getScheme())
                    .append("://")
                    .append(uri.getHost());
            if (uri.getPort() >= 0) {
                target.append(':').append(uri.getPort());
            }
            target.append(uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath());
            return target.toString();
        } catch (URISyntaxException exception) {
            return "[invalid target]";
        }
    }

    private static final class CandidateBrowserState {
        private String currentTarget;
        private final Map<String, Set<String>> inspections = new HashMap<>();
    }
}
