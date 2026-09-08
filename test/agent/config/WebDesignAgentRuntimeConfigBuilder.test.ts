import assert from 'node:assert/strict'
import test from 'node:test'

import { WebDesignAgentRuntimeConfigBuilder } from '../../../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'

function serversFor(
  builder: WebDesignAgentRuntimeConfigBuilder,
  role: 'candidate' | 'concept' = 'candidate',
) {
  const config = role === 'concept' ? builder.buildConcept() : builder.buildCandidate('A')
  const servers = config.mcpServers

  if (servers === undefined || typeof servers === 'string') {
    assert.fail('Expected object MCP server configuration.')
  }

  return servers
}

test('uses native Strands prefix for component MCP tools', () => {
  const servers = serversFor(
    new WebDesignAgentRuntimeConfigBuilder({
      API_KEY_21ST: 'test-key',
    }),
  )

  assert.equal(servers['components']?.url, 'https://21st.dev/api/mcp')
  assert.equal(servers['components']?.prefix, 'components')
  assert.equal(servers['components']?.continueOnError, true)
  assert.deepEqual(servers['components']?.headers, {
    'x-api-key': 'test-key',
  })
})

test('configures official Playwright MCP as an opt-in browser capability', () => {
  const builder = new WebDesignAgentRuntimeConfigBuilder({
    WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
  })
  const servers = serversFor(builder)

  assert.equal(builder.capabilities().browser, true)
  assert.equal(servers['browser']?.command, 'npx')
  assert.deepEqual(servers['browser']?.args, [
    '-y',
    '@playwright/mcp@0.0.80',
    '--headless',
    '--isolated',
  ])
  assert.equal(servers['browser']?.prefix, 'browser')
  assert.equal(servers['browser']?.continueOnError, false)
})

test('prefers a deployment-provided browser MCP URL over local Playwright', () => {
  const servers = serversFor(
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
      WEB_DESIGN_AGENT_BROWSER_MCP_URL: 'https://browser.example/mcp',
      WEB_DESIGN_AGENT_BROWSER_MCP_AUTHORIZATION: 'Bearer test-token',
    }),
  )

  assert.equal(servers['browser']?.url, 'https://browser.example/mcp')
  assert.equal(servers['browser']?.command, undefined)
  assert.equal(servers['browser']?.prefix, 'browser')
  assert.equal(servers['browser']?.continueOnError, false)
  assert.deepEqual(servers['browser']?.headers, {
    Authorization: 'Bearer test-token',
  })
})

test('configures concept image MCP with a native assets prefix', () => {
  const servers = serversFor(
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD: 'true',
      WEB_DESIGN_AGENT_HIGGSFIELD_MCP_AUTHORIZATION: 'Bearer test-token',
    }),
    'concept',
  )

  assert.equal(servers['higgsfield']?.url, 'https://mcp.higgsfield.ai/mcp')
  assert.equal(servers['higgsfield']?.prefix, 'assets')
  assert.equal(servers['higgsfield']?.continueOnError, false)
  assert.deepEqual(servers['higgsfield']?.headers, {
    Authorization: 'Bearer test-token',
  })
})
