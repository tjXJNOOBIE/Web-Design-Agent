import assert from 'node:assert/strict'
import test from 'node:test'

import {WEB_DESIGN_AGENT_REQUEST_LIMITS} from '../src/design/validation/WebDesignAgentRequestLimits.js'
import {
  feedbackSchema,
  pagePathSchema,
  promptSchema,
  publicUrlSchema,
} from '../src/mcp/server/WebDesignMcpSchemas.js'

test('public MCP prompt schema enforces the model-spend boundary', () => {
  assert.equal(promptSchema.safeParse('design a site').success, true)
  assert.equal(
    promptSchema.safeParse(
      'x'.repeat(WEB_DESIGN_AGENT_REQUEST_LIMITS.promptCharacters + 1),
    ).success,
    false,
  )
})

test('public MCP feedback and URL schemas reject oversized input', () => {
  assert.equal(
    feedbackSchema.safeParse(
      'x'.repeat(WEB_DESIGN_AGENT_REQUEST_LIMITS.feedbackCharacters + 1),
    ).success,
    false,
  )
  assert.equal(
    publicUrlSchema.safeParse(
      `https://example.com/${'x'.repeat(WEB_DESIGN_AGENT_REQUEST_LIMITS.urlCharacters)}`,
    ).success,
    false,
  )
})

test('public page paths must be bounded absolute site routes', () => {
  assert.equal(pagePathSchema.safeParse('/pricing').success, true)
  assert.equal(pagePathSchema.safeParse('pricing').success, false)
  assert.equal(
    pagePathSchema.safeParse(
      `/${'x'.repeat(WEB_DESIGN_AGENT_REQUEST_LIMITS.pagePathCharacters)}`,
    ).success,
    false,
  )
})
