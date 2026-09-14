package org.tavall.webdesign.design.validation;

import org.junit.jupiter.api.Test;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignSourceMode;

import java.net.InetAddress;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebDesignGenerationRequestResolverTest {
    private final WebDesignGenerationRequestResolver resolver = new WebDesignGenerationRequestResolver(
            new WebDesignAgentBrowserTargetValidator(
                    ignored -> List.of(InetAddress.getByName("93.184.216.34")),
                    Set.of(80, 443)
            )
    );

    @Test
    void defaultsToCodeFirstAndNormalizesPromptAndRoutes() {
        DesignGenerationRequest result = resolver.resolve(new DesignGenerationRequest(
                "  Build Tavall  ",
                null,
                null,
                null,
                null,
                List.of("/", "/docs"),
                null
        ));

        assertThat(result.prompt()).isEqualTo("Build Tavall");
        assertThat(result.sourceMode()).isEqualTo(DesignSourceMode.CODE_FIRST);
        assertThat(result.pages()).containsExactly("/", "/docs");
    }

    @Test
    void requiresModeSpecificSourceInputs() {
        assertThatThrownBy(() -> resolver.resolve(new DesignGenerationRequest(
                "Design",
                DesignSourceMode.EXISTING_SITE,
                null,
                null,
                null,
                List.of(),
                null
        )))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("requires targetUrl");

        assertThatThrownBy(() -> resolver.resolve(new DesignGenerationRequest(
                "Design",
                DesignSourceMode.REFERENCE_IMAGE,
                null,
                null,
                null,
                List.of(),
                null
        )))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("requires referenceImageUrl");
    }

    @Test
    void rejectsInvalidPageRoutesBeforeAgentInvocation() {
        assertThatThrownBy(() -> resolver.resolve(new DesignGenerationRequest(
                "Design",
                DesignSourceMode.CODE_FIRST,
                null,
                null,
                null,
                List.of("docs"),
                null
        )))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("begin with /");
    }
}
