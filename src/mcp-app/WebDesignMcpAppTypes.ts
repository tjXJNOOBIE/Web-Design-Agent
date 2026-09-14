export type DesignCandidateId = 'A' | 'B' | 'C'

export type DesignSourceMode =
  | 'code-first'
  | 'concept-first'
  | 'reference-image'
  | 'existing-site'

export interface DesignGenomeData {
  readonly composition: string
  readonly navigation: string
  readonly heroStrategy: string
  readonly typography: string
  readonly density: number
  readonly geometry: string
  readonly surfaceModel: string
  readonly depth: number
  readonly motion: string
  readonly contentRhythm: string
  readonly imageryStrategy: string
}

export interface DesignTokenData {
  readonly name: string
  readonly value: string
}

export interface DesignTypographyData {
  readonly role: string
  readonly family: string
  readonly weight: string
}

export interface DesignSystemData {
  readonly tokens: readonly DesignTokenData[]
  readonly typography: readonly DesignTypographyData[]
  readonly components: readonly string[]
  readonly principles: readonly string[]
}

export interface VisualStateData {
  readonly density: number
  readonly spacingScale: number
  readonly radius: number
  readonly fontScale: number
  readonly heroScale: number
  readonly contrast: number
  readonly depth: number
  readonly motion: number
}

export interface DesignDocumentData {
  readonly html: string
  readonly css: string
  readonly javascript: string
}

export interface DesignPageData {
  readonly path: string
  readonly title: string
  readonly html: string
  readonly javascript: string
}

export interface DesignCandidateData {
  readonly id: DesignCandidateId
  readonly title: string
  readonly thesis: string
  readonly genome: DesignGenomeData
  readonly designSystem: DesignSystemData
  readonly document: DesignDocumentData
  readonly pages: readonly DesignPageData[]
  readonly visualState: VisualStateData
  readonly critique: readonly string[]
  readonly browserEvidence: readonly string[]
}

export interface DesignIntentData {
  readonly product: string
  readonly audience: readonly string[]
  readonly primaryGoal: string
  readonly secondaryGoals: readonly string[]
  readonly contentHierarchy: readonly string[]
  readonly visualConstraints: readonly string[]
  readonly interactionRequirements: readonly string[]
  readonly responsiveRequirements: readonly string[]
  readonly sourceMode: DesignSourceMode
}

export interface DesignValidationData {
  readonly designDistancePassed: boolean
  readonly browserValidated: boolean
  readonly notes: readonly string[]
}

export interface DesignGenerationResult {
  readonly version: 1
  readonly prompt: string
  readonly intent: DesignIntentData
  readonly candidates: readonly DesignCandidateData[]
  readonly validation: DesignValidationData
}

export interface DesignConceptData {
  readonly id: DesignCandidateId
  readonly title: string
  readonly thesis: string
  readonly imageUrl: string
}

export interface DesignConceptSetData {
  readonly prompt: string
  readonly concepts: readonly DesignConceptData[]
  readonly providerEvidence?: readonly string[]
}

export interface DesignPreferenceProfileData {
  readonly version: 1
  readonly acceptedGenome: DesignGenomeData
  readonly rejectedGenomes: readonly DesignGenomeData[]
  readonly visualState: VisualStateData
  readonly notes: readonly string[]
}

export interface DesignPageExportData {
  readonly path: string
  readonly title: string
  readonly html: string
  readonly javascript: string
  readonly standaloneHtml: string
}

export interface DesignExportData {
  readonly html: string
  readonly css: string
  readonly javascript: string
  readonly standaloneHtml: string
  readonly pages: readonly DesignPageExportData[]
}
