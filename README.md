# Web Design Agent

Web Design Agent is a Strands-powered web design product for turning a vague request into three genuinely different, real website implementations, reviewing them inline, visually tuning them, and refining the selected direction.

```text
vague request
  -> infer product brief
  -> build structurally different A / B / C
  -> inspect/review available evidence
  -> tune visual controls or give chat feedback
  -> refine selected candidate
  -> export real HTML/CSS/JS and reusable design-system evidence
```

## Product surfaces

- Public stateless NoAuth HTTP MCP endpoint at `/mcp`.
- Stdio MCP mode for local clients.
- MCP App A/B/C review surface.
- CLI generation through `web-design-agent`.
- One-shot vague-prompt evaluation through `web-design-agent-eval`.

Clients do not create WDA accounts or supply WDA credentials. Model/browser/component/image-provider credentials remain deployment-owned capabilities behind the service boundary.

## Strands architecture

Strands is the agent framework and owns the model/tool loop. WDA consumes the validated Strands baseline through the thin `@tjxjnoobie/strands-bridge` lifecycle/integration package; the bridge does not replace Strands.

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
          with specialists exposed through native agent-as-tool support
  -> deterministic validation + runtime evidence
  -> typed result
  -> reverse-order lifecycle close
```

The model baseline is pinned to `global.anthropic.claude-sonnet-4-6` instead of inheriting a moving SDK default. Deployments may override it with `WEB_DESIGN_AGENT_MODEL_ID`.

## A/B/C contract

A/B/C must differ structurally, not merely by colors. Every candidate carries a Design Genome covering composition, navigation, hero strategy, typography, density, geometry, surface model, depth, motion, content rhythm, and imagery strategy.

`DesignDistanceEvaluator` scores every pair. One full regeneration attempt is permitted after deterministic diversity failure; the generation is rejected if the second set remains too similar.

Candidates include real HTML/CSS/optional JavaScript, optional additional page routes, a reusable design system, live visual-state defaults, critique notes, and runtime evidence.

## Runtime-grounded evidence

WDA does **not** trust the model to certify its own tool usage.

Generation/refinement consume the native Strands event stream. `WebDesignAgentToolEvidenceCollector` records successful nested specialist tool calls.

### Browser evidence

A successful candidate `browser_navigate` establishes its current inspected target. A failed later navigation clears it. `browser_snapshot` or `browser_take_screenshot` counts only when bound to a successful navigation target.

- model-authored `browserValidated` is ignored;
- model-authored `browserEvidence` is replaced;
- failed browser calls do not count;
- existing-site, reference-image, and concept-first implementation require A/B/C to inspect the exact validated source target;
- code-first browser activity may be retained as evidence, but `browserValidated` remains false until final returned candidate HTML can be deterministically bound to a controlled render target.

A screenshot of some unrelated public website does not validate the site WDA returned. A sentence this obvious unfortunately needed code.

### Component and concept-provider evidence

Successful `components_*` calls are attributed to the candidate that used component research.

Concept exploration requires a successful Concept Artist `assets_*` provider call. Three plausible image URLs in model JSON without real provider execution are rejected.

## NoAuth browser safety

Explicit browserable source URLs are validated **before Strands sees them**:

- HTTP(S) only;
- no URL credentials;
- public browser ports only;
- localhost/internal names rejected;
- DNS resolved before use;
- private, loopback, link-local, metadata, reserved, multicast, or mixed public/private results rejected.

That is not a complete SSRF boundary. Redirects, DNS rebinding, browser clicks, and model-discovered destinations happen after request parsing. Therefore a public NoAuth deployment with browser capability must also isolate browser egress from Tavall/control/private/metadata networks.

WDA refuses public HTTP startup with browser capability unless the deployment declares that boundary with:

```text
WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED=true
```

The declaration is a startup invariant, not a firewall. The deployment still has to enforce the actual network isolation.

## NoAuth resource controls

The public service is account-free, not unbounded.

### HTTP defaults

| Environment variable | Default | Meaning |
| --- | ---: | --- |
| `WEB_DESIGN_AGENT_MAX_CONCURRENT_REQUESTS` | `4` | In-flight `/mcp` requests per process. |
| `WEB_DESIGN_AGENT_MAX_REQUEST_BODY_BYTES` | `1048576` | Maximum JSON body. |
| `WEB_DESIGN_AGENT_REQUEST_RECEIVE_TIMEOUT_MS` | `30000` | Request-body receive timeout. |
| `WEB_DESIGN_AGENT_HEADERS_TIMEOUT_MS` | `15000` | Header receive timeout. |

The server returns bounded/safe 400/413/415/429 responses and redacts unexpected internal/provider exception text from anonymous 500 responses.

Public MCP schemas separately bound prompts, feedback, URLs, page count/path lengths, candidate fields, design-system data, and preference-profile fields before expensive workflow execution.

### Native Strands invocation defaults

| Environment variable | Default |
| --- | ---: |
| `WEB_DESIGN_AGENT_INVOCATION_TIMEOUT_MS` | `240000` |
| `WEB_DESIGN_AGENT_MAX_TURNS` | `16` |
| `WEB_DESIGN_AGENT_MAX_OUTPUT_TOKENS` | `60000` |
| `WEB_DESIGN_AGENT_MAX_TOTAL_TOKENS` | `200000` |

WDA passes these through native Strands invocation limits. MCP request cancellation propagates into the same Strands `cancelSignal`, combined with the independent WDA wall-clock timeout. Requests already cancelled before workflow execution are rejected before runtime construction.

Global/per-source throttling remains a deployment/edge responsibility rather than an application-owned mutable map.

## External design tools

External capabilities are optional and role-scoped.

| Capability | Configuration | Behavior |
| --- | --- | --- |
| 21st component research | `API_KEY_21ST` | Candidate-only design/component research with native `components` prefix. |
| Deployment browser MCP | `WEB_DESIGN_AGENT_BROWSER_MCP_URL` | Preferred browser path when supplied. |
| Local Playwright MCP | `WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT=true` | Official `@playwright/mcp@0.0.80`, headless/isolated, service workers blocked. |
| Browser executable | `WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH` | Reuses an environment-installed browser. |
| Playwright cache | `WEB_DESIGN_AGENT_PLAYWRIGHT_BROWSERS_PATH` or `PLAYWRIGHT_BROWSERS_PATH` | Passed explicitly to the MCP child. |
| Higgsfield concept-first | `WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD=true` | Concept Artist only; provider authorization remains deployment-owned. |

Candidate agents receive component/browser capability. The Director receives specialist agent tools. The Critic does not open duplicate browser/component processes. The Concept Artist receives image capability only.

## MCP App review

The MCP App supports:

- A/B/C switching and simultaneous comparison;
- desktop/tablet/mobile preview widths;
- multi-page route switching;
- density, spacing, radius, font, hero, contrast, depth, and motion controls;
- immediate local visual changes without a model round trip;
- selected-candidate refinement;
- design-system inspection;
- context handoff;
- standalone export;
- concept-first selection.

An earlier physical AppBridge smoke validated A/B/C selection, route switching, compare mode, live visual mutation, and `ui/update-model-context`.

## Run and validate

Core gate:

```bash
npm run check:real
```

Durable DEVELOPMENT gate with an environment-owned browser:

```bash
WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chrome \
npm run check:durable
```

HTTP MCP:

```bash
node dist/mcp/main.js
```

Stdio MCP:

```bash
node dist/mcp/main.js --stdio
```

CLI:

```bash
node dist/cli/main.js "make a competitive Minecraft PvP website"
```

## Validation status

On current head `f9149134f9cdf18db7b62f9f2caf18156fde6e1b`, the local/package
gates now pass:

```text
strict TypeScript                                PASS
deterministic product suite                     PASS (75 / 75)
production build                                PASS
real npm pack                                   PASS
clean packed-consumer install/start             PASS
consumer HTTP MCP initialize/tools/resources    PASS
```

The earlier fully executed physical baseline also passed:

```text
real npm install                                 PASS
@tjxjnoobie/strands-bridge@0.1.0                 PASS
@strands-agents/sdk@1.16.0                       PASS
strict TypeScript                                PASS
then-current product/delegate suite              PASS (30 / 30)
real HTTP MCP integration                        PASS
production MCP App build                         PASS
clean packed-consumer install/start              PASS
native Strands + Playwright MCP                  PASS
24 browser tools                                 PASS
real navigate / snapshot / PNG                   PASS
package dry-run                                  PASS
```

The current exact-source Tavall environment was resolved, but its shared
workspace provider currently returns `STALE_VERSION: developer workspace path
is unavailable` during refresh. Therefore no Tavall-local durable run is
claimed for this head; local/package evidence is kept separate from the
missing durable/provider evidence.

GitHub/Codex helped surface earlier P1/P2 issues around SSRF, evidence binding, CORS, cleanup, source inputs, and refinement identity. Those threads were fixed and resolved. The current Codex review/coding allowance is exhausted, so no newer GitHub-bot execution is being claimed.

## Remaining promotion gates

- rerun the current hardened head on the durable Tavall DEVELOPMENT/ubuntu surface and commit the exact generated lockfile;
- verify actual browser egress isolation in deployment;
- add deterministic final-candidate render binding for code-first validation;
- run an authorized real model through Director -> A/B/C -> Critic;
- run real 21st MCP through Strands;
- prove the real model-led render -> inspect -> critique -> repair flow;
- prove WDA Concept Artist -> image-provider execution through Strands;
- validate the production MCP App in supported ChatGPT and Claude hosts;
- run the vague-prompt corpus and measure one-shot design quality.

PR #2 remains Draft until those claims have evidence.

## License

MIT.
