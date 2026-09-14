package org.tavall.webdesign.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.agent.WebDesignGenerationPromptBuilder;
import org.tavall.webdesign.agent.WebDesignStrandsConfigurationResolver;
import org.tavall.webdesign.design.export.DesignExportBuilder;
import org.tavall.webdesign.design.handler.WebDesignConceptGenerationHandler;
import org.tavall.webdesign.design.handler.WebDesignGenerationHandler;
import org.tavall.webdesign.design.handler.WebDesignRefinementHandler;
import org.tavall.webdesign.design.preview.WebDesignAgentPreviewRuntime;
import org.tavall.webdesign.design.validation.DesignDistanceEvaluator;
import org.tavall.webdesign.design.validation.DesignGenerationResultParser;
import org.tavall.webdesign.design.validation.WebDesignAgentBrowserTargetValidator;
import org.tavall.webdesign.design.validation.WebDesignGenerationEvidenceResolver;
import org.tavall.webdesign.design.validation.WebDesignGenerationRequestResolver;
import org.tavall.webdesign.design.validation.WebDesignInvocationResultValidator;

import java.util.Map;
import java.util.Objects;

/** Builds the shared Java-owned Web Design Agent application graph from environment policy. */
public final class WebDesignApplicationServicesBuilder {
    private final Map<String, String> environment;
    private final WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder;

    public WebDesignApplicationServicesBuilder(Map<String, String> environment) {
        this.environment = Map.copyOf(Objects.requireNonNull(environment, "environment"));
        this.roleConfigurationBuilder = new WebDesignAgentRoleConfigurationBuilder(this.environment);
    }

    public WebDesignAgentRoleConfigurationBuilder.WebDesignAgentCapabilities capabilities() {
        return roleConfigurationBuilder.capabilities();
    }

    public WebDesignApplicationServices build() {
        return build(null, null);
    }

    public WebDesignApplicationServices build(
            WebDesignAgentPreviewRuntime previewRuntime,
            String previewBaseUrl
    ) {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        WebDesignStrandsConfigurationResolver strandsConfigurationResolver =
                new WebDesignStrandsConfigurationResolver(environment);
        DesignGenerationResultParser parser = new DesignGenerationResultParser(objectMapper);
        WebDesignInvocationResultValidator invocationValidator = new WebDesignInvocationResultValidator();
        WebDesignGenerationHandler generationHandler = new WebDesignGenerationHandler(
                strandsConfigurationResolver,
                roleConfigurationBuilder,
                new WebDesignGenerationRequestResolver(new WebDesignAgentBrowserTargetValidator()),
                new WebDesignGenerationPromptBuilder(objectMapper, capabilities()),
                parser,
                new DesignDistanceEvaluator(),
                new WebDesignGenerationEvidenceResolver(capabilities()),
                invocationValidator,
                previewRuntime,
                previewBaseUrl
        );
        WebDesignRefinementHandler refinementHandler = new WebDesignRefinementHandler(
                strandsConfigurationResolver,
                roleConfigurationBuilder,
                parser,
                invocationValidator,
                objectMapper
        );
        WebDesignConceptGenerationHandler conceptGenerationHandler = new WebDesignConceptGenerationHandler(
                strandsConfigurationResolver,
                roleConfigurationBuilder,
                parser,
                invocationValidator
        );
        return new WebDesignApplicationServices(
                objectMapper,
                roleConfigurationBuilder,
                generationHandler,
                refinementHandler,
                conceptGenerationHandler,
                new DesignExportBuilder()
        );
    }
}
