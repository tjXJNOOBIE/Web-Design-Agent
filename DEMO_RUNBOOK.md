# Web Design Agent demo runbook

## Clean consumer

```bash
npm pack
mkdir /tmp/wda-consumer && cd /tmp/wda-consumer
npm init -y
npm install /path/to/tjxjnoobie-web-design-agent-0.2.0.tgz
WEB_DESIGN_AGENT_PORT=3001 npx web-design-agent-mcp
```

For a browser-enabled deployment also set an HTTPS
`WEB_DESIGN_AGENT_PUBLIC_BASE_URL` and enforce real browser egress isolation;
the application startup flag is not a firewall.

## Protocol smoke

Verify `/`, `initialize`, `tools/list`, `resources/list`, and
`ui://web-design-agent/abc-review.html`. The current package smoke proves these
calls from a clean packed consumer. A design call requires an authorized model
provider and is not represented by fixture output.

## Evidence boundary

The current head proves 75/75 deterministic tests, strict TypeScript, build,
package install, and local MCP negotiation. Real model, Playwright/component/
image providers, supported-host MCP App installation, public HTTPS deployment,
and a real vague-prompt A/B/C/refine/export capture remain external gates.
