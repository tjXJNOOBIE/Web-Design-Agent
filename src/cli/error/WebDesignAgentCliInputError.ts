export class WebDesignAgentCliInputError extends Error {
  public constructor(
    message = 'Web Design Agent requires a non-blank request.',
  ) {
    super(message)
    this.name = 'WebDesignAgentCliInputError'
  }
}
