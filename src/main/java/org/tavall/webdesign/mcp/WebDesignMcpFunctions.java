package org.tavall.webdesign.mcp;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.tavall.ai.core.annotation.AIFunction;
import org.tavall.ai.core.annotation.AIParam;
import org.tavall.webdesign.agent.WebDesignAgentRoleConfigurationBuilder;
import org.tavall.webdesign.design.data.DesignCandidate;
import org.tavall.webdesign.design.data.DesignConceptSet;
import org.tavall.webdesign.design.data.DesignGenerationRequest;
import org.tavall.webdesign.design.data.DesignPreferenceProfile;
import org.tavall.webdesign.design.data.DesignRefinementRequest;
import org.tavall.webdesign.design.data.DesignSourceMode;
import org.tavall.webdesign.design.data.VisualState;
import org.tavall.webdesign.design.export.DesignExportBuilder;
import org.tavall.webdesign.design.handler.WebDesignConceptGenerationHandler;
import org.tavall.webdesign.design.handler.WebDesignGenerationHandler;
import org.tavall.webdesign.design.handler.WebDesignRefinementHandler;
import org.tavall.webdesign.design.validation.DesignResultValidationException;

import java.util.List;

/** Public Function Catalog projection of the Web Design Agent product contract. */
public final class WebDesignMcpFunctions {
    private final WebDesignGenerationHandler generationHandler;
    private final WebDesignRefinementHandler refinementHandler;
    private final WebDesignConceptGenerationHandler conceptGenerationHandler;
    private final DesignExportBuilder exportBuilder;
    private final WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder;

    public WebDesignMcpFunctions(
            WebDesignGenerationHandler generationHandler,
            WebDesignRefinementHandler refinementHandler,
            WebDesignConceptGenerationHandler conceptGenerationHandler,
            DesignExportBuilder exportBuilder,
            WebDesignAgentRoleConfigurationBuilder roleConfigurationBuilder
    ) {
        this.generationHandler = generationHandler;
        this.refinementHandler = refinementHandler;
        this.conceptGenerationHandler = conceptGenerationHandler;
        this.exportBuilder = exportBuilder;
        this.roleConfigurationBuilder = roleConfigurationBuilder;
    }

    @AIFunction(name = "design", description = "Generate three genuinely distinct real website implementations.")
    public Payload design(
            @AIParam(name = "prompt", description = "Website design brief") String prompt,
            @AIParam(name = "sourceMode", description = "code-first, reference-image, or existing-site", required = false)
            PublicDesignSourceMode sourceMode,
            @AIParam(name = "referenceImageUrl", description = "Public reference image URL", required = false)
            String referenceImageUrl,
            @AIParam(name = "targetUrl", description = "Public existing-site target URL", required = false)
            String targetUrl,
            @AIParam(name = "pages", description = "Additional absolute page routes", required = false)
            List<String> pages,
            @AIParam(name = "preferenceProfile", description = "Portable design preference profile", required = false)
            DesignPreferenceProfile preferenceProfile
    ) {
        DesignGenerationRequest request = new DesignGenerationRequest(
                prompt,
                sourceMode == null ? null : sourceMode.internalMode(),
                referenceImageUrl,
                targetUrl,
                null,
                pages,
                preferenceProfile
        );
        return new Payload("generation", generationHandler.generate(request));
    }

    @AIFunction(name = "refine-design", description = "Reconcile live visual controls and feedback into the selected implementation.")
    public Payload refineDesign(
            @AIParam(name = "candidate", description = "Selected A/B/C implementation") DesignCandidate candidate,
            @AIParam(name = "visualState", description = "Current visual control values") VisualState visualState,
            @AIParam(name = "feedback", description = "Optional human refinement feedback", required = false)
            String feedback
    ) {
        return new Payload(
                "candidate",
                refinementHandler.refine(new DesignRefinementRequest(candidate, visualState, feedback == null ? "" : feedback))
        );
    }

    @AIFunction(name = "create-design-concepts", description = "Generate three optional concept images before real A/B/C.")
    public Payload createDesignConcepts(
            @AIParam(name = "prompt", description = "Website concept brief") String prompt
    ) {
        return new Payload("concepts", conceptGenerationHandler.createConcepts(prompt));
    }

    @AIFunction(name = "design-from-concept", description = "Use a selected concept as reference for real A/B/C implementations.")
    public Payload designFromConcept(
            @AIParam(name = "prompt", description = "Website design brief") String prompt,
            @AIParam(name = "concept", description = "Selected generated concept") DesignConceptSet.DesignConcept concept
    ) {
        DesignGenerationRequest request = new DesignGenerationRequest(
                prompt,
                DesignSourceMode.CONCEPT_FIRST,
                null,
                null,
                concept,
                List.of(),
                null
        );
        return new Payload("generation", generationHandler.generate(request));
    }

    @AIFunction(name = "export-design", description = "Export current visual state as standalone HTML and page artifacts.")
    public Payload exportDesign(
            @AIParam(name = "candidate", description = "Selected A/B/C implementation") DesignCandidate candidate,
            @AIParam(name = "visualState", description = "Visual state to bind into the export") VisualState visualState
    ) {
        if (candidate == null || visualState == null) {
            throw new DesignResultValidationException("Export requires candidate and visualState.");
        }
        return new Payload("export", exportBuilder.build(candidate, visualState));
    }

    @AIFunction(name = "extract-design-system", description = "Extract candidate design system.")
    public Payload extractDesignSystem(
            @AIParam(name = "candidate", description = "Candidate whose design system should be extracted")
            DesignCandidate candidate
    ) {
        if (candidate == null) {
            throw new DesignResultValidationException("Design-system extraction requires a candidate.");
        }
        return new Payload("design-system", new DesignSystemResult(candidate.id().name(), candidate.designSystem()));
    }

    @AIFunction(name = "build-design-preference-profile", description = "Build portable preference profile.")
    public Payload buildDesignPreferenceProfile(
            @AIParam(name = "acceptedCandidate", description = "Accepted design candidate") DesignCandidate acceptedCandidate,
            @AIParam(name = "rejectedCandidates", description = "Rejected alternatives, maximum 12")
            List<DesignCandidate> rejectedCandidates,
            @AIParam(name = "visualState", description = "Accepted visual control state") VisualState visualState,
            @AIParam(name = "notes", description = "Optional preference notes", required = false) List<String> notes
    ) {
        if (acceptedCandidate == null || rejectedCandidates == null || visualState == null) {
            throw new DesignResultValidationException(
                    "Preference-profile construction requires acceptedCandidate, rejectedCandidates, and visualState."
            );
        }
        if (rejectedCandidates.size() > 12) {
            throw new DesignResultValidationException("Preference profile supports at most 12 rejected candidates.");
        }
        List<String> safeNotes = notes == null ? List.of() : List.copyOf(notes);
        if (safeNotes.size() > 100) {
            throw new DesignResultValidationException("Preference profile supports at most 100 notes.");
        }
        for (String note : safeNotes) {
            if (note == null || note.isBlank() || note.length() > 2_000) {
                throw new DesignResultValidationException("Preference profile notes must contain 1 to 2000 characters.");
            }
        }
        DesignPreferenceProfile profile = new DesignPreferenceProfile(
                1,
                acceptedCandidate.genome(),
                rejectedCandidates.stream().map(DesignCandidate::genome).toList(),
                visualState,
                safeNotes
        );
        return new Payload("preference-profile", new PreferenceProfileResult(profile));
    }

    @AIFunction(name = "web-design-capabilities", description = "Report configured external capabilities.")
    public Payload webDesignCapabilities() {
        return new Payload("capabilities", roleConfigurationBuilder.capabilities());
    }

    public enum PublicDesignSourceMode {
        @JsonProperty("code-first")
        CODE_FIRST(DesignSourceMode.CODE_FIRST),
        @JsonProperty("reference-image")
        REFERENCE_IMAGE(DesignSourceMode.REFERENCE_IMAGE),
        @JsonProperty("existing-site")
        EXISTING_SITE(DesignSourceMode.EXISTING_SITE);

        private final DesignSourceMode internalMode;

        PublicDesignSourceMode(DesignSourceMode internalMode) {
            this.internalMode = internalMode;
        }

        public DesignSourceMode internalMode() {
            return internalMode;
        }
    }

    public record Payload(String kind, Object data) {
    }

    public record DesignSystemResult(String candidateId, org.tavall.webdesign.design.data.DesignSystem designSystem) {
    }

    public record PreferenceProfileResult(DesignPreferenceProfile profile) {
    }
}
