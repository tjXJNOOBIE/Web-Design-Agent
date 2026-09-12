package org.tavall.webdesign.evaluation;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.tavall.webdesign.application.WebDesignApplicationServices;
import org.tavall.webdesign.application.WebDesignApplicationServicesBuilder;

import java.util.Arrays;
import java.util.List;

public final class WebDesignEvaluationApplication {
    private WebDesignEvaluationApplication() {
    }

    public static void main(String[] args) {
        try {
            WebDesignApplicationServices services = new WebDesignApplicationServicesBuilder(System.getenv()).build();
            List<String> prompts = args.length == 0
                    ? OneShotDesignPromptCorpus.PROMPTS
                    : List.copyOf(Arrays.asList(args));
            OneShotDesignEvaluationHandler.OneShotDesignEvaluation result =
                    new OneShotDesignEvaluationHandler(services.generationHandler()).evaluate(prompts);
            System.out.println(services.objectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(result));
        } catch (RuntimeException | JsonProcessingException exception) {
            System.err.println(exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage());
            System.exit(1);
        }
    }
}
