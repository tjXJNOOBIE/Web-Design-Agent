import assert from 'node:assert/strict'
import {createServer} from 'node:net'
import { request as createHttpRequest } from 'node:http'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

import { WebDesignAgentPreviewRuntime } from '../../../dist/design/preview/WebDesignAgentPreviewRuntime.js'
import { WebDesignMcpHttpServer } from '../../../dist/mcp/http/WebDesignMcpHttpServer.js'

function unusedBuilder() {
  return {
    build() {
      throw new Error('MCP builder should not be reached by this boundary test.')
    },
  }
}

async function freePort() {
  const probe = createServer()
  await new Promise((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', resolve)
  })
  const address = probe.address()
  await new Promise((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()))
  })
  if (address === null || typeof address === 'string') {
    throw new Error('Ephemeral MCP test port was not assigned.')
  }
  return address.port
}

async function withServer(port, limits, builder, operation, previewRuntime) {
  const server = new WebDesignMcpHttpServer(
    builder,
    '127.0.0.1',
    port,
    limits,
    previewRuntime,
  )
  await server.start()

  try {
    await operation()
  } finally {
    await server.close()
  }
}

function previewCandidate(id) {
  return {
    id,
    title: `Candidate ${id}`,
    document: {
      html: `<main><h1>Candidate ${id}</h1></main>`,
      css: 'body{margin:0}',
      javascript: '',
    },
    pages: [],
    visualState: {
      density: 0.5,
      spacingScale: 1,
      radius: 8,
      fontScale: 1,
      heroScale: 1,
      contrast: 1,
      depth: 0.2,
      motion: 0,
    },
  }
}

test('rejects oversized anonymous MCP request bodies before building an agent runtime', async () => {
  const port = await freePort()

  await withServer(
    port,
    { maxRequestBodyBytes: 32 },
    unusedBuilder(),
    async () => {
      const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: 'x'.repeat(128) }),
      })
      const body = await response.json()

      assert.equal(response.status, 413)
      assert.equal(body.error.code, -32002)
      assert.match(body.error.message, /exceeds 32 bytes/)
    },
  )
})

test('rejects malformed JSON before constructing the MCP server', async () => {
  const port = await freePort()

  await withServer(port, {}, unusedBuilder(), async () => {
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    })
    const body = await response.json()

    assert.equal(response.status, 400)
    assert.equal(body.error.code, -32700)
    assert.match(body.error.message, /invalid JSON/)
  })
})

test('does not expose internal MCP construction errors to anonymous clients', async () => {
  const port = await freePort()
  const secret = 'provider-secret-should-never-cross-http-boundary'
  const builder = {
    build() {
      return {
        async connect() {
          throw new Error(secret)
        },
        async close() {},
      }
    },
  }

  await withServer(port, {}, builder, async () => {
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    })
    const text = await response.text()
    const body = JSON.parse(text)

    assert.equal(response.status, 500)
    assert.equal(body.error.code, -32603)
    assert.equal(body.error.message, 'Internal Web Design Agent server error.')
    assert.ok(!text.includes(secret))
  })
})

test('returns 429 while the anonymous per-process concurrency slot is occupied', async () => {
  const port = await freePort()

  await withServer(
    port,
    { maxConcurrentRequests: 1, requestReceiveTimeoutMs: 5_000, headersTimeoutMs: 2_500 },
    unusedBuilder(),
    async () => {
      const blocker = createHttpRequest({
        hostname: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': '128',
        },
      })

      const connected = new Promise((resolve, reject) => {
        blocker.once('socket', (socket) => {
          if (socket.readyState === 'open') {
            resolve()
            return
          }
          socket.once('connect', resolve)
          socket.once('error', reject)
        })
        blocker.once('error', (error) => {
          if (error.code !== 'ECONNRESET') reject(error)
        })
      })

      blocker.write('{')
      blocker.flushHeaders()
      await connected
      await delay(40)

      try {
        const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
        const body = await response.json()

        assert.equal(response.status, 429)
        assert.equal(response.headers.get('retry-after'), '5')
        assert.equal(body.error.code, -32001)
      } finally {
        blocker.destroy()
      }
    },
  )
})

test('preflight allows MCP protocol headers without introducing authentication', async () => {
  const port = await freePort()

  await withServer(port, {}, unusedBuilder(), async () => {
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'OPTIONS',
    })
    const allowHeaders = response.headers.get('access-control-allow-headers') ?? ''

    assert.equal(response.status, 204)
    assert.match(allowHeaders, /mcp-protocol-version/)
    assert.match(allowHeaders, /mcp-method/)
    assert.match(allowHeaders, /mcp-name/)
    assert.equal(response.headers.get('access-control-allow-origin'), '*')
  })
})

test('serves only active content-addressed preview publications through the WDA HTTP origin', async () => {
  const port = await freePort()
  const previewRuntime = new WebDesignAgentPreviewRuntime()
  const publication = previewRuntime.publish(
    [previewCandidate('A'), previewCandidate('B'), previewCandidate('C')],
    `http://127.0.0.1:${port}/`,
  )

  await withServer(
    port,
    {},
    unusedBuilder(),
    async () => {
      const active = await fetch(publication.targets.A.url)
      const html = await active.text()

      assert.equal(active.status, 200)
      assert.match(html, /Candidate A/)
      assert.equal(active.headers.get('cache-control'), 'no-store')
      assert.match(
        active.headers.get('content-security-policy') ?? '',
        /connect-src 'none'/,
      )

      publication.close()

      const released = await fetch(publication.targets.A.url)
      assert.equal(released.status, 404)
    },
    previewRuntime,
  )
})
