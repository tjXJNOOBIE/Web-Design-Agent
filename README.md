# Web Design Agent

Web Design Agent is a Strands-powered web design product for turning vague prompts into three genuinely different, real website implementations, reviewing them inline, visually tuning them, and refining the selected direction.

The product is built around a simple human flow:

```text
vague request
  -> infer product brief
  -> build structurally different A / B / C
  -> render/review real implementations
  -> tune visual controls or give chat feedback
  -> refine selected candidate
  -> export real HTML/CSS/JS and reusable design-system evidence
```

## Product surfaces

- Public stateless HTTP MCP endpoint at `/mcp` when `web-design-agent-mcp` is hosted.
- Stdio MCP mode for local clients.
- MCP App A/B/C review surface for hosts that support MCP Apps.
- CLI generation through `web-design-agent`.
- One-shot vague-prompt evaluation through `web-design-agent-eval`.

The public HTTP MCP surface is intentionally **NoAuth**. Clients do not log in and do not supply Web Design Agent credentials. Each request constructs an isolated Web Design Agent runtime so anonymous clients do not share model/session state. Deployment-owned model keys or optional provider credentials are internal service capabilities, not client authentication requirements.

The HTTP server also applies local defense-in-depth controls by default: four concurrent MCP requests per process, a 1 MiB request-body limit, a 30-second request receive timeout, a 15-second header timeout, and redacted unexpected-error responses. These are capacity/abuse controls, not authentication. Global or per-source rate limiting belongs at the deployment edge/shared infrastructure layer rather than in a feature-local in-memory map.

## Strands architecture

Strands is the agent framework and owns the model/tool loop. The product consumes the validated Strands baseline through the thin `@tjxjnoobie/strands-bridge` integration package; the bridge does not replace Strands or implement a second agent framework.

```text
MCP / CLI request
  -> WebDesignAgentWorkflowHandler
  -> WebDesignAgentRuntimeBuilder
     -> Candidate A native Strands agent
     -> Candidate B native Strands agent
     -> Candidate C native Strands agent
     -> Visual Critic native Strands agent
     -> optional Concept Artist native Strands agent
     -> Design Director native Strands agent
          with specialists exposed through native Strands agent-as-tool support
  -> deterministic A/B/C validation
  -> typed result
  -> reverse-order lifecycle close
```

The Design Director owns the main model/tool loop. Candidate specialists own implementation directions. The critic evaluates output without becoming a fourth implementation style. Optional concept-first generation is isolated behind its own specialist and external capability.

The default model is pinned to `global.anthropic.claude-sonnet-4-6` instead of inheriting Strands' moving SDK default. Deployments may override it with `WEB_DESIGN_AGENT_MODEL_ID` without changing the shared bridge.

The thin bridge is physically validated against real `@strands-agents/sdk@1.16.0`, including native agent construction and a disposable real Strands + MCP integration flow.

## A/B/C contract

A/B/C variants are required to differ structurally, not only cosmetically. Every candidate carries a typed Design Genome covering composition, navigation, hero strategy, typography, density, geometry, surface model, depth, motion, content rhythm, and imagery strategy.

`DesignDistanceEvaluator` checks all three candidate pairs. If a pair is too similar, the runtime permits one complete regeneration pass and then rejects the result if diversity still fails.

Every candidate also carries:

- real HTML/CSS/optional JavaScript;
- optional additional page routes using the same design language;
- design-system tokens, typography, reusable component names, and principles;
- live visual-state defaults;
- critique notes;
- runtime-grounded browser evidence when browser tools actually executed.

## Runtime-grounded browser evidence

Web Design Agent does **not** trust the model to certify that visual validation happened.

Generation and refinement consume the native Strands event stream. Successful candidate `browser_*` calls are observed from real nested Strands `AfterToolCallEvent` lifecycle events and converted into product evidence by `WebDesignAgentToolEvidenceCollector`.

Consequences:

- model-authored `validation.browserValidated` is ignored;
- model-authored candidate `browserEvidence` is replaced;
- failed browser calls do not count;
- `browserValidated` is true only when A, B, and C each have successful inspection evidence from `browser_snapshot` or `browser_take_screenshot`;
- existing-site/reference-image work fails if the required real browser inspection was not observed, even when a browser capability was merely configured;
- model-authored validation notes are retained only as explicitly unverified agent notes.

Configuring a browser is not evidence that anybody used it. Software has enough ceremonies already.

## Live visual review

The MCP App review surface supports:

- A/B/C switching;
- simultaneous comparison;
- desktop, tablet, and mobile preview widths;
- multi-page route switching;
- density, spacing, radius, font scale, hero scale, contrast, depth, and motion controls;
- immediate preview changes without a model round trip;
- refinement from the exact visual-state snapshot plus optional chat feedback;
- selected-candidate context handoff;
- standalone export;
- portable preference-profile generation.

The generated implementation remains immutable while the review UI keeps temporary visual state separately. A model call happens only when the user asks the agent to reconcile those preferences into a new implementation.

The production MCP App is one 438.66 kB HTML resource and has been browser-tested under the official MCP Apps `AppBridge`. That smoke validated A/B/C selection, route switching, three-way compare, live visual-variable editing, and `ui/update-model-context` handoff.

## External design tools

External capabilities are optional and deployment-owned. Candidate agents receive component/browser capabilities; the Design Director receives its specialist-agent tools; the critic does not open its own browser process; the Concept Artist receives only the concept-image capability.

| Capability | Configuration | Behavior |
| --- | --- | --- |
| Strands model | `WEB_DESIGN_AGENT_MODEL_ID` | Overrides the pinned default `global.anthropic.claude-sonnet-4-6` for Director, Candidates, Critic, and Concept Artist. |
| 21st component research | `API_KEY_21ST` | Adds `https://21st.dev/api/mcp` with native Strands prefix `components`. Results are design inspiration; they do not force React/Tailwind into the target stack. |
| Deployment browser MCP | `WEB_DESIGN_AGENT_BROWSER_MCP_URL` | Preferred browser path when supplied. Existing-site/reference modes reject when no browser capability exists. |
| Local Playwright MCP | `WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT=true` | Uses official `@playwright/mcp@0.0.80` as a stdio MCP fallback. Browser tool names stay canonical, such as `browser_navigate`. |
| Environment-owned browser executable | `WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH` | Points Playwright MCP at an already-installed browser rather than downloading a browser per request. |
| Environment-owned Playwright cache | `WEB_DESIGN_AGENT_PLAYWRIGHT_BROWSERS_PATH` or `PLAYWRIGHT_BROWSERS_PATH` | Passed explicitly into the MCP child because the MCP stdio transport intentionally inherits only a safe environment-variable subset. |
| Higgsfield concept-first | `WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD=true` | Adds `https://mcp.higgsfield.ai/mcp` to the Concept Artist. Provider authorization remains deployment-owned. Concept images are references, not implementation evidence. |

The browser configuration is typed directly against the native Strands `McpServerConfig` surface. There is no loose product-level MCP config cast hiding stale field names.

A physical browser integration test has initialized a real browser-enabled candidate through `StrandsAgentRuntimeBootstrap`, loaded 24 Playwright MCP tools, navigated to a real page, returned a real accessibility snapshot, captured a real PNG screenshot, and closed the Strands/runtime resources cleanly.

A real Higgsfield concept image has separately been generated through the connected external surface. The Web Design Agent's own southbound Higgsfield MCP path through Strands remains a provider-credential integration gate. That does not change the NoAuth client contract.

## HTTP deployment controls

The public HTTP server defaults are intentionally conservative and can be tuned without code changes:

| Environment variable | Default | Meaning |
| --- | ---: | --- |
| `WEB_DESIGN_AGENT_MAX_CONCURRENT_REQUESTS` | `4` | Maximum in-flight `/mcp` requests in one WDA process. |
| `WEB_DESIGN_AGENT_MAX_REQUEST_BODY_BYTES` | `1048576` | Maximum JSON request body size. |
| `WEB_DESIGN_AGENT_REQUEST_RECEIVE_TIMEOUT_MS` | `30000` | Maximum time allowed for receiving an HTTP request body. |
| `WEB_DESIGN_AGENT_HEADERS_TIMEOUT_MS` | `15000` | Maximum time allowed for receiving request headers. |

The server returns `429` with `Retry-After` when the local concurrency ceiling is occupied, `413` before runtime construction for oversized bodies, typed `400` responses for malformed JSON, and a generic `500` envelope for unexpected server failures so provider/internal exception text does not cross the anonymous boundary.

## Run and validate

Install dependencies and run the core physical gate:

```bash
npm run check:real
```

For a durable DEVELOPMENT environment with an environment-owned browser executable, run the complete typed validation gate:

```bash
WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chrome \
npm run check:durable
```

`check:durable` runs the core physical MCP gate, the physical Strands + Playwright MCP browser integration, and an npm package dry-run. Deployments using a non-default browser process command can set `WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_COMMAND`.

Start HTTP MCP:

```bash
node dist/mcp/main.js
```

Local stdio MCP:

```bash
node dist/mcp/main.js --stdio
```

CLI:

```bash
node dist/cli/main.js "make a competitive Minecraft PvP website"
```

Evaluation corpus:

```bash
node dist/evaluation/main.js
```

## Current validation status

The most recent physical Node `v22.23.2` baseline before the GitHub-only fallback pass completed:

```text
npm install                                      PASS
@tjxjnoobie/strands-bridge@0.1.0                 PASS
@strands-agents/sdk@1.16.0                       PASS
npm run typecheck                                PASS
npm test                                         PASS (30 / 30)
npm run test:integ:mcp                           PASS (1 / 1)
production Vite MCP App build                    PASS
npm pack --dry-run                               PASS
clean consumer tarball install                   PASS
packed MCP startup + eight-tool negotiation      PASS
official AppBridge Chromium interaction          PASS
native Strands candidate + Playwright MCP init   PASS
Playwright MCP browser tool catalog              PASS (24 tools)
browser_navigate                                 PASS
browser_snapshot                                 PASS
browser_take_screenshot                          PASS
runtime-grounded browser evidence tests          PASS
model self-certification rejected                PASS
```

The current GitHub fallback line additionally contains dedicated tests for dual operation/cleanup failure preservation, pinned-model override behavior, and anonymous HTTP guardrails. Those newer checks must be rerun on the durable DEVELOPMENT execution surface before their physical pass counts replace the baseline above.

The clean external consumer receives `@tjxjnoobie/web-design-agent@0.2.0`, `@tjxjnoobie/strands-bridge@0.1.0`, and real Strands 1.16.0, then starts the NoAuth MCP binary and negotiates all eight WDA tools.

The following remain promotion gates:

- rerun the current GitHub head through `check:durable` and commit the reproducibly generated npm lockfile from the durable DEVELOPMENT environment;
- authorized real Web Design Agent model generation through Director + candidate specialists;
- real 21st MCP use through Strands with the deployment-owned API key;
- use the now-proven browser capability and runtime evidence collector inside the real model-led render -> inspect -> critique -> repair loop;
- real southbound Higgsfield MCP concept-first execution through the Concept Artist with deployment-owned provider authorization;
- hosted ChatGPT and Claude MCP App rendering;
- real vague-prompt one-shot quality measurements.

PR #2 stays Draft until those claims have actual evidence. Computers already generate enough fiction without release notes joining in.

## License

MIT.
