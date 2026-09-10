import type {DesignCandidateData} from '../../design/data/DesignCandidateData.js'
import type {DesignConceptSetData} from '../../design/data/DesignConceptData.js'
import type {DesignGenerationRequest} from '../../design/data/DesignGenerationRequest.js'
import type {DesignGenerationResult} from '../../design/data/DesignGenerationResult.js'
import type {DesignRefinementRequest} from '../../design/data/DesignRefinementRequest.js'

export interface IWebDesignAgentRuntime {
  generate(
    request: DesignGenerationRequest,
    cancelSignal?: AbortSignal,
  ): Promise<DesignGenerationResult>

  refine(
    request: DesignRefinementRequest,
    cancelSignal?: AbortSignal,
  ): Promise<DesignCandidateData>

  createConcepts(
    prompt: string,
    cancelSignal?: AbortSignal,
  ): Promise<DesignConceptSetData>

  close(): Promise<void>
}
