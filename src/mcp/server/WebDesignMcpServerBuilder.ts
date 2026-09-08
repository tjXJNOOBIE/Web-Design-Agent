import {registerAppResource, registerAppTool} from '@modelcontextprotocol/ext-apps/server'
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {z} from 'zod'

import type {
  WebDesignAgentCapabilityData,
  WebDesignAgentEnvironment,
} from '../../agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import type {DesignCandidateData} from '../../design/data/DesignCandidateData.js'
import type {DesignPreferenceProfileData} from '../../design/data/DesignPreferenceProfileData.js'
import {DesignExportBuilder} from '../../design/export/DesignExportBuilder.js'
import type {IWebDesignAgentWorkflowHandler} from '../../design/handler/IWebDesignAgentWorkflowHandler.js'
import {WEB_DESIGN_AGENT_REQUEST_LIMITS} from '../../design/validation/WebDesignAgentRequestLimits.js'
import {
  candidateSchema,
  conceptSchema,
  feedbackSchema,
  pagePathSchema,
  preferenceProfileSchema,
  promptSchema,
  publicUrlSchema,
  visualStateSchema,
} from './WebDesignMcpSchemas.js'
import {WebDesignMcpAppDocumentReader} from './WebDesignMcpAppDocumentReader.js'

export const WEB_DESIGN_MCP_APP_RESOURCE_URI =
  'ui://web-design-agent/abc-review.html'

export class WebDesignMcpServerBuilder {
  public constructor(
    private readonly workflow: IWebDesignAgentWorkflowHandler,
    private readonly capabilities: WebDesignAgentCapabilityData,
    private readonly environment: WebDesignAgentEnvironment = process.env,
    private readonly appReader = new WebDesignMcpAppDocumentReader(),
  ) {}

  public build(): McpServer {
    const server = new McpServer({name: 'web-design-agent', version: '0.2.0'})
    const ui = {_meta: {ui: {resourceUri: WEB_DESIGN_MCP_APP_RESOURCE_URI}}}

    registerAppTool(
      server,
      'design',
      {
        title: 'Design website A/B/C',
        description: 'Generate three genuinely distinct real website implementations.',
        inputSchema: {
          prompt: promptSchema,
          sourceMode: z.enum(['code-first', 'reference-image', 'existing-site']).optional(),
          referenceImageUrl: publicUrlSchema.optional(),
          targetUrl: publicUrlSchema.optional(),
          pages: z
            .array(pagePathSchema)
            .max(WEB_DESIGN_AGENT_REQUEST_LIMITS.pageCount)
            .optional(),
          preferenceProfile: preferenceProfileSchema.optional(),
        },
        ...ui,
      },
      async (input: any) =>
        this.payload('generation', await this.workflow.generate(input)),
    )

    registerAppTool(
      server,
      'refine-design',
      {
        title: 'Refine selected design',
        description:
          'Reconcile live visual controls and feedback into the selected implementation.',
        inputSchema: {
          candidate: candidateSchema,
          visualState: visualStateSchema,
          feedback: feedbackSchema.optional(),
        },
        ...ui,
      },
      async (input: any) =>
        this.payload(
          'candidate',
          await this.workflow.refine({
            candidate: input.candidate,
            visualState: input.visualState,
            feedback: input.feedback ?? '',
          }),
        ),
    )

    registerAppTool(
      server,
      'create-design-concepts',
      {
        title: 'Explore visual concepts',
        description: 'Generate three optional concept images before real A/B/C.',
        inputSchema: {prompt: promptSchema},
        ...ui,
      },
      async (input: any) =>
        this.payload('concepts', await this.workflow.createConcepts(input.prompt)),
    )

    registerAppTool(
      server,
      'design-from-concept',
      {
        title: 'Build A/B/C from concept',
        description:
          'Use a selected concept as reference for real A/B/C implementations.',
        inputSchema: {prompt: promptSchema, concept: conceptSchema},
        ...ui,
      },
      async (input: any) =>
        this.payload(
          'generation',
          await this.workflow.generate({
            prompt: input.prompt,
            sourceMode: 'concept-first',
            selectedConcept: input.concept,
          }),
        ),
    )

    registerAppTool(
      server,
      'export-design',
      {
        title: 'Export selected design',
        description: 'Export current visual state as standalone HTML and page artifacts.',
        inputSchema: {candidate: candidateSchema, visualState: visualStateSchema},
        ...ui,
      },
      async (input: any) =>
        this.payload(
          'export',
          new DesignExportBuilder().build(input.candidate, input.visualState),
        ),
    )

    server.registerTool(
      'extract-design-system',
      {
        description: 'Extract candidate design system.',
        inputSchema: {candidate: candidateSchema},
      },
      async (input: any) =>
        this.payload('design-system', {
          candidateId: input.candidate.id,
          designSystem: input.candidate.designSystem,
        }),
    )

    server.registerTool(
      'build-design-preference-profile',
      {
        description: 'Build portable preference profile.',
        inputSchema: {
          acceptedCandidate: candidateSchema,
          rejectedCandidates: z.array(candidateSchema).max(12),
          visualState: visualStateSchema,
          notes: z.array(z.string().min(1).max(2_000)).max(100).optional(),
        },
      },
      async (input: any) => {
        const profile: DesignPreferenceProfileData = {
          version: 1,
          acceptedGenome: input.acceptedCandidate.genome,
          rejectedGenomes: input.rejectedCandidates.map(
            (candidate: DesignCandidateData) => candidate.genome,
          ),
          visualState: input.visualState,
          notes: input.notes ?? [],
        }
        return this.payload('preference-profile', {profile})
      },
    )

    server.registerTool(
      'web-design-capabilities',
      {description: 'Report configured external capabilities.', inputSchema: {}},
      async () => this.payload('capabilities', this.capabilities),
    )

    registerAppResource(
      server,
      'abc-review-ui',
      WEB_DESIGN_MCP_APP_RESOURCE_URI,
      {mimeType: 'text/html;profile=mcp-app'},
      async () => ({
        contents: [
          {
            uri: WEB_DESIGN_MCP_APP_RESOURCE_URI,
            mimeType: 'text/html;profile=mcp-app',
            text: await this.appReader.read(),
            _meta: {ui: {csp: {resourceDomains: this.resourceDomains()}}},
          },
        ],
      }),
    )

    return server
  }

  private payload(kind: string, data: unknown): any {
    return {
      content: [{type: 'text', text: JSON.stringify(data)}],
      structuredContent: {kind, data},
    }
  }

  private resourceDomains(): string[] {
    return (this.environment['WEB_DESIGN_AGENT_APP_RESOURCE_DOMAINS'] ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }
}
