# Web Design Agent Final Draft

> **Status:** Working product and architecture contract  
> **Owns:** Web design workflow, A/B/C policy, product prompts/contracts, NoAuth MCP surface, MCP App review experience, design-tool selection, and product validation policy  
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

## A/B/C rule

Material generation returns exactly A, B, and C. They must differ structurally, not merely by palette or border radius.

Every candidate has a Design Genome covering:

- composition;
- navigation;
- hero strategy;
- typography;
- density;
- geometry;
- surface model;
- depth;
- motion;
- content rhythm;
- imagery strategy.

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

## Browser capability rule

A deployment can provide `WEB_DESIGN_AGENT_BROWSER_MCP_URL`. Otherwise it can opt into the official Playwright MCP stdio fallback with `WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT=true`.

WDA uses native Strands `McpServerConfig` fields directly. Browser tool names remain canonical, such as `browser_navigate`; WDA does not add a redundant browser prefix.

Durable/hosted environments should provision browsers once at environment bootstrap. WDA supports:

- `WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH`;
- `WEB_DESIGN_AGENT_PLAYWRIGHT_BROWSERS_PATH` or `PLAYWRIGHT_BROWSERS_PATH`;
- `WEB_DESIGN_AGENT_PLAYWRIGHT_MCP_COMMAND`.

Browser binaries are not downloaded per anonymous design request.

## Runtime evidence rule

**Model-authored validation claims are never authoritative browser evidence.**

Generation and refinement consume the native Strands stream. `WebDesignAgentToolEvidenceCollector` watches actual nested candidate lifecycle events surfaced through Strands agent-as-tool streaming.

Only successful candidate `browser_*` calls are recorded. Failed calls do not count.

For generation:

- model-authored candidate `browserEvidence` is replaced;
- model-authored `validation.browserValidated` is ignored;
- model-authored validation notes are retained only as explicitly unverified agent notes;
- `browserValidated=true` requires successful inspection evidence for **A, B, and C**;
- successful inspection means an observed `browser_snapshot` or `browser_take_screenshot` call for that candidate.

For refinement, selected-candidate browser evidence is likewise replaced by observed Strands tool evidence.

Existing-site/reference-image modes require both configured browser capability and observed successful inspection. Merely configuring a browser does not satisfy the contract.

### Why

A model saying “I checked it” is not evidence that it checked it. The runtime already receives real Strands tool lifecycle events, so validation should be derived from those events rather than from prose-shaped optimism.

## NoAuth public MCP rule

The hosted HTTP MCP endpoint is intentionally **NoAuth**.

Clients do not create WDA accounts, log in, or send product bearer tokens. Deployment-owned model, browser, 21st, or image-provider credentials stay behind the service boundary.

Rate limits, concurrency ceilings, request-size limits, timeouts, and compute/resource ceilings are abuse/capacity controls, not authentication.

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
-> runtime-grounded browser evidence
-> deterministic diversity + route checks
-> A/B/C result
```

### Refinement

```text
selected candidate
+ VisualState
+ human feedback
-> matching Candidate agent
-> optional browser work
-> Visual Critic
-> observed evidence replaces model evidence
-> refined candidate
```

### Concept-first

```text
prompt
-> optional Concept Artist + image capability
-> three conceptual references
-> user selects one
-> selected concept becomes design input
-> real A/B/C implementation flow
```

Concept images are references, never proof of a working site.

## MCP product surface

The product registers:

- `design`;
- `refine-design`;
- `create-design-concepts`;
- `design-from-concept`;
- `export-design`;
- `extract-design-system`;
- `build-design-preference-profile`;
- `web-design-capabilities`;
- MCP App resource `ui://web-design-agent/abc-review.html`.

The HTTP root advertises `authentication: none`.

## MCP App review surface

The review UI supports:

- A/B/C selection;
- simultaneous comparison;
- desktop/tablet/mobile widths;
- multi-page route switching;
- live visual sliders;
- design-system inspection;
- refinement;
- selected-candidate context handoff;
- export;
- concept-first selection.

Generated pages render inside sandboxed iframes. The review shell does not dictate the generated site's framework.

## Evaluation

The checked-in vague-prompt corpus currently records objective metrics:

- generation success;
- valid three-candidate implementation rate;
- deterministic diversity rate;
- runtime-grounded browser validation rate.

Subjective quality such as “a human would keep one of these” must come from real evaluation, not an invented automated score.

## Physical validation baseline

Current real-package evidence includes:

```text
Node 22 install                                  PASS
@tjxjnoobie/strands-bridge@0.1.0                 PASS
@strands-agents/sdk@1.16.0                       PASS
strict TypeScript                                PASS
product/delegate tests                           PASS (30 / 30)
real HTTP MCP integration                        PASS (1 / 1)
production Vite MCP App build                    PASS
clean packed-consumer install                    PASS
packed NoAuth MCP + eight-tool negotiation       PASS
official MCP Apps AppBridge browser smoke        PASS
native Strands candidate + Playwright MCP init   PASS
Playwright browser catalog                       PASS (24 tools)
real navigate/snapshot/PNG                       PASS
runtime-grounded evidence behavior               PASS
package dry-run                                  PASS
```

The repository exposes `npm run check:durable` for the durable reusable DEVELOPMENT environment. It combines the core physical gate, physical Strands/browser integration, and package dry-run.

## Remaining promotion gates

- commit exact generated dependency locks from the durable DEVELOPMENT write surface;
- run an authorized real model through Director -> A/B/C -> Critic;
- run real 21st MCP through Strands with deployment-owned credentials;
- prove the real model-led render -> inspect -> critique -> repair loop using the runtime evidence collector;
- prove the Concept Artist southbound image-provider path through Strands;
- render the production MCP App in supported ChatGPT and Claude clients;
- run the full vague-prompt corpus with real model/browser behavior and record one-shot quality.

## Final rules

- Strands owns the agent framework and model/tool loop.
- `strands-bridge` is thin shared glue only.
- The public HTTP MCP endpoint is NoAuth.
- A/B/C means genuinely different real implementations.
- Browser evidence comes from observed Strands tool execution, never model self-report.
- External capabilities are role-scoped.
- Browsers are environment-provisioned, not downloaded per request.
- Concept imagery is reference material, not working-site evidence.
- Public requests remain isolated and stateless.
