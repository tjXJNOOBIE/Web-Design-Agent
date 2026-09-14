package org.tavall.webdesign.design.data;

public record DesignRefinementRequest(
        DesignCandidate candidate,
        VisualState visualState,
        String feedback
) {
}
