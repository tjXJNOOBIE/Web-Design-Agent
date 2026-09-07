import assert from 'node:assert/strict'
import test from 'node:test'

import { WebDesignAgentRuntimeConfigBuilder } from '../../../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import { WEB_DESIGN_AGENT_SYSTEM_PROMPT } from '../../../src/agent/prompt/WebDesignAgentSystemPrompt.js'

test('buildsStableProductIdentityAndPrompt', () => {
  const runtimeConfig = new WebDesignAgentRuntimeConfigBuilder({}).build()

  assert.equal(runtimeConfig.agent.id, 'web-design-agent')
  assert.equal(runtimeConfig.agent.name, 'Web Design Agent')
  assert.equal(runtimeConfig.agent.systemPrompt, WEB_DESIGN_AGENT_SYSTEM_PROMPT)
  assert.equal(runtimeConfig.agent.printer, false)
  assert.equal(runtimeConfig.agent.model, undefined)
  assert.equal(runtimeConfig.mcpServers, undefined)
})

test('buildsConfiguredModelAndMcpBoundaryFromEnvironment', () => {
  const builder = new WebDesignAgentRuntimeConfigBuilder({
    WEB_DESIGN_AGENT_MODEL_ID: ' model.example ',
    WEB_DESIGN_AGENT_MCP_URL: ' https://example.invalid/mcp ',
    WEB_DESIGN_AGENT_MCP_AUTHORIZATION: ' Bearer example ',
  })

  const runtimeConfig = builder.build()

  assert.equal(runtimeConfig.agent.model, 'model.example')
  assert.notEqual(typeof runtimeConfig.mcpServers, 'string')
  const mcpServers = typeof runtimeConfig.mcpServers === 'string'
    ? undefined
    : runtimeConfig.mcpServers
  assert.equal(mcpServers?.product?.url, 'https://example.invalid/mcp')
  assert.deepEqual(mcpServers?.product?.headers, {
    Authorization: 'Bearer example',
  })
  assert.equal(runtimeConfig.mcpDefaults?.applicationName, 'web-design-agent')
})

test('ignoresBlankOptionalEnvironmentValues', () => {
  const runtimeConfig = new WebDesignAgentRuntimeConfigBuilder({
    WEB_DESIGN_AGENT_MODEL_ID: '   ',
    WEB_DESIGN_AGENT_MCP_AUTHORIZATION: '   ',
  }).build()

  assert.equal(runtimeConfig.agent.model, undefined)
})
