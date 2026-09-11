package org.tavall.webdesign.design.data;

import java.util.List;

public record DesignSystem(
        List<Token> tokens,
        List<Typography> typography,
        List<String> components,
        List<String> principles
) {
    public DesignSystem {
        tokens = List.copyOf(tokens);
        typography = List.copyOf(typography);
        components = List.copyOf(components);
        principles = List.copyOf(principles);
    }

    public record Token(String name, String value) {
    }

    public record Typography(String role, String family, String weight) {
    }
}
