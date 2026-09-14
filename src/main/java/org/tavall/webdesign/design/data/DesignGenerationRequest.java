package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignGenerationRequest(
        String prompt,
        DesignSourceMode sourceMode,
        String referenceImageUrl,
        String targetUrl,
        DesignConceptSet.DesignConcept selectedConcept,
        List<String> pages,
        DesignPreferenceProfile preferenceProfile
) {
    public DesignGenerationRequest {
        pages = pages == null ? List.of() : List.copyOf(pages);
    }
}
