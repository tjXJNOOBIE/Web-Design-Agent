package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignValidation(
        boolean designDistancePassed,
        boolean browserValidated,
        List<String> notes
) {
    public DesignValidation {
        notes = List.copyOf(notes);
    }
}
