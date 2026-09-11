package org.tavall.webdesign.design.validation;

import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.agent.evidence.WebDesignAgentToolEvidenceCollector;
import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignCandidateId;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignGenerationResult;
import org.tavall.webdesign.design.data.DesignIntent;
import org.tavall.webdesign.design.data.DesignSourceMode;
import org.tavall.webdesign.design.data.DesignValidation;
import org.tavall.webdesign.design.preview.WebDesignAgentPreviewRuntime;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

public final class WebDesignGenerationEvidenceResolver {
    private final WebDesignAgentRoleConfigurationBuilder.WebDesignAgentCapabilities capabilities;

    public WebDesignGenerationEvidenceResolver(
            WebDesignAgentRoleConfigurationBuilder.WebDesignAgentCapabilities capabilities
    ) {
        this.capabilities = capabilities;
    }

    public DesignGenerationResult resolve(
            DesignGenerationResult result,
            DesignGenerationRequest request,
            WebDesignAgentToolEvidenceCollector evidence
    ) {
        return resolve(result, request, evidence, null);
    }

    public DesignGenerationResult resolve(
            DesignGenerationResult result,
            DesignGenerationRequest request,
            WebDesignAgentToolEvidenceCollector evidence,
            FinalPreviewInspection finalPreviewInspection
    ) {
        List<DesignCandidateId> candidateIds = result.candidates().stream().map(DesignCandidate::id).toList();
        String expectedBrowserTarget = expectedBrowserTarget(request);
        boolean sourceBoundBrowserValidation = expectedBrowserTarget != null;
        List<DesignCandidateId> missingSourceInspection = capabilities.browser()
                ? evidence.missingBrowserInspection(candidateIds, expectedBrowserTarget)
                : candidateIds;
        boolean observedBrowserInspection = capabilities.browser()
                && evidence.missingBrowserInspection(candidateIds, null).isEmpty();
        List<DesignCandidateId> missingFinalPreviewInspection = finalPreviewInspection == null
                ? candidateIds
                : candidateIds.stream()
                .filter(candidateId -> !finalPreviewInspection.evidence().hasBrowserInspection(
                        candidateId,
                        finalPreviewInspection.targets().get(candidateId).url()
                ))
                .toList();
        boolean finalPreviewValidated = finalPreviewInspection != null
                && missingFinalPreviewInspection.isEmpty();
        boolean browserValidated = capabilities.browser()
                && (sourceBoundBrowserValidation
                ? missingSourceInspection.isEmpty()
                : finalPreviewValidated);

        List<DesignCandidate> candidates = result.candidates().stream()
                .map(candidate -> withRuntimeBrowserEvidence(candidate, evidence, finalPreviewInspection))
                .toList();
        List<String> notes = new ArrayList<>();
        result.validation().notes().forEach(note -> notes.add("Agent note (unverified): " + note));

        if (!capabilities.browser()) {
            notes.add("Runtime evidence: browser validation was not executed because no browser MCP capability was configured.");
        } else if (sourceBoundBrowserValidation && browserValidated) {
            notes.add("Runtime evidence: successful browser inspection of the required source target was observed for candidates A, B, and C.");
        } else if (sourceBoundBrowserValidation) {
            notes.add("Runtime evidence: required browser inspection was not observed for candidates " + joinIds(missingSourceInspection) + ".");
        } else if (finalPreviewValidated) {
            notes.add("Runtime evidence: the exact final A/B/C artifacts were render-bound to content-addressed public previews and successfully inspected with browser tooling.");
        } else if (finalPreviewInspection != null) {
            String missing = missingFinalPreviewInspection.size() == 1
                    ? "candidate " + missingFinalPreviewInspection.getFirst()
                    : "candidates " + joinIds(missingFinalPreviewInspection);
            notes.add("Runtime evidence: final render-bound content-addressed preview inspection was not observed for "
                    + missing + "; browserValidated remains false.");
        } else if (observedBrowserInspection) {
            notes.add("Runtime evidence: browser activity was observed for candidates A, B, and C, but the final returned candidate implementations were not render-bound to content-addressed previews; browserValidated remains false.");
        } else {
            notes.add("Runtime evidence: final candidate preview publication is unavailable, so code-first output is not render-bound and browserValidated remains false.");
        }

        if (capabilities.components()) {
            List<DesignCandidateId> missingComponentResearch = evidence.missingComponentResearch(candidateIds);
            if (missingComponentResearch.isEmpty()) {
                notes.add("Runtime evidence: component research was observed for candidates A, B, and C.");
            } else {
                notes.add("Runtime evidence: component research was not observed for candidates " + joinIds(missingComponentResearch) + ".");
            }
        }

        if (requiresBrowser(request) && sourceBoundBrowserValidation && !missingSourceInspection.isEmpty()) {
            throw new DesignResultValidationException(
                    "This design mode requires successful browser inspection of its source for every candidate; missing runtime evidence for "
                            + joinIds(missingSourceInspection) + "."
            );
        }

        DesignIntent originalIntent = result.intent();
        DesignIntent normalizedIntent = new DesignIntent(
                originalIntent.product(),
                originalIntent.audience(),
                originalIntent.primaryGoal(),
                originalIntent.secondaryGoals(),
                originalIntent.contentHierarchy(),
                originalIntent.visualConstraints(),
                originalIntent.interactionRequirements(),
                originalIntent.responsiveRequirements(),
                request.sourceMode()
        );
        return new DesignGenerationResult(
                result.version(),
                request.prompt(),
                normalizedIntent,
                candidates,
                new DesignValidation(true, browserValidated, notes)
        );
    }

    public void validateRequestedPages(DesignGenerationRequest request, List<DesignCandidate> candidates) {
        if (request.pages().isEmpty()) {
            return;
        }
        List<String> required = request.pages().stream()
                .filter(path -> !"/".equals(path))
                .toList();
        for (DesignCandidate candidate : candidates) {
            var actual = candidate.pages().stream().map(DesignCandidate.Page::path).collect(java.util.stream.Collectors.toSet());
            List<String> missing = required.stream().filter(path -> !actual.contains(path)).toList();
            if (!missing.isEmpty()) {
                throw new DesignResultValidationException(
                        "Candidate " + candidate.id() + " is missing requested page routes: " + String.join(", ", missing)
                );
            }
        }
    }

    public boolean requiresBrowser(DesignGenerationRequest request) {
        return request.sourceMode() == DesignSourceMode.REFERENCE_IMAGE
                || request.sourceMode() == DesignSourceMode.EXISTING_SITE
                || request.sourceMode() == DesignSourceMode.CONCEPT_FIRST
                || request.targetUrl() != null;
    }

    private DesignCandidate withRuntimeBrowserEvidence(
            DesignCandidate candidate,
            WebDesignAgentToolEvidenceCollector evidence,
            FinalPreviewInspection finalPreviewInspection
    ) {
        List<String> runtimeEvidence = new ArrayList<>();
        if (capabilities.browser()) {
            runtimeEvidence.addAll(evidence.browserEvidence(candidate.id()));
            if (finalPreviewInspection != null) {
                runtimeEvidence.addAll(finalPreviewInspection.evidence().browserEvidence(candidate.id()));
            }
        }
        List<String> unique = new LinkedHashSet<>(runtimeEvidence).stream().sorted().toList();
        return new DesignCandidate(
                candidate.id(),
                candidate.title(),
                candidate.thesis(),
                candidate.genome(),
                candidate.designSystem(),
                candidate.document(),
                candidate.pages(),
                candidate.visualState(),
                candidate.critique(),
                unique
        );
    }

    private static String expectedBrowserTarget(DesignGenerationRequest request) {
        if (request.targetUrl() != null) {
            return request.targetUrl();
        }
        if (request.sourceMode() == DesignSourceMode.REFERENCE_IMAGE) {
            return request.referenceImageUrl();
        }
        if (request.sourceMode() == DesignSourceMode.CONCEPT_FIRST && request.selectedConcept() != null) {
            return request.selectedConcept().imageUrl();
        }
        return null;
    }

    private static String joinIds(List<DesignCandidateId> ids) {
        return ids.stream().map(Enum::name).collect(java.util.stream.Collectors.joining(", "));
    }

    public record FinalPreviewInspection(
            WebDesignAgentToolEvidenceCollector evidence,
            Map<DesignCandidateId, WebDesignAgentPreviewRuntime.Target> targets
    ) {
        public FinalPreviewInspection {
            targets = Map.copyOf(targets);
        }
    }
}
