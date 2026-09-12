package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignGenerationResult(
        int version,
        String prompt,
        DesignIntent intent,
        List<DesignCandidate> candidates,
        DesignValidation validation
) {
    public DesignGenerationResult {
        candidates = List.copyOf(candidates);
    }
}
