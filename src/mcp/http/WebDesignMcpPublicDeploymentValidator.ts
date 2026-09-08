import type {
  WebDesignAgentCapabilityData,
  WebDesignAgentEnvironment,
} from '../../agent/config/WebDesignAgentRuntimeConfigBuilder.js'

export class WebDesignMcpPublicDeploymentValidator {
  public validate(
    capabilities: WebDesignAgentCapabilityData,
    environment: WebDesignAgentEnvironment,
  ): void {
    if (!capabilities.browser) return

    if (!this.enabled(environment['WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED'])) {
      throw new Error(
        'Refusing to expose browser capability on the public NoAuth HTTP endpoint without WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED=true. The browser deployment must deny private, loopback, link-local, metadata, and internal control-network egress.',
      )
    }
  }

  private enabled(value: string | undefined): boolean {
    const normalized = value?.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
}
