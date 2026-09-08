import type {WebDesignAgentRuntimeBuilder} from '../../agent/runtime/WebDesignAgentRuntimeBuilder.js'
import type {DesignCandidateData} from '../data/DesignCandidateData.js'
import type {DesignConceptSetData} from '../data/DesignConceptData.js'
import type {DesignGenerationRequest} from '../data/DesignGenerationRequest.js'
import type {DesignGenerationResult} from '../data/DesignGenerationResult.js'
import type {DesignRefinementRequest} from '../data/DesignRefinementRequest.js'
import type {IWebDesignAgentWorkflowHandler} from './IWebDesignAgentWorkflowHandler.js'
export class WebDesignAgentWorkflowHandler implements IWebDesignAgentWorkflowHandler{public constructor(private readonly runtimeBuilder:WebDesignAgentRuntimeBuilder){}public async generate(request:DesignGenerationRequest):Promise<DesignGenerationResult>{return this.withRuntime(runtime=>runtime.generate(request))}public async refine(request:DesignRefinementRequest):Promise<DesignCandidateData>{return this.withRuntime(runtime=>runtime.refine(request))}public async createConcepts(prompt:string):Promise<DesignConceptSetData>{return this.withRuntime(runtime=>runtime.createConcepts(prompt))}private async withRuntime<T>(operation:(runtime:Awaited<ReturnType<WebDesignAgentRuntimeBuilder['build']>>)=>Promise<T>):Promise<T>{const runtime=await this.runtimeBuilder.build();try{return await operation(runtime)}finally{await runtime.close()}}}
