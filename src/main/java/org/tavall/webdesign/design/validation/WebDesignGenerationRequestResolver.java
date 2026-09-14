package org.tavall.webdesign.design.validation;

import org.tavall.webdesign.design.data.DesignConceptSet;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignSourceMode;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class WebDesignGenerationRequestResolver {
    private final WebDesignAgentBrowserTargetValidator browserTargetValidator;

    public WebDesignGenerationRequestResolver(WebDesignAgentBrowserTargetValidator browserTargetValidator) {
        this.browserTargetValidator = browserTargetValidator;
    }

    public DesignGenerationRequest resolve(DesignGenerationRequest request) {
        if (request == null) {
            throw new DesignResultValidationException("Design request is required.");
        }

        String prompt = request.prompt() == null ? "" : request.prompt().trim();
        if (prompt.isEmpty()) {
            throw new DesignResultValidationException("Design prompt must be non-blank.");
        }
        if (prompt.length() > WebDesignAgentRequestLimits.PROMPT_CHARACTERS) {
            throw new DesignResultValidationException(
                    "Design prompt exceeds the " + WebDesignAgentRequestLimits.PROMPT_CHARACTERS + "-character limit."
            );
        }

        DesignSourceMode sourceMode = request.sourceMode() == null
                ? DesignSourceMode.CODE_FIRST
                : request.sourceMode();
        if (sourceMode == DesignSourceMode.REFERENCE_IMAGE && blank(request.referenceImageUrl())) {
            throw new DesignResultValidationException("reference-image mode requires referenceImageUrl.");
        }
        if (sourceMode == DesignSourceMode.EXISTING_SITE && blank(request.targetUrl())) {
            throw new DesignResultValidationException("existing-site mode requires targetUrl.");
        }
        if (sourceMode == DesignSourceMode.CONCEPT_FIRST && request.selectedConcept() == null) {
            throw new DesignResultValidationException("concept-first mode requires a selectedConcept.");
        }

        String referenceImageUrl = request.referenceImageUrl() == null
                ? null
                : browserTargetValidator.validate(request.referenceImageUrl(), "referenceImageUrl");
        String targetUrl = request.targetUrl() == null
                ? null
                : browserTargetValidator.validate(request.targetUrl(), "targetUrl");
        DesignConceptSet.DesignConcept selectedConcept = request.selectedConcept();
        if (selectedConcept != null) {
            selectedConcept = new DesignConceptSet.DesignConcept(
                    selectedConcept.id(),
                    selectedConcept.title(),
                    selectedConcept.thesis(),
                    browserTargetValidator.validate(selectedConcept.imageUrl(), "selectedConcept.imageUrl")
            );
        }

        List<String> pages = normalizePages(request.pages());
        return new DesignGenerationRequest(
                prompt,
                sourceMode,
                referenceImageUrl,
                targetUrl,
                selectedConcept,
                pages,
                request.preferenceProfile()
        );
    }

    private static List<String> normalizePages(List<String> pages) {
        if (pages == null || pages.isEmpty()) {
            return List.of();
        }
        if (pages.size() > WebDesignAgentRequestLimits.PAGE_COUNT) {
            throw new DesignResultValidationException(
                    "Requested pages exceed the " + WebDesignAgentRequestLimits.PAGE_COUNT + "-page limit."
            );
        }

        List<String> normalized = new ArrayList<>(pages.size());
        Set<String> seen = new HashSet<>();
        for (int index = 0; index < pages.size(); index++) {
            String value = pages.get(index);
            String path = value == null ? "" : value.trim();
            if (path.isEmpty()) {
                throw new DesignResultValidationException("Requested page path[" + index + "] must be non-blank.");
            }
            if (path.length() > WebDesignAgentRequestLimits.PAGE_PATH_CHARACTERS) {
                throw new DesignResultValidationException(
                        "Requested page path exceeds the " + WebDesignAgentRequestLimits.PAGE_PATH_CHARACTERS + "-character limit."
                );
            }
            if (!path.startsWith("/")) {
                throw new DesignResultValidationException("Requested page paths must begin with /.");
            }
            if (!seen.add(path)) {
                throw new DesignResultValidationException("Duplicate requested page path: " + path);
            }
            normalized.add(path);
        }
        return List.copyOf(normalized);
    }

    private static boolean blank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
