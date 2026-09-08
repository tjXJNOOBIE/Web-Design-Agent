import type {DesignGenerationRequest} from '../design/data/DesignGenerationRequest.js'
import type {IWebDesignAgentWorkflowHandler} from '../design/handler/IWebDesignAgentWorkflowHandler.js'
import {WebDesignAgentCliInputError} from './error/WebDesignAgentCliInputError.js'
export class WebDesignAgentCliHandler{public constructor(private readonly workflow:IWebDesignAgentWorkflowHandler){}public async handle(request:DesignGenerationRequest):Promise<string>{const prompt=request.prompt.trim();if(!prompt)throw new WebDesignAgentCliInputError();return JSON.stringify(await this.workflow.generate({...request,prompt}),null,2)}}
