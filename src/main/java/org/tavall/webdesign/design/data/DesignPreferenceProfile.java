package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignPreferenceProfile(
        int version,
        DesignGenome acceptedGenome,
        List<DesignGenome> rejectedGenomes,
        VisualState visualState,
        List<String> notes
) {
    public DesignPreferenceProfile {
        rejectedGenomes = List.copyOf(rejectedGenomes);
        notes = List.copyOf(notes);
    }
}
