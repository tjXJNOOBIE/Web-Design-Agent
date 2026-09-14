package org.tavall.webdesign.design.validation;

public final class WebDesignAgentRequestLimits {
    public static final int PROMPT_CHARACTERS = 12_000;
    public static final int FEEDBACK_CHARACTERS = 6_000;
    public static final int URL_CHARACTERS = 2_048;
    public static final int PAGE_COUNT = 12;
    public static final int PAGE_PATH_CHARACTERS = 256;

    private WebDesignAgentRequestLimits() {
    }
}
