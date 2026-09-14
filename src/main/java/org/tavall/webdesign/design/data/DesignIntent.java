package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignIntent(
        String product,
        List<String> audience,
        String primaryGoal,
        List<String> secondaryGoals,
        List<String> contentHierarchy,
        List<String> visualConstraints,
        List<String> interactionRequirements,
        List<String> responsiveRequirements,
        DesignSourceMode sourceMode
) {
    public DesignIntent {
        audience = List.copyOf(audience);
        secondaryGoals = List.copyOf(secondaryGoals);
        contentHierarchy = List.copyOf(contentHierarchy);
        visualConstraints = List.copyOf(visualConstraints);
        interactionRequirements = List.copyOf(interactionRequirements);
        responsiveRequirements = List.copyOf(responsiveRequirements);
    }
}
