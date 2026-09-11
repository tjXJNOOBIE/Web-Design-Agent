package org.tavall.webdesign.design.data;

public record VisualState(
        double density,
        double spacingScale,
        double radius,
        double fontScale,
        double heroScale,
        double contrast,
        double depth,
        double motion
) {
    public static final VisualState DEFAULT = new VisualState(0.5, 1.0, 12.0, 1.0, 1.0, 1.0, 0.5, 0.3);
}
