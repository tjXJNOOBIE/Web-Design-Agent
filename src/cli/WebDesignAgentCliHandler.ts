import type {DesignGenerationRequest} from '../design/data/DesignGenerationRequest.js'
import type {IWebDesignAgentWorkflowHandler} from '../design/handler/IWebDesignAgentWorkflowHandler.js'
import {WEB_DESIGN_AGENT_REQUEST_LIMITS} from '../design/validation/WebDesignAgentRequestLimits.js'
import {WebDesignAgentCliInputError} from './error/WebDesignAgentCliInputError.js'

export class WebDesignAgentCliHandler {
  public constructor(
    private readonly workflow: IWebDesignAgentWorkflowHandler,
  ) {}

  public async handle(request: DesignGenerationRequest): Promise<string> {
    const prompt = request.prompt.trim()
    if (prompt.length === 0) {
      throw new WebDesignAgentCliInputError()
    }
    if (prompt.length > WEB_DESIGN_AGENT_REQUEST_LIMITS.promptCharacters) {
      throw new WebDesignAgentCliInputError(
        `Web Design Agent requests are limited to ${WEB_DESIGN_AGENT_REQUEST_LIMITS.promptCharacters} characters.`,
      )
    }

    return JSON.stringify(
      await this.workflow.generate({...request, prompt}),
      null,
      2,
    )
  }
}
