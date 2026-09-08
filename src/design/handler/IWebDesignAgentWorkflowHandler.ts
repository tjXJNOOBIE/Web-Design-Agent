import type {DesignCandidateData} from '../data/DesignCandidateData.js'
import type {DesignConceptSetData} from '../data/DesignConceptData.js'
import type {DesignGenerationRequest} from '../data/DesignGenerationRequest.js'
import type {DesignGenerationResult} from '../data/DesignGenerationResult.js'
import type {DesignRefinementRequest} from '../data/DesignRefinementRequest.js'
export interface IWebDesignAgentWorkflowHandler{generate(request:DesignGenerationRequest):Promise<DesignGenerationResult>;refine(request:DesignRefinementRequest):Promise<DesignCandidateData>;createConcepts(prompt:string):Promise<DesignConceptSetData>}
