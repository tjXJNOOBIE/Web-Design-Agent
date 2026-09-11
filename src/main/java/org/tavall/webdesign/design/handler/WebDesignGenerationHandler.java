package org.tavall.webdesign.design.handler;

import org.tavall.ai.agent.strands.StrandsObservedInvocationResult;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.agent.WebDesignGenerationPromptBuilder;
import org.tavall.webdesign.agent.WebDesignStrandsConfigurationResolver;
import org.tavall.webdesign.agent.WebDesignStrandsGraphRuntime;
import org.tavall.webdesign.agent.evidence.WebDesignAgentToolEvidenceCollector;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignGenerationResult;
import org.tavall.webdesign.design.validation.DesignDistanceEvaluator;
import org.tavall.webdesign.design.validation.DesignGenerationResultParser;
import org.tavall.webdesign.design.validation.DesignResultValidationException;
import org.tavall.webdesign.design.validation.WebDesignGenerationEvidenceResolver;
import org.tavall.webdesign.design.validation.WebDesignGenerationRequestResolver;

import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

public final class WebDesignGenerationHandler {
    private static final Set<String> FAILED_INVOCATION_STOP_REASONS = Set.of(
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

    private final WebDesignStrandsConfigurationResolver strandsConfigurationResolver;
    private final WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder;
    private final WebDesignGenerationRequestResolver requestResolver;
    private final WebDesignGenerationPromptBuilder promptBuilder;
    private final DesignGenerationResultParser parser;
    private final DesignDistanceEvaluator distanceEvaluator;
    private final WebDesignGenerationEvidenceResolver evidenceResolver;

    public WebDesignGenerationHandler(
            WebDesignStrandsConfigurationResolver strandsConfigurationResolver,
            WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder,
            WebDesignGenerationRequestResolver requestResolver,
            WebDesignGenerationPromptBuilder promptBuilder,
            DesignGenerationResultParser parser,
            DesignDistanceEvaluator distanceEvaluator,
            WebDesignGenerationEvidenceResolver evidenceResolver
    ) {
        this.strandsConfigurationResolver = strandsConfigurationResolver;
        this.roleConfigurationBuilder = roleConfigurationBuilder;
        this.requestResolver = requestResolver;
        this.promptBuilder = promptBuilder;
        this.parser = parser;
        this.distanceEvaluator = distanceEvaluator;
        this.evidenceResolver = evidenceResolver;
    }

    public DesignGenerationResult generate(DesignGenerationRequest request) {
        DesignGenerationRequest normalized = requestResolver.resolve(request);
        if (evidenceResolver.requiresBrowser(normalized) && !roleConfigurationBuilder.capabilities().browser()) {
            throw new DesignResultValidationException(
                    "This design mode requires configured browser MCP capability so evidence is not fabricated."
            );
        }

        WebDesignStrandsGraphRuntime graph = new WebDesignStrandsGraphRuntime(
                strandsConfigurationResolver.resolve(),
                roleConfigurationBuilder
        );
        RuntimeException operationFailure = null;
        try {
            graph.start();
            ParsedInvocation invocation = invokeGeneration(graph, normalized, "");
            DesignGenerationResult result = invocation.result();
            DesignDistanceEvaluator.Result distance = distanceEvaluator.evaluate(result.candidates());

            if (!distance.passed()) {
                String failures = distance.pairs().stream()
                        .filter(pair -> !pair.passed())
                        .map(pair -> pair.left() + "/" + pair.right() + "="
                                + String.format(Locale.ROOT, "%.3f", pair.distance()))
                        .collect(Collectors.joining(", "));
                invocation = invokeGeneration(
                        graph,
                        normalized,
                        "DETERMINISTIC DIVERSITY FAILURE: " + failures
                                + ". Regenerate complete A/B/C with greater structural distance."
                );
                result = invocation.result();
                distance = distanceEvaluator.evaluate(result.candidates());
                if (!distance.passed()) {
                    throw new DesignResultValidationException(
                            "A/B/C candidates remained too similar after the allowed regeneration pass."
                    );
                }
            }

            evidenceResolver.validateRequestedPages(normalized, result.candidates());
            return evidenceResolver.resolve(result, normalized, invocation.evidence());
        } catch (RuntimeException exception) {
            operationFailure = exception;
            throw exception;
        } finally {
            try {
                graph.close();
            } catch (RuntimeException closeFailure) {
                if (operationFailure != null) {
                    operationFailure.addSuppressed(closeFailure);
                } else {
                    throw closeFailure;
                }
            }
        }
    }

    private ParsedInvocation invokeGeneration(
            WebDesignStrandsGraphRuntime graph,
            DesignGenerationRequest request,
            String suffix
    ) {
        StrandsObservedInvocationResult invocation = graph.invokeDirectorObserved(promptBuilder.build(request, suffix));
        String stopReason = invocation.stopReason();
        if (stopReason != null && FAILED_INVOCATION_STOP_REASONS.contains(stopReason)) {
            throw new DesignResultValidationException(
                    "Web Design Agent invocation stopped before a complete result was produced: " + stopReason + "."
            );
        }

        WebDesignAgentToolEvidenceCollector evidence = new WebDesignAgentToolEvidenceCollector();
        evidence.recordAll(invocation.toolEvents());
        return new ParsedInvocation(parser.parseGeneration(invocation.text()), evidence);
    }

    private record ParsedInvocation(
            DesignGenerationResult result,
            WebDesignAgentToolEvidenceCollector evidence
    ) {
    }
}
