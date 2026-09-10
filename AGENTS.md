# Repository instructions

`Web-Design-Agent` owns the Web Design Agent product. The authoritative backend/control architecture is Java. Shared provider-neutral AI execution and Java MCP capability publication belong in `TavallStudios/function-catalog`. Native Strands lifecycle/model-tool reasoning and native agent-as-tool composition belong in the standalone `tjXJNOOBIE/strands-bridge` MCP runtime service.

Browser-side MCP App assets and other genuine frontend code may remain TypeScript/Vite. TypeScript must not own product backend policy, MCP/control orchestration, design workflow authority, provider authorization, or durable/runtime infrastructure once its Java replacement is validated.

## Authoritative engineering guidance

Before changing code, architecture, tests, packaging, lifecycle, or documentation, read the current versions of **all** shared Tavall quality documents in `TavallStudios/tavall-docs`, including:

- [`CODE_ARCHITECTURE.md`](https://github.com/TavallStudios/tavall-docs/blob/main/docs/quality/CODE_ARCHITECTURE.md)
- [`DOCUMENTATION_STANDARDS.md`](https://github.com/TavallStudios/tavall-docs/blob/main/docs/quality/DOCUMENTATION_STANDARDS.md)
- [`GIT_WORKFLOW.md`](https://github.com/TavallStudios/tavall-docs/blob/main/docs/quality/GIT_WORKFLOW.md)
- every active chapter under [`docs/quality/code-architecture/`](https://github.com/TavallStudios/tavall-docs/tree/main/docs/quality/code-architecture), including `APPLICATION_OWNED_MUTABLE_MAPS.md`.

`CODE_ARCHITECTURE.md` wins if a detailed chapter conflicts with it. Repository-local rules may strengthen those documents but must not silently weaken them.

Use `TavallStudios/Tavall-Architecture-Tests` as the canonical executable architecture-test source. During the current migration, CI may consume the active executable consumer implementation from PR #6 until it is promoted and released.

## Product architecture

```text
ChatGPT / Claude / CLI / MCP clients
    -> Web Design Agent Java NoAuth product boundary
        -> Java design workflow / validation / evidence / export authority
        -> Java-owned role and capability policy
        -> standalone strands-bridge over MCP
            -> Candidate A native Strands session
            -> Candidate B native Strands session
            -> Candidate C native Strands session
            -> Visual Critic native Strands session
            -> optional Concept Artist native Strands session
            -> Director native Strands session
                 -> specialists via native Strands agent-as-tool
            -> role-scoped external MCP clients
        -> browser-side MCP App / review UI assets
```

**Java owns the application and specialist topology. Strands owns native reasoning and agent-as-tool execution. MCP joins them.**

Java decides which specialist roles exist, their product prompts/policies, what external capability each role may receive, invocation budgets, result/evidence validation, and cleanup ownership. The bridge resolves Java-supplied session references to native Strands `createAgentTool()` capabilities; Java must not recreate the Strands tool loop or agent-as-tool protocol.

## Product boundaries

- Product Java code must not depend on `@strands-agents/sdk` or embed/import the npm `strands-bridge` package.
- Use the Function Catalog Java Strands client/provider boundary to invoke the standalone bridge service.
- `strands-bridge` must not own Web Design Agent product policy, A/B/C rules, evidence truth, source validation, design result validation, NoAuth policy, export behavior, or frontend state.
- Do not recreate `tavall-di`, Tavall Cache, Registry, Database, Concurrency, EventBus, Scheduler, or other Java-owned systems in TypeScript.
- Existing TypeScript backend code is migration/reference behavior until a corresponding Java slice has physical parity evidence. Port first; retire backend ownership afterward. Genuine browser-side frontend code may remain TypeScript.
- Product prompts, permissions, tool exposure, workflows, user-facing policy, source validation, evidence classification, and design result validation belong here.
- The public HTTP MCP product endpoint is **NoAuth**. Clients do not log in or provide Web Design Agent credentials. Deployment-owned model/provider credentials are internal capabilities, not client authentication.
- NoAuth never means unrestricted network reach. A public HTTP deployment that exposes browser capability must fail closed unless browser execution is isolated from private, loopback, link-local, metadata, service-control, and internal Tavall networks.
- Explicit browserable source inputs must be validated before Strands invocation: HTTP(S) only, safe public ports, no URL credentials, and no private/reserved/internal DNS or address targets. Application URL checks supplement rather than replace deployment egress isolation because redirects and DNS rebinding exist.
- Rate limits, concurrency limits, request-size limits, and compute/resource ceilings are abuse controls and must not be described as authentication.
- Provider capabilities remain role-scoped. Candidates may receive browser/component research; Concept Artist may receive image generation; Director and Critic do not inherit those southbound provider credentials merely because they can call specialists as native agent tools.
- Do not invent MCP operation names or claim integration behavior until backed by the connected catalog/runtime.
- Do not add application-owned mutable keyed state. Classify state through Tavall Registry/Cache/Database/distributed or dedicated operation/runtime ownership according to current Tavall docs.

## Web design behavior

- Preserve the established A/B/C invariant for material visual design work: create three genuinely distinct candidates, not cosmetic variants.
- Preserve product requirements and real content while varying composition, navigation, hero strategy, typography class, density, geometry, surface/depth model, motion, rhythm, and imagery strategy.
- Candidate A, B, and C remain separate specialist Strands sessions. Director must invoke all three for material generation.
- Visual Critic critiques evidence and does not become an implementation specialist.
- Concept Artist is optional and is available only when real image-provider capability is configured.
- Browser validation and provider-use claims must come from observed real tool lifecycle evidence, never model-authored booleans, URLs, notes, or prose.
- Browser snapshot/screenshot evidence counts only when bound to a successful navigation target. Source-dependent modes must bind evidence to the validated requested target.
- Failed navigation invalidates the current inspection target until a later successful navigation establishes a new one.
- Concept-first output requires observed successful image-provider tool execution; returned image URLs alone are not proof of provider use.
- Existing-site/reference-image modes fail when their required inspection capability is unavailable.
- Code-first final-candidate preview validation must remain bound to runtime-owned content-addressed previews rather than model-chosen substitute URLs.
- 21st/component tooling is inspiration/pattern research and must not force a frontend framework onto an implementation that does not use it.
- Preserve accepted/rejected design evidence and validate responsive/accessibility behavior as those systems are migrated.

## Tests and validation

- Use delegate-style tests against real product classes and production-equivalent Tavall DI composition for managed Java behavior.
- Fake only true external boundaries such as the standalone bridge, MCP endpoints, model providers, DNS resolution, browser/provider services, filesystem/export destinations, or cloud services.
- Never report a TypeScript bridge shim, schema-only check, or mocked runtime as physical Strands validation.
- `check` must consume the canonical Tavall architecture-test plugin/modules that apply to this repository.
- The Java migration CI must validate the full shared Function Catalog provider and standalone bridge before validating Web Design Agent.
- Require a physical Java -> standalone Strands MCP -> native specialist agent-as-tool composition check before declaring the Java specialist graph complete.
- Preserve deterministic request/result/evidence tests from the TypeScript implementation as executable migration specifications.
- Record exactly which checks ran and keep migration PRs Draft while required external/runtime evidence is unavailable.

## Git

Follow the shared Tavall PR-first workflow: `working/*` branches, linked issues for architecture-crossing work, structured commits, truthful validation, docs synchronized with touched systems, and accountable review before `main`.
