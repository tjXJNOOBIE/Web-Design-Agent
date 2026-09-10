import type {DesignCandidateId} from '../../design/data/DesignCandidateData.js'

const CANDIDATE_AGENT_IDS: Readonly<Record<string, DesignCandidateId>> = {
  'web-design-agent-candidate-a': 'A',
  'web-design-agent-candidate-b': 'B',
  'web-design-agent-candidate-c': 'C',
}

const CONCEPT_AGENT_ID = 'web-design-agent-concept'
const BROWSER_INSPECTION_TOOLS = new Set([
  'browser_snapshot',
  'browser_take_screenshot',
])

interface ToolCallEventLike {
  readonly type?: unknown
  readonly agent?: {
    readonly id?: unknown
  }
  readonly toolUse?: {
    readonly name?: unknown
    readonly input?: unknown
  }
  readonly result?: {
    readonly status?: unknown
  }
  readonly error?: unknown
  readonly event?: {
    readonly data?: unknown
  }
}

interface CandidateBrowserState {
  currentTarget?: string
  readonly inspections: Map<string, Set<string>>
}

export class WebDesignAgentToolEvidenceCollector {
  private readonly successfulCandidateTools = new Map<
    DesignCandidateId,
    Set<string>
  >()
  private readonly browserState = new Map<
    DesignCandidateId,
    CandidateBrowserState
  >()
  private readonly successfulConceptTools = new Set<string>()

  public record(event: unknown): void {
    if (!this.isRecord(event)) return

    const typedEvent = event as ToolCallEventLike

    if (typedEvent.type === 'afterToolCallEvent') {
      this.recordAfterToolCall(typedEvent)
      return
    }

    if (typedEvent.type === 'toolStreamUpdateEvent') {
      this.record(typedEvent.event?.data)
    }
  }

  public browserEvidence(candidateId: DesignCandidateId): readonly string[] {
    const state = this.browserState.get(candidateId)
    if (state === undefined) return []

    const evidence: string[] = []
    for (const [target, tools] of state.inspections) {
      const displayedTarget = this.displayTarget(target)
      for (const toolName of [...tools].sort()) {
        evidence.push(`${toolName} executed successfully for ${displayedTarget}.`)
      }
    }

    return evidence.sort()
  }

  public componentEvidence(candidateId: DesignCandidateId): readonly string[] {
    return this.candidateToolEvidence(candidateId, 'components_')
  }

  public hasBrowserInspection(
    candidateId: DesignCandidateId,
    expectedTarget?: string,
  ): boolean {
    const inspections = this.browserState.get(candidateId)?.inspections
    if (inspections === undefined || inspections.size === 0) return false

    if (expectedTarget === undefined) return true

    const normalizedExpectedTarget = this.normalizeBrowserTarget(expectedTarget)
    return (
      normalizedExpectedTarget !== undefined &&
      (inspections.get(normalizedExpectedTarget)?.size ?? 0) > 0
    )
  }

  public hasComponentResearch(candidateId: DesignCandidateId): boolean {
    return this.hasCandidateToolPrefix(candidateId, 'components_')
  }

  public missingBrowserInspection(
    candidateIds: readonly DesignCandidateId[] = ['A', 'B', 'C'],
    expectedTarget?: string,
  ): readonly DesignCandidateId[] {
    return candidateIds.filter(
      (candidateId) => !this.hasBrowserInspection(candidateId, expectedTarget),
    )
  }

  public missingComponentResearch(
    candidateIds: readonly DesignCandidateId[] = ['A', 'B', 'C'],
  ): readonly DesignCandidateId[] {
    return candidateIds.filter(
      (candidateId) => !this.hasComponentResearch(candidateId),
    )
  }

  public conceptProviderEvidence(): readonly string[] {
    return [...this.successfulConceptTools]
      .sort()
      .map((toolName) => `${toolName} executed successfully.`)
  }

  public hasConceptProviderCall(): boolean {
    return this.successfulConceptTools.size > 0
  }

  private candidateToolEvidence(
    candidateId: DesignCandidateId,
    prefix: string,
  ): readonly string[] {
    return [...(this.successfulCandidateTools.get(candidateId) ?? [])]
      .filter((toolName) => toolName.startsWith(prefix))
      .sort()
      .map((toolName) => `${toolName} executed successfully.`)
  }

  private hasCandidateToolPrefix(
    candidateId: DesignCandidateId,
    prefix: string,
  ): boolean {
    const tools = this.successfulCandidateTools.get(candidateId)
    if (tools === undefined) return false

    for (const toolName of tools) {
      if (toolName.startsWith(prefix)) return true
    }

    return false
  }

  private recordAfterToolCall(event: ToolCallEventLike): void {
    const agentId = event.agent?.id
    const toolName = event.toolUse?.name

    if (typeof agentId !== 'string' || typeof toolName !== 'string') return

    const candidateId = CANDIDATE_AGENT_IDS[agentId]
    if (candidateId !== undefined) {
      this.recordCandidateTool(candidateId, toolName, event)
      return
    }

    if (
      agentId === CONCEPT_AGENT_ID &&
      toolName.startsWith('assets_') &&
      this.succeeded(event)
    ) {
      this.successfulConceptTools.add(toolName)
    }
  }

  private recordCandidateTool(
    candidateId: DesignCandidateId,
    toolName: string,
    event: ToolCallEventLike,
  ): void {
    if (toolName === 'browser_navigate') {
      const state = this.browserStateFor(candidateId)
      if (!this.succeeded(event)) {
        delete state.currentTarget
        return
      }

      const target = this.browserNavigationTarget(event.toolUse?.input)
      if (target === undefined) {
        delete state.currentTarget
        return
      }

      state.currentTarget = target
      return
    }

    if (toolName.startsWith('browser_')) {
      if (!this.succeeded(event)) return

      if (BROWSER_INSPECTION_TOOLS.has(toolName)) {
        const state = this.browserStateFor(candidateId)
        const target = state.currentTarget
        if (target === undefined) return

        const tools = state.inspections.get(target) ?? new Set<string>()
        tools.add(toolName)
        state.inspections.set(target, tools)
      }
      return
    }

    if (toolName.startsWith('components_') && this.succeeded(event)) {
      const tools = this.successfulCandidateTools.get(candidateId) ?? new Set<string>()
      tools.add(toolName)
      this.successfulCandidateTools.set(candidateId, tools)
    }
  }

  private browserStateFor(candidateId: DesignCandidateId): CandidateBrowserState {
    const existing = this.browserState.get(candidateId)
    if (existing !== undefined) return existing

    const created: CandidateBrowserState = {inspections: new Map()}
    this.browserState.set(candidateId, created)
    return created
  }

  private browserNavigationTarget(input: unknown): string | undefined {
    if (!this.isRecord(input)) return undefined
    const url = input['url']
    return typeof url === 'string' ? this.normalizeBrowserTarget(url) : undefined
  }

  private normalizeBrowserTarget(value: string): string | undefined {
    try {
      const url = new URL(value)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
      url.hash = ''
      return url.href
    } catch {
      return undefined
    }
  }

  private displayTarget(value: string): string {
    try {
      const url = new URL(value)
      return `${url.origin}${url.pathname}`
    } catch {
      return '[invalid target]'
    }
  }

  private succeeded(event: ToolCallEventLike): boolean {
    return event.error === undefined && event.result?.status !== 'error'
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }
}
