import type {WebDesignAgentRuntimeBuilder} from '../../agent/runtime/WebDesignAgentRuntimeBuilder.js'
import type {DesignCandidateData} from '../data/DesignCandidateData.js'
import type {DesignConceptSetData} from '../data/DesignConceptData.js'
import type {DesignGenerationRequest} from '../data/DesignGenerationRequest.js'
import type {DesignGenerationResult} from '../data/DesignGenerationResult.js'
import type {DesignRefinementRequest} from '../data/DesignRefinementRequest.js'
import type {IWebDesignAgentWorkflowHandler} from './IWebDesignAgentWorkflowHandler.js'

type OperationOutcome<T> =
  | {readonly succeeded: true; readonly value: T}
  | {readonly succeeded: false; readonly error: unknown}

export class WebDesignAgentWorkflowHandler implements IWebDesignAgentWorkflowHandler {
  public constructor(private readonly runtimeBuilder: WebDesignAgentRuntimeBuilder) {}

  public async generate(
    request: DesignGenerationRequest,
    cancelSignal?: AbortSignal,
  ): Promise<DesignGenerationResult> {
    return this.withRuntime((runtime) => runtime.generate(request, cancelSignal))
  }

  public async refine(
    request: DesignRefinementRequest,
    cancelSignal?: AbortSignal,
  ): Promise<DesignCandidateData> {
    return this.withRuntime((runtime) => runtime.refine(request, cancelSignal))
  }

  public async createConcepts(
    prompt: string,
    cancelSignal?: AbortSignal,
  ): Promise<DesignConceptSetData> {
    return this.withRuntime((runtime) => runtime.createConcepts(prompt, cancelSignal))
  }

  private async withRuntime<T>(
    operation: (
      runtime: Awaited<ReturnType<WebDesignAgentRuntimeBuilder['build']>>,
    ) => Promise<T>,
  ): Promise<T> {
    const runtime = await this.runtimeBuilder.build()
    let outcome: OperationOutcome<T>

    try {
      outcome = {succeeded: true, value: await operation(runtime)}
    } catch (error) {
      outcome = {succeeded: false, error}
    }

    let cleanupError: unknown
    try {
      await runtime.close()
    } catch (error) {
      cleanupError = error
    }

    if (!outcome.succeeded) {
      if (cleanupError !== undefined) {
        throw new AggregateError(
          [outcome.error, cleanupError],
          'Web Design Agent operation and runtime cleanup both failed.',
          {cause: outcome.error},
        )
      }

      throw outcome.error
    }

    if (cleanupError !== undefined) {
      throw cleanupError
    }

    return outcome.value
  }
}
