package org.tavall.webdesign.design.validation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.tavall.webdesign.design.data.DesignCandidateId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DesignGenerationResultParserTest {
    private final DesignGenerationResultParser parser = new DesignGenerationResultParser(new ObjectMapper());

    @Test
    void parsesEmbeddedGenerationJsonAndPreservesExactAbcCandidates() {
        var result = parser.parseGeneration("model preface\n" + validGeneration() + "\nmodel suffix");

        assertThat(result.version()).isEqualTo(1);
        assertThat(result.prompt()).isEqualTo("Build a launch site");
        assertThat(result.candidates())
                .extracting(candidate -> candidate.id())
                .containsExactly(DesignCandidateId.A, DesignCandidateId.B, DesignCandidateId.C);
        assertThat(result.validation().browserValidated()).isFalse();
    }

    @Test
    void rejectsDuplicateCandidateIds() {
        String invalid = validGeneration().replaceFirst("\"id\":\"C\"", "\"id\":\"A\"");

        assertThatThrownBy(() -> parser.parseGeneration(invalid))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("exactly one candidate each");
    }

    @Test
    void rejectsRelativeAndDuplicatePagePaths() {
        String relative = validGeneration().replaceFirst("\"path\":\"/about\"", "\"path\":\"about\"");
        assertThatThrownBy(() -> parser.parseGeneration(relative))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("begin with /");

        String duplicate = validGeneration().replaceFirst("\"path\":\"/about\"", "\"path\":\"/\"");
        assertThatThrownBy(() -> parser.parseGeneration(duplicate))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("Duplicate page path");
    }

    @Test
    void rejectsOutOfRangeVisualState() {
        String invalid = validGeneration().replaceFirst("\"motion\":0.3", "\"motion\":1.4");

        assertThatThrownBy(() -> parser.parseGeneration(invalid))
                .isInstanceOf(DesignResultValidationException.class)
                .hasMessageContaining("visualState.motion must be between 0 and 1");
    }

    private static String validGeneration() {
        return """
                {
                  "version":1,
                  "prompt":"Build a launch site",
                  "intent":{
                    "product":"Tavall",
                    "audience":["developers"],
                    "primaryGoal":"explain the product",
                    "secondaryGoals":[],
                    "contentHierarchy":["hero"],
                    "visualConstraints":[],
                    "interactionRequirements":[],
                    "responsiveRequirements":["mobile"],
                    "sourceMode":"code-first"
                  },
                  "candidates":[
                    %s,
                    %s,
                    %s
                  ],
                  "validation":{"designDistancePassed":false,"browserValidated":false,"notes":[]}
                }
                """.formatted(candidate("A", "stack", "top", 0.2, 0.2), candidate("B", "split", "rail", 0.6, 0.5), candidate("C", "editorial", "minimal", 0.9, 0.8));
    }

    private static String candidate(String id, String composition, String navigation, double density, double depth) {
        return """
                {
                  "id":"%s",
                  "title":"Candidate %s",
                  "thesis":"Distinct direction",
                  "genome":{
                    "composition":"%s",
                    "navigation":"%s",
                    "heroStrategy":"statement",
                    "typography":"sans",
                    "density":%s,
                    "geometry":"square",
                    "surfaceModel":"flat",
                    "depth":%s,
                    "motion":"restrained",
                    "contentRhythm":"alternating",
                    "imageryStrategy":"product"
                  },
                  "designSystem":{
                    "tokens":[{"name":"space","value":"8px"}],
                    "typography":[{"role":"body","family":"Inter","weight":"400"}],
                    "components":["button"],
                    "principles":["clear hierarchy"]
                  },
                  "document":{"html":"<main>home</main>","css":"main{}","javascript":""},
                  "pages":[
                    {"path":"/","title":"Home","html":"<main>home</main>","javascript":""},
                    {"path":"/about","title":"About","html":"<main>about</main>","javascript":""}
                  ],
                  "visualState":{"density":0.5,"spacingScale":1,"radius":12,"fontScale":1,"heroScale":1,"contrast":1,"depth":0.5,"motion":0.3},
                  "critique":[],
                  "browserEvidence":[]
                }
                """.formatted(id, id, composition, navigation, density, depth);
    }
}
