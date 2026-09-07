import type { IStrandsAgentRuntimeBootstrap } from '@tjxjnoobie/custom-strands-bridge'

import type { WebDesignAgentRuntimeConfigBuilder } from '../agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import { WebDesignAgentCliInputError } from './error/WebDesignAgentCliInputError.js'

export class WebDesignAgentCliHandler {
  private readonly agentRuntimeBootstrap: IStrandsAgentRuntimeBootstrap
  private readonly runtimeConfigBuilder: WebDesignAgentRuntimeConfigBuilder

  public constructor(
    agentRuntimeBootstrap: IStrandsAgentRuntimeBootstrap,
    runtimeConfigBuilder: WebDesignAgentRuntimeConfigBuilder,
  ) {
    this.agentRuntimeBootstrap = agentRuntimeBootstrap
    this.runtimeConfigBuilder = runtimeConfigBuilder
  }

  public async handle(request: string): Promise<string> {
    const normalizedRequest = request.trim()

    if (normalizedRequest.length === 0) {
      throw new WebDesignAgentCliInputError()
    }

    const agentRuntime = await this.agentRuntimeBootstrap.createAgentRuntime(
      this.runtimeConfigBuilder.build(),
    )

    try {
      const result = await agentRuntime.invokeAgent(normalizedRequest)

      return result.toString()
    } finally {
      await agentRuntime.close()
    }
  }
}
