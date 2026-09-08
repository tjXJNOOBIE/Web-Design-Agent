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

export const DEFAULT_WEB_DESIGN_AGENT_MODEL_ID =
  'global.anthropic.claude-sonnet-4-6'

type WebDesignAgentMcpServerMap = Exclude<
  NonNullable<StrandsAgentRuntimeConfig['mcpServers']>,
  string
>

interface WebDesignAgentRuntimeToolPolicy {
  readonly components: boolean
  readonly browser: boolean
  readonly conceptImages: boolean
}

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
      {components: false, browser: false, conceptImages: false},
    )
  }

  public buildCandidate(id: 'A' | 'B' | 'C'): StrandsAgentRuntimeConfig {
    return this.buildRuntime(
      `web-design-agent-candidate-${id.toLowerCase()}`,
      `Web Design Candidate ${id}`,
      buildWebDesignCandidateSystemPrompt(id),
      [],
      {components: true, browser: true, conceptImages: false},
    )
  }

  public buildCritic(): StrandsAgentRuntimeConfig {
    return this.buildRuntime(
      'web-design-agent-critic',
      'Web Design Agent Visual Critic',
      WEB_DESIGN_AGENT_CRITIC_SYSTEM_PROMPT,
      [],
      {components: false, browser: false, conceptImages: false},
    )
  }

  public buildConcept(): StrandsAgentRuntimeConfig {
    return this.buildRuntime(
      'web-design-agent-concept',
      'Web Design Agent Concept Artist',
      WEB_DESIGN_AGENT_CONCEPT_SYSTEM_PROMPT,
      [],
      {components: false, browser: false, conceptImages: true},
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
    toolPolicy: WebDesignAgentRuntimeToolPolicy,
  ): StrandsAgentRuntimeConfig {
    const model =
      this.optionalString(this.environment['WEB_DESIGN_AGENT_MODEL_ID']) ??
      DEFAULT_WEB_DESIGN_AGENT_MODEL_ID
    const mcpServers: WebDesignAgentMcpServerMap = {}

    if (toolPolicy.components) this.addComponentServer(mcpServers)
    if (toolPolicy.browser) this.addBrowserServer(mcpServers)
    if (toolPolicy.conceptImages) this.addConceptImageServer(mcpServers)

    return {
      agent: {
        id,
        name,
        model,
        systemPrompt,
        printer: false,
        ...(tools.length === 0 ? {} : {tools: [...tools]}),
        traceAttributes: {product: 'web-design-agent', role: id},
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
    if (apiKey === undefined) return

    mcpServers['components'] = {
      url:
        this.optionalString(this.environment['WEB_DESIGN_AGENT_21ST_MCP_URL']) ??
        'https://21st.dev/api/mcp',
      headers: {'x-api-key': apiKey},
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
          : {headers: {Authorization: authorization}}),
        continueOnError: false,
      }
      return
    }

    if (!this.optionalBoolean(this.environment['WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT'])) {
      return
    }

    const playwrightEnvironment = this.buildPlaywrightEnvironment()

    mcpServers['browser'] = {
      command:
        this.optionalString(
          this.environment['WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_COMMAND'],
        ) ?? 'npx',
      args: this.buildPlaywrightArgs(),
      ...(playwrightEnvironment === undefined ? {} : {env: playwrightEnvironment}),
      continueOnError: false,
    }
  }

  private buildPlaywrightArgs(): string[] {
    const packageSpec =
      this.optionalString(
        this.environment['WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_PACKAGE'],
      ) ?? '@playwright/mcp@0.0.80'
    const executablePath = this.optionalString(
      this.environment['WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH'],
    )

    return [
      '-y',
      packageSpec,
      ...(executablePath === undefined
        ? ['--browser=chromium']
        : [`--executable-path=${executablePath}`]),
      '--headless',
      '--isolated',
    ]
  }

  private buildPlaywrightEnvironment(): Record<string, string> | undefined {
    const browsersPath =
      this.optionalString(
        this.environment['WEB_DESIGN_AGENT_PLAYWRIGHT_BROWSERS_PATH'],
      ) ?? this.optionalString(this.environment['PLAYWRIGHT_BROWSERS_PATH'])

    if (browsersPath === undefined) return undefined

    return {
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
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
        : {headers: {Authorization: authorization}}),
      prefix: 'assets',
      continueOnError: false,
    }
  }

  private optionalString(value: string | undefined): string | undefined {
    if (value === undefined) return undefined
    const normalized = value.trim()
    return normalized.length === 0 ? undefined : normalized
  }

  private optionalBoolean(value: string | undefined): boolean {
    const normalized = value?.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
}
