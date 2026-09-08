# Web Design Agent Progression

> **Status:** Implementation tracker  
> **Current audited source line:** security/budget hardening through the current `working/strands-agent-foundation` head  
> **Last fully executed physical baseline:** `7fbff58da150a17aa3e02994b9b49c0e5ea814e0`  
> **Authority:** Reports implementation/validation evidence only; product behavior is owned by `WEB_DESIGN_AGENT_FINAL_DRAFT.md`

## Summary

Web Design Agent has moved beyond the original physical Strands/browser proof into a hardened public NoAuth product line. The current source adds SSRF defenses, source-bound browser evidence, provider/component evidence, public MCP capacity/input limits, native Strands invocation budgets, MCP disconnect cancellation, source-mode invariants, and stricter concept-first behavior.

Strands Agents remains the actual agent framework. `@tjxjnoobie/strands-bridge` is thin shared lifecycle/integration glue only.

The critical evidence rule is now stronger than the last physical baseline: model claims are never authoritative, browser inspection must be navigation-bound, source-dependent modes must inspect the exact validated source target, and code-first does not claim final browser validation until returned output is deterministically render-bound.

## Current source implementation

| Area | Current source state |
| --- | --- |
| Strands Director + A/B/C + Critic | Implemented |
| Thin `strands-bridge` boundary | Implemented; pinned to `69d27b147ee4f8bf0bfba43cbd0668a1ca4dd868` |
| Typed design contracts / genomes / design systems | Implemented |
| Deterministic A/B/C distance | Implemented |
| Multi-page route enforcement | Implemented |
| Native Strands MCP configuration | Implemented |
| External MCP role ownership | Candidates: browser/components; Concept Artist: image; Director/Critic: no duplicates |
| Runtime-grounded browser evidence | Implemented from native Strands lifecycle events |
| Navigation-bound browser evidence | Implemented; failed navigation clears current target |
| Existing-site/reference-image source binding | Implemented; exact validated source required for A/B/C |
| Concept-first provider evidence | Implemented; successful `assets_*` event required |
| Concept-first selected-image inspection | Implemented; A/B/C must inspect selected concept target |
| Component research evidence | Implemented from successful candidate `components_*` events |
| Code-first browser truthfulness | Browser activity retained, `browserValidated=false` until final candidate output is deterministic-render-bound |
| Explicit browser SSRF validation | Implemented; public URL/DNS/address policy |
| Hosted browser egress startup gate | Implemented; public HTTP browser capability requires isolated-egress declaration |
| Public NoAuth HTTP limits | Implemented; concurrency, body size, receive/header timeout, safe errors, CORS |
| Public MCP schema limits | Implemented for prompts, feedback, URLs, pages, candidate/profile fields |
| Native Strands invocation budgets | Implemented; wall-clock + turn/output/total-token limits |
| MCP disconnect cancellation | Implemented; MCP request signal propagated to Strands |
| Pre-cancel short circuit | Implemented; cancelled request rejected before runtime construction |
| Pinned model baseline | Implemented; deployment override retained |
| Playwright MCP fallback | Implemented with isolated/headless/service-worker-blocking configuration |
| NoAuth `/mcp` | Implemented |
| MCP App review surface | Implemented |
| Durable validation command | `npm run check:durable` |

## Last physically executed baseline

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

A clean external npm consumer also verified WDA, the renamed bridge, real Strands 1.16.0, public package import, NoAuth startup, and all eight WDA tools. The production MCP App completed the official AppBridge handshake and browser interaction smoke.

These results remain evidence for that tested line only. They do **not** prove the later SSRF, source-binding, invocation-budget, request-cancellation, bounded-schema, concept-provider, or pre-cancel changes until the current head is executed again.

## Current hardening details

### Browser target policy

Explicit browserable inputs are accepted only as validated public HTTP(S) targets. The validator rejects URL credentials, non-public ports, localhost/internal names, and any DNS result in private, loopback, link-local, metadata, reserved, or multicast ranges. Mixed public/private DNS answers fail closed.

Application validation is intentionally not represented as a complete network firewall. Public browser hosting also requires environment-enforced egress isolation because redirects, rebinding, clicks, and model-discovered destinations happen after request parsing.

### Browser evidence

Browser evidence is now target-aware:

```text
successful browser_navigate(target)
-> current candidate target = target
-> browser_snapshot / browser_take_screenshot
-> runtime evidence bound to target
```

A failed later navigation clears the target.

For existing-site, reference-image, and concept-first implementation, A/B/C must each inspect the exact validated source target.

For code-first, arbitrary browser activity no longer makes `browserValidated=true`. A deterministic final-output renderer is still required before WDA can prove that the returned HTML itself was inspected.

### Provider/tool evidence

- successful `components_*` calls are attributed to their candidate;
- failed component calls do not count;
- concept generation requires a successful Concept Artist `assets_*` event;
- model-provided image URLs without provider execution are rejected.

### NoAuth resource controls

The public server currently owns per-process concurrency, body-size and request/header receive limits, safe anonymous errors, protocol CORS headers, and observed cleanup. Public tool schemas bound expensive request fields before workflow execution.

Global/per-source rate limiting remains a deployment/edge concern rather than an application-owned mutable map.

### Native Strands execution controls

Current defaults:

```text
invocation timeout      240,000 ms
max turns               16
max output tokens       60,000
max total tokens        200,000
```

All are deployment-overridable. MCP request cancellation is combined with the WDA timeout through native AbortSignals and forwarded to Strands. Incomplete stop reasons are rejected rather than parsed as complete JSON.

## GitHub/Codex fallback state

GitHub remains the active SCM/review fallback while Tavall Cloud v2 is unavailable in this chat.

Codex previously found and helped surface real P1/P2 issues around SSRF, evidence binding, CORS, cleanup, source inputs, and refinement identity; those review threads were addressed and resolved.

The GitHub Codex review quota and subsequent coding-agent quota are currently exhausted. Therefore later current-head changes have been statically reconciled through GitHub but have **not** been executed by Codex. Do not reinterpret the absence of a new review as a green check.

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

The durable Tavall `ubuntu` environment remains the intended long-lived execution surface for the current-head rerun, exact dependency lock, network-isolation verification, and provider-backed quality work.

## Dependency locks

The renamed dependency graph reproducibly generated npm lockfile v3 during prior physical validation. The exact current lock should be generated and committed from the durable DEVELOPMENT write surface rather than reconstructed through connector text.

## Remaining promotion gates

1. Rerun the **current** hardened head with `npm run check:durable` and commit its exact dependency lock.
2. Verify the public browser egress network boundary on the real deployment surface.
3. Add deterministic final-candidate rendering so code-first can earn real browser validation.
4. Run an authorized real model through Director -> Candidate A/B/C -> Critic.
5. Run real 21st MCP through Strands with deployment-owned credentials.
6. Prove the real model-led render -> inspect -> critique -> repair loop.
7. Prove the Concept Artist southbound image-provider path through Strands.
8. Render the production MCP App in supported ChatGPT and Claude clients.
9. Run the full vague-prompt corpus with real model/browser behavior and record one-shot quality.

## Promotion state

PR #2 remains Draft. The older line proved that the package, Strands, MCP, MCP App, and browser mechanics are physically real. The current line strengthens security, resource control, and evidence semantics, but must be physically rerun before those newer claims become promotion evidence.
