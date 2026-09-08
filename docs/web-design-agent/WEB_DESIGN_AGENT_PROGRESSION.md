# Web Design Agent Progression

> **Status:** Implementation tracker  
> **Audited implementation head:** `7fbff58da150a17aa3e02994b9b49c0e5ea814e0`  
> **Authority:** Reports implementation/validation evidence only; product behavior is owned by `WEB_DESIGN_AGENT_FINAL_DRAFT.md`

## Summary

Web Design Agent is physically validated across the renamed Strands dependency graph, public NoAuth MCP transport, production MCP App, clean packed-consumer installation, native Strands candidate/browser integration, and runtime-grounded browser evidence.

Strands Agents remains the actual agent framework. `@tjxjnoobie/strands-bridge` is thin shared lifecycle/integration glue only.

The major change in this audited line is that browser validation no longer trusts model output. WDA consumes native Strands streaming lifecycle events, records successful candidate browser calls, overwrites model-authored browser evidence, and computes `browserValidated` from observed execution.

## Implemented and validated

| Area | Status | Evidence |
| --- | --- | --- |
| Strands Director + A/B/C + Critic | Implemented + physical Strands evidence | native agents and agent-as-tool composition |
| Thin `strands-bridge` boundary | Physically validated | `@tjxjnoobie/strands-bridge@0.1.0`, bridge head `69d27b147ee4f8bf0bfba43cbd0668a1ca4dd868` |
| Typed Design Intent / Genome / Design System / Visual State | Implemented + tested | `src/design/data/` |
| Deterministic A/B/C distance | Implemented + tested | `DesignDistanceEvaluator` |
| Multi-page route enforcement | Implemented + tested | runtime route validation |
| Native Strands MCP configuration | Implemented + tested | no loose external MCP config cast |
| External MCP role ownership | Implemented + tested | Candidates: browser/components; Concept Artist: image provider; Director/Critic: no duplicates |
| Runtime-grounded browser evidence | Implemented + tested | `WebDesignAgentToolEvidenceCollector` + streamed nested Strands events |
| Existing-site/reference evidence gate | Implemented + tested | requires configured browser **and observed inspection** |
| 21st configuration | Implemented | provider-backed call pending |
| Playwright MCP fallback | Implemented + physically validated | official `@playwright/mcp@0.0.80`, 24 browser tools |
| Higgsfield concept capability | Implemented configuration | separate connector-level real generation proven; WDA southbound path pending |
| NoAuth `/mcp` | Physically validated | real MCP client, eight WDA tools, `authentication:none` |
| MCP App production bundle | Physically validated | Vite single-file build, official AppBridge interaction smoke |
| Live ABC controls | Browser validated | candidate/page switching, compare, live radius mutation, context handoff |
| Clean consumer package | Physically validated | current WDA + renamed bridge + Strands 1.16.0 install/start/catalog |
| Durable validation command | Implemented | `npm run check:durable` |

## Physical validation

Against implementation head `7fbff58da150a17aa3e02994b9b49c0e5ea814e0` with Node `v22.23.2`:

```text
strict TypeScript                                PASS
product/delegate tests                           PASS (30 / 30)
real HTTP MCP integration                        PASS (1 / 1)
production Vite MCP App build                    PASS
native Strands candidate + Playwright MCP        PASS (1 / 1)
Playwright browser catalog                       PASS (24 tools)
real browser navigation                          PASS
real accessibility snapshot                      PASS
real PNG screenshot                              PASS
package dry-run                                  PASS
```

### Browser evidence hardening

The audited runtime now uses `director.streamAgent()` for generation/refinement so nested specialist lifecycle events remain visible.

`WebDesignAgentToolEvidenceCollector` records successful `browser_*` calls only when the event belongs to `web-design-agent-candidate-a`, `-b`, or `-c` and the tool result did not fail.

For final generation:

```text
model browserValidated=true + no real calls      -> false
model browserEvidence strings + no real calls    -> discarded
failed browser_snapshot                           -> does not count
A/B/C observed snapshot/screenshot                -> browserValidated=true
existing/reference + missing observed evidence    -> generation rejected
```

The model's validation notes are preserved only as `Agent note (unverified): ...`. Runtime evidence notes are added separately.

### Physical browser path

The checked-in browser integration initializes a real WDA candidate through `StrandsAgentRuntimeBootstrap`, opens the WDA-built Playwright MCP config, validates canonical browser tool names, navigates a real page, receives an accessibility snapshot, captures a PNG, and closes resources cleanly.

A durable environment may supply:

- `WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH`;
- `WEB_DESIGN_AGENT_PLAYWRIGHT_BROWSERS_PATH` / `PLAYWRIGHT_BROWSERS_PATH`;
- `WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_COMMAND`;
- or a remote `WEB_DESIGN_AGENT_BROWSER_MCP_URL`.

Browser provisioning is environment work, not per-request work.

### Public MCP and package

A clean external npm consumer has verified:

```text
@tjxjnoobie/web-design-agent@0.2.0              PASS
@tjxjnoobie/strands-bridge@0.1.0               PASS
@strands-agents/sdk@1.16.0                     PASS
public package import                           PASS
NoAuth HTTP startup                             PASS
root authentication:none                       PASS
all eight WDA tools                             PASS
```

### MCP App

The production App has completed the official MCP Apps `AppBridge` handshake and verified A/B/C selection, route switching, three-way compare, live slider mutation, and `ui/update-model-context` handoff in Chromium.

### Higgsfield

One real website-concept image generation completed through the connected Higgsfield surface. This proves provider capability separately, not yet WDA Concept Artist orchestration through Strands.

## Durable DEVELOPMENT gate

The repository exposes:

```text
npm run check:durable
```

It combines:

1. TypeScript + product/delegate tests;
2. real WDA HTTP MCP integration and App build;
3. physical native Strands + Playwright MCP browser integration;
4. package dry-run.

The durable Tavall `ubuntu` environment is the intended long-lived execution surface for final locks and provider-backed runs once its typed command namespace is exposed to this chat.

## Dependency locks

The exact renamed dependency graph reproducibly generates npm lockfile v3. The lock should be committed from the durable DEVELOPMENT write surface rather than reconstructed through connector text.

## Remaining promotion gates

1. Commit exact WDA dependency lock; commit bridge lock if repository policy retains it.
2. Run an authorized real model through Director -> Candidate A/B/C -> Critic.
3. Run real 21st MCP through Strands with deployment-owned credentials.
4. Prove a real model-led render -> inspect -> critique -> repair loop and observe `browserValidated=true` from runtime events.
5. Prove the Concept Artist southbound image-provider path through Strands.
6. Render the production MCP App in supported ChatGPT and Claude clients.
7. Run the full vague-prompt corpus with real model/browser behavior and record one-shot quality.

## Promotion state

PR #2 remains Draft. Package, Strands, MCP, App, and browser mechanics are no longer the primary risk. The remaining risk is the thing judges and users actually care about: whether the real model/tool loop produces excellent, distinctive websites from vague prompts.
