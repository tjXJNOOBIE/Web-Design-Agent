package org.tavall.webdesign.cli;

import org.junit.jupiter.api.Test;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignSourceMode;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebDesignCliRequestResolverTest {
    private final WebDesignCliRequestResolver resolver = new WebDesignCliRequestResolver();

    @Test
    void resolvesReferenceModeAndRemovesReferenceArgumentsFromPrompt() {
        DesignGenerationRequest request = resolver.resolve(
                List.of("make", "it", "editorial", "--reference", "https://example.com/reference.png"),
                ""
        );

        assertThat(request.prompt()).isEqualTo("make it editorial");
        assertThat(request.sourceMode()).isEqualTo(DesignSourceMode.REFERENCE_IMAGE);
        assertThat(request.referenceImageUrl()).isEqualTo("https://example.com/reference.png");
    }

    @Test
    void usesStandardInputWhenNoArgumentsWereProvided() {
        DesignGenerationRequest request = resolver.resolve(List.of(), "  make me a portfolio  ");

        assertThat(request.prompt()).isEqualTo("make me a portfolio");
        assertThat(request.sourceMode()).isNull();
    }

    @Test
    void rejectsConceptFirstOnNonInteractiveCli() {
        assertThatThrownBy(() -> resolver.resolve(List.of("--concept-first", "portfolio"), ""))
                .isInstanceOf(WebDesignCliInputException.class)
                .hasMessageContaining("create-design-concepts");
    }

    @Test
    void rejectsMissingReferenceValue() {
        assertThatThrownBy(() -> resolver.resolve(List.of("portfolio", "--reference"), ""))
                .isInstanceOf(WebDesignCliInputException.class)
                .hasMessage("--reference requires an HTTP(S) reference image URL.");
    }

    @Test
    void rejectsBlankPrompt() {
        assertThatThrownBy(() -> resolver.resolve(List.of(), ""))
                .isInstanceOf(WebDesignCliInputException.class)
                .hasMessage("Web Design Agent requires a non-blank request.");
    }
}
