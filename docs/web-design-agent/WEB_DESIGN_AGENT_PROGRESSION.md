# Web Design Agent Progression

> **Status:** Implementation tracker  
> **Audited implementation head:** `59bf3242ae9aa246a0a5baf2e50f4e317f97718f`  
> **Authority:** Reports implementation and validation evidence only; product behavior remains owned by `WEB_DESIGN_AGENT_FINAL_DRAFT.md`

## Summary

Web Design Agent is now physically revalidated after the shared package/repository rename to `strands-bridge` / `@tjxjnoobie/strands-bridge`.

Strands Agents is the actual agent framework. The bridge remains thin shared lifecycle/composition/package glue and does not own the model/tool loop, provider framework, authentication framework, product prompts, or Web Design Agent policy.

The public HTTP MCP product boundary is explicitly **NoAuth**. Clients do not log in or provide Web Design Agent credentials. Deployment-owned model/provider keys are internal service capabilities. Rate limits, concurrency ceilings, request-size limits, timeouts, and compute/resource ceilings are abuse controls, not authentication.

Basic package/runtime uncertainty is no longer a blocker. The remaining gates concern the actual provider-backed design loop, supported-client rendering, one-shot quality measurement, and committing the generated dependency locks from the normal DEVELOPMENT write surface.

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
| 21st MCP configuration | Implemented configuration | real provider-backed 21st call still pending |
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
| Package install/build | Physically validated after rename | fresh Node 22.23.2 install, typecheck, 17/17 tests, Vite build, real MCP integration, and package dry-run |
| Clean consumer package install | Previously physically validated | must be rerun after namespace rename before promotion |

## Physical Validation Evidence

### Exact post-rename Web Design Agent graph

Against Web Design Agent head `59bf3242ae9aa246a0a5baf2e50f4e317f97718f` with Node `v22.23.2` and bridge pin `69d27b147ee4f8bf0bfba43cbd0668a1ca4dd868`:

```text
fresh Git clone                              PASS
renamed bridge resolution                    PASS
@tjxjnoobie/strands-bridge@0.1.0             PASS
@strands-agents/sdk@1.16.0                   PASS
npm install                                  PASS
npm run check:real                           PASS
contract/delegate tests                      PASS (17 / 17)
real HTTP MCP integration                    PASS (1 / 1)
production Vite MCP App build                PASS
production App size                          438.66 kB / 105.89 kB gzip
npm pack --dry-run                           PASS
package files                                144
package dry-run size                         140,977 bytes
```

The exact install generated npm lockfile v3 at 175,011 bytes.

The physical MCP integration uses the real MCP SDK `Client` and `StreamableHTTPClientTransport` against the real `WebDesignMcpHttpServer`, requires all eight public tools, reads the bundled `ui://web-design-agent/abc-review.html` resource, and calls `web-design-capabilities`.

### Strands bridge

The repository is `tjXJNOOBIE/strands-bridge` and the package is `@tjxjnoobie/strands-bridge`.

The renamed bridge has separately passed:

```text
npm install                                  PASS
package prepare/build                        PASS
bridge typecheck                             PASS
bridge delegate tests                        PASS (12 / 12)
real Strands SDK verification                PASS (@strands-agents/sdk 1.16.0)
native disposable Strands + MCP integration  PASS (1 / 1)
```

The exact GitHub bridge head consumed by Web Design Agent is `69d27b147ee4f8bf0bfba43cbd0668a1ca4dd868`.

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

The connected Higgsfield surface successfully completed one real 16:9 website-concept image generation. This proves the external image-generation capability is live. It does not yet prove Web Design Agent's southbound concept-provider path through Strands. Provider authorization is deployment-owned and does not alter the NoAuth WDA client contract.

### Model/provider availability in the validation sandbox

The capable external validation sandbox used for post-rename package validation has no configured AWS, Anthropic, OpenAI, Google/Gemini, or 21st credentials. Therefore no provider-backed generation is claimed from that environment.

## Dependency Lock State

The exact post-rename WDA install generated npm lockfile v3 at 175,011 bytes with the renamed bridge package/head. The renamed bridge also generates its own real lockfile in Node 22 validation.

Those generated lockfiles have not been hand-reassembled through chat output. They should be committed from the normal Tavall DEVELOPMENT environment/write surface so the repository receives the exact generated bytes rather than a reconstructed dependency graph.

## Remaining Promotion Gates

1. Commit the exact generated WDA `package-lock.json`; commit the bridge lockfile if repository policy retains it.
2. Rerun the clean external consumer/tarball smoke against the renamed bridge package identity.
3. Run an authorized real model generation through the Web Design Agent Director and candidate specialists.
4. Run real 21st MCP discovery/use through Strands using the deployment-owned API key.
5. Run the Web Design Agent's configured southbound browser MCP through an actual candidate render/critique/repair cycle.
6. Run Web Design Agent's configured southbound concept-provider path through Strands with deployment-owned provider authorization. Connector-level generation is already proven separately.
7. Render the production MCP App in supported ChatGPT and Claude clients.
8. Run the full vague-prompt corpus with the real model/browser loop and record one-shot quality measurements.

## Promotion State

PR #2 remains Draft. The public product boundary is intentionally NoAuth; provider credentials are deployment concerns rather than client authentication requirements. The principal remaining work is real model/tool design-quality evidence and supported-client validation, not package or MCP plumbing.
