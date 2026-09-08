import type {
  IStrandsAgentRuntime,
  IStrandsAgentRuntimeBootstrap,
} from '@tjxjnoobie/strands-bridge'

import type {
  WebDesignAgentCapabilityData,
} from '../config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntimeConfigBuilder} from '../config/WebDesignAgentRuntimeConfigBuilder.js'
import type {WebDesignAgentPreviewRuntime} from '../../design/preview/WebDesignAgentPreviewRuntime.js'
import type {IWebDesignAgentRuntime} from './IWebDesignAgentRuntime.js'
import {WebDesignAgentRuntime} from './WebDesignAgentRuntime.js'

export class WebDesignAgentRuntimeBuilder {
  public constructor(
    private readonly bootstrap: IStrandsAgentRuntimeBootstrap,
    private readonly config: WebDesignAgentRuntimeConfigBuilder,
    private readonly previewRuntime?: WebDesignAgentPreviewRuntime,
    private readonly previewBaseUrl?: string,
  ) {}

  public capabilities(): WebDesignAgentCapabilityData {
    const configured = this.config.capabilities()
    const {
      finalCandidatePreview: _configuredPreviewCapability,
      ...baseCapabilities
    } = configured
    const finalCandidatePreview =
      baseCapabilities.browser &&
      this.previewRuntime !== undefined &&
      this.previewBaseUrl !== undefined

    return {
      ...baseCapabilities,
      ...(finalCandidatePreview ? {finalCandidatePreview: true} : {}),
    }
  }

  public async build(): Promise<IWebDesignAgentRuntime> {
    const created: IStrandsAgentRuntime[] = []

    try {
      const candidateA = await this.create(this.config.buildCandidate('A'), created)
      const candidateB = await this.create(this.config.buildCandidate('B'), created)
      const candidateC = await this.create(this.config.buildCandidate('C'), created)
      const critic = await this.create(this.config.buildCritic(), created)
      const tools = [
        candidateA.createAgentTool({
          name: 'candidate_a',
          description: 'Build/refine candidate A.',
        }),
        candidateB.createAgentTool({
          name: 'candidate_b',
          description: 'Build/refine candidate B.',
        }),
        candidateC.createAgentTool({
          name: 'candidate_c',
          description: 'Build/refine candidate C.',
        }),
        critic.createAgentTool({
          name: 'visual_critic',
          description: 'Critique candidate evidence without implementing.',
        }),
      ]

      if (this.config.capabilities().conceptImages) {
        const concept = await this.create(this.config.buildConcept(), created)
        tools.push(
          concept.createAgentTool({
            name: 'concept_artist',
            description: 'Generate real concept images.',
          }),
        )
      }

      const director = await this.create(this.config.buildDirector(tools), created)
      return new WebDesignAgentRuntime(
        director,
        [...created].reverse(),
        this.capabilities(),
        this.config.invocationPolicy(),
        undefined,
        undefined,
        undefined,
        this.previewRuntime,
        this.previewBaseUrl,
      )
    } catch (startupError) {
      const errors: unknown[] = []
      for (const runtime of [...created].reverse()) {
        try {
          await runtime.close()
        } catch (error) {
          errors.push(error)
        }
      }

      if (errors.length > 0) {
        throw new AggregateError(
          [startupError, ...errors],
          'Web Design Agent startup and cleanup both failed.',
          {cause: startupError},
        )
      }

      throw startupError
    }
  }

  private async create(
    config: Parameters<IStrandsAgentRuntimeBootstrap['createAgentRuntime']>[0],
    created: IStrandsAgentRuntime[],
  ): Promise<IStrandsAgentRuntime> {
    const runtime = await this.bootstrap.createAgentRuntime(config)
    created.push(runtime)
    return runtime
  }
}
