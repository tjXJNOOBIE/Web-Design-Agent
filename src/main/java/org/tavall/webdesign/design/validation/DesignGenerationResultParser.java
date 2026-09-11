package org.tavall.webdesign.design.validation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignCandidateId;
import org.tavall.webdesign.design.data.DesignConceptSet;
import org.tavall.webdesign.design.data.DesignGenerationResult;
import org.tavall.webdesign.design.data.DesignGenome;
import org.tavall.webdesign.design.data.DesignIntent;
import org.tavall.webdesign.design.data.DesignSourceMode;
import org.tavall.webdesign.design.data.DesignSystem;
import org.tavall.webdesign.design.data.DesignValidation;
import org.tavall.webdesign.design.data.VisualState;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class DesignGenerationResultParser {
    private final ObjectMapper objectMapper;

    public DesignGenerationResultParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public DesignGenerationResult parseGeneration(Object value) {
        ObjectNode object = object(deserialize(value), "generation");
        List<DesignCandidate> candidates = new ArrayList<>();
        for (JsonNode candidate : array(required(object, "candidates"), "candidates")) {
            candidates.add(parseCandidate(candidate));
        }

        EnumSet<DesignCandidateId> ids = EnumSet.noneOf(DesignCandidateId.class);
        candidates.forEach(candidate -> ids.add(candidate.id()));
        if (candidates.size() != 3 || ids.size() != 3 || !ids.containsAll(EnumSet.allOf(DesignCandidateId.class))) {
            throw new DesignResultValidationException(
                    "Generation must contain exactly one candidate each for A, B, and C."
            );
        }

        ObjectNode validation = object(optional(object, "validation", objectMapper.createObjectNode()), "validation");
        return new DesignGenerationResult(
                1,
                requiredText(required(object, "prompt"), "prompt"),
                parseIntent(required(object, "intent")),
                candidates,
                new DesignValidation(
                        booleanValue(optional(validation, "designDistancePassed", objectMapper.getNodeFactory().booleanNode(false)),
                                "validation.designDistancePassed"),
                        booleanValue(optional(validation, "browserValidated", objectMapper.getNodeFactory().booleanNode(false)),
                                "validation.browserValidated"),
                        strings(optional(validation, "notes", objectMapper.createArrayNode()), "validation.notes")
                )
        );
    }

    public DesignCandidate parseCandidate(Object value) {
        ObjectNode object = object(deserialize(value), "candidate");
        List<DesignCandidate.Page> pages = new ArrayList<>();
        Set<String> paths = new HashSet<>();
        for (JsonNode pageValue : array(optional(object, "pages", objectMapper.createArrayNode()), "candidate.pages")) {
            DesignCandidate.Page page = parsePage(pageValue);
            if (!paths.add(page.path())) {
                throw new DesignResultValidationException("Duplicate page path: " + page.path());
            }
            pages.add(page);
        }

        return new DesignCandidate(
                candidateId(required(object, "id")),
                requiredText(required(object, "title"), "candidate.title"),
                requiredText(required(object, "thesis"), "candidate.thesis"),
                parseGenome(required(object, "genome")),
                parseDesignSystem(required(object, "designSystem")),
                parseDocument(required(object, "document")),
                pages,
                parseVisualState(required(object, "visualState")),
                strings(optional(object, "critique", objectMapper.createArrayNode()), "candidate.critique"),
                strings(optional(object, "browserEvidence", objectMapper.createArrayNode()), "candidate.browserEvidence")
        );
    }

    public DesignConceptSet parseConceptSet(Object value, String prompt) {
        ObjectNode object = object(deserialize(value), "concept set");
        ArrayNode raw = array(required(object, "concepts"), "concepts");
        if (raw.size() != 3) {
            throw new DesignResultValidationException("Concept generation must return exactly three concepts.");
        }

        List<DesignConceptSet.DesignConcept> concepts = new ArrayList<>(3);
        EnumSet<DesignCandidateId> ids = EnumSet.noneOf(DesignCandidateId.class);
        for (JsonNode conceptValue : raw) {
            DesignConceptSet.DesignConcept concept = parseConcept(conceptValue);
            concepts.add(concept);
            ids.add(concept.id());
        }
        if (ids.size() != 3 || !ids.containsAll(EnumSet.allOf(DesignCandidateId.class))) {
            throw new DesignResultValidationException("Concept generation must contain unique A/B/C ids.");
        }

        return new DesignConceptSet(prompt, concepts, List.of());
    }

    private DesignConceptSet.DesignConcept parseConcept(JsonNode value) {
        ObjectNode object = object(value, "concept");
        return new DesignConceptSet.DesignConcept(
                candidateId(required(object, "id")),
                requiredText(required(object, "title"), "concept.title"),
                requiredText(required(object, "thesis"), "concept.thesis"),
                requiredText(required(object, "imageUrl"), "concept.imageUrl")
        );
    }

    private DesignIntent parseIntent(JsonNode value) {
        ObjectNode object = object(value, "intent");
        return new DesignIntent(
                requiredText(required(object, "product"), "intent.product"),
                strings(required(object, "audience"), "intent.audience"),
                requiredText(required(object, "primaryGoal"), "intent.primaryGoal"),
                strings(optional(object, "secondaryGoals", objectMapper.createArrayNode()), "intent.secondaryGoals"),
                strings(optional(object, "contentHierarchy", objectMapper.createArrayNode()), "intent.contentHierarchy"),
                strings(optional(object, "visualConstraints", objectMapper.createArrayNode()), "intent.visualConstraints"),
                strings(optional(object, "interactionRequirements", objectMapper.createArrayNode()), "intent.interactionRequirements"),
                strings(optional(object, "responsiveRequirements", objectMapper.createArrayNode()), "intent.responsiveRequirements"),
                sourceMode(required(object, "sourceMode"))
        );
    }

    private DesignGenome parseGenome(JsonNode value) {
        ObjectNode object = object(value, "genome");
        return new DesignGenome(
                requiredText(required(object, "composition"), "genome.composition"),
                requiredText(required(object, "navigation"), "genome.navigation"),
                requiredText(required(object, "heroStrategy"), "genome.heroStrategy"),
                requiredText(required(object, "typography"), "genome.typography"),
                normalized(required(object, "density"), "genome.density"),
                requiredText(required(object, "geometry"), "genome.geometry"),
                requiredText(required(object, "surfaceModel"), "genome.surfaceModel"),
                normalized(required(object, "depth"), "genome.depth"),
                requiredText(required(object, "motion"), "genome.motion"),
                requiredText(required(object, "contentRhythm"), "genome.contentRhythm"),
                requiredText(required(object, "imageryStrategy"), "genome.imageryStrategy")
        );
    }

    private DesignSystem parseDesignSystem(JsonNode value) {
        ObjectNode object = object(value, "designSystem");
        List<DesignSystem.Token> tokens = new ArrayList<>();
        for (JsonNode valueNode : array(required(object, "tokens"), "designSystem.tokens")) {
            ObjectNode token = object(valueNode, "token");
            tokens.add(new DesignSystem.Token(
                    requiredText(required(token, "name"), "token.name"),
                    requiredText(required(token, "value"), "token.value")
            ));
        }

        List<DesignSystem.Typography> typography = new ArrayList<>();
        for (JsonNode valueNode : array(required(object, "typography"), "designSystem.typography")) {
            ObjectNode item = object(valueNode, "typography");
            typography.add(new DesignSystem.Typography(
                    requiredText(required(item, "role"), "typography.role"),
                    requiredText(required(item, "family"), "typography.family"),
                    requiredText(required(item, "weight"), "typography.weight")
            ));
        }

        return new DesignSystem(
                tokens,
                typography,
                strings(required(object, "components"), "designSystem.components"),
                strings(required(object, "principles"), "designSystem.principles")
        );
    }

    private DesignCandidate.Document parseDocument(JsonNode value) {
        ObjectNode object = object(value, "document");
        return new DesignCandidate.Document(
                requiredText(required(object, "html"), "document.html"),
                requiredText(required(object, "css"), "document.css"),
                text(optional(object, "javascript", objectMapper.getNodeFactory().textNode("")), "document.javascript")
        );
    }

    private DesignCandidate.Page parsePage(JsonNode value) {
        ObjectNode object = object(value, "page");
        String path = requiredText(required(object, "path"), "page.path");
        if (!path.startsWith("/")) {
            throw new DesignResultValidationException("Page paths must begin with /.");
        }
        if (path.length() > WebDesignAgentRequestLimits.PAGE_PATH_CHARACTERS) {
            throw new DesignResultValidationException(
                    "Page path exceeds the " + WebDesignAgentRequestLimits.PAGE_PATH_CHARACTERS + "-character limit."
            );
        }
        return new DesignCandidate.Page(
                path,
                requiredText(required(object, "title"), "page.title"),
                requiredText(required(object, "html"), "page.html"),
                text(optional(object, "javascript", objectMapper.getNodeFactory().textNode("")), "page.javascript")
        );
    }

    private VisualState parseVisualState(JsonNode value) {
        ObjectNode object = object(value, "visualState");
        return new VisualState(
                normalized(required(object, "density"), "visualState.density"),
                positive(required(object, "spacingScale"), "visualState.spacingScale"),
                nonnegative(required(object, "radius"), "visualState.radius"),
                positive(required(object, "fontScale"), "visualState.fontScale"),
                positive(required(object, "heroScale"), "visualState.heroScale"),
                positive(required(object, "contrast"), "visualState.contrast"),
                normalized(required(object, "depth"), "visualState.depth"),
                normalized(required(object, "motion"), "visualState.motion")
        );
    }

    private JsonNode deserialize(Object value) {
        if (value instanceof JsonNode node) {
            return node;
        }
        if (!(value instanceof String text)) {
            return objectMapper.valueToTree(value);
        }

        String trimmed = text.trim();
        try {
            return objectMapper.readTree(trimmed);
        } catch (JsonProcessingException ignored) {
            int first = trimmed.indexOf('{');
            int last = trimmed.lastIndexOf('}');
            if (first >= 0 && last > first) {
                try {
                    return objectMapper.readTree(trimmed.substring(first, last + 1));
                } catch (JsonProcessingException nested) {
                    throw new DesignResultValidationException("Agent result did not contain valid JSON.", nested);
                }
            }
            throw new DesignResultValidationException("Agent result did not contain valid JSON.");
        }
    }

    private static ObjectNode object(JsonNode value, String label) {
        if (!(value instanceof ObjectNode object)) {
            throw new DesignResultValidationException(label + " must be an object.");
        }
        return object;
    }

    private static ArrayNode array(JsonNode value, String label) {
        if (!(value instanceof ArrayNode array)) {
            throw new DesignResultValidationException(label + " must be an array.");
        }
        return array;
    }

    private static JsonNode required(ObjectNode object, String field) {
        JsonNode value = object.get(field);
        if (value == null || value.isNull()) {
            throw new DesignResultValidationException(field + " is required.");
        }
        return value;
    }

    private static JsonNode optional(ObjectNode object, String field, JsonNode fallback) {
        JsonNode value = object.get(field);
        return value == null || value.isNull() ? fallback : value;
    }

    private static String requiredText(JsonNode value, String label) {
        String text = text(value, label).trim();
        if (text.isEmpty()) {
            throw new DesignResultValidationException(label + " must be non-blank.");
        }
        return text;
    }

    private static String text(JsonNode value, String label) {
        if (!value.isTextual()) {
            throw new DesignResultValidationException(label + " must be a string.");
        }
        return value.textValue();
    }

    private static List<String> strings(JsonNode value, String label) {
        ArrayNode array = array(value, label);
        List<String> values = new ArrayList<>(array.size());
        for (int index = 0; index < array.size(); index++) {
            values.add(requiredText(array.get(index), label + "[" + index + "]"));
        }
        return values;
    }

    private static boolean booleanValue(JsonNode value, String label) {
        if (!value.isBoolean()) {
            throw new DesignResultValidationException(label + " must be a boolean.");
        }
        return value.booleanValue();
    }

    private static double finiteNumber(JsonNode value, String label) {
        if (!value.isNumber()) {
            throw new DesignResultValidationException(label + " must be a finite number.");
        }
        double number = value.doubleValue();
        if (!Double.isFinite(number)) {
            throw new DesignResultValidationException(label + " must be a finite number.");
        }
        return number;
    }

    private static double normalized(JsonNode value, String label) {
        double number = finiteNumber(value, label);
        if (number < 0.0 || number > 1.0) {
            throw new DesignResultValidationException(label + " must be between 0 and 1.");
        }
        return number;
    }

    private static double positive(JsonNode value, String label) {
        double number = finiteNumber(value, label);
        if (number <= 0.0) {
            throw new DesignResultValidationException(label + " must be greater than zero.");
        }
        return number;
    }

    private static double nonnegative(JsonNode value, String label) {
        double number = finiteNumber(value, label);
        if (number < 0.0) {
            throw new DesignResultValidationException(label + " must not be negative.");
        }
        return number;
    }

    private static DesignCandidateId candidateId(JsonNode value) {
        String id = requiredText(value, "candidate.id");
        try {
            return DesignCandidateId.valueOf(id);
        } catch (IllegalArgumentException exception) {
            throw new DesignResultValidationException("Candidate id must be A, B, or C.", exception);
        }
    }

    private static DesignSourceMode sourceMode(JsonNode value) {
        String mode = requiredText(value, "intent.sourceMode");
        try {
            return DesignSourceMode.fromWireValue(mode);
        } catch (IllegalArgumentException exception) {
            throw new DesignResultValidationException("Unsupported design source mode.", exception);
        }
    }
}
