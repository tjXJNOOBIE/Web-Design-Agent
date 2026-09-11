package org.tavall.webdesign.design.handler;

import org.tavall.ai.agent.strands.StrandsObservedInvocationResult;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.agent.WebDesignStrandsConfigurationResolver;
import org.tavall.webdesign.agent.WebDesignStrandsGraphRuntime;
import org.tavall.webdesign.agent.evidence.WebDesignAgentToolEvidenceCollector;
import org.tavall.webdesign.design.data.DesignConceptSet;
import org.tavall.webdesign.design.validation.DesignGenerationResultParser;
import org.tavall.webdesign.design.validation.DesignResultValidationException;
import org.tavall.webdesign.design.validation.WebDesignAgentRequestLimits;
import org.tavall.webdesign.design.validation.WebDesignInvocationResultValidator;

public final class WebDesignConceptGenerationHandler {
    private final WebDesignStrandsConfigurationResolver strandsConfigurationResolver;
    private final WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder;
    private final DesignGenerationResultParser parser;
    private final WebDesignInvocationResultValidator invocationValidator;

    public WebDesignConceptGenerationHandler(
            WebDesignStrandsConfigurationResolver strandsConfigurationResolver,
            WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder,
            DesignGenerationResultParser parser,
            WebDesignInvocationResultValidator invocationValidator
    ) {
        this.strandsConfigurationResolver = strandsConfigurationResolver;
        this.roleConfigurationBuilder = roleConfigurationBuilder;
        this.parser = parser;
        this.invocationValidator = invocationValidator;
    }

    public DesignConceptSet createConcepts(String prompt) {
        String normalized = prompt == null ? "" : prompt.trim();
        if (normalized.isEmpty()) {
            throw new DesignResultValidationException("Concept prompt must be non-blank.");
        }
        if (normalized.length() > WebDesignAgentRequestLimits.PROMPT_CHARACTERS) {
            throw new DesignResultValidationException(
                    "Concept prompt exceeds the " + WebDesignAgentRequestLimits.PROMPT_CHARACTERS + "-character limit."
            );
        }
        if (!roleConfigurationBuilder.capabilities().conceptImages()) {
            throw new DesignResultValidationException("Concept-first image generation is not configured.");
        }

        try (WebDesignStrandsGraphRuntime graph = new WebDesignStrandsGraphRuntime(
                strandsConfigurationResolver.resolve(),
                roleConfigurationBuilder
        )) {
            graph.start();
            StrandsObservedInvocationResult invocation = graph.invokeDirectorObserved(
                    "OPERATION: concept-first\nPrompt: " + normalized
                            + "\nInvoke concept_artist, use its real image-provider results, and return exactly three real A/B/C concept results as JSON."
            );
            invocationValidator.assertComplete(invocation);

            WebDesignAgentToolEvidenceCollector evidence = new WebDesignAgentToolEvidenceCollector();
            evidence.recordAll(invocation.toolEvents());
            if (!evidence.hasConceptProviderCall()) {
                throw new DesignResultValidationException(
                        "Concept-first generation returned no successful runtime evidence from the configured image provider."
                );
            }

            DesignConceptSet parsed = parser.parseConceptSet(invocation.text(), normalized);
            return new DesignConceptSet(
                    parsed.prompt(),
                    parsed.concepts(),
                    evidence.conceptProviderEvidence()
            );
        }
    }
}
