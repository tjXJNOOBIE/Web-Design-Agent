import type {IStrandsAgentRuntime} from '@tjxjnoobie/strands-bridge'

import {
  DEFAULT_WEB_DESIGN_AGENT_INVOCATION_POLICY,
  type WebDesignAgentCapabilityData,
  type WebDesignAgentInvocationPolicyData,
} from '../config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentToolEvidenceCollector} from '../evidence/WebDesignAgentToolEvidenceCollector.js'
import type {IWebDesignAgentRuntime} from './IWebDesignAgentRuntime.js'
import type {
  DesignCandidateData,
  DesignCandidateId,
} from '../../design/data/DesignCandidateData.js'
import type {DesignConceptSetData} from '../../design/data/DesignConceptData.js'
import type {DesignGenerationRequest} from '../../design/data/DesignGenerationRequest.js'
import type {DesignGenerationResult} from '../../design/data/DesignGenerationResult.js'
import type {DesignRefinementRequest} from '../../design/data/DesignRefinementRequest.js'
import type {
  DesignCandidatePreviewTargetData,
  WebDesignAgentPreviewRuntime,
} from '../../design/preview/WebDesignAgentPreviewRuntime.js'
import {DesignDistanceEvaluator} from '../../design/validation/DesignDistanceEvaluator.js'
import {DesignGenerationResultParser} from '../../design/validation/DesignGenerationResultParser.js'
import {DesignResultValidationError} from '../../design/validation/DesignResultValidationError.js'
import {WebDesignAgentBrowserTargetValidator} from '../../design/validation/WebDesignAgentBrowserTargetValidator.js'

type NormalizedDesignGenerationRequest = DesignGenerationRequest & {
  readonly prompt: string
  readonly sourceMode: NonNullable<DesignGenerationRequest['sourceMode']>
}

interface StreamedDirectorInvocationData {
  readonly text: string
  readonly evidence: WebDesignAgentToolEvidenceCollector
}

interface ParsedGenerationInvocationData {
  readonly result: DesignGenerationResult
  readonly evidence: WebDesignAgentToolEvidenceCollector
}

interface FinalCandidatePreviewInspectionData {
  readonly evidence: WebDesignAgentToolEvidenceCollector
  readonly targets: Readonly<
    Record<DesignCandidateId, DesignCandidatePreviewTargetData>
  >
}

const FAILED_INVOCATION_STOP_REASONS = new Set([
  'cancelled',
  'limitTurns',
  'limitTotalTokens',
  'limitOutputTokens',
  'maxTokens',
  'modelContextWindowExceeded',
  'contentFiltered',
  'guardrailIntervened',
  'refusal',
])

export class WebDesignAgentRuntime implements IWebDesignAgentRuntime {
  private closed = false

  public constructor(
    private readonly director: IStrandsAgentRuntime,
    private readonly owned: readonly IStrandsAgentRuntime[],
    private readonly capabilities: WebDesignAgentCapabilityData,
    private readonly invocationPolicy: WebDesignAgentInvocationPolicyData =
      DEFAULT_WEB_DESIGN_AGENT_INVOCATION_POLICY,
    private readonly browserTargets = new WebDesignAgentBrowserTargetValidator(),
    private readonly parser = new DesignGenerationResultParser(),
    private readonly distance = new DesignDistanceEvaluator(),
    private readonly previewRuntime?: WebDesignAgentPreviewRuntime,
    private readonly previewBaseUrl?: string,
  ) {}

  public async generate(
    request: DesignGenerationRequest,
    cancelSignal?: AbortSignal,
  ): Promise<DesignGenerationResult> {
    this.assertOpen()

    const prompt = request.prompt.trim()
    if (prompt.length === 0) {
      throw new DesignResultValidationError('Design prompt must be non-blank.')
    }

    const normalizedRequest = await this.normalizeGenerationRequest({
      ...request,
      prompt,
      sourceMode: request.sourceMode ?? 'code-first',
    })

    if (this.requiresBrowser(normalizedRequest) && !this.capabilities.browser) {
      throw new DesignResultValidationError(
        'This design mode requires configured browser MCP capability so evidence is not fabricated.',
      )
    }

    let invocation = await this.invokeGeneration(normalizedRequest, '', cancelSignal)
    let result = invocation.result
    let check = this.distance.evaluate(result.candidates)

    if (!check.passed) {
      const pairs = check.pairs
        .filter((pair) => !pair.passed)
        .map(
          (pair) =>
            `${pair.left}/${pair.right}=${pair.distance.toFixed(3)}`,
        )
        .join(', ')

      invocation = await this.invokeGeneration(
        normalizedRequest,
        `\nDETERMINISTIC DIVERSITY FAILURE: ${pairs}. Regenerate complete A/B/C with greater structural distance.`,
        cancelSignal,
      )
      result = invocation.result
      check = this.distance.evaluate(result.candidates)

      if (!check.passed) {
        throw new DesignResultValidationError(
          'A/B/C candidates remained too similar after the allowed regeneration pass.',
        )
      }
    }

    this.validatePages(request.pages, result.candidates)

    const finalPreviewInspection = await this.inspectFinalCodeFirstCandidates(
      result.candidates,
      normalizedRequest,
      cancelSignal,
    )

    return this.applyRuntimeEvidence(
      result,
      invocation.evidence,
      normalizedRequest,
      finalPreviewInspection,
    )
  }

  public async refine(
    request: DesignRefinementRequest,
    cancelSignal?: AbortSignal,
  ): Promise<DesignCandidateData> {
    this.assertOpen()

    const feedback =
      request.feedback.trim() ||
      'No extra text feedback; preserve the slider-state preference exactly.'
    const invocation = await this.streamDirector(
      `OPERATION: refine-selected-candidate\nCandidate: ${JSON.stringify(request.candidate)}\nVisualState: ${JSON.stringify(request.visualState)}\nHuman feedback: ${feedback}\nInvoke only the matching candidate specialist then visual_critic. Return one complete candidate JSON object.`,
      cancelSignal,
    )
    const candidate = this.parser.parseCandidate(invocation.text)

    if (candidate.id !== request.candidate.id) {
      throw new DesignResultValidationError(
        `Refinement requested candidate ${request.candidate.id} but the agent returned candidate ${candidate.id}.`,
      )
    }

    return {
      ...candidate,
      browserEvidence: this.capabilities.browser
        ? invocation.evidence.browserEvidence(candidate.id)
        : [],
    }
  }

  public async createConcepts(
    prompt: string,
    cancelSignal?: AbortSignal,
  ): Promise<DesignConceptSetData> {
    this.assertOpen()

    const normalized = prompt.trim()
    if (normalized.length === 0) {
      throw new DesignResultValidationError('Concept prompt must be non-blank.')
    }
    if (!this.capabilities.conceptImages) {
      throw new DesignResultValidationError(
        'Concept-first image generation is not configured.',
      )
    }

    const invocation = await this.streamDirector(
      `OPERATION: concept-first\nPrompt: ${normalized}\nInvoke concept_artist, use its real image-provider results, and return exactly three real A/B/C concept results as JSON.`,
      cancelSignal,
    )
    const concepts = this.parser.parseConceptSet(invocation.text, normalized)

    if (!invocation.evidence.hasConceptProviderCall()) {
      throw new DesignResultValidationError(
        'Concept-first generation returned no successful runtime evidence from the configured image provider.',
      )
    }

    return {
      ...concepts,
      providerEvidence: invocation.evidence.conceptProviderEvidence(),
    }
  }

  public async close(): Promise<void> {
    if (this.closed) return

    this.closed = true
    const errors: unknown[] = []

    for (const runtime of [...this.owned]) {
      try {
        await runtime.close()
      } catch (error) {
        errors.push(error)
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        'One or more Web Design Agent runtimes failed to close.',
      )
    }
  }

  private async invokeGeneration(
    request: NormalizedDesignGenerationRequest,
    suffix = '',
    cancelSignal?: AbortSignal,
  ): Promise<ParsedGenerationInvocationData> {
    const invocation = await this.streamDirector(
      `${this.prompt(request)}${suffix}`,
      cancelSignal,
    )

    return {
      result: this.parser.parseGeneration(invocation.text),
      evidence: invocation.evidence,
    }
  }

  private async inspectFinalCodeFirstCandidates(
    candidates: readonly DesignCandidateData[],
    request: NormalizedDesignGenerationRequest,
    cancelSignal?: AbortSignal,
  ): Promise<FinalCandidatePreviewInspectionData | undefined> {
    if (
      request.sourceMode !== 'code-first' ||
      this.expectedBrowserTarget(request) !== undefined ||
      !this.capabilities.browser ||
      this.capabilities.finalCandidatePreview !== true ||
      this.previewRuntime === undefined ||
      this.previewBaseUrl === undefined
    ) {
      return undefined
    }

    const publication = this.previewRuntime.publish(
      candidates,
      this.previewBaseUrl,
    )
    const targets = publication.targets
    const lines = [
      'OPERATION: inspect-final-code-first-previews',
      'The runtime has already parsed and frozen the exact final candidate artifacts.',
      'Invoke candidate_a, candidate_b, and candidate_c. Tell each matching specialist to perform inspect-final-code-first-preview only.',
      'Each specialist must browser_navigate to its exact assigned URL and then run browser_snapshot or browser_take_screenshot on that page.',
      'Do not redesign, repair, rewrite, regenerate, or substitute any candidate or URL during this operation.',
      'The runtime will ignore prose claims and accept only observed browser lifecycle evidence bound to the exact URLs below.',
    ]

    for (const candidateId of ['A', 'B', 'C'] as const) {
      lines.push(
        `Candidate ${candidateId} final preview: ${targets[candidateId].url}`,
      )
    }

    lines.push('Return JSON only: {"inspected":["A","B","C"]}.')

    try {
      const inspection = await this.streamDirector(lines.join('\n'), cancelSignal)
      return {
        evidence: inspection.evidence,
        targets,
      }
    } finally {
      publication.close()
    }
  }

  private async streamDirector(
    prompt: string,
    cancelSignal?: AbortSignal,
  ): Promise<StreamedDirectorInvocationData> {
    const evidence = new WebDesignAgentToolEvidenceCollector()
    const timeoutSignal = AbortSignal.timeout(this.invocationPolicy.timeoutMs)
    const invocationSignal = cancelSignal === undefined
      ? timeoutSignal
      : AbortSignal.any([cancelSignal, timeoutSignal])
    const stream = this.director.streamAgent(prompt, {
      cancelSignal: invocationSignal,
      limits: {
        turns: this.invocationPolicy.maxTurns,
        outputTokens: this.invocationPolicy.maxOutputTokens,
        totalTokens: this.invocationPolicy.maxTotalTokens,
      },
    })

    while (true) {
      const next = await stream.next()
      if (next.done) {
        const stopReason = next.value.stopReason
        if (
          typeof stopReason === 'string' &&
          FAILED_INVOCATION_STOP_REASONS.has(stopReason)
        ) {
          throw new DesignResultValidationError(
            `Web Design Agent invocation stopped before a complete result was produced: ${stopReason}.`,
          )
        }

        return {
          text: next.value.toString(),
          evidence,
        }
      }

      evidence.record(next.value)
    }
  }

  private applyRuntimeEvidence(
    result: DesignGenerationResult,
    evidence: WebDesignAgentToolEvidenceCollector,
    request: NormalizedDesignGenerationRequest,
    finalPreviewInspection?: FinalCandidatePreviewInspectionData,
  ): DesignGenerationResult {
    const candidateIds: readonly DesignCandidateId[] = result.candidates.map(
      (candidate) => candidate.id,
    )
    const expectedBrowserTarget = this.expectedBrowserTarget(request)
    const sourceBoundBrowserValidation = expectedBrowserTarget !== undefined
    const missingSourceInspection = this.capabilities.browser
      ? evidence.missingBrowserInspection(candidateIds, expectedBrowserTarget)
      : candidateIds
    const observedBrowserInspection =
      this.capabilities.browser &&
      evidence.missingBrowserInspection(candidateIds).length === 0
    const missingFinalPreviewInspection =
      finalPreviewInspection === undefined
        ? candidateIds
        : candidateIds.filter(
            (candidateId) =>
              !finalPreviewInspection.evidence.hasBrowserInspection(
                candidateId,
                finalPreviewInspection.targets[candidateId].url,
              ),
          )
    const finalPreviewValidated =
      finalPreviewInspection !== undefined &&
      missingFinalPreviewInspection.length === 0
    const browserValidated =
      this.capabilities.browser &&
      (sourceBoundBrowserValidation
        ? missingSourceInspection.length === 0
        : finalPreviewValidated)
    const candidates = result.candidates.map((candidate) => {
      const browserEvidence = this.capabilities.browser
        ? [
            ...evidence.browserEvidence(candidate.id),
            ...(finalPreviewInspection?.evidence.browserEvidence(candidate.id) ?? []),
          ]
        : []

      return {
        ...candidate,
        browserEvidence: [...new Set(browserEvidence)].sort(),
      }
    })
    const notes = result.validation.notes.map(
      (note) => `Agent note (unverified): ${note}`,
    )

    if (!this.capabilities.browser) {
      notes.push(
        'Runtime evidence: browser validation was not executed because no browser MCP capability was configured.',
      )
    } else if (sourceBoundBrowserValidation && browserValidated) {
      notes.push(
        'Runtime evidence: successful browser inspection of the required source target was observed for candidates A, B, and C.',
      )
    } else if (sourceBoundBrowserValidation) {
      notes.push(
        `Runtime evidence: required browser inspection was not observed for candidates ${missingSourceInspection.join(', ')}.`,
      )
    } else if (finalPreviewValidated) {
      notes.push(
        'Runtime evidence: the exact final A/B/C artifacts were render-bound to content-addressed public previews and successfully inspected with browser tooling.',
      )
    } else if (finalPreviewInspection !== undefined) {
      const missing = missingFinalPreviewInspection.length === 1
        ? `candidate ${missingFinalPreviewInspection[0]}`
        : `candidates ${missingFinalPreviewInspection.join(', ')}`
      notes.push(
        `Runtime evidence: final render-bound content-addressed preview inspection was not observed for ${missing}; browserValidated remains false.`,
      )
    } else if (observedBrowserInspection) {
      notes.push(
        'Runtime evidence: browser activity was observed for candidates A, B, and C, but the final returned candidate implementations were not render-bound to content-addressed previews; browserValidated remains false.',
      )
    } else if (this.capabilities.finalCandidatePreview !== true) {
      notes.push(
        'Runtime evidence: final candidate preview publication is unavailable, so code-first output is not render-bound and browserValidated remains false.',
      )
    } else {
      notes.push(
        'Runtime evidence: final returned candidate implementations were not successfully render-bound and inspected, so code-first browserValidated remains false.',
      )
    }

    if (this.capabilities.components) {
      const missingComponentResearch =
        evidence.missingComponentResearch(candidateIds)

      if (missingComponentResearch.length === 0) {
        notes.push(
          'Runtime evidence: component research was observed for candidates A, B, and C.',
        )
      } else {
        notes.push(
          `Runtime evidence: component research was not observed for candidates ${missingComponentResearch.join(', ')}.`,
        )
      }
    }

    if (
      this.requiresBrowser(request) &&
      sourceBoundBrowserValidation &&
      missingSourceInspection.length > 0
    ) {
      throw new DesignResultValidationError(
        `This design mode requires successful browser inspection of its source for every candidate; missing runtime evidence for ${missingSourceInspection.join(', ')}.`,
      )
    }

    return {
      ...result,
      prompt: request.prompt,
      intent: {
        ...result.intent,
        sourceMode: request.sourceMode,
      },
      candidates,
      validation: {
        designDistancePassed: true,
        browserValidated,
        notes,
      },
    }
  }

  private async normalizeGenerationRequest(
    request: NormalizedDesignGenerationRequest,
  ): Promise<NormalizedDesignGenerationRequest> {
    if (
      request.sourceMode === 'reference-image' &&
      (request.referenceImageUrl === undefined ||
        request.referenceImageUrl.trim().length === 0)
    ) {
      throw new DesignResultValidationError(
        'reference-image mode requires referenceImageUrl.',
      )
    }

    if (
      request.sourceMode === 'existing-site' &&
      (request.targetUrl === undefined || request.targetUrl.trim().length === 0)
    ) {
      throw new DesignResultValidationError(
        'existing-site mode requires targetUrl.',
      )
    }

    if (
      request.sourceMode === 'concept-first' &&
      request.selectedConcept === undefined
    ) {
      throw new DesignResultValidationError(
        'concept-first mode requires a selectedConcept.',
      )
    }

    const referenceImageUrl =
      request.referenceImageUrl === undefined
        ? undefined
        : await this.browserTargets.validate(
            request.referenceImageUrl,
            'referenceImageUrl',
          )
    const targetUrl =
      request.targetUrl === undefined
        ? undefined
        : await this.browserTargets.validate(request.targetUrl, 'targetUrl')
    const selectedConcept =
      request.selectedConcept === undefined
        ? undefined
        : {
            ...request.selectedConcept,
            imageUrl: await this.browserTargets.validate(
              request.selectedConcept.imageUrl,
              'selectedConcept.imageUrl',
            ),
          }

    return {
      ...request,
      ...(referenceImageUrl === undefined ? {} : {referenceImageUrl}),
      ...(targetUrl === undefined ? {} : {targetUrl}),
      ...(selectedConcept === undefined ? {} : {selectedConcept}),
    }
  }

  private expectedBrowserTarget(
    request: NormalizedDesignGenerationRequest,
  ): string | undefined {
    if (request.targetUrl !== undefined) return request.targetUrl
    if (request.sourceMode === 'reference-image') return request.referenceImageUrl
    if (request.sourceMode === 'concept-first') {
      return request.selectedConcept?.imageUrl
    }
    return undefined
  }

  private prompt(request: NormalizedDesignGenerationRequest): string {
    const lines = [
      'OPERATION: generate-real-abc',
      `Prompt: ${request.prompt}`,
      `Source mode: ${request.sourceMode}`,
      `Capabilities: ${JSON.stringify(this.capabilities)}`,
      'Infer the hidden brief. Create distinct Design Genomes, invoke all candidate specialists, critique real outputs, repair with evidence, and return generation JSON.',
    ]

    if (request.referenceImageUrl) {
      lines.push(
        `Reference image URL: ${request.referenceImageUrl}`,
        'Each candidate must navigate to and inspect this exact validated public reference target before claiming source-grounded browser evidence.',
      )
    }
    if (request.targetUrl) {
      lines.push(
        `Existing site target URL: ${request.targetUrl}`,
        'Each candidate must navigate to and inspect this exact validated public target before claiming source-grounded browser evidence.',
      )
    }
    if (request.selectedConcept) {
      lines.push(
        `Selected concept: ${JSON.stringify(request.selectedConcept)}`,
        `Selected concept image target: ${request.selectedConcept.imageUrl}`,
        'Each candidate must navigate to and inspect this exact validated concept image target before claiming concept-grounded browser evidence.',
      )
    }
    if (request.pages?.length) {
      lines.push(`Requested pages: ${JSON.stringify(request.pages)}`)
    }
    if (request.preferenceProfile) {
      lines.push(
        `Portable preference profile: ${JSON.stringify(request.preferenceProfile)}`,
      )
    }

    return lines.join('\n')
  }

  private requiresBrowser(
    request: Pick<DesignGenerationRequest, 'sourceMode' | 'targetUrl'>,
  ): boolean {
    return (
      request.sourceMode === 'reference-image' ||
      request.sourceMode === 'existing-site' ||
      request.sourceMode === 'concept-first' ||
      request.targetUrl !== undefined
    )
  }

  private validatePages(
    requested: readonly string[] | undefined,
    candidates: readonly DesignCandidateData[],
  ): void {
    if (requested === undefined) return

    const required = requested
      .map((path) => path.trim())
      .filter((path) => path.length > 0 && path !== '/')

    for (const candidate of candidates) {
      const actual = new Set(candidate.pages.map((page) => page.path))
      const missing = required.filter((path) => !actual.has(path))

      if (missing.length > 0) {
        throw new DesignResultValidationError(
          `Candidate ${candidate.id} is missing requested page routes: ${missing.join(', ')}`,
        )
      }
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('Web Design Agent runtime is closed.')
    }
  }
}
