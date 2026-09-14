package org.tavall.webdesign.cli;

import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignSourceMode;
import org.tavall.webdesign.design.validation.WebDesignAgentRequestLimits;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Resolves CLI arguments into the same validated generation request consumed by Java handlers. */
public final class WebDesignCliRequestResolver {
    public DesignGenerationRequest resolve(List<String> arguments, String stdinFallback) {
        List<String> safeArguments = List.copyOf(Objects.requireNonNull(arguments, "arguments"));
        int referenceIndex = safeArguments.indexOf("--reference");
        if (referenceIndex >= 0) {
            if (referenceIndex + 1 >= safeArguments.size()) {
                throw referenceError();
            }
            String referenceImageUrl = safeArguments.get(referenceIndex + 1);
            if (referenceImageUrl == null
                    || referenceImageUrl.isBlank()
                    || referenceImageUrl.startsWith("--")) {
                throw referenceError();
            }
            List<String> promptParts = new ArrayList<>();
            for (int index = 0; index < safeArguments.size(); index++) {
                if (index != referenceIndex && index != referenceIndex + 1) {
                    promptParts.add(safeArguments.get(index));
                }
            }
            return request(
                    String.join(" ", promptParts),
                    DesignSourceMode.REFERENCE_IMAGE,
                    referenceImageUrl.trim()
            );
        }

        if (safeArguments.contains("--concept-first")) {
            throw new WebDesignCliInputException(
                    "Concept-first is interactive. Use the MCP surface and create-design-concepts."
            );
        }

        String prompt = String.join(" ", safeArguments).trim();
        if (prompt.isEmpty() && stdinFallback != null) {
            prompt = stdinFallback.trim();
        }
        return request(prompt, null, null);
    }

    private DesignGenerationRequest request(
            String prompt,
            DesignSourceMode sourceMode,
            String referenceImageUrl
    ) {
        String normalizedPrompt = prompt == null ? "" : prompt.trim();
        if (normalizedPrompt.isEmpty()) {
            throw new WebDesignCliInputException();
        }
        if (normalizedPrompt.length() > WebDesignAgentRequestLimits.PROMPT_CHARACTERS) {
            throw new WebDesignCliInputException(
                    "Web Design Agent requests are limited to "
                            + WebDesignAgentRequestLimits.PROMPT_CHARACTERS
                            + " characters."
            );
        }
        return new DesignGenerationRequest(
                normalizedPrompt,
                sourceMode,
                referenceImageUrl,
                null,
                null,
                List.of(),
                null
        );
    }

    private static WebDesignCliInputException referenceError() {
        return new WebDesignCliInputException("--reference requires an HTTP(S) reference image URL.");
    }
}
