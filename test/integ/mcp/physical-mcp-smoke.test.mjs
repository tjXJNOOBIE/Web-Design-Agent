import test from 'node:test'
import assert from 'node:assert/strict'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

import { WebDesignMcpHttpServer } from '../../../dist/mcp/http/WebDesignMcpHttpServer.js'
import {
  WebDesignMcpServerBuilder,
  WEB_DESIGN_MCP_APP_RESOURCE_URI,
} from '../../../dist/mcp/server/WebDesignMcpServerBuilder.js'

const REQUIRED_TOOLS = [
  'build-design-preference-profile',
  'create-design-concepts',
  'design',
  'design-from-concept',
  'export-design',
  'extract-design-system',
  'refine-design',
  'web-design-capabilities',
]

const workflow = {
  async generate() {
    throw new Error('Generation is not part of the MCP transport smoke test.')
  },
  async refine() {
    throw new Error('Refinement is not part of the MCP transport smoke test.')
  },
  async createConcepts() {
    throw new Error('Concept generation is not part of the MCP transport smoke test.')
  },
}

test('negotiates physical HTTP MCP server and serves bundled review app', async () => {
  const port = 43129
  const serverBuilder = new WebDesignMcpServerBuilder(
    workflow,
    {
      components: false,
      browser: false,
      conceptImages: false,
    },
    {},
  )
  const httpServer = new WebDesignMcpHttpServer(
    serverBuilder,
    '127.0.0.1',
    port,
  )
  const client = new Client({
    name: 'web-design-agent-physical-mcp-smoke',
    version: '1.0.0',
  })

  await httpServer.start()

  try {
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${port}/mcp`),
      ),
    )

    const tools = await client.listTools()
    const toolNames = tools.tools
      .map((tool) => tool.name)
      .sort()

    assert.deepEqual(toolNames, REQUIRED_TOOLS)

    const resource = await client.readResource({
      uri: WEB_DESIGN_MCP_APP_RESOURCE_URI,
    })
    const resourceText = typeof resource.contents[0]?.text === 'string'
      ? resource.contents[0].text
      : ''

    assert.match(resourceText, /Web Design Agent/)
    assert.ok(Buffer.byteLength(resourceText) > 100_000)

    const capabilities = await client.callTool({
      name: 'web-design-capabilities',
      arguments: {},
    })

    assert.deepEqual(capabilities.structuredContent, {
      kind: 'capabilities',
      data: {
        components: false,
        browser: false,
        conceptImages: false,
      },
    })
  } finally {
    await client.close().catch(() => undefined)
    await httpServer.close()
  }
})
