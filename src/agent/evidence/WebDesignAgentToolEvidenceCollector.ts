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
  }
  readonly result?: {
    readonly status?: unknown
  }
  readonly error?: unknown
  readonly event?: {
    readonly data?: unknown
  }
}

export class WebDesignAgentToolEvidenceCollector {
  private readonly successfulCandidateTools = new Map<
    DesignCandidateId,
    Set<string>
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
    return this.candidateToolEvidence(candidateId, 'browser_')
  }

  public componentEvidence(candidateId: DesignCandidateId): readonly string[] {
    return this.candidateToolEvidence(candidateId, 'components_')
  }

  public hasBrowserInspection(candidateId: DesignCandidateId): boolean {
    const tools = this.successfulCandidateTools.get(candidateId)
    if (tools === undefined) return false

    for (const toolName of tools) {
      if (BROWSER_INSPECTION_TOOLS.has(toolName)) return true
    }

    return false
  }

  public hasComponentResearch(candidateId: DesignCandidateId): boolean {
    return this.hasCandidateToolPrefix(candidateId, 'components_')
  }

  public missingBrowserInspection(
    candidateIds: readonly DesignCandidateId[] = ['A', 'B', 'C'],
  ): readonly DesignCandidateId[] {
    return candidateIds.filter(
      (candidateId) => !this.hasBrowserInspection(candidateId),
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
    if (event.error !== undefined || event.result?.status === 'error') return

    const candidateId = CANDIDATE_AGENT_IDS[agentId]
    if (candidateId !== undefined) {
      if (
        toolName.startsWith('browser_') ||
        toolName.startsWith('components_')
      ) {
        const tools = this.successfulCandidateTools.get(candidateId) ?? new Set<string>()
        tools.add(toolName)
        this.successfulCandidateTools.set(candidateId, tools)
      }
      return
    }

    if (agentId === CONCEPT_AGENT_ID && toolName.startsWith('assets_')) {
      this.successfulConceptTools.add(toolName)
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }
}
