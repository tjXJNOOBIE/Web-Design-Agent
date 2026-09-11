package org.tavall.webdesign.design.data;

public enum DesignSourceMode {
    CODE_FIRST("code-first"),
    CONCEPT_FIRST("concept-first"),
    REFERENCE_IMAGE("reference-image"),
    EXISTING_SITE("existing-site");

    private final String wireValue;

    DesignSourceMode(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static DesignSourceMode fromWireValue(String value) {
        for (DesignSourceMode mode : values()) {
            if (mode.wireValue.equals(value)) {
                return mode;
            }
        }
        throw new IllegalArgumentException("Unsupported design source mode: " + value);
    }
}
