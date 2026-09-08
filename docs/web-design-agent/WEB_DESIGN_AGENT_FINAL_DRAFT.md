# Web Design Agent Final Draft

> **Status:** Working product and architecture contract  
> **Authority:** Proposed Web Design Agent product behavior still open to material design changes  
> **Owns:** Web design workflow, product prompts, typed design contracts, product MCP surface, MCP App review experience, external design-tool selection, and product validation policy  
> **Must not define:** Shared Strands SDK lifecycle/MCP mechanics, Tavall Java infrastructure, target-project frontend architecture, or claims unsupported by runtime evidence

## About

Web Design Agent turns vague web-design requests into three real and deliberately different website implementations, gives the user a visual A/B/C review surface, accepts high-bandwidth visual preference input, and reconciles the selected direction into exportable implementation artifacts.

The product optimizes for one-shot usefulness: an intelligible vague prompt should normally produce at least one direction worth selecting without forcing the user to write a design specification first.

## Ownership Rules

This repository owns:

- the Design Director, candidate, critic, and optional concept-specialist product prompts;
- A/B/C product policy and deterministic diversity enforcement;
- design intent, Design Genome, design system, visual state, multi-page, concept, export, and preference-profile contracts;
- the stateless public MCP product surface and local stdio surface;
- the MCP App review/editor experience;
- selection of optional browser, component-research, and concept-image MCP integrations;
- one-shot evaluation metrics and product validation requirements.

`@tjxjnoobie/custom-strands-bridge` owns:

- physical Strands SDK construction;
- native Strands MCP loading;
- native agent-as-tool composition support;
- invocation, streaming, cancellation, and reverse-order MCP cleanup mechanics.

The product must not create a second agent framework or duplicate Tavall Java DI/cache/registry/database/concurrency systems.

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

### Visual Preference Rule

Candidates expose review variables for density, spacing, radius, font scale, hero scale, contrast, depth, and motion where meaningful.

The MCP App changes those values locally and immediately. It does not call the model for every slider movement. When refinement is requested, the selected candidate, exact visual-state snapshot, and optional text feedback are sent back to the Strands workflow.

### Preference Portability Rule

A selected design can produce a versioned portable preference profile containing the accepted genome, rejected genomes, final visual state, and notes. Anonymous public MCP operation does not require server-side identity or durable user storage.

##### Why

Portable explicit preference evidence allows future calls to reuse design taste without introducing cross-user state into a public no-auth service.

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
build Candidate A runtime
-> build Candidate B runtime
-> build Candidate C runtime
-> build Visual Critic runtime
-> optionally build Concept Artist runtime
-> expose specialists as native Strands agent tools
-> build Design Director runtime with those tools
-> invoke product workflow
-> close Director and specialists in reverse construction order
```

Every public workflow call builds a fresh runtime composition. The public HTTP MCP endpoint therefore remains stateless across requests.

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
-> optional Concept Artist + Higgsfield MCP
-> three conceptual images
-> user selects one
-> selected concept becomes reference input
-> normal real A/B/C implementation flow
```

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

The HTTP surface exposes `/mcp` without product authentication and creates a fresh MCP server/transport for each request. Deployment must still apply ordinary network abuse controls such as rate limiting and resource limits.

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

Implementation commit `6490fb8e0ee3aaafa4e321bcf78f98ae813aeab0` has local contract evidence:

- strict TypeScript typecheck against local external-boundary stubs;
- 17/17 delegate/product contract tests;
- server TypeScript build against the same external-boundary stubs.

That evidence proves product orchestration/contracts under substituted external boundaries only. It does not prove physical Strands SDK, MCP SDK, model-provider, browser, 21st, Higgsfield, or hosted-client behavior.

Before this draft may be promoted:

- install real npm dependencies and generate the lockfile;
- validate the exact shared bridge against its physical Strands SDK dependency;
- run an authorized real model generation;
- run real 21st MCP discovery/use;
- run real browser rendering, responsive checks, and screenshot/interaction evidence;
- validate Higgsfield concept-first when enabled;
- build the production Vite single-file MCP App against the real packages;
- run in-process/remote MCP client tests against the real SDK;
- run clean-directory package install and CLI/MCP smoke tests;
- render the MCP App in supported ChatGPT/Claude clients;
- record exact one-shot evaluation results from real model/browser runs.

## Final Rules Summary

- Strands owns the model/tool loop through the shared bridge.
- A/B/C means structurally different real implementations.
- Deterministic code validates candidate diversity and required pages.
- External component libraries inspire design but do not force framework migration.
- Browser evidence is never invented.
- Concept imagery is optional reference material, not implementation proof.
- Slider changes are immediate local visual input and become model input only on refinement.
- Public anonymous MCP requests remain isolated and stateless.
- Preference reuse is portable and explicit rather than hidden server identity state.
