import type { DesignCandidateId } from '../../design/data/DesignCandidateData.js'

const CANDIDATE_AGENT_IDS: Readonly<Record<string, DesignCandidateId>> = {
  'web-design-agent-candidate-a': 'A',
  'web-design-agent-candidate-b': 'B',
  'web-design-agent-candidate-c': 'C',
}

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
  private readonly successfulBrowserTools = new Map<
    DesignCandidateId,
    Set<string>
  >()

  public record(event: unknown): void {
    if (!this.isRecord(event)) {
      return
    }

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
    return [...(this.successfulBrowserTools.get(candidateId) ?? [])]
      .sort()
      .map((toolName) => `${toolName} executed successfully.`)
  }

  public hasBrowserInspection(candidateId: DesignCandidateId): boolean {
    const tools = this.successfulBrowserTools.get(candidateId)
    if (tools === undefined) {
      return false
    }

    for (const toolName of tools) {
      if (BROWSER_INSPECTION_TOOLS.has(toolName)) {
        return true
      }
    }

    return false
  }

  public missingBrowserInspection(
    candidateIds: readonly DesignCandidateId[] = ['A', 'B', 'C'],
  ): readonly DesignCandidateId[] {
    return candidateIds.filter(
      (candidateId) => !this.hasBrowserInspection(candidateId),
    )
  }

  private recordAfterToolCall(event: ToolCallEventLike): void {
    const agentId = event.agent?.id
    const toolName = event.toolUse?.name

    if (typeof agentId !== 'string' || typeof toolName !== 'string') {
      return
    }

    const candidateId = CANDIDATE_AGENT_IDS[agentId]
    if (candidateId === undefined || !toolName.startsWith('browser_')) {
      return
    }

    if (event.error !== undefined || event.result?.status === 'error') {
      return
    }

    const tools = this.successfulBrowserTools.get(candidateId) ?? new Set<string>()
    tools.add(toolName)
    this.successfulBrowserTools.set(candidateId, tools)
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }
}
