# Agents for Humans submission: Web Design Agent

## Tagline

Turn a vague design request into three real, structurally different websites
that a human can review and refine.

## Problem and audience

Founders, product teams, and developers often need a usable visual direction
before they can explain what they want. Web Design Agent makes alternatives,
grounds browser/provider evidence, and keeps the human in the selection loop.

## Strands use and safety

The Strands Design Director coordinates native Candidate A/B/C specialists and a
Visual Critic. Deterministic product code owns schemas, diversity checks,
browser target validation, content-addressed previews, evidence binding,
cancellation, and cleanup. The public MCP surface is intentionally NoAuth but
bounded by request, concurrency, token, and network-egress controls.

## Installation and validation

See [README.md](README.md), [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md), and
[docs/ARCHITECTURE.svg](docs/ARCHITECTURE.svg). The exact current branch passed
`npm run check`, `npm pack`, a clean packed-consumer install, and local MCP
initialize/tool/resource discovery.

## Pre-existing components disclosure

The Web Design Agent product was built for this hackathon. It reuses the
pre-existing Strands SDK, the shared `@tjxjnoobie/strands-bridge`, MCP/App
protocol libraries, Node.js tooling, and Tavall development infrastructure.
Deployment-owned provider credentials and browser infrastructure are external.

## AWS and video

No AWS service is claimed until actually used by the final deployment. Add the
public demo/video URL and AWS Builder ID in Devpost as human submission fields.
