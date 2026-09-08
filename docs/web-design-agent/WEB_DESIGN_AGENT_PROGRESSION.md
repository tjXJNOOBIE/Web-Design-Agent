# Web Design Agent Progression

> **Status:** Implementation tracker  
> **Audited branch head:** `a80d6e9f2ec093e6dc7c5dea9129a9ea58a51871`  
> **Authority:** Reports implementation and validation evidence only; product behavior remains owned by `WEB_DESIGN_AGENT_FINAL_DRAFT.md`

## Summary

Web Design Agent now has physical validation across its package, shared Strands runtime boundary, public MCP transport, production MCP App bundle, official MCP Apps host bridge, browser interaction shell, optional Higgsfield generation capability, and clean consumer installation.

The remaining blockers are no longer basic packaging or transport uncertainty. They are the authenticated product-quality paths that require external credentials or an actual supported client host: authorized model generation, authenticated 21st use, the agent's southbound browser/Higgsfield MCP loops, hosted ChatGPT/Claude rendering, and real one-shot quality measurements.

## Implemented and Validated

| Area | Status | Evidence |
| --- | --- | --- |
| Strands Director + candidate A/B/C + critic composition | Implemented + physical bridge validation | `WebDesignAgentRuntimeBuilder`; shared bridge verified against real `@strands-agents/sdk@1.16.0` |
| Optional concept specialist | Implemented | capability-gated `buildConcept()` path |
| Typed Design Intent / Genome / Design System / Visual State | Implemented + contract tested | `src/design/data/` |
| Deterministic A/B/C distance validation | Implemented + contract tested | `DesignDistanceEvaluator` |
| One regeneration attempt for low design distance | Implemented + contract tested | `WebDesignAgentRuntime.generate()` |
| Requested multi-page enforcement | Implemented + contract tested | `validatePages()` |
| Existing-site/reference browser gating | Implemented + contract tested | runtime validation |
| 21st MCP configuration | Implemented configuration | authenticated 21st call still pending |
| Higgsfield MCP configuration | Implemented configuration | connector-level real image generation completed; WDA southbound MCP/OAuth path still pending |
| HTTP no-auth stateless `/mcp` server | Physically validated | real MCP SDK 1.30 client connected and listed all eight tools |
| Stdio MCP server | Implemented | packaged binary present; dedicated stdio client smoke still optional |
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
| Package install/build | Physically validated | fresh Node 22.23.2 install, typecheck, tests, Vite build, and pack |
| Clean consumer package install | Physically validated | separate npm project installed packed 0.2.0 artifact, imported exports, started MCP binary, and listed eight tools |

## Physical Validation Evidence

### Web Design Agent fresh clone

Against branch head `a80d6e9f2ec093e6dc7c5dea9129a9ea58a51871` with Node `v22.23.2`:

```text
npm install                                 PASS (299 packages)
npm run typecheck                           PASS
npm test                                    PASS (17 / 17)
npm run test:integ:mcp                      PASS (1 / 1)
production Vite MCP App build               PASS
npm pack --dry-run --ignore-scripts         PASS
```

The physical MCP integration test uses the real MCP SDK `Client` and `StreamableHTTPClientTransport` against the real `WebDesignMcpHttpServer`, requires all eight public tools, reads the bundled `ui://web-design-agent/abc-review.html` resource, and calls `web-design-capabilities`.

### Shared Strands bridge

Against bridge commit `98e009f014b5a58a004ceb5de66bed8b064714fe`:

```text
npm install / Git prepare build             PASS
bridge typecheck                            PASS
bridge delegate tests                       PASS (12 / 12)
real Strands SDK verification               PASS (@strands-agents/sdk 1.16.0)
native disposable Strands + MCP integration PASS (1 / 1)
```

The bridge packaging fix adds a `prepare` build so Git-pinned consumers receive the declared `dist` entry points instead of an unbuilt package.

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

The connected Higgsfield free-plan surface successfully completed one real 16:9 website-concept image generation. This proves the external image-generation capability is live. It does not yet prove Web Design Agent's southbound Higgsfield MCP/OAuth invocation through Strands because that authentication is not configured in the validation sandbox.

### Clean consumer smoke

A separate empty npm project installed the packed Web Design Agent tarball and verified:

```text
Web Design Agent package 0.2.0              PASS
custom-strands-bridge 0.1.0                 PASS
@strands-agents/sdk 1.16.0                  PASS
public package import                       PASS
web-design-agent-mcp startup                PASS
HTTP root descriptor                        PASS
real MCP client lists all eight tools       PASS
```

## Dependency Lock State

A clean install reproducibly generates npm lockfile v3, currently 175,039 bytes, with the corrected bridge pin `98e009f014b5a58a004ceb5de66bed8b064714fe`.

The lockfile is not yet committed. The current chat connector can execute and validate it in the capable sandbox but cannot directly transfer that generated file into the GitHub contents action without reconstructing the file through text chunks. Do not hand-reassemble the dependency lock. Commit the generated file directly from the Tavall DEVELOPMENT environment once its edited environment execution surface is injected.

## Remaining Promotion Gates

1. Commit the reproducibly generated `package-lock.json` from the normal DEVELOPMENT environment.
2. Run an authorized real model generation through the Web Design Agent Director and candidate specialists.
3. Run authenticated 21st MCP discovery/use through the configured Strands runtime.
4. Run the Web Design Agent's configured southbound browser MCP through an actual candidate render/critique/repair cycle.
5. Run Web Design Agent's configured southbound Higgsfield MCP/OAuth concept-first path through Strands. Connector-level generation is already proven separately.
6. Render the production MCP App in supported ChatGPT and Claude clients.
7. Run the full vague-prompt corpus with the real model/browser loop and record one-shot quality measurements.

## Promotion State

PR #2 remains Draft because the remaining gates concern the product's actual model-led design quality and authenticated external-tool orchestration. Package installation, real Strands presence, MCP transport, MCP App production build, AppBridge browser behavior, and clean consumer packaging are no longer blockers.
