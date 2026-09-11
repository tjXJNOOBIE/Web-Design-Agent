package org.tavall.webdesign.design.handler;

import org.tavall.ai.agent.strands.StrandsObservedInvocationResult;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.agent.WebDesignGenerationPromptBuilder;
import org.tavall.webdesign.agent.WebDesignStrandsConfigurationResolver;
import org.tavall.webdesign.agent.WebDesignStrandsGraphRuntime;
import org.tavall.webdesign.agent.evidence.WebDesignAgentToolEvidenceCollector;
import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignCandidateId;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignGenerationResult;
import org.tavall.webdesign.design.data.DesignSourceMode;
import org.tavall.webdesign.design.preview.WebDesignAgentPreviewRuntime;
import org.tavall.webdesign.design.validation.DesignDistanceEvaluator;
import org.tavall.webdesign.design.validation.DesignGenerationResultParser;
import org.tavall.webdesign.design.validation.DesignResultValidationException;
import org.tavall.webdesign.design.validation.WebDesignGenerationEvidenceResolver;
import org.tavall.webdesign.design.validation.WebDesignGenerationRequestResolver;
import org.tavall.webdesign.design.validation.WebDesignInvocationResultValidator;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

public final class WebDesignGenerationHandler {
    private final WebDesignStrandsConfigurationResolver strandsConfigurationResolver;
    private final WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder;
    private final WebDesignGenerationRequestResolver requestResolver;
    private final WebDesignGenerationPromptBuilder promptBuilder;
    private final DesignGenerationResultParser parser;
    private final DesignDistanceEvaluator distanceEvaluator;
    private final WebDesignGenerationEvidenceResolver evidenceResolver;
    private final WebDesignInvocationResultValidator invocationValidator;
    private final WebDesignAgentPreviewRuntime previewRuntime;
    private final String previewBaseUrl;

    public WebDesignGenerationHandler(
            WebDesignStrandsConfigurationResolver strandsConfigurationResolver,
            WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder,
            WebDesignGenerationRequestResolver requestResolver,
            WebDesignGenerationPromptBuilder promptBuilder,
            DesignGenerationResultParser parser,
            DesignDistanceEvaluator distanceEvaluator,
            WebDesignGenerationEvidenceResolver evidenceResolver,
            WebDesignInvocationResultValidator invocationValidator
    ) {
        this(
                strandsConfigurationResolver,
                roleConfigurationBuilder,
                requestResolver,
                promptBuilder,
                parser,
                distanceEvaluator,
                evidenceResolver,
                invocationValidator,
                null,
                null
        );
    }

    public WebDesignGenerationHandler(
            WebDesignStrandsConfigurationResolver strandsConfigurationResolver,
            WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder,
            WebDesignGenerationRequestResolver requestResolver,
            WebDesignGenerationPromptBuilder promptBuilder,
            DesignGenerationResultParser parser,
            DesignDistanceEvaluator distanceEvaluator,
            WebDesignGenerationEvidenceResolver evidenceResolver,
            WebDesignInvocationResultValidator invocationValidator,
            WebDesignAgentPreviewRuntime previewRuntime,
            String previewBaseUrl
    ) {
        this.strandsConfigurationResolver = strandsConfigurationResolver;
        this.roleConfigurationBuilder = roleConfigurationBuilder;
        this.requestResolver = requestResolver;
        this.promptBuilder = promptBuilder;
        this.parser = parser;
        this.distanceEvaluator = distanceEvaluator;
        this.evidenceResolver = evidenceResolver;
        this.invocationValidator = invocationValidator;
        this.previewRuntime = previewRuntime;
        this.previewBaseUrl = previewBaseUrl == null || previewBaseUrl.isBlank() ? null : previewBaseUrl.trim();
    }

    public DesignGenerationResult generate(DesignGenerationRequest request) {
        DesignGenerationRequest normalized = requestResolver.resolve(request);
        if (evidenceResolver.requiresBrowser(normalized) && !roleConfigurationBuilder.capabilities().browser()) {
            throw new DesignResultValidationException(
                    "This design mode requires configured browser MCP capability so evidence is not fabricated."
            );
        }

        try (WebDesignStrandsGraphRuntime graph = new WebDesignStrandsGraphRuntime(
                strandsConfigurationResolver.resolve(),
                roleConfigurationBuilder
        )) {
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
            WebDesignGenerationEvidenceResolver.FinalPreviewInspection finalPreviewInspection =
                    inspectFinalCodeFirstCandidates(graph, result.candidates(), normalized);
            return evidenceResolver.resolve(
                    result,
                    normalized,
                    invocation.evidence(),
                    finalPreviewInspection
            );
        }
    }

    private ParsedInvocation invokeGeneration(
            WebDesignStrandsGraphRuntime graph,
            DesignGenerationRequest request,
            String suffix
    ) {
        StrandsObservedInvocationResult invocation = graph.invokeDirectorObserved(promptBuilder.build(request, suffix));
        invocationValidator.assertComplete(invocation);

        WebDesignAgentToolEvidenceCollector evidence = new WebDesignAgentToolEvidenceCollector();
        evidence.recordAll(invocation.toolEvents());
        return new ParsedInvocation(parser.parseGeneration(invocation.text()), evidence);
    }

    private WebDesignGenerationEvidenceResolver.FinalPreviewInspection inspectFinalCodeFirstCandidates(
            WebDesignStrandsGraphRuntime graph,
            List<DesignCandidate> candidates,
            DesignGenerationRequest request
    ) {
        if (request.sourceMode() != DesignSourceMode.CODE_FIRST
                || request.targetUrl() != null
                || !roleConfigurationBuilder.capabilities().browser()
                || previewRuntime == null
                || previewBaseUrl == null) {
            return null;
        }

        try (WebDesignAgentPreviewRuntime.Publication publication = previewRuntime.publish(candidates, previewBaseUrl)) {
            List<String> lines = new ArrayList<>();
            lines.add("OPERATION: inspect-final-code-first-previews");
            lines.add("The runtime has already parsed and frozen the exact final candidate artifacts.");
            lines.add("Invoke candidate_a, candidate_b, and candidate_c. Tell each matching specialist to perform inspect-final-code-first-preview only.");
            lines.add("Each specialist must browser_navigate to its exact assigned URL and then run browser_snapshot or browser_take_screenshot on that page.");
            lines.add("Do not redesign, repair, rewrite, regenerate, or substitute any candidate or URL during this operation.");
            lines.add("The runtime will ignore prose claims and accept only observed browser lifecycle evidence bound to the exact URLs below.");
            for (DesignCandidateId candidateId : DesignCandidateId.values()) {
                lines.add("Candidate " + candidateId + " final preview: " + publication.targets().get(candidateId).url());
            }
            lines.add("Return JSON only: {\"inspected\":[\"A\",\"B\",\"C\"]}.");

            StrandsObservedInvocationResult invocation = graph.invokeDirectorObserved(String.join("\n", lines));
            invocationValidator.assertComplete(invocation);
            WebDesignAgentToolEvidenceCollector evidence = new WebDesignAgentToolEvidenceCollector();
            evidence.recordAll(invocation.toolEvents());
            return new WebDesignGenerationEvidenceResolver.FinalPreviewInspection(
                    evidence,
                    publication.targets()
            );
        }
    }

    private record ParsedInvocation(
            DesignGenerationResult result,
            WebDesignAgentToolEvidenceCollector evidence
    ) {
    }
}
