import assert from 'node:assert/strict'
import test from 'node:test'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StrandsAgentRuntimeBootstrap } from '@tjxjnoobie/strands-bridge'

import { WebDesignAgentRuntimeConfigBuilder } from '../../../dist/agent/config/WebDesignAgentRuntimeConfigBuilder.js'

function requiredEnvironment(name) {
  const value = process.env[name]?.trim()
  assert.ok(value, `${name} is required for the physical browser integration test.`)
  return value
}

function browserServerFrom(config) {
  const servers = config.mcpServers
  assert.ok(servers && typeof servers !== 'string', 'Expected object MCP server configuration.')

  const browser = servers.browser
  assert.ok(browser, 'Expected browser MCP server configuration.')
  assert.ok(browser.command, 'Physical browser integration requires stdio browser MCP command.')

  return browser
}

test('initializes Strands candidate and drives real Playwright MCP browser tools', async () => {
  const executablePath = requiredEnvironment('WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH')
  const builder = new WebDesignAgentRuntimeConfigBuilder({
    ...process.env,
    WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
    WEB_DESIGN_AGENT_PLAYWRIGHT_EXECUTABLE_PATH: executablePath,
  })
  const candidateConfig = builder.buildCandidate('A')

  const runtime = await new StrandsAgentRuntimeBootstrap().createAgentRuntime(candidateConfig)
  try {
    assert.equal(runtime.isClosed(), false)
    const agentTool = runtime.createAgentTool({
      name: 'candidate_browser_integration',
      description: 'Physical browser-enabled candidate integration test.',
    })
    assert.equal(agentTool.name, 'candidate_browser_integration')
  } finally {
    await runtime.close()
  }
  assert.equal(runtime.isClosed(), true)

  const browser = browserServerFrom(candidateConfig)
  const transport = new StdioClientTransport({
    command: browser.command,
    args: browser.args,
    ...(browser.env === undefined ? {} : { env: browser.env }),
    ...(browser.cwd === undefined ? {} : { cwd: browser.cwd }),
  })
  const client = new Client({
    name: 'web-design-agent-browser-integration',
    version: '0.2.0',
  })

  try {
    await client.connect(transport)
    const catalog = await client.listTools()
    const names = new Set(catalog.tools.map((tool) => tool.name))

    assert.ok(names.has('browser_navigate'))
    assert.ok(names.has('browser_snapshot'))
    assert.ok(names.has('browser_take_screenshot'))
    assert.ok(!names.has('browser_browser_navigate'))

    const navigation = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    })
    assert.equal(navigation.isError, undefined)
    assert.match(JSON.stringify(navigation), /Example Domain/)

    const snapshot = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    })
    assert.equal(snapshot.isError, undefined)
    assert.match(JSON.stringify(snapshot), /Example Domain/)

    const screenshot = await client.callTool({
      name: 'browser_take_screenshot',
      arguments: { type: 'png', scale: 'css' },
    })
    assert.equal(screenshot.isError, undefined)
    assert.match(JSON.stringify(screenshot), /image|png/i)
  } finally {
    await client.close()
  }
})
