# Current Codex E2E validation

Validated on 2026-09-11 against Web Design PR #10 head `36696131155b81de08fc678091c77a3a73e0856b`.

- `npm run check:app`: passed browser-only TypeScript typecheck and Vite single-file build (`dist/mcp-app.html`).
- Java `clean check`: passed, including the canonical `architectureTest`, product tests, and MCP App resource packaging.
- Java `installDist`: passed and produced HTTP MCP, stdio MCP, CLI, and evaluator launchers.
- Physical specialist graph test: passed both non-skipped `WebDesignStrandsGraphIntegrationTest` tests. The Java graph started Candidate A/B/C, Critic, and Director through the standalone bridge; role capability assertions confirmed browser/component/image capability scoping.
- Java HTTP MCP compatibility tests cover the exact eight-tool public contract and MCP App resource metadata.
- `npm` contains browser/App build tooling only; product orchestration remains Java.

This was local/development validation. No production website or deployment was mutated, so no production operation record was required. Real external browser/image provider credentials and public NoAuth deployment egress remain provider/deployment acceptance boundaries.
