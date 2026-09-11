package org.tavall.webdesign.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.tavall.ai.core.catalog.AIFunctionCatalog;
import org.tavall.ai.mcp.server.AIFunctionMcpToolPublisher;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.agent.WebDesignGenerationPromptBuilder;
import org.tavall.webdesign.agent.WebDesignStrandsConfigurationResolver;
import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignCandidateId;
import org.tavall.webdesign.design.data.DesignGenome;
import org.tavall.webdesign.design.data.DesignSystem;
import org.tavall.webdesign.design.data.VisualState;
import org.tavall.webdesign.design.export.DesignExportBuilder;
import org.tavall.webdesign.design.handler.WebDesignConceptGenerationHandler;
import org.tavall.webdesign.design.handler.WebDesignGenerationHandler;
import org.tavall.webdesign.design.handler.WebDesignRefinementHandler;
import org.tavall.webdesign.design.validation.DesignDistanceEvaluator;
import org.tavall.webdesign.design.validation.DesignGenerationResultParser;
import org.tavall.webdesign.design.validation.WebDesignAgentBrowserTargetValidator;
import org.tavall.webdesign.design.validation.WebDesignGenerationEvidenceResolver;
import org.tavall.webdesign.design.validation.WebDesignGenerationRequestResolver;
import org.tavall.webdesign.design.validation.WebDesignInvocationResultValidator;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WebDesignMcpFunctionsTest {
    @Test
    void publicFunctionCatalogContainsExactlyTheHistoricalEightTools() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        WebDesignMcpFunctions functions = functions(objectMapper);
        AIFunctionCatalog catalog = new AIFunctionCatalog(objectMapper);
        catalog.registerInstances(functions);

        assertThat(catalog.getFunctionDefinitions().keySet()).containsExactlyInAnyOrder(
                "design",
                "refine-design",
                "create-design-concepts",
                "design-from-concept",
                "export-design",
                "extract-design-system",
                "build-design-preference-profile",
                "web-design-capabilities"
        );
        assertThat(catalog.getFunctionDefinitions().get("design").getRequiredParameters())
                .containsExactly("prompt");
        assertThat(catalog.getFunctionDefinitions().get("refine-design").getRequiredParameters())
                .containsExactlyInAnyOrder("candidate", "visualState");
    }

    @Test
    void presentationMetadataMatchesTheInteractiveMcpAppTools() {
        Map<String, Object> uiMeta = WebDesignMcpAppResource.toolMeta();
        Map<String, AIFunctionMcpToolPublisher.ToolPresentation> presentations = Map.of(
                "design", new AIFunctionMcpToolPublisher.ToolPresentation("Design website A/B/C", uiMeta),
                "refine-design", new AIFunctionMcpToolPublisher.ToolPresentation("Refine selected design", uiMeta),
                "create-design-concepts", new AIFunctionMcpToolPublisher.ToolPresentation("Explore visual concepts", uiMeta),
                "design-from-concept", new AIFunctionMcpToolPublisher.ToolPresentation("Build A/B/C from concept", uiMeta),
                "export-design", new AIFunctionMcpToolPublisher.ToolPresentation("Export selected design", uiMeta)
        );

        assertThat(presentations.keySet()).containsExactlyInAnyOrder(
                "design",
                "refine-design",
                "create-design-concepts",
                "design-from-concept",
                "export-design"
        );
        assertThat(uiMeta).isEqualTo(Map.of(
                "ui",
                Map.of("resourceUri", WebDesignMcpAppResource.RESOURCE_URI)
        ));
    }

    @Test
    void purePublicToolsPreserveStructuredKindAndDataContract() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        WebDesignMcpFunctions functions = functions(objectMapper);
        DesignCandidate candidate = candidate();

        WebDesignMcpFunctions.Payload designSystem = functions.extractDesignSystem(candidate);
        WebDesignMcpFunctions.Payload exported = functions.exportDesign(candidate, candidate.visualState());
        WebDesignMcpFunctions.Payload capabilities = functions.webDesignCapabilities();

        assertThat(designSystem.kind()).isEqualTo("design-system");
        assertThat(exported.kind()).isEqualTo("export");
        assertThat(capabilities.kind()).isEqualTo("capabilities");
        assertThat(objectMapper.valueToTree(designSystem.data()).path("candidateId").asText()).isEqualTo("A");
        assertThat(objectMapper.valueToTree(exported.data()).path("standaloneHtml").asText()).contains("<!doctype html>");
    }

    private static WebDesignMcpFunctions functions(ObjectMapper objectMapper) {
        WebDesignAgentRoleConfigurationBuilder roleConfiguration = new WebDesignAgentRoleConfigurationBuilder(Map.of());
        WebDesignStrandsConfigurationResolver strandsConfiguration = new WebDesignStrandsConfigurationResolver(Map.of(
                WebDesignStrandsConfigurationResolver.NODE_EXECUTABLE_ENV, "/bin/false",
                WebDesignStrandsConfigurationResolver.BRIDGE_ENTRYPOINT_ENV, "/tmp/not-used.js"
        ));
        DesignGenerationResultParser parser = new DesignGenerationResultParser(objectMapper);
        WebDesignInvocationResultValidator invocationValidator = new WebDesignInvocationResultValidator();
        WebDesignGenerationHandler generationHandler = new WebDesignGenerationHandler(
                strandsConfiguration,
                roleConfiguration,
                new WebDesignGenerationRequestResolver(new WebDesignAgentBrowserTargetValidator()),
                new WebDesignGenerationPromptBuilder(objectMapper, roleConfiguration.capabilities()),
                parser,
                new DesignDistanceEvaluator(),
                new WebDesignGenerationEvidenceResolver(roleConfiguration.capabilities()),
                invocationValidator
        );
        WebDesignRefinementHandler refinementHandler = new WebDesignRefinementHandler(
                strandsConfiguration,
                roleConfiguration,
                parser,
                invocationValidator,
                objectMapper
        );
        WebDesignConceptGenerationHandler conceptHandler = new WebDesignConceptGenerationHandler(
                strandsConfiguration,
                roleConfiguration,
                parser,
                invocationValidator
        );
        return new WebDesignMcpFunctions(
                generationHandler,
                refinementHandler,
                conceptHandler,
                new DesignExportBuilder(),
                roleConfiguration
        );
    }

    private static DesignCandidate candidate() {
        DesignGenome genome = new DesignGenome(
                "editorial",
                "top",
                "split",
                "serif",
                0.5,
                "sharp",
                "flat",
                0.2,
                "subtle",
                "dense",
                "photo"
        );
        DesignSystem designSystem = new DesignSystem(
                List.of(new DesignSystem.Token("background", "#fff")),
                List.of(new DesignSystem.Typography("body", "system-ui", "400")),
                List.of("button"),
                List.of("clear hierarchy")
        );
        VisualState visualState = new VisualState(0.5, 1.0, 8.0, 1.0, 1.0, 1.0, 0.2, 0.2);
        return new DesignCandidate(
                DesignCandidateId.A,
                "A",
                "test",
                genome,
                designSystem,
                new DesignCandidate.Document("<main>hello</main>", "main{display:block}", ""),
                List.of(),
                visualState,
                List.of(),
                List.of()
        );
    }
}
