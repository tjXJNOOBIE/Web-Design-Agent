import type { StrandsAgentRuntimeConfig } from '@tjxjnoobie/custom-strands-bridge'

import { WEB_DESIGN_AGENT_SYSTEM_PROMPT } from '../prompt/WebDesignAgentSystemPrompt.js'

export type WebDesignAgentEnvironment = Readonly<Record<string, string | undefined>>

export class WebDesignAgentRuntimeConfigBuilder {
  private readonly environment: WebDesignAgentEnvironment

  public constructor(environment: WebDesignAgentEnvironment = process.env) {
    this.environment = environment
  }

  public build(): StrandsAgentRuntimeConfig {
    const modelId = this.optionalString(this.environment['WEB_DESIGN_AGENT_MODEL_ID'])
    const mcpUrl = this.optionalString(this.environment['WEB_DESIGN_AGENT_MCP_URL'])

    const authorization = this.optionalString(
      this.environment['WEB_DESIGN_AGENT_MCP_AUTHORIZATION'],
    )

    const runtimeConfig: StrandsAgentRuntimeConfig = {
      agent: {
        id: 'web-design-agent',
        name: 'Web Design Agent',
        systemPrompt: WEB_DESIGN_AGENT_SYSTEM_PROMPT,
        printer: false,
        traceAttributes: {
          product: 'web-design-agent',
          hackathonTrack: 'Professional',
        },
        ...(modelId === undefined ? {} : { model: modelId }),
      },
      ...(mcpUrl === undefined
        ? {}
        : {
            mcpServers: {
              product: {
                url: mcpUrl,
                ...(authorization === undefined
                  ? {}
                  : { headers: { Authorization: authorization } }),
              },
            },
            mcpDefaults: {
              applicationName: 'web-design-agent',
              applicationVersion: '0.1.0',
            },
          }),
    }

    return runtimeConfig
  }

  private optionalString(value: string | undefined): string | undefined {
    if (value === undefined) {
      return undefined
    }

    const normalizedValue = value.trim()

    return normalizedValue.length === 0 ? undefined : normalizedValue
  }
}
