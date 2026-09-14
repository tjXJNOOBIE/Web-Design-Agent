package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignCandidate(
        DesignCandidateId id,
        String title,
        String thesis,
        DesignGenome genome,
        DesignSystem designSystem,
        Document document,
        List<Page> pages,
        VisualState visualState,
        List<String> critique,
        List<String> browserEvidence
) {
    public DesignCandidate {
        pages = List.copyOf(pages);
        critique = List.copyOf(critique);
        browserEvidence = List.copyOf(browserEvidence);
    }

    public record Document(String html, String css, String javascript) {
    }

    public record Page(String path, String title, String html, String javascript) {
    }
}
