import type {DesignCandidateData} from '../../design/data/DesignCandidateData.js'
import type {DesignConceptSetData} from '../../design/data/DesignConceptData.js'
import type {DesignGenerationRequest} from '../../design/data/DesignGenerationRequest.js'
import type {DesignGenerationResult} from '../../design/data/DesignGenerationResult.js'
import type {DesignRefinementRequest} from '../../design/data/DesignRefinementRequest.js'
export interface IWebDesignAgentRuntime{generate(request:DesignGenerationRequest):Promise<DesignGenerationResult>;refine(request:DesignRefinementRequest):Promise<DesignCandidateData>;createConcepts(prompt:string):Promise<DesignConceptSetData>;close():Promise<void>}
