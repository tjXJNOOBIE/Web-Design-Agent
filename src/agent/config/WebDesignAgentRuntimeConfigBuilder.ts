import type {
  IStrandsAgentRuntime,
  StrandsAgentRuntimeConfig,
} from '@tjxjnoobie/strands-bridge'

import {
  WEB_DESIGN_AGENT_CONCEPT_SYSTEM_PROMPT,
  WEB_DESIGN_AGENT_CRITIC_SYSTEM_PROMPT,
  WEB_DESIGN_AGENT_DIRECTOR_SYSTEM_PROMPT,
  buildWebDesignCandidateSystemPrompt,
} from '../prompt/WebDesignAgentSystemPrompt.js'

export type WebDesignAgentEnvironment = Readonly<Record<string, string | undefined>>
export type WebDesignAgentTool = ReturnType<IStrandsAgentRuntime['createAgentTool']>

type WebDesignAgentMcpServerMap = Exclude<
  NonNullable<StrandsAgentRuntimeConfig['mcpServers']>,
  string
>

export interface WebDesignAgentCapabilityData {
  readonly components: boolean
  readonly browser: boolean
  readonly conceptImages: boolean
}

export class WebDesignAgentRuntimeConfigBuilder {
  public constructor(
    private readonly environment: WebDesignAgentEnvironment = process.env,
  ) {}

  public capabilities(): WebDesignAgentCapabilityData {
    return {
      components: this.optionalString(this.environment['API_KEY_21ST']) !== undefined,
      browser:
        this.optionalString(this.environment['WEB_DESIGN_AGENT_BROWSER_MCP_URL']) !== undefined ||
        this.optionalBoolean(this.environment['WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT']),
      conceptImages: this.optionalBoolean(
        this.environment['WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD'],
      ),
    }
  }

  public buildDirector(
    agentTools: readonly WebDesignAgentTool[] = [],
  ): StrandsAgentRuntimeConfig {
    return this.buildRuntime(
      'web-design-agent-director',
      'Web Design Agent Director',
      WEB_DESIGN_AGENT_DIRECTOR_SYSTEM_PROMPT,
      agentTools,
      false,
    )
  }

  public buildCandidate(id: 'A' | 'B' | 'C'): StrandsAgentRuntimeConfig {
    return this.buildRuntime(
      `web-design-agent-candidate-${id.toLowerCase()}`,
      `Web Design Candidate ${id}`,
      buildWebDesignCandidateSystemPrompt(id),
      [],
      false,
    )
  }

  public buildCritic(): StrandsAgentRuntimeConfig {
    return this.buildRuntime(
      'web-design-agent-critic',
      'Web Design Agent Visual Critic',
      WEB_DESIGN_AGENT_CRITIC_SYSTEM_PROMPT,
      [],
      false,
    )
  }

  public buildConcept(): StrandsAgentRuntimeConfig {
    return this.buildRuntime(
      'web-design-agent-concept',
      'Web Design Agent Concept Artist',
      WEB_DESIGN_AGENT_CONCEPT_SYSTEM_PROMPT,
      [],
      true,
    )
  }

  public build(): StrandsAgentRuntimeConfig {
    return this.buildDirector()
  }

  private buildRuntime(
    id: string,
    name: string,
    systemPrompt: string,
    tools: readonly WebDesignAgentTool[],
    includeConceptImages: boolean,
  ): StrandsAgentRuntimeConfig {
    const model = this.optionalString(this.environment['WEB_DESIGN_AGENT_MODEL_ID'])
    const mcpServers: WebDesignAgentMcpServerMap = {}

    this.addComponentServer(mcpServers)
    this.addBrowserServer(mcpServers)

    if (includeConceptImages) {
      this.addConceptImageServer(mcpServers)
    }

    return {
      agent: {
        id,
        name,
        systemPrompt,
        printer: false,
        ...(tools.length === 0 ? {} : { tools: [...tools] }),
        ...(model === undefined ? {} : { model }),
        traceAttributes: {
          product: 'web-design-agent',
          role: id,
        },
      },
      ...(Object.keys(mcpServers).length === 0
        ? {}
        : {
            mcpServers,
            mcpDefaults: {
              applicationName: 'web-design-agent',
              applicationVersion: '0.2.0',
              continueOnError: true,
            },
          }),
    }
  }

  private addComponentServer(mcpServers: WebDesignAgentMcpServerMap): void {
    const apiKey = this.optionalString(this.environment['API_KEY_21ST'])
    if (apiKey === undefined) {
      return
    }

    mcpServers['components'] = {
      url:
        this.optionalString(this.environment['WEB_DESIGN_AGENT_21ST_MCP_URL']) ??
        'https://21st.dev/api/mcp',
      headers: {
        'x-api-key': apiKey,
      },
      prefix: 'components',
      continueOnError: true,
    }
  }

  private addBrowserServer(mcpServers: WebDesignAgentMcpServerMap): void {
    const browserUrl = this.optionalString(
      this.environment['WEB_DESIGN_AGENT_BROWSER_MCP_URL'],
    )

    if (browserUrl !== undefined) {
      const authorization = this.optionalString(
        this.environment['WEB_DESIGN_AGENT_BROWSER_MCP_AUTHORIZATION'],
      )

      mcpServers['browser'] = {
        url: browserUrl,
        ...(authorization === undefined
          ? {}
          : {
              headers: {
                Authorization: authorization,
              },
            }),
        prefix: 'browser',
        continueOnError: false,
      }
      return
    }

    if (!this.optionalBoolean(this.environment['WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT'])) {
      return
    }

    mcpServers['browser'] = {
      command:
        this.optionalString(
          this.environment['WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_COMMAND'],
        ) ?? 'npx',
      args: [
        '-y',
        this.optionalString(
          this.environment['WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_PACKAGE'],
        ) ?? '@playwright/mcp@0.0.80',
        '--headless',
        '--isolated',
      ],
      prefix: 'browser',
      continueOnError: false,
    }
  }

  private addConceptImageServer(mcpServers: WebDesignAgentMcpServerMap): void {
    if (!this.optionalBoolean(this.environment['WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD'])) {
      return
    }

    const authorization = this.optionalString(
      this.environment['WEB_DESIGN_AGENT_HIGGSFIELD_MCP_AUTHORIZATION'],
    )

    mcpServers['higgsfield'] = {
      url:
        this.optionalString(
          this.environment['WEB_DESIGN_AGENT_HIGGSFIELD_MCP_URL'],
        ) ?? 'https://mcp.higgsfield.ai/mcp',
      ...(authorization === undefined
        ? {}
        : {
            headers: {
              Authorization: authorization,
            },
          }),
      prefix: 'assets',
      continueOnError: false,
    }
  }

  private optionalString(value: string | undefined): string | undefined {
    if (value === undefined) {
      return undefined
    }

    const normalized = value.trim()
    return normalized.length === 0 ? undefined : normalized
  }

  private optionalBoolean(value: string | undefined): boolean {
    const normalized = value?.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
}
