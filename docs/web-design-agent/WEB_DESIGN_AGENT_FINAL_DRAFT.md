# Web Design Agent Final Draft

> **Status:** Working product and architecture contract  
> **Owns:** Web design workflow, A/B/C policy, product prompts/contracts, NoAuth MCP surface, MCP App review experience, design-tool selection, request safety, and product validation policy  
> **Must not define:** Shared Strands SDK mechanics, a replacement agent framework, Tavall Java infrastructure, provider implementations, client authentication requirements, or claims unsupported by runtime evidence

## About

Web Design Agent turns vague but intelligible web-design requests into three real and deliberately different website implementations, lets the user compare and visually tune them, and reconciles the selected direction into exportable implementation artifacts.

The north-star product claim is one-shot usefulness: the first A/B/C generation should normally contain at least one direction worth keeping without forcing the user to write a design specification first.

## Ownership

Strands is the agent framework and owns the model/tool loop. `@tjxjnoobie/strands-bridge` is thin shared integration/lifecycle glue only.

This repository owns:

- Design Director, Candidate A/B/C, Visual Critic, and optional Concept Artist product behavior;
- hidden-brief inference;
- Design Genome and deterministic A/B/C diversity policy;
- design intent, design-system, visual-state, multi-page, concept, export, and preference-profile contracts;
- external design-tool selection and role assignment;
- runtime evidence interpretation;
- public input and browser-target policy;
- the public NoAuth MCP product surface;
- the MCP App review/editor;
- product evaluation and promotion policy.

The bridge must not become another agent framework, provider layer, authentication system, or mirror of native Strands features.

## Runtime composition

```text
Candidate A native Strands agent
Candidate B native Strands agent
Candidate C native Strands agent
Visual Critic native Strands agent
optional Concept Artist native Strands agent
        ↓
exposed through native Strands agent-as-tool support
        ↓
Design Director native Strands agent
        ↓
WDA deterministic validation + runtime evidence
```

Every public workflow call builds a fresh composition and closes lifecycle-owned resources after the call. Public HTTP requests therefore do not share model conversation state.

The WDA model baseline is pinned explicitly rather than inheriting a moving SDK default. `WEB_DESIGN_AGENT_MODEL_ID` remains a deployment override.

## Invocation budget rule

Public and local workflows use native Strands invocation controls rather than a parallel watchdog system.

The default product budget is:

```text
wall-clock timeout     240 seconds
max turns              16
max output tokens      60,000
max total tokens       200,000
```

Deployments may override these through the documented `WEB_DESIGN_AGENT_*` invocation variables.

The Director receives native Strands `cancelSignal` and `limits`. Cancellation, turn/token exhaustion, provider refusal, guardrail intervention, or context-window exhaustion is treated as an incomplete product result rather than handing truncated output to the JSON parser.

For MCP calls, the request-scoped MCP abort signal is combined with the WDA timeout. An already-cancelled request is rejected before runtime construction, so a disconnected client does not create five agents and southbound MCP clients merely to discover that nobody is listening.

## A/B/C rule

Material generation returns exactly A, B, and C. They must differ structurally, not merely by palette or border radius.

Every candidate has a Design Genome covering composition, navigation, hero strategy, typography, density, geometry, surface model, depth, motion, content rhythm, and imagery strategy.

`DesignDistanceEvaluator` scores every candidate pair. One full regeneration attempt is permitted after deterministic diversity failure; the generation is rejected if the second set remains too similar.

## Candidate implementation rule

Each candidate returns browser-renderable HTML/CSS and optional JavaScript plus a concrete reusable design system. Empty JavaScript is valid.

Requested non-home routes live in `pages[]`, share the candidate design language, and are checked deterministically before success.

## External tool ownership

External capabilities belong only to the Strands agents that need them:

```text
Design Director
  -> Candidate A/B/C agent tools
  -> Visual Critic agent tool
  -> optional Concept Artist agent tool

Candidate A/B/C
  -> optional 21st component MCP
  -> optional browser MCP

Visual Critic
  -> no duplicate browser/component process

Concept Artist
  -> optional concept-image MCP only
```

21st is component/reference research, not architecture authority and not permission to force React/Tailwind into a target that does not use it.

## Browser capability and SSRF rule

A deployment can provide `WEB_DESIGN_AGENT_BROWSER_MCP_URL`. Otherwise it can opt into the official Playwright MCP stdio fallback with `WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT=true`.

WDA uses native Strands `McpServerConfig` fields directly. Browser tool names remain canonical, such as `browser_navigate`; WDA does not add a redundant browser prefix.

Explicit browserable source inputs are validated before Strands sees them. Public-target validation requires HTTP(S), rejects URL credentials and non-public ports, resolves DNS, and fails closed on loopback, private, link-local, metadata, reserved, multicast, or mixed public/private DNS answers.

Application URL validation is not a complete SSRF boundary because redirects, DNS rebinding, browser clicks, and model-discovered destinations happen after request parsing. Therefore a public NoAuth HTTP deployment with browser capability must also run the browser in a network boundary that cannot reach Tavall/control/private/metadata networks. WDA refuses that public browser configuration unless the deployment explicitly declares the egress boundary is in place.

Durable/hosted environments should provision browsers once at environment bootstrap. WDA supports an environment-owned browser executable/cache or remote browser MCP. Browser binaries are not downloaded per anonymous design request.

## Runtime evidence rule

**Model-authored validation claims are never authoritative browser or provider evidence.**

Generation and refinement consume the native Strands stream. `WebDesignAgentToolEvidenceCollector` watches nested specialist lifecycle events surfaced through Strands agent-as-tool streaming.

### Browser evidence

A successful `browser_navigate` establishes the candidate's current inspected target. A failed later navigation clears it. `browser_snapshot` or `browser_take_screenshot` counts only when it follows a successful navigation and is therefore bound to a known target.

For generation:

- model-authored candidate `browserEvidence` is replaced;
- model-authored `validation.browserValidated` is ignored;
- failed browser calls do not count;
- model-authored validation notes are retained only as explicitly unverified agent notes.

Source-dependent modes are strict:

- `reference-image` requires `referenceImageUrl` and browser capability;
- `existing-site` requires `targetUrl` and browser capability;
- `concept-first` requires a selected concept and browser capability;
- A, B, and C must each inspect the exact validated source target before the source-dependent generation can succeed.

For code-first generation, observed browser activity is retained as runtime evidence, but `browserValidated` remains **false** until the final returned candidate implementation can be deterministically bound to a controlled render target. Inspecting an arbitrary public page does not validate the HTML returned by WDA.

For refinement, selected-candidate browser evidence is likewise replaced by observed Strands tool evidence. Refinement also rejects a specialist result whose A/B/C ID does not match the selected candidate.

### Component and concept-provider evidence

Successful `components_*` calls are attributed to the candidate that used 21st/component research. Configuration alone is not evidence of use.

Concept-first image exploration requires successful `assets_*` execution from the Concept Artist. Three plausible image URLs in model JSON without a real provider event are rejected.

### Why

A model saying “I checked it” or “I generated this image” is not evidence. The runtime already receives real Strands lifecycle events, so WDA derives product evidence from those events rather than from prose-shaped optimism.

## NoAuth public MCP rule

The hosted HTTP MCP endpoint is intentionally **NoAuth**.

Clients do not create WDA accounts, log in, or send product bearer tokens. Deployment-owned model, browser, 21st, or image-provider credentials stay behind the service boundary.

NoAuth does not mean unbounded. The public Node boundary enforces configurable per-process concurrency, body-size, request-receive, and header limits. Tool schemas additionally bound prompt, feedback, URL, page-count/path, candidate, preference, and design-system fields before expensive workflow execution.

Native Strands wall-clock/turn/token budgets limit model/tool execution. MCP request cancellation propagates to Strands. Global or per-source rate limiting remains an edge/distributed-infrastructure responsibility rather than an application-owned mutable map.

These are abuse/capacity controls, not authentication.

## Visual preference rule

The MCP App exposes live visual controls including density, spacing, radius, font scale, hero scale, contrast, depth, and motion.

Slider changes modify preview state locally without a model round trip. When the user requests refinement, the exact visual-state snapshot plus optional text feedback is sent back through the Strands workflow.

## Preference portability rule

A selected direction may emit a versioned portable preference profile containing accepted genome, rejected genomes, final visual state, and notes. Anonymous operation therefore does not require hidden server-side identity state.

## Product flows

### Code-first

```text
prompt
-> hidden brief
-> Candidate A/B/C Strands agents
-> optional component/browser work
-> Visual Critic
-> typed parse
-> runtime evidence retained
-> browserValidated=false until final output is render-bound
-> deterministic diversity + route checks
-> A/B/C result
```

### Existing-site / reference-image

```text
validated public source URL
-> A/B/C each navigate and inspect exact source
-> implementation + critique
-> runtime verifies target-bound inspection
-> reject if any candidate lacks source evidence
```

### Refinement

```text
selected candidate
+ VisualState
+ human feedback
-> matching Candidate agent only
-> optional browser work
-> Visual Critic
-> enforce returned candidate ID
-> observed evidence replaces model evidence
-> refined candidate
```

### Concept-first

```text
prompt
-> Concept Artist + image capability
-> observed assets_* provider execution
-> three conceptual references
-> user selects one
-> validate selected public image URL
-> A/B/C each inspect selected image
-> real implementation flow
```

Concept images are references, never proof of a working site.

## MCP product surface

The product registers `design`, `refine-design`, `create-design-concepts`, `design-from-concept`, `export-design`, `extract-design-system`, `build-design-preference-profile`, `web-design-capabilities`, and MCP App resource `ui://web-design-agent/abc-review.html`.

The HTTP root advertises `authentication: none`.

## MCP App review surface

The review UI supports A/B/C selection, simultaneous comparison, desktop/tablet/mobile widths, multi-page route switching, live visual sliders, design-system inspection, refinement, selected-candidate context handoff, export, and concept-first selection.

Generated pages render inside sandboxed iframes. The review shell does not dictate the generated site's framework.

## Evaluation

The checked-in vague-prompt corpus records objective metrics such as generation success, valid three-candidate implementation rate, deterministic diversity rate, and runtime-grounded browser validation rate.

Subjective quality such as “a human would keep one of these” must come from real evaluation, not an invented automated score.

## Physical validation baseline

The last fully executed physical baseline predates the newest SSRF, request-budget, cancellation, bounded-schema, and source-binding commits. That earlier baseline proved real Node 22 installation, `@tjxjnoobie/strands-bridge`, Strands 1.16.0, 30/30 then-current product/delegate tests, HTTP MCP integration, production MCP App build, packed consumer startup, official AppBridge interaction, native Strands + Playwright MCP, real navigation/snapshot/PNG, and package dry-run.

Those results remain valid evidence for the tested commit only. They are **not** upgraded to physical evidence for the current source head until `npm run check:durable` is rerun.

The repository exposes `npm run check:durable` for the durable reusable DEVELOPMENT environment. It combines the core physical gate, physical Strands/browser integration, and package dry-run.

## Remaining promotion gates

- rerun the current security-hardened head in the durable DEVELOPMENT environment and commit the exact generated dependency lock;
- enforce and verify the public browser egress network boundary in deployment;
- add deterministic final-candidate render binding for code-first browser validation;
- run an authorized real model through Director -> A/B/C -> Critic;
- run real 21st MCP through Strands with deployment-owned credentials;
- prove the real model-led render -> inspect -> critique -> repair loop using runtime evidence;
- prove the Concept Artist southbound image-provider path through Strands;
- render the production MCP App in supported ChatGPT and Claude clients;
- run the full vague-prompt corpus with real model/browser behavior and record one-shot quality.

## Final rules

- Strands owns the agent framework and model/tool loop.
- `strands-bridge` is thin shared glue only.
- The public HTTP MCP endpoint is NoAuth.
- NoAuth browser access requires isolated network egress.
- A/B/C means genuinely different real implementations.
- Browser/provider evidence comes from observed Strands execution, never model self-report.
- Source-dependent evidence must match the validated source target.
- Code-first is not browser-validated until final output is deterministically render-bound.
- External capabilities are role-scoped.
- Native Strands limits and cancellation bound public agent work.
- Concept imagery is reference material, not working-site evidence.
- Public requests remain isolated and stateless.
