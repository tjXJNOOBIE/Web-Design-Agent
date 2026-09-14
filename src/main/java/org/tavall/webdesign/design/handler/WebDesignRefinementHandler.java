package org.tavall.webdesign.design.handler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.tavall.ai.agent.strands.StrandsObservedInvocationResult;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.agent.WebDesignStrandsConfigurationResolver;
import org.tavall.webdesign.agent.WebDesignStrandsGraphRuntime;
import org.tavall.webdesign.agent.evidence.WebDesignAgentToolEvidenceCollector;
import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignRefinementRequest;
import org.tavall.webdesign.design.validation.DesignGenerationResultParser;
import org.tavall.webdesign.design.validation.DesignResultValidationException;
import org.tavall.webdesign.design.validation.WebDesignAgentRequestLimits;
import org.tavall.webdesign.design.validation.WebDesignInvocationResultValidator;

public final class WebDesignRefinementHandler {
    private final WebDesignStrandsConfigurationResolver strandsConfigurationResolver;
    private final WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder;
    private final DesignGenerationResultParser parser;
    private final WebDesignInvocationResultValidator invocationValidator;
    private final ObjectMapper objectMapper;

    public WebDesignRefinementHandler(
            WebDesignStrandsConfigurationResolver strandsConfigurationResolver,
            WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder,
            DesignGenerationResultParser parser,
            WebDesignInvocationResultValidator invocationValidator,
            ObjectMapper objectMapper
    ) {
        this.strandsConfigurationResolver = strandsConfigurationResolver;
        this.roleConfigurationBuilder = roleConfigurationBuilder;
        this.parser = parser;
        this.invocationValidator = invocationValidator;
        this.objectMapper = objectMapper;
    }

    public DesignCandidate refine(DesignRefinementRequest request) {
        if (request == null || request.candidate() == null || request.visualState() == null) {
            throw new DesignResultValidationException("Refinement requires a candidate and visualState.");
        }
        String feedback = request.feedback() == null ? "" : request.feedback().trim();
        if (feedback.length() > WebDesignAgentRequestLimits.FEEDBACK_CHARACTERS) {
            throw new DesignResultValidationException(
                    "Refinement feedback exceeds the " + WebDesignAgentRequestLimits.FEEDBACK_CHARACTERS + "-character limit."
            );
        }
        if (feedback.isEmpty()) {
            feedback = "No extra text feedback; preserve the slider-state preference exactly.";
        }

        try (WebDesignStrandsGraphRuntime graph = new WebDesignStrandsGraphRuntime(
                strandsConfigurationResolver.resolve(),
                roleConfigurationBuilder
        )) {
            graph.start();
            StrandsObservedInvocationResult invocation = graph.invokeDirectorObserved(
                    "OPERATION: refine-selected-candidate\nCandidate: " + json(request.candidate())
                            + "\nVisualState: " + json(request.visualState())
                            + "\nHuman feedback: " + feedback
                            + "\nInvoke only the matching candidate specialist then visual_critic. Return one complete candidate JSON object."
            );
            invocationValidator.assertComplete(invocation);

            DesignCandidate candidate = parser.parseCandidate(invocation.text());
            if (candidate.id() != request.candidate().id()) {
                throw new DesignResultValidationException(
                        "Refinement requested candidate " + request.candidate().id()
                                + " but the agent returned candidate " + candidate.id() + "."
                );
            }

            WebDesignAgentToolEvidenceCollector evidence = new WebDesignAgentToolEvidenceCollector();
            evidence.recordAll(invocation.toolEvents());
            return new DesignCandidate(
                    candidate.id(),
                    candidate.title(),
                    candidate.thesis(),
                    candidate.genome(),
                    candidate.designSystem(),
                    candidate.document(),
                    candidate.pages(),
                    candidate.visualState(),
                    candidate.critique(),
                    roleConfigurationBuilder.capabilities().browser()
                            ? evidence.browserEvidence(candidate.id())
                            : java.util.List.of()
            );
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize refinement input", exception);
        }
    }
}
