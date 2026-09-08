# Web Design Agent Final Draft

> **Status:** Working product and architecture contract  
> **Authority:** Proposed Web Design Agent product behavior still open to material design changes  
> **Owns:** Web design workflow, product prompts, typed design contracts, product MCP surface, MCP App review experience, external design-tool selection, and product validation policy  
> **Must not define:** Shared Strands SDK lifecycle/MCP mechanics, Tavall Java infrastructure, target-project frontend architecture, provider implementations, client authentication requirements, or claims unsupported by runtime evidence

## About

Web Design Agent turns vague web-design requests into three real and deliberately different website implementations, gives the user a visual A/B/C review surface, accepts high-bandwidth visual preference input, and reconciles the selected direction into exportable implementation artifacts.

The product optimizes for one-shot usefulness: an intelligible vague prompt should normally produce at least one direction worth selecting without forcing the user to write a design specification first.

## Ownership Rules

This repository owns:

- the Design Director, candidate, critic, and optional concept-specialist product prompts;
- A/B/C product policy and deterministic diversity enforcement;
- design intent, Design Genome, design system, visual state, multi-page, concept, export, and preference-profile contracts;
- the stateless public NoAuth MCP product surface and local stdio surface;
- the MCP App review/editor experience;
- selection of optional browser, component-research, and concept-image MCP integrations;
- one-shot evaluation metrics and product validation requirements.

Strands is the agent framework and owns the model/tool loop. The thin `@tjxjnoobie/strands-bridge` package owns only shared integration mechanics that multiple products would otherwise duplicate:

- physical Strands SDK construction;
- native Strands MCP loading;
- native agent-as-tool composition support;
- lifecycle validation and cleanup around invocation, streaming, cancellation, and reverse-order MCP teardown.

The bridge must not become a second agent framework, provider layer, product authentication system, or mirror of native Strands capabilities. The product must not duplicate Tavall Java DI/cache/registry/database/concurrency systems.

## System Rules and Behavior

### Vague-Prompt Rule

The Design Director infers a hidden product brief from an intelligible request rather than asking unnecessary preference questions. Product, audience, goal, content hierarchy, responsive requirements, and visual constraints become typed design intent.

### A/B/C Rule

Material design generation produces exactly one A, B, and C candidate. Each candidate has a Design Genome describing:

- composition;
- navigation;
- hero strategy;
- typography class;
- density;
- geometry;
- surface model;
- depth;
- motion language;
- content rhythm;
- imagery strategy.

`DesignDistanceEvaluator` scores every candidate pair. The runtime allows one regeneration pass when a pair falls below the required distance and rejects the generation if the second set remains too similar.

##### Why

Creative divergence must be enforceable outside prompt wording. Otherwise A/B/C can degrade into one layout wearing three palettes, which creates the illusion of choice without producing useful exploration.

### Candidate Implementation Rule

Each candidate returns browser-renderable HTML/CSS and optional JavaScript. Empty JavaScript is valid. Each candidate also returns a design system containing design tokens, typography roles, reusable component names, and principles represented by the implementation.

Requested non-home routes are returned in `pages[]` and use the candidate's shared CSS/design language. The runtime verifies requested routes are present before returning success.

### External Tool Rule

21st/component MCP results are inspiration and pattern research. They do not decide the target project's framework. React/Tailwind source may be structurally analyzed and reimplemented in the target stack.

Browser evidence is truthful only when browser tooling actually executed. Existing-site and reference-image modes reject without configured browser capability rather than inventing inspection evidence.

Higgsfield concept-first generation is optional. Generated imagery is labeled and treated as conceptual reference. The selected concept must still be turned into real A/B/C implementations before it represents working product behavior.

Provider keys, OAuth state, or other credentials required by optional model/design services are deployment-owned service capabilities. They are not credentials that a client must supply to use the Web Design Agent MCP endpoint.

### NoAuth Public MCP Rule

The hosted HTTP MCP product endpoint is NoAuth.

Clients do not create Web Design Agent accounts, log in, or send product bearer tokens. Every public request receives an isolated runtime composition and no cross-client model/session state is shared.

Deployment may enforce rate limits, concurrency limits, request-size limits, timeouts, and compute/resource ceilings. Those are abuse and capacity controls, not authentication.

##### Why

The product designs web pages. Requiring an account boundary for ordinary MCP use would add state, credential handling, and client friction without improving the core product contract. Provider-side secrets still remain private to the deployment that pays for or operates those capabilities.

### Visual Preference Rule

Candidates expose review variables for density, spacing, radius, font scale, hero scale, contrast, depth, and motion where meaningful.

The MCP App changes those values locally and immediately. It does not call the model for every slider movement. When refinement is requested, the selected candidate, exact visual-state snapshot, and optional text feedback are sent back to the Strands workflow.

### Preference Portability Rule

A selected design can produce a versioned portable preference profile containing the accepted genome, rejected genomes, final visual state, and notes. Anonymous public MCP operation does not require server-side identity or durable user storage.

##### Why

Portable explicit preference evidence allows future calls to reuse design taste without introducing cross-user state into a public NoAuth service.

## Technical Structure

```text
src/
├── agent/
│   ├── config/
│   ├── prompt/
│   └── runtime/
├── design/
│   ├── data/
│   ├── export/
│   ├── handler/
│   └── validation/
├── mcp/
│   ├── http/
│   ├── server/
│   └── stdio/
├── mcp-app/
├── evaluation/
└── cli/
```

### Runtime Composition

```text
build Candidate A native Strands agent
-> build Candidate B native Strands agent
-> build Candidate C native Strands agent
-> build Visual Critic native Strands agent
-> optionally build Concept Artist native Strands agent
-> expose specialists through native Strands agent-as-tool support
-> build Design Director native Strands agent with those tools
-> invoke product workflow
-> close lifecycle-owned agents/resources in reverse construction order
```

Every public workflow call builds a fresh composition. The public HTTP MCP endpoint therefore remains stateless across requests.

## Runtime Flows

### Code-First Generation

```text
prompt
-> Design Director hidden brief
-> candidate A/B/C specialist invocations
-> critic/review loop
-> typed candidate parsing
-> deterministic design-distance validation
-> requested-route validation
-> structured generation result
```

### Refinement

```text
selected candidate
+ live VisualState snapshot
+ optional human feedback
-> matching candidate specialist
-> visual critic
-> replacement candidate
```

### Concept-First

```text
prompt
-> optional Concept Artist + deployment-provided image capability
-> three conceptual images
-> user selects one
-> selected concept becomes reference input
-> normal real A/B/C implementation flow
```

Higgsfield is one supported provider path for this optional capability. Its provider authorization is deployment-owned and does not change the Web Design Agent's NoAuth client surface.

### Existing Site / Reference Image

These modes require browser capability. Missing browser capability is a typed validation failure, not a fallback to invented visual evidence.

### Export

`DesignExportBuilder` applies the current VisualState variables and produces standalone HTML for the home document and additional page routes. Script closing tags are escaped before inline export.

## MCP Product Surface

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

The HTTP surface exposes `/mcp` as a NoAuth product endpoint and creates a fresh MCP server/transport for each request. Clients do not log in or supply product credentials. Deployment-owned model or optional provider credentials are internal service capabilities, not client authentication. Deployment must still apply ordinary network abuse controls such as rate limiting, concurrency limits, request-size limits, timeouts, and resource limits.

## MCP App Review Surface

The review UI supports:

- A/B/C selector;
- simultaneous comparison;
- desktop/tablet/mobile preview widths;
- route switching for multi-page candidates;
- live visual sliders;
- selected-candidate design-system inspection;
- agent refinement;
- selection context handoff;
- export;
- concept-first selection.

Generated candidate documents render inside sandboxed iframes. The review shell itself is framework-light and does not impose the generated site's implementation stack.

## One-Shot Evaluation

The checked-in corpus intentionally uses vague prompts. Current automated metrics are objective only:

- successful generation rate;
- valid three-candidate implementation rate;
- deterministic candidate-diversity rate;
- browser-validation rate.

The suite does not fabricate subjective metrics such as "user would choose one" without actual human evidence.

## Validation Requirements

The current PR line now has physical infrastructure evidence in addition to its contract tests.

Verified on Node `v22.23.2` with real installed packages before the package namespace reconciliation:

- clean `npm install` succeeds;
- strict TypeScript typecheck succeeds;
- 17/17 delegate/product contract tests pass;
- production TypeScript and Vite MCP App builds succeed;
- `npm pack` succeeds;
- real MCP SDK 1.30 client negotiates the HTTP server, lists all eight tools, reads the production MCP App resource, and calls a real tool;
- a clean external npm consumer installs the packed artifact, imports the public package, starts the MCP binary, and negotiates all eight tools;
- the shared bridge physically verifies real `@strands-agents/sdk@1.16.0` and passes a native disposable Strands + MCP integration flow;
- the production MCP App completes the official MCP Apps `AppBridge` initialization flow in Chromium and passes A/B/C selection, route switching, live slider mutation, compare mode, and `ui/update-model-context` handoff;
- one real Higgsfield website-concept generation completes through the connected external generation surface.

The renamed `@tjxjnoobie/strands-bridge` package and WDA dependency/import reconciliation must receive the same clean Node 22 install/check before that namespace change is considered physically revalidated.

Before this draft may be promoted, the remaining product-quality paths must be verified:

- commit the generated npm lockfile from the normal DEVELOPMENT environment when available;
- rerun clean Node 22 install and `check:real` against the renamed bridge package/commit;
- run an authorized real model generation through the Design Director and candidate specialists;
- run real 21st MCP discovery/use through Strands with the deployment-owned API key;
- run the configured southbound browser MCP through a real candidate render/critique/repair loop;
- run the configured southbound Higgsfield concept-first path through Strands with deployment-owned provider authorization;
- render the production MCP App in supported ChatGPT and Claude clients;
- record exact one-shot evaluation results from real model/browser runs.

##### Why

Infrastructure validation proves the package, Strands boundary, transport, App protocol, browser shell, and packaging behave physically. It does not prove the product's defining quality claim: that a vague prompt produces strong, distinctive sites through the complete provider-backed model and design-tool loop. Promotion therefore remains tied to that evidence rather than to dependency plumbing alone.

## Final Rules Summary

- Strands owns the agent framework and model/tool loop; `strands-bridge` owns only shared lifecycle/composition glue.
- The public HTTP MCP endpoint is NoAuth.
- A/B/C means structurally different real implementations.
- Deterministic code validates candidate diversity and required pages.
- External component libraries inspire design but do not force framework migration.
- Browser evidence is never invented.
- Concept imagery is optional reference material, not implementation proof.
- Slider changes are immediate local visual input and become model input only on refinement.
- Public anonymous MCP requests remain isolated and stateless.
- Preference reuse is portable and explicit rather than hidden server identity state.
