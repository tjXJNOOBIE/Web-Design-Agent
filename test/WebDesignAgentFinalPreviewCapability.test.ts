import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentRuntimeConfigBuilder} from '../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'

test('local Playwright advertises generation-owned final candidate preview support', () => {
  const capabilities = new WebDesignAgentRuntimeConfigBuilder({
    WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
  }).capabilities()

  assert.equal(capabilities.browser, true)
  assert.equal(capabilities.finalCandidatePreview, true)
})

test('remote browser MCP does not claim reachability to the loopback final preview', () => {
  const capabilities = new WebDesignAgentRuntimeConfigBuilder({
    WEB_DESIGN_AGENT_BROWSER_MCP_URL: 'https://browser.example/mcp',
  }).capabilities()

  assert.equal(capabilities.browser, true)
  assert.equal(capabilities.finalCandidatePreview, undefined)
})

test('remote browser takes precedence over local Playwright for preview reachability', () => {
  const capabilities = new WebDesignAgentRuntimeConfigBuilder({
    WEB_DESIGN_AGENT_BROWSER_MCP_URL: 'https://browser.example/mcp',
    WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
  }).capabilities()

  assert.equal(capabilities.browser, true)
  assert.equal(capabilities.finalCandidatePreview, undefined)
})
