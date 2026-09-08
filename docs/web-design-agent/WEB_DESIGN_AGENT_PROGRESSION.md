# Web Design Agent Progression

> **Status:** Implementation tracker  
> **Audited branch head:** `f07926fe3f41c4231139b9002baedcd63417315f`  
> **Authority:** Reports implementation and validation evidence only; product behavior remains owned by `WEB_DESIGN_AGENT_FINAL_DRAFT.md`

## Summary

Web Design Agent has physical validation across its package, Strands integration boundary, public MCP transport, production MCP App bundle, official MCP Apps host bridge, browser interaction shell, optional Higgsfield generation capability, and clean consumer installation.

The shared integration repository/package has now been renamed from the overly broad `custom-strands-bridge` identity to `strands-bridge` / `@tjxjnoobie/strands-bridge`. The architecture contract now states explicitly that Strands is the agent framework and the bridge is thin lifecycle/composition glue only.

The public HTTP MCP product boundary is explicitly **NoAuth**. Clients do not log in or provide Web Design Agent credentials. Deployment-owned model/provider keys are internal service capabilities. Rate limits, concurrency ceilings, request-size limits, timeouts, and compute/resource ceilings are abuse controls, not authentication.

The remaining blockers are product-quality/provider-backed paths and exact post-rename physical revalidation, not basic MCP design uncertainty.

## Implemented and Validated

| Area | Status | Evidence |
| --- | --- | --- |
| Strands Director + candidate A/B/C + critic composition | Implemented + physical Strands evidence | `WebDesignAgentRuntimeBuilder`; bridge validated against real `@strands-agents/sdk@1.16.0` before namespace reconciliation |
| Thin `strands-bridge` boundary | Implemented + bridge-local physical validation | package renamed to `@tjxjnoobie/strands-bridge`; native Strands remains framework owner |
| Optional concept specialist | Implemented | capability-gated `buildConcept()` path |
| Typed Design Intent / Genome / Design System / Visual State | Implemented + contract tested | `src/design/data/` |
| Deterministic A/B/C distance validation | Implemented + contract tested | `DesignDistanceEvaluator` |
| One regeneration attempt for low design distance | Implemented + contract tested | `WebDesignAgentRuntime.generate()` |
| Requested multi-page enforcement | Implemented + contract tested | `validatePages()` |
| Existing-site/reference browser gating | Implemented + contract tested | runtime validation |
| 21st MCP configuration | Implemented configuration | real provider-backed 21st call still pending |
| Higgsfield concept capability | Implemented configuration | connector-level real image generation completed; WDA southbound provider path still pending |
| HTTP NoAuth stateless `/mcp` server | Physically validated before namespace reconciliation | real MCP SDK 1.30 client connected and listed all eight tools; root descriptor reports `authentication: none` |
| Stdio MCP server | Implemented | packaged binary present; dedicated stdio client smoke remains optional |
| MCP App production bundle | Physically built | Vite 7.3.6 single-file build, `dist/mcp-app.html` 438.66 kB / 105.89 kB gzip |
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
| Package install/build | Physically validated before namespace reconciliation | fresh Node 22.23.2 install, typecheck, tests, Vite build, and pack |
| Clean consumer package install | Physically validated before namespace reconciliation | separate npm project installed packed 0.2.0 artifact, imported exports, started MCP binary, and listed eight tools |

## Physical Validation Evidence

### Web Design Agent baseline before bridge namespace reconciliation

Against the prior validated Web Design Agent line with Node `v22.23.2`:

```text
npm install                                 PASS
npm run typecheck                           PASS
npm test                                    PASS (17 / 17)
npm run test:integ:mcp                      PASS (1 / 1)
production Vite MCP App build               PASS
npm pack --dry-run --ignore-scripts         PASS
```

The physical MCP integration test uses the real MCP SDK `Client` and `StreamableHTTPClientTransport` against the real `WebDesignMcpHttpServer`, requires all eight public tools, reads the bundled `ui://web-design-agent/abc-review.html` resource, and calls `web-design-capabilities`.

### Strands bridge namespace reconciliation

The repository is now `tjXJNOOBIE/strands-bridge` and the npm package contract is `@tjxjnoobie/strands-bridge`.

A capable Node 22 sandbox physically validated the namespace-renamed bridge source before the GitHub API write path was used:

```text
npm install                                  PASS
package prepare/build                        PASS
bridge typecheck                             PASS
bridge delegate tests                        PASS (12 / 12)
real Strands SDK verification                PASS (@strands-agents/sdk 1.16.0)
native disposable Strands + MCP integration  PASS (1 / 1)
```

The exact GitHub bridge head used by Web Design Agent is now `69d27b147ee4f8bf0bfba43cbd0668a1ca4dd868`.

Web Design Agent package/import reconciliation to `@tjxjnoobie/strands-bridge` is committed. Exact fresh-clone WDA revalidation against that GitHub head is still pending because the available disposable verification surface repeatedly returned upstream 502 errors, while the fallback local container could not resolve GitHub DNS. This is an environment blocker, not a reported test pass.

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

The connected Higgsfield surface successfully completed one real 16:9 website-concept image generation. This proves the external image-generation capability is live. It does not yet prove Web Design Agent's southbound Higgsfield provider path through Strands. Provider authorization is deployment-owned and does not alter the NoAuth WDA client contract.

### Clean consumer smoke baseline

A separate empty npm project previously installed the packed Web Design Agent artifact and verified:

```text
Web Design Agent package 0.2.0              PASS
shared Strands bridge 0.1.0                 PASS
@strands-agents/sdk 1.16.0                  PASS
public package import                       PASS
web-design-agent-mcp startup                PASS
HTTP root descriptor authentication:none    PASS
real MCP client lists all eight tools       PASS
```

That consumer smoke must be rerun once against the renamed `@tjxjnoobie/strands-bridge` package before promotion.

## Dependency Lock State

A clean pre-rename install reproducibly generated npm lockfile v3. The namespace rename changes the dependency key and pinned bridge commit, so the final WDA lockfile must be regenerated after exact post-rename install validation rather than copying the stale lock.

The bridge itself also generated a real lockfile in the Node 22 validation sandbox after the package rename. Neither generated lockfile has been hand-reassembled through chat output.

## Remaining Promotion Gates

1. Complete clean Node 22 install + `check:real` for WDA against bridge head `69d27b147ee4f8bf0bfba43cbd0668a1ca4dd868`.
2. Regenerate and commit the final WDA `package-lock.json` from that exact dependency graph; commit the bridge lockfile if repository policy retains it.
3. Run an authorized real model generation through the Web Design Agent Director and candidate specialists.
4. Run real 21st MCP discovery/use through Strands using the deployment-owned API key.
5. Run the Web Design Agent's configured southbound browser MCP through an actual candidate render/critique/repair cycle.
6. Run Web Design Agent's configured southbound Higgsfield concept-first path through Strands with deployment-owned provider authorization. Connector-level generation is already proven separately.
7. Render the production MCP App in supported ChatGPT and Claude clients.
8. Run the full vague-prompt corpus with the real model/browser loop and record one-shot quality measurements.

## Promotion State

PR #2 remains Draft. The public product boundary is intentionally NoAuth; remaining provider credentials are deployment concerns, not client authentication requirements. The principal open gates are post-rename physical revalidation and the product's actual model-led design-quality/tool-use evidence.
