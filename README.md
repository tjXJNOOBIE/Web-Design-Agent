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

The public HTTP MCP surface is intentionally **NoAuth**. Clients do not log in and do not supply Web Design Agent credentials. Each request constructs an isolated Web Design Agent runtime so anonymous clients do not share model/session state. Deployment-owned model keys or optional provider credentials are internal service capabilities, not client authentication requirements. Rate limiting, concurrency ceilings, request-size limits, and compute/resource limits are abuse controls, not auth.

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

The thin bridge has been physically validated against real `@strands-agents/sdk@1.16.0`, including native agent construction and a disposable real Strands + MCP integration flow.

## A/B/C contract

A/B/C variants are required to differ structurally, not only cosmetically. Every candidate carries a typed Design Genome covering composition, navigation, hero strategy, typography, density, geometry, surface model, depth, motion, content rhythm, and imagery strategy.

`DesignDistanceEvaluator` checks all three candidate pairs. If a pair is too similar, the runtime permits one complete regeneration pass and then rejects the result if diversity still fails.

Every candidate also carries:

- real HTML/CSS/optional JavaScript;
- optional additional page routes using the same design language;
- design-system tokens, typography, reusable component names, and principles;
- live visual-state defaults;
- critique notes;
- browser evidence only when browser tooling actually executed.

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

The production MCP App has been built as one 438.66 kB HTML resource and browser-tested under the official MCP Apps `AppBridge`. That smoke validated A/B/C selection, route switching, three-way compare, live visual-variable editing, and `ui/update-model-context` handoff.

## External design tools

External capabilities are optional and deployment-owned:

| Capability | Configuration | Behavior |
| --- | --- | --- |
| 21st component research | `API_KEY_21ST` | Adds `https://21st.dev/api/mcp` by default. Results are design inspiration; they do not force React/Tailwind into the target stack. |
| Browser/render evidence | `WEB_DESIGN_AGENT_BROWSER_MCP_URL` | Enables truthful browser/reference/existing-site inspection. Reference and existing-site modes reject when this capability is absent. |
| Higgsfield concept-first | `WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD=true` | Adds `https://mcp.higgsfield.ai/mcp` by default to the concept specialist. Provider authorization remains deployment-owned. Concept images are references, not implementation evidence. |

Optional endpoint/provider overrides are available through the matching `WEB_DESIGN_AGENT_*` environment variables in `WebDesignAgentRuntimeConfigBuilder`.

A real Higgsfield concept image has been generated through the connected external surface. The Web Design Agent's own southbound Higgsfield MCP path through Strands remains a provider-credential integration gate. That does not change the NoAuth client contract of the Web Design Agent MCP endpoint.

## Run

After dependencies are installed:

```bash
npm run check:real
```

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

Fresh Node `v22.23.2` physical validation currently passes:

```text
npm install                                 PASS
npm run typecheck                           PASS
npm test                                    PASS (17 / 17)
npm run test:integ:mcp                      PASS (1 / 1)
production Vite MCP App build               PASS
npm pack --dry-run                          PASS
clean consumer tarball install              PASS
packed MCP startup + eight-tool negotiation PASS
official AppBridge Chromium interaction     PASS
```

The shared bridge separately passes its physical Strands 1.16.0 verification and native disposable Strands + MCP integration test.

The following remain promotion gates:

- commit the reproducibly generated npm lockfile from the normal DEVELOPMENT environment;
- authorized real Web Design Agent model generation;
- real 21st MCP use through Strands with the deployment-owned API key;
- real southbound browser MCP render/critique/repair execution through the agent;
- real southbound Higgsfield MCP concept-first execution through the agent with deployment-owned provider credentials;
- hosted ChatGPT and Claude MCP App rendering;
- real vague-prompt one-shot quality measurements.

PR #2 stays Draft until those claims have actual evidence. Computers already generate enough fiction without release notes joining in.

## License

MIT.
