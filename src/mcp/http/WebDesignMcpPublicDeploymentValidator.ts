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

    this.validatePublicBaseUrl(environment['WEB_DESIGN_AGENT_PUBLIC_BASE_URL'])
  }

  private validatePublicBaseUrl(value: string | undefined): void {
    const normalized = value?.trim()
    if (normalized === undefined || normalized.length === 0) {
      throw new Error(
        'Browser-enabled public Web Design Agent deployment requires WEB_DESIGN_AGENT_PUBLIC_BASE_URL so final candidate artifacts can be inspected through the public WDA origin.',
      )
    }

    let url: URL
    try {
      url = new URL(normalized)
    } catch {
      throw new Error('WEB_DESIGN_AGENT_PUBLIC_BASE_URL must be a valid HTTPS origin.')
    }

    if (url.protocol !== 'https:') {
      throw new Error('WEB_DESIGN_AGENT_PUBLIC_BASE_URL must use HTTPS.')
    }
    if (url.username.length > 0 || url.password.length > 0) {
      throw new Error('WEB_DESIGN_AGENT_PUBLIC_BASE_URL must not contain credentials.')
    }
    if (url.pathname !== '/' || url.search.length > 0 || url.hash.length > 0) {
      throw new Error(
        'WEB_DESIGN_AGENT_PUBLIC_BASE_URL must be an origin without path, query, or fragment data.',
      )
    }
  }

  private enabled(value: string | undefined): boolean {
    const normalized = value?.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
}
