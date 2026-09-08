import {lookup} from 'node:dns/promises'
import {BlockList, isIP} from 'node:net'

import {DesignResultValidationError} from './DesignResultValidationError.js'
import {WEB_DESIGN_AGENT_REQUEST_LIMITS} from './WebDesignAgentRequestLimits.js'

export type WebDesignAgentDnsResolver = (
  hostname: string,
) => Promise<readonly string[]>

const BLOCKED_NETWORKS = new BlockList()

for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  BLOCKED_NETWORKS.addSubnet(network, prefix, 'ipv4')
}

for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:10::', 28],
  ['2001:20::', 28],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  BLOCKED_NETWORKS.addSubnet(network, prefix, 'ipv6')
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
])

const BLOCKED_HOSTNAME_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
]

export class WebDesignAgentBrowserTargetValidator {
  public constructor(
    private readonly resolveDns: WebDesignAgentDnsResolver = async (hostname) =>
      (await lookup(hostname, {all: true, verbatim: true})).map(
        (result) => result.address,
      ),
    private readonly allowedPorts: ReadonlySet<number> = new Set([80, 443]),
  ) {}

  public async validate(value: string, label: string): Promise<string> {
    const normalizedValue = value.trim()
    if (normalizedValue.length === 0) {
      throw new DesignResultValidationError(`${label} must be non-blank.`)
    }
    if (normalizedValue.length > WEB_DESIGN_AGENT_REQUEST_LIMITS.urlCharacters) {
      throw new DesignResultValidationError(
        `${label} exceeds the ${WEB_DESIGN_AGENT_REQUEST_LIMITS.urlCharacters}-character URL limit.`,
      )
    }

    let url: URL
    try {
      url = new URL(normalizedValue)
    } catch {
      throw new DesignResultValidationError(`${label} must be a valid URL.`)
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new DesignResultValidationError(
        `${label} must use http or https.`,
      )
    }

    if (url.username.length > 0 || url.password.length > 0) {
      throw new DesignResultValidationError(
        `${label} must not contain URL credentials.`,
      )
    }

    const port = url.port.length > 0
      ? Number(url.port)
      : url.protocol === 'https:'
        ? 443
        : 80
    if (!Number.isSafeInteger(port) || !this.allowedPorts.has(port)) {
      throw new DesignResultValidationError(
        `${label} uses a browser port that is not allowed by the public Web Design Agent policy.`,
      )
    }

    const hostname = this.normalizeHostname(url.hostname)
    if (this.isBlockedHostname(hostname)) {
      throw new DesignResultValidationError(
        `${label} must resolve to a public internet host.`,
      )
    }

    const directAddressFamily = isIP(hostname)
    if (directAddressFamily !== 0) {
      this.assertPublicAddress(hostname, directAddressFamily, label)
    } else {
      let addresses: readonly string[]
      try {
        addresses = await this.resolveDns(hostname)
      } catch {
        throw new DesignResultValidationError(
          `${label} hostname could not be resolved safely.`,
        )
      }

      if (addresses.length === 0) {
        throw new DesignResultValidationError(
          `${label} hostname did not resolve to an address.`,
        )
      }

      for (const address of addresses) {
        const family = isIP(address)
        if (family === 0) {
          throw new DesignResultValidationError(
            `${label} hostname returned an invalid address.`,
          )
        }
        this.assertPublicAddress(address, family, label)
      }
    }

    url.hash = ''
    return url.href
  }

  private normalizeHostname(hostname: string): string {
    const normalized = hostname.trim().toLowerCase().replace(/\.$/, '')
    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      return normalized.slice(1, -1)
    }
    return normalized
  }

  private isBlockedHostname(hostname: string): boolean {
    if (BLOCKED_HOSTNAMES.has(hostname)) return true
    return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  }

  private assertPublicAddress(
    address: string,
    family: number,
    label: string,
  ): void {
    const type = family === 4 ? 'ipv4' : 'ipv6'
    if (BLOCKED_NETWORKS.check(address, type)) {
      throw new DesignResultValidationError(
        `${label} must not resolve to a private, loopback, link-local, metadata, reserved, or multicast address.`,
      )
    }
  }
}
