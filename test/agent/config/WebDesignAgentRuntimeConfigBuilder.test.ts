import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_WEB_DESIGN_AGENT_INVOCATION_POLICY,
  WebDesignAgentRuntimeConfigBuilder,
} from '../../../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'

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
    new WebDesignAgentRuntimeConfigBuilder({API_KEY_21ST: 'test-key'}),
  )

  assert.equal(servers['components']?.url, 'https://21st.dev/api/mcp')
  assert.equal(servers['components']?.prefix, 'components')
  assert.equal(servers['components']?.continueOnError, true)
  assert.deepEqual(servers['components']?.headers, {'x-api-key': 'test-key'})
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
    '--browser=chromium',
    '--headless',
    '--isolated',
    '--block-service-workers',
  ])
  assert.equal(servers['browser']?.prefix, undefined)
  assert.equal(servers['browser']?.continueOnError, false)
})

test('passes the installed Playwright browser path into the stdio child', () => {
  const servers = serversFor(
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
      PLAYWRIGHT_BROWSERS_PATH: '/ms-playwright',
    }),
  )

  assert.deepEqual(servers['browser']?.env, {
    PLAYWRIGHT_BROWSERS_PATH: '/ms-playwright',
  })
})

test('prefers the Web Design Agent Playwright browser path override', () => {
  const servers = serversFor(
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
      PLAYWRIGHT_BROWSERS_PATH: '/generic-playwright',
      WEB_DESIGN_AGENT_PLAYWRIGHT_BROWSERS_PATH: '/wda-playwright',
    }),
  )

  assert.deepEqual(servers['browser']?.env, {
    PLAYWRIGHT_BROWSERS_PATH: '/wda-playwright',
  })
})

test('uses an installed browser executable when the deployment provides one', () => {
  const servers = serversFor(
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
      WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH: '/opt/chromium/chrome',
    }),
  )

  assert.deepEqual(servers['browser']?.args, [
    '-y',
    '@playwright/mcp@0.0.80',
    '--executable-path=/opt/chromium/chrome',
    '--headless',
    '--isolated',
    '--block-service-workers',
  ])
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
  assert.equal(servers['browser']?.prefix, undefined)
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

test('scopes external MCP tools to the Strands agents that own them', () => {
  const builder = new WebDesignAgentRuntimeConfigBuilder({
    API_KEY_21ST: 'test-key',
    WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
    WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD: 'true',
    WEB_DESIGN_AGENT_HIGGSFIELD_MCP_AUTHORIZATION: 'Bearer test-token',
  })

  assert.equal(builder.buildDirector().mcpServers, undefined)
  assert.equal(builder.buildCritic().mcpServers, undefined)

  const candidateServers = serversFor(builder)
  assert.deepEqual(Object.keys(candidateServers).sort(), ['browser', 'components'])

  const conceptServers = serversFor(builder, 'concept')
  assert.deepEqual(Object.keys(conceptServers), ['higgsfield'])
})

test('provides an unlimited native Strands wall-clock default with bounded budgets', () => {
  assert.deepEqual(
    new WebDesignAgentRuntimeConfigBuilder({}).invocationPolicy(),
    DEFAULT_WEB_DESIGN_AGENT_INVOCATION_POLICY,
  )
  assert.equal(
    new WebDesignAgentRuntimeConfigBuilder({}).invocationPolicy().timeoutMs,
    0,
  )
})

test('allows deployment to override native Strands invocation budgets', () => {
  assert.deepEqual(
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_INVOCATION_TIMEOUT_MS: '90000',
      WEB_DESIGN_AGENT_MAX_TURNS: '9',
      WEB_DESIGN_AGENT_MAX_OUTPUT_TOKENS: '24000',
      WEB_DESIGN_AGENT_MAX_TOTAL_TOKENS: '80000',
    }).invocationPolicy(),
    {
      timeoutMs: 90_000,
      maxTurns: 9,
      maxOutputTokens: 24_000,
      maxTotalTokens: 80_000,
    },
  )
})

test('allows an unlimited invocation wall-clock window', () => {
  assert.equal(
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_INVOCATION_TIMEOUT_MS: '0',
    }).invocationPolicy().timeoutMs,
    0,
  )
})

test('rejects invalid native Strands invocation budgets', () => {
  assert.throws(
    () =>
      new WebDesignAgentRuntimeConfigBuilder({
        WEB_DESIGN_AGENT_MAX_TURNS: '0',
      }).invocationPolicy(),
    /WEB_DESIGN_AGENT_MAX_TURNS must be a positive integer/,
  )
  assert.throws(
    () =>
      new WebDesignAgentRuntimeConfigBuilder({
        WEB_DESIGN_AGENT_INVOCATION_TIMEOUT_MS: 'not-a-number',
      }).invocationPolicy(),
    /WEB_DESIGN_AGENT_INVOCATION_TIMEOUT_MS must be a non-negative integer/,
  )
})
