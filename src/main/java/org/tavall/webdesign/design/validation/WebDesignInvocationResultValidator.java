package org.tavall.webdesign.design.validation;

import org.tavall.ai.agent.strands.StrandsObservedInvocationResult;

import java.util.Set;

public final class WebDesignInvocationResultValidator {
    private static final Set<String> FAILED_STOP_REASONS = Set.of(
            "cancelled",
            "limitTurns",
            "limitTotalTokens",
            "limitOutputTokens",
            "maxTokens",
            "modelContextWindowExceeded",
            "contentFiltered",
            "guardrailIntervened",
            "refusal"
    );

    public void assertComplete(StrandsObservedInvocationResult invocation) {
        String stopReason = invocation.stopReason();
        if (stopReason != null && FAILED_STOP_REASONS.contains(stopReason)) {
            throw new DesignResultValidationException(
                    "Web Design Agent invocation stopped before a complete result was produced: " + stopReason + "."
            );
        }
    }
}
