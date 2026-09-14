# Web Design Agent demo runbook

## Clean consumer

```bash
npm run check:app
gradle --no-daemon clean check installDist
npm run package:runtime
npm pack
mkdir /tmp/wda-consumer && cd /tmp/wda-consumer
npm init -y
npm install /path/to/tjxjnoobie-web-design-agent-0.3.0.tgz
npx web-design-agent doctor
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
package install, local MCP negotiation, and real Playwright MCP. The shared
bridge subscription smoke proves a native Strands model call. For a
developer-owned unlimited run, the defaults already leave both wall-clock
windows unlimited. Set both variables to `0` explicitly if you want the
capture environment to make that policy visible; caller cancellation and
token/turn budgets remain active. Component/image
providers, supported-host MCP App installation, public HTTPS deployment, and
a real vague-prompt A/B/C/refine/export capture remain unverified.

When a machine exposes a wrapper and a separately installed logged-in Codex
binary, set `STRANDS_BRIDGE_CODEX_COMMAND` to the absolute logged-in binary
path. This keeps subscription authentication and cleanup behavior deterministic.
No synthetic browser result is presented as acceptance. The required video
manifest records the unexecuted real-design-job gate and its current blocker.
