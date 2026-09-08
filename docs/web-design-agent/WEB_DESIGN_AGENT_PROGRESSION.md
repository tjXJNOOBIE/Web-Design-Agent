# Web Design Agent Progression

> **Status:** Implementation tracker  
> **Audited implementation head:** `dc7d8bc4af2a028a0cebda522474a6e25277531d`  
> **Authority:** Reports implementation and validation evidence only; product behavior remains owned by `WEB_DESIGN_AGENT_FINAL_DRAFT.md`

## Summary

Web Design Agent is physically validated across the renamed Strands dependency graph, public NoAuth MCP transport, production MCP App, clean packed-consumer installation, native Strands candidate initialization, and a real Playwright MCP browser path.

Strands Agents is the actual agent framework. `@tjxjnoobie/strands-bridge` remains thin shared lifecycle/composition/package glue and does not own the model/tool loop, provider framework, authentication framework, product prompts, or Web Design Agent policy.

The public HTTP MCP product boundary is explicitly **NoAuth**. Clients do not log in or provide Web Design Agent credentials. Deployment-owned model/provider keys are internal service capabilities. Rate limits, concurrency ceilings, request-size limits, timeouts, and compute/resource ceilings are abuse controls, not authentication.

Basic package, Strands, MCP, MCP App, and browser-process uncertainty is no longer a blocker. The remaining gates concern the actual provider-backed design loop, supported-client rendering, one-shot quality measurement, and committing generated dependency locks from the durable DEVELOPMENT write surface.

## Implemented and Validated

| Area | Status | Evidence |
| --- | --- | --- |
| Strands Director + candidate A/B/C + critic composition | Implemented + physical Strands evidence | `WebDesignAgentRuntimeBuilder`; exact renamed bridge graph installs real `@strands-agents/sdk@1.16.0` |
| Thin `strands-bridge` boundary | Implemented + physically validated | `@tjxjnoobie/strands-bridge@0.1.0`, bridge head `69d27b147ee4f8bf0bfba43cbd0668a1ca4dd868` |
| Optional concept specialist | Implemented | capability-gated `buildConcept()` path |
| Typed Design Intent / Genome / Design System / Visual State | Implemented + contract tested | `src/design/data/` |
| Deterministic A/B/C distance validation | Implemented + contract tested | `DesignDistanceEvaluator` |
| One regeneration attempt for low design distance | Implemented + contract tested | `WebDesignAgentRuntime.generate()` |
| Requested multi-page enforcement | Implemented + contract tested | `validatePages()` |
| Existing-site/reference browser gating | Implemented + contract tested | runtime validation |
| Native Strands MCP configuration | Implemented + contract tested | external MCPs now use native `McpServerConfig` fields rather than loose product casts |
| External tool role ownership | Implemented + contract tested | Candidates own browser/components; Concept Artist owns image provider; Director/Critic do not duplicate those MCP clients |
| 21st MCP configuration | Implemented configuration | real provider-backed 21st call still pending |
| Playwright MCP fallback | Implemented + physically validated | official `@playwright/mcp@0.0.80`, canonical browser tool names, environment-owned executable/cache support |
| Higgsfield concept capability | Implemented configuration | connector-level real image generation completed; WDA southbound provider path still pending |
| HTTP NoAuth stateless `/mcp` server | Physically validated after rename | real MCP SDK client connected, listed all eight tools, and read the production App resource |
| Stdio MCP server | Implemented | packaged binary present; dedicated stdio client smoke remains optional |
| MCP App production bundle | Physically built after rename | Vite 7.3.6 single-file build, `dist/mcp-app.html` 438.66 kB / 105.89 kB gzip |
| MCP App A/B/C selector/editor | Browser validated | official `AppBridge` + Chromium/Playwright smoke |
| Live visual controls | Browser validated | Radius slider changed nested preview CSS variable to `--wda-radius:5px` |
| Multi-page review | Browser validated | Candidate B switched to `/stats` and rendered B Stats content |
| Compare mode | Browser validated | three candidate preview iframes rendered simultaneously |
| Selection context handoff | Browser validated | official host received `ui/update-model-context` containing selected candidate B |
| Design-system extraction tool | Registered + real MCP transport validated | physical MCP tool catalog includes `extract-design-system` |
| Portable preference-profile tool | Registered + real MCP transport validated | physical MCP tool catalog includes `build-design-preference-profile` |
| Standalone HTML/page export | Implemented + contract tested | `DesignExportBuilder` |
| One-shot vague prompt corpus | Implemented | `ONE_SHOT_DESIGN_PROMPT_CORPUS` |
| Objective one-shot evaluation metrics | Implemented + contract tested | `OneShotDesignEvaluationHandler` |
| Package install/build | Physically validated after rename | fresh Node 22.23.2 install, typecheck, 25/25 tests, Vite build, real MCP integration, and package dry-run |
| Clean consumer package install | Physically validated after rename | empty npm project installed packed WDA + renamed bridge + Strands 1.16.0, imported exports, started NoAuth MCP, listed eight tools |
| Physical browser integration | Physically validated | native Strands candidate initialization + Playwright MCP + real navigation/snapshot/PNG + clean teardown |
| Durable validation command | Implemented | `npm run check:durable` combines core physical gate, browser integration, and package dry-run |

## Physical Validation Evidence

### Exact post-rename Web Design Agent graph

Node `v22.23.2`, bridge pin `69d27b147ee4f8bf0bfba43cbd0668a1ca4dd868`:

```text
fresh Git clone                               PASS
renamed bridge resolution                     PASS
@tjxjnoobie/strands-bridge@0.1.0              PASS
@strands-agents/sdk@1.16.0                    PASS
npm install                                   PASS
npm run typecheck                             PASS
contract/delegate tests                       PASS (25 / 25)
real HTTP MCP integration                     PASS (1 / 1)
production Vite MCP App build                 PASS
production App size                           438.66 kB / 105.89 kB gzip
npm pack --dry-run                            PASS
```

The exact install generated npm lockfile v3 at approximately 175 kB. The lock is generated from the renamed bridge graph rather than copied from the pre-rename dependency tree.

The physical HTTP MCP integration uses the real MCP SDK `Client` and `StreamableHTTPClientTransport` against `WebDesignMcpHttpServer`, requires all eight public tools, reads the bundled `ui://web-design-agent/abc-review.html` resource, and calls `web-design-capabilities`.

### Clean packed consumer smoke

A separate empty npm project installed the current packed artifact and verified:

```text
@tjxjnoobie/web-design-agent@0.2.0          PASS
@tjxjnoobie/strands-bridge@0.1.0           PASS
@strands-agents/sdk@1.16.0                 PASS
public WDA package import                   PASS
NoAuth HTTP root startup                    PASS
root authentication:none                   PASS
real MCP client negotiation                 PASS
all eight WDA tools                         PASS
```

### Strands bridge

The renamed bridge has separately passed:

```text
npm install                                  PASS
package prepare/build                        PASS
bridge typecheck                             PASS
bridge delegate tests                        PASS (12 / 12)
real Strands SDK verification                PASS (@strands-agents/sdk 1.16.0)
native disposable Strands + MCP integration  PASS (1 / 1)
```

### Physical WDA browser path

WDA first exposed a real integration defect that contract stubs could not catch: the product used the stale field `toolNamePrefix`, while Strands 1.16 uses `prefix`. The product now builds native Strands MCP server objects directly, so TypeScript protects that boundary.

Playwright MCP itself already exposes canonical names such as `browser_navigate`; WDA therefore does not add another browser prefix.

The checked-in browser integration uses the same WDA-built candidate browser configuration and validates:

```text
native Strands candidate initialization      PASS
Playwright MCP stdio connection               PASS
Playwright tool catalog                       PASS (24 tools)
browser_navigate                              PASS
browser_snapshot                              PASS
browser_take_screenshot                       PASS
real accessibility snapshot                   PASS
real PNG image result                         PASS
clean Strands/runtime teardown                PASS
```

A durable environment may provide an existing browser executable through `WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH` or a browser cache through `WEB_DESIGN_AGENT_PLAYWRIGHT_BROWSERS_PATH` / `PLAYWRIGHT_BROWSERS_PATH`. WDA passes browser-cache state explicitly to the stdio MCP child because the MCP transport intentionally inherits only a safe environment-variable subset.

This proves the physical browser capability and Strands candidate lifecycle. It does **not** yet prove that a real model successfully uses that capability to critique and repair a generated candidate.

### Official MCP Apps browser host smoke

A temporary host used the official `@modelcontextprotocol/ext-apps/app-bridge` `AppBridge` and `PostMessageTransport` with Chromium. The real production MCP App completed the `ui/initialize` handshake and received tool input/result notifications.

Verified interactions:

```text
A/B/C selector                         PASS
Candidate B selection                  PASS
multi-page Stats selection             PASS
live Radius slider -> nested preview   PASS
three-way Compare                      PASS
ui/update-model-context handoff        PASS
```

This validates the MCP App protocol and browser behavior under the official host bridge. It is not a claim that ChatGPT or Claude's production clients have rendered this exact build yet.

### Higgsfield capability smoke

The connected Higgsfield surface successfully completed one real 16:9 website-concept image generation. This proves the external image-generation capability is live. It does not yet prove Web Design Agent's southbound Concept Artist provider path through Strands. Provider authorization is deployment-owned and does not alter the NoAuth WDA client contract.

### Model/provider availability in the external validation sandbox

The external validation sandbox used for package/browser validation has no configured AWS, Anthropic, OpenAI, Google/Gemini, or 21st credentials. Therefore no provider-backed generation is claimed from that environment.

## Durable DEVELOPMENT Gate

The repository now exposes one typed physical validation command for a durable reusable DEVELOPMENT environment:

```text
npm run check:durable
```

This runs:

1. strict TypeScript;
2. delegate/product tests;
3. real WDA HTTP MCP integration and production App build;
4. physical native Strands + Playwright MCP browser integration;
5. npm package dry-run.

The browser gate requires an environment-owned executable or equivalent valid Playwright deployment configuration. Browser installation is an environment/bootstrap responsibility, not per-request work.

## Dependency Lock State

The exact post-rename WDA install generates npm lockfile v3 from the renamed bridge graph. The renamed bridge also generates its own real lockfile in Node 22 validation.

Those generated lockfiles should be committed from the durable Tavall DEVELOPMENT write surface so the repository receives the exact generated bytes rather than a reconstructed dependency graph.

## Remaining Promotion Gates

1. Commit the exact generated WDA `package-lock.json`; commit the bridge lockfile if repository policy retains it.
2. Run an authorized real model generation through the Web Design Agent Director and candidate specialists.
3. Run real 21st MCP discovery/use through Strands using the deployment-owned API key.
4. Use the physically proven browser capability in an actual model-led candidate render -> inspect -> critique -> repair loop.
5. Run Web Design Agent's configured southbound concept-provider path through Strands with deployment-owned provider authorization. Connector-level generation is already proven separately.
6. Render the production MCP App in supported ChatGPT and Claude clients.
7. Run the full vague-prompt corpus with the real model/browser loop and record one-shot quality measurements.

## Promotion State

PR #2 remains Draft. The public product boundary is intentionally NoAuth; provider credentials are deployment concerns rather than client authentication requirements. The principal remaining work is real model/tool design-quality evidence and supported-client validation, not package, Strands, MCP, or browser-process plumbing.
