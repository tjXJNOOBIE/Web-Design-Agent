# Web Design Agent

A Strands-powered product design agent for evidence-driven web design and implementation.

**Agents for Humans track:** Professional

## Install and run

```bash
npx @tjxjnoobie/web-design-agent "your request"
```

Node.js 22+ is required. Model-provider credentials/configuration are supplied through Strands and the environment. Set `WEB_DESIGN_AGENT_MODEL_ID` to select an explicit Strands model ID.

Set `WEB_DESIGN_AGENT_MCP_URL` when a real product tool/MCP surface is available. The foundation does not fabricate one.

Optional MCP authorization may be supplied through `WEB_DESIGN_AGENT_MCP_AUTHORIZATION`. Secrets are never committed.

## Architecture

```text
Web Design Agent
    -> @tjxjnoobie/custom-strands-bridge
        -> @strands-agents/sdk
            -> model provider
            -> typed MCP/tool surfaces
                -> owning Tavall/third-party runtimes
```

This repository owns Web Design Agent product behavior. Shared Strands bootstrap, MCP composition, invocation, cancellation, agent-as-tool composition, and cleanup remain in `custom-strands-bridge`. Tavall Java infrastructure remains in its owning Java runtimes and is consumed over typed boundaries instead of being recreated in TypeScript.

## Development

```bash
npm install
npm run check
```

The bridge dependency is temporarily pinned to exact Git commit `677f141a73fcc1bed23edf02c8fdfbd116fd034d` while the bridge foundation is still in Draft review. Replace that source pin with the published bridge version once the bridge promotion gates are complete.

See [`docs/web-design-agent/WEB_DESIGN_AGENT_FINAL_DRAFT.md`](docs/web-design-agent/WEB_DESIGN_AGENT_FINAL_DRAFT.md) for the current product foundation contract.
