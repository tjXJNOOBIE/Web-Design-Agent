import type {
  IStrandsAgentRuntime,
  IStrandsAgentRuntimeBootstrap,
  StrandsAgentRuntimeConfig,
} from '@tjxjnoobie/strands-bridge'

export class FakeRuntime implements IStrandsAgentRuntime {
  public invokes: string[] = []
  public streamOptions: unknown[] = []
  public closeCalls = 0
  public results: string[] = []
  public streamEvents: unknown[][] = []
  public streamEventFactory?: (
    args: string,
    invocationIndex: number,
  ) => readonly unknown[]
  public stopReason: string = 'endTurn'
  private closed = false

  public constructor(result = '{}') {
    this.results = [result]
  }

  public async invokeAgent(args: any): Promise<any> {
    this.invokes.push(String(args))
    return {
      stopReason: this.stopReason,
      toString: () => this.results.shift() ?? '{}',
    }
  }

  public async *streamAgent(
    args: any,
    options?: any,
  ): AsyncGenerator<any, any, undefined> {
    const prompt = String(args)
    const invocationIndex = this.invokes.length
    this.invokes.push(prompt)
    this.streamOptions.push(options)
    const events =
      this.streamEvents.shift() ??
      this.streamEventFactory?.(prompt, invocationIndex) ??
      []

    for (const event of events) {
      yield event
    }

    return {
      stopReason: this.stopReason,
      toString: () => this.results.shift() ?? '{}',
    }
  }

  public cancelInvocation(): void {}

  public createAgentTool(options?: {name?: string}): any {
    return {name: options?.name}
  }

  public isClosed(): boolean {
    return this.closed
  }

  public async close(): Promise<void> {
    this.closeCalls += 1
    this.closed = true
  }
}

export class FakeBootstrap implements IStrandsAgentRuntimeBootstrap {
  public configs: StrandsAgentRuntimeConfig[] = []
  public runtimes: FakeRuntime[] = []

  public constructor(
    private readonly factory: (
      config: StrandsAgentRuntimeConfig,
      index: number,
    ) => FakeRuntime = () => new FakeRuntime(),
  ) {}

  public async createAgentRuntime(
    config: StrandsAgentRuntimeConfig,
  ): Promise<IStrandsAgentRuntime> {
    this.configs.push(config)
    const runtime = this.factory(config, this.runtimes.length)
    this.runtimes.push(runtime)
    return runtime
  }
}
