package org.tavall.webdesign.evaluation;

import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignGenerationResult;
import org.tavall.webdesign.design.handler.WebDesignGenerationHandler;
import org.tavall.webdesign.design.validation.DesignDistanceEvaluator;

import java.util.List;
import java.util.Objects;

/** Runs the one-shot product corpus through the canonical Java generation handler. */
public final class OneShotDesignEvaluationHandler {
    private final WebDesignGenerationHandler generationHandler;
    private final DesignDistanceEvaluator distanceEvaluator;

    public OneShotDesignEvaluationHandler(WebDesignGenerationHandler generationHandler) {
        this(generationHandler, new DesignDistanceEvaluator());
    }

    public OneShotDesignEvaluationHandler(
            WebDesignGenerationHandler generationHandler,
            DesignDistanceEvaluator distanceEvaluator
    ) {
        this.generationHandler = Objects.requireNonNull(generationHandler, "generationHandler");
        this.distanceEvaluator = Objects.requireNonNull(distanceEvaluator, "distanceEvaluator");
    }

    public OneShotDesignEvaluation evaluate(List<String> prompts) {
        List<String> safePrompts = List.copyOf(Objects.requireNonNull(prompts, "prompts"));
        if (safePrompts.isEmpty()) {
            return new OneShotDesignEvaluation(0, 0.0, 0.0, 0.0, 0.0);
        }

        int success = 0;
        int valid = 0;
        int distinct = 0;
        int browserValidated = 0;
        for (String prompt : safePrompts) {
            try {
                DesignGenerationResult result = generationHandler.generate(new DesignGenerationRequest(
                        prompt,
                        null,
                        null,
                        null,
                        null,
                        List.of(),
                        null
                ));
                success++;
                if (validCandidates(result.candidates())) {
                    valid++;
                }
                if (distanceEvaluator.evaluate(result.candidates()).passed()) {
                    distinct++;
                }
                if (result.validation().browserValidated()) {
                    browserValidated++;
                }
            } catch (RuntimeException ignored) {
                // Evaluation records failed generations in the aggregate instead of aborting the corpus.
            }
        }

        return new OneShotDesignEvaluation(
                safePrompts.size(),
                rate(success, safePrompts.size()),
                rate(valid, safePrompts.size()),
                rate(distinct, safePrompts.size()),
                rate(browserValidated, safePrompts.size())
        );
    }

    private static boolean validCandidates(List<DesignCandidate> candidates) {
        return candidates.size() == 3 && candidates.stream().allMatch(candidate ->
                candidate.document().html() != null
                        && !candidate.document().html().trim().isEmpty()
                        && candidate.document().css() != null
                        && !candidate.document().css().trim().isEmpty()
        );
    }

    private static double rate(int count, int total) {
        return Math.round(((double) count / total) * 1_000.0) / 1_000.0;
    }

    public record OneShotDesignEvaluation(
            int prompts,
            double successRate,
            double validCandidateRate,
            double distinctCandidateRate,
            double browserValidationRate
    ) {
    }
}
