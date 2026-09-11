package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignConceptSet(
        String prompt,
        List<DesignConcept> concepts,
        List<String> providerEvidence
) {
    public DesignConceptSet {
        concepts = List.copyOf(concepts);
        providerEvidence = providerEvidence == null ? List.of() : List.copyOf(providerEvidence);
    }

    public record DesignConcept(
            DesignCandidateId id,
            String title,
            String thesis,
            String imageUrl
    ) {
    }
}
