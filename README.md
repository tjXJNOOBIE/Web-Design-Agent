# Web Design Agent

Web Design Agent is a Java-owned Tavall product that turns a design request into three genuinely different A/B/C website implementations, lets clients compare and refine them, and exports real HTML/CSS/JavaScript plus reusable design-system evidence.

The browser MCP App remains TypeScript/Vite. Native Strands reasoning runs in the standalone `tjXJNOOBIE/strands-bridge` service. Product orchestration, policy, validation, evidence, export, CLI, evaluation, and public MCP surfaces are Java.

## Architecture

```text
ChatGPT / Claude / CLI / MCP clients
             |
             v
      Web Design Agent Java
  policy / validation / evidence
  A/B/C workflow / export / preview
      |                  |
      |                  +--> MCP App (TypeScript/Vite browser UI)
      v
Tavall Function Catalog / AIAgentRuntime
      |
      v
standalone strands-bridge over MCP
      |
      v
native Strands specialist sessions
  Candidate A / B / C
  Visual Critic
  optional Concept Artist
  Design Director
```

**Java owns the application. Strands owns reasoning. MCP joins them.**

WDA never embeds the Strands SDK in the product backend and does not recreate Tavall DI, Function Catalog, policy, or runtime infrastructure in TypeScript.

## Product surfaces

The Gradle distribution installs four commands:

- `web-design-agent-mcp` — public Streamable HTTP MCP server.
- `web-design-agent-mcp-stdio` — local stdio MCP server using the same Java tool/resource surface.
- `web-design-agent` — one-shot CLI generation.
- `web-design-agent-eval` — deterministic vague-prompt evaluation corpus.

The HTTP and stdio transports share the same Java Function Catalog, tool metadata, MCP App resource, schemas, and result contract.

## npm distribution

The public product package is a thin launcher around the Java distribution. It
includes the browser MCP App compiled into the Java artifact, verifies the
bundled runtime manifest, and resolves the pinned standalone Strands bridge. It
does not create a Node product backend.

```bash
npm install @tjxjnoobie/web-design-agent
npx @tjxjnoobie/web-design-agent doctor
npx web-design-agent-mcp
npx web-design-agent-mcp-stdio
npx web-design-agent "Make a landing page for a community garden"
```

The package is prepared for public npm publication. The current registry has no
published `@tjxjnoobie` scope, so the current clean-consumer evidence uses the
versioned tarball produced by `npm pack`.

## A/B/C contract

Material design work must produce three structurally distinct candidates, not three paint jobs on the same layout. Candidates vary composition, navigation, hero strategy, typography class, density, geometry, surface/depth model, motion, content rhythm, and imagery strategy.

Deterministic distance validation compares every pair. One regeneration attempt is allowed when diversity fails; the request is rejected if the second set remains too similar.

Each candidate can carry real HTML/CSS/JavaScript, additional page routes, a reusable design system, visual-state defaults, critique notes, and observed runtime evidence.

## Evidence rules

WDA does not trust model-authored claims that tools were used successfully.

- Browser evidence is derived from observed tool lifecycle events.
- A snapshot or screenshot counts only after a successful navigation establishes the inspected target.
- Failed navigation clears the current inspection target.
- Source-dependent modes must bind evidence to the validated requested target.
- Concept-first output requires observed successful image-provider execution; returned image URLs alone are not evidence.
- Code-first final-preview validation binds to runtime-owned, content-addressed previews rather than model-selected substitute URLs.

## Public source modes

The public `design` MCP tool exposes:

- `code-first`
- `reference-image`
- `existing-site`

`concept-first` is intentionally not accepted by `design`; clients first call `create-design-concepts`, choose a concept, then call `design-from-concept`.

CLI supports ordinary code-first generation plus `--reference <https-url>`. Concept-first remains an interactive MCP flow.

## NoAuth browser safety

The public HTTP MCP endpoint is NoAuth. Clients do not create WDA accounts or supply WDA credentials. Deployment-owned model/provider credentials remain behind the service boundary.

Explicit browserable source URLs are validated before Strands receives them:

- HTTP(S) only;
- no URL credentials;
- public browser ports only;
- localhost/internal names rejected;
- DNS resolution required;
- private, loopback, link-local, metadata, reserved, multicast, and mixed public/private results rejected.

Application URL validation is not a complete SSRF boundary. Redirects, DNS rebinding, browser clicks, and model-discovered destinations happen later. A public deployment with browser capability therefore refuses startup unless the deployment declares browser egress isolation:

```text
WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED=true
```

The deployment must still enforce the actual network isolation.

## Runtime configuration

The Java product launches the standalone Strands bridge through the shared Function Catalog provider. These two variables are required for generation/evaluation/CLI execution:

```text
WEB_DESIGN_AGENT_STRANDS_NODE=/absolute/path/to/node
WEB_DESIGN_AGENT_STRANDS_ENTRYPOINT=/absolute/path/to/strands-bridge/dist/mcp/main.js
```

Optional model selection:

```text
WEB_DESIGN_AGENT_MODEL_ID=global.anthropic.claude-sonnet-4-6
```

The bridge child receives only an explicit allow-list of environment variables. Product-only secrets are not inherited implicitly.

### Optional capabilities

| Capability | Configuration |
| --- | --- |
| 21st/component research | `API_KEY_21ST` |
| Deployment browser MCP | `WEB_DESIGN_AGENT_BROWSER_MCP_URL` |
| Local Playwright MCP | `WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT=true` |
| Browser executable | `WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH` |
| Higgsfield concept provider | `WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD=true` |

Candidate specialists may receive browser/component capability. Concept Artist may receive image capability. Director and Critic do not inherit provider credentials simply because they can invoke specialists.

### HTTP resource controls

| Variable | Default |
| --- | ---: |
| `WEB_DESIGN_AGENT_MAX_CONCURRENT_REQUESTS` | `4` |
| `WEB_DESIGN_AGENT_MAX_REQUEST_BODY_BYTES` | `1048576` |
| `WEB_DESIGN_AGENT_REQUEST_RECEIVE_TIMEOUT_MS` | `30000` |
| `WEB_DESIGN_AGENT_HEADERS_TIMEOUT_MS` | `15000` |

## Build and test

Requirements:

- Java 25
- Gradle 9.1+
- Node 24+
- the current standalone `strands-bridge` build when running physical Strands integration

Browser MCP App:

```bash
npm ci --ignore-scripts
npm run check:app
```

Java product:

```bash
gradle --no-daemon clean test build installDist
```

The repository consumes the canonical `TavallStudios/Tavall-Architecture-Tests` Gradle plugin/modules. Migration CI also validates the exact Function Catalog provider branch and standalone Strands bridge before building WDA.

For the physical Java -> Strands -> Java integration test, CI sets:

```text
STRANDS_BRIDGE_INTEGRATION_NODE=/absolute/path/to/node
STRANDS_BRIDGE_INTEGRATION_ENTRYPOINT=/absolute/path/to/strands-bridge/dist/mcp/main.js
```

and runs Gradle with:

```bash
gradle --no-daemon -Dstrands.bridge.integration.required=true clean test build installDist
```

## Run installed commands

After `installDist`:

```bash
export WEB_DESIGN_AGENT_STRANDS_NODE="$(command -v node)"
export WEB_DESIGN_AGENT_STRANDS_ENTRYPOINT="/path/to/strands-bridge/dist/mcp/main.js"

build/install/web-design-agent-mcp/bin/web-design-agent-mcp
build/install/web-design-agent-mcp/bin/web-design-agent-mcp-stdio
build/install/web-design-agent-mcp/bin/web-design-agent "make a competitive Minecraft PvP website"
build/install/web-design-agent-mcp/bin/web-design-agent --reference https://example.com/reference.png "design from this reference"
build/install/web-design-agent-mcp/bin/web-design-agent-eval
```

HTTP defaults to port `3001`; `WEB_DESIGN_AGENT_HOST` and `WEB_DESIGN_AGENT_PORT` may override the bind address/port.

## MCP App

The browser app supports A/B/C switching, simultaneous comparison, responsive preview widths, route switching, local visual controls, refinement, design-system inspection, context handoff, standalone export, and concept selection.

Its TypeScript is intentionally browser-only under `src/mcp-app`. There is no second Node/TypeScript product backend.

## Repository ownership

- `src/main/java` — authoritative product/backend implementation.
- `src/test/java` — Java product, transport, policy, and physical integration tests.
- `src/mcp-app` — browser-only MCP App.
- `TavallStudios/function-catalog` — provider-neutral AI runtime and Java MCP publication infrastructure.
- `tjXJNOOBIE/strands-bridge` — standalone native Strands reasoning runtime.

See `AGENTS.md` for the engineering rules that keep those boundaries intact.
