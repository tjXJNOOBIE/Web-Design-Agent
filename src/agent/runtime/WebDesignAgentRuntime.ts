import type { IStrandsAgentRuntime } from '@tjxjnoobie/strands-bridge'

import type { WebDesignAgentCapabilityData } from '../config/WebDesignAgentRuntimeConfigBuilder.js'
import { WebDesignAgentToolEvidenceCollector } from '../evidence/WebDesignAgentToolEvidenceCollector.js'
import type { IWebDesignAgentRuntime } from './IWebDesignAgentRuntime.js'
import type {
  DesignCandidateData,
  DesignCandidateId,
} from '../../design/data/DesignCandidateData.js'
import type { DesignConceptSetData } from '../../design/data/DesignConceptData.js'
import type { DesignGenerationRequest } from '../../design/data/DesignGenerationRequest.js'
import type { DesignGenerationResult } from '../../design/data/DesignGenerationResult.js'
import type { DesignRefinementRequest } from '../../design/data/DesignRefinementRequest.js'
import { DesignDistanceEvaluator } from '../../design/validation/DesignDistanceEvaluator.js'
import { DesignGenerationResultParser } from '../../design/validation/DesignGenerationResultParser.js'
import { DesignResultValidationError } from '../../design/validation/DesignResultValidationError.js'

interface StreamedDirectorInvocationData {
  readonly text: string
  readonly evidence: WebDesignAgentToolEvidenceCollector
}

interface ParsedGenerationInvocationData {
  readonly result: DesignGenerationResult
  readonly evidence: WebDesignAgentToolEvidenceCollector
}

export class WebDesignAgentRuntime implements IWebDesignAgentRuntime {
  private closed = false

  public constructor(
    private readonly director: IStrandsAgentRuntime,
    private readonly owned: readonly IStrandsAgentRuntime[],
    private readonly capabilities: WebDesignAgentCapabilityData,
    private readonly parser = new DesignGenerationResultParser(),
    private readonly distance = new DesignDistanceEvaluator(),
  ) {}

  public async generate(
    request: DesignGenerationRequest,
  ): Promise<DesignGenerationResult> {
    this.assertOpen()

    const prompt = request.prompt.trim()
    if (prompt.length === 0) {
      throw new DesignResultValidationError('Design prompt must be non-blank.')
    }

    const sourceMode = request.sourceMode ?? 'code-first'
    const normalizedRequest = {
      ...request,
      prompt,
      sourceMode,
    }

    if (this.requiresBrowser(normalizedRequest) && !this.capabilities.browser) {
      throw new DesignResultValidationError(
        'This design mode requires configured browser MCP capability so evidence is not fabricated.',
      )
    }

    let invocation = await this.invokeGeneration(normalizedRequest)
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

    return this.applyRuntimeEvidence(
      result,
      invocation.evidence,
      normalizedRequest,
    )
  }

  public async refine(
    request: DesignRefinementRequest,
  ): Promise<DesignCandidateData> {
    this.assertOpen()

    const feedback =
      request.feedback.trim() ||
      'No extra text feedback; preserve the slider-state preference exactly.'
    const invocation = await this.streamDirector(
      `OPERATION: refine-selected-candidate\nCandidate: ${JSON.stringify(request.candidate)}\nVisualState: ${JSON.stringify(request.visualState)}\nHuman feedback: ${feedback}\nInvoke only the matching candidate specialist then visual_critic. Return one complete candidate JSON object.`,
    )
    const candidate = this.parser.parseCandidate(invocation.text)

    return {
      ...candidate,
      browserEvidence: this.capabilities.browser
        ? invocation.evidence.browserEvidence(candidate.id)
        : [],
    }
  }

  public async createConcepts(prompt: string): Promise<DesignConceptSetData> {
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

    return this.parser.parseConceptSet(
      (
        await this.director.invokeAgent(
          `OPERATION: concept-first\nPrompt: ${normalized}\nInvoke concept_artist and return exactly three real A/B/C concept results as JSON.`,
        )
      ).toString(),
      normalized,
    )
  }

  public async close(): Promise<void> {
    if (this.closed) {
      return
    }

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
    request: DesignGenerationRequest & {
      prompt: string
      sourceMode: NonNullable<DesignGenerationRequest['sourceMode']>
    },
    suffix = '',
  ): Promise<ParsedGenerationInvocationData> {
    const invocation = await this.streamDirector(`${this.prompt(request)}${suffix}`)

    return {
      result: this.parser.parseGeneration(invocation.text),
      evidence: invocation.evidence,
    }
  }

  private async streamDirector(
    prompt: string,
  ): Promise<StreamedDirectorInvocationData> {
    const evidence = new WebDesignAgentToolEvidenceCollector()
    const stream = this.director.streamAgent(prompt)

    while (true) {
      const next = await stream.next()
      if (next.done) {
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
    request: DesignGenerationRequest & {
      prompt: string
      sourceMode: NonNullable<DesignGenerationRequest['sourceMode']>
    },
  ): DesignGenerationResult {
    const candidateIds: readonly DesignCandidateId[] = result.candidates.map(
      (candidate) => candidate.id,
    )
    const missingBrowserInspection = this.capabilities.browser
      ? evidence.missingBrowserInspection(candidateIds)
      : candidateIds
    const browserValidated =
      this.capabilities.browser && missingBrowserInspection.length === 0
    const candidates = result.candidates.map((candidate) => ({
      ...candidate,
      browserEvidence: this.capabilities.browser
        ? evidence.browserEvidence(candidate.id)
        : [],
    }))
    const notes = result.validation.notes.map(
      (note) => `Agent note (unverified): ${note}`,
    )

    if (!this.capabilities.browser) {
      notes.push(
        'Runtime evidence: browser validation was not executed because no browser MCP capability was configured.',
      )
    } else if (browserValidated) {
      notes.push(
        'Runtime evidence: successful browser inspection was observed for candidates A, B, and C.',
      )
    } else {
      notes.push(
        `Runtime evidence: successful browser inspection was not observed for candidates ${missingBrowserInspection.join(', ')}.`,
      )
    }

    if (this.requiresBrowser(request) && !browserValidated) {
      throw new DesignResultValidationError(
        `This design mode requires successful browser inspection for every candidate; missing runtime evidence for ${missingBrowserInspection.join(', ')}.`,
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

  private prompt(
    request: DesignGenerationRequest & {
      prompt: string
      sourceMode: NonNullable<DesignGenerationRequest['sourceMode']>
    },
  ): string {
    const lines = [
      'OPERATION: generate-real-abc',
      `Prompt: ${request.prompt}`,
      `Source mode: ${request.sourceMode}`,
      `Capabilities: ${JSON.stringify(this.capabilities)}`,
      'Infer the hidden brief. Create distinct Design Genomes, invoke all candidate specialists, critique real outputs, repair with evidence, and return generation JSON.',
    ]

    if (request.referenceImageUrl) {
      lines.push(`Reference image URL: ${request.referenceImageUrl}`)
    }
    if (request.targetUrl) {
      lines.push(`Existing site target URL: ${request.targetUrl}`)
    }
    if (request.selectedConcept) {
      lines.push(`Selected concept: ${JSON.stringify(request.selectedConcept)}`)
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
    request: Pick<
      DesignGenerationRequest,
      'sourceMode' | 'targetUrl'
    >,
  ): boolean {
    return (
      request.sourceMode === 'reference-image' ||
      request.sourceMode === 'existing-site' ||
      request.targetUrl !== undefined
    )
  }

  private validatePages(
    requested: readonly string[] | undefined,
    candidates: readonly DesignCandidateData[],
  ): void {
    if (requested === undefined) {
      return
    }

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
