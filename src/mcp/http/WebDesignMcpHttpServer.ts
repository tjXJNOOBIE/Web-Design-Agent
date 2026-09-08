import { createServer, type Server as HttpServer } from 'node:http'

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import type { WebDesignMcpServerBuilder } from '../server/WebDesignMcpServerBuilder.js'

export class WebDesignMcpHttpServer {
  private server: HttpServer | undefined

  public constructor(
    private readonly builder: WebDesignMcpServerBuilder,
    private readonly host = '0.0.0.0',
    private readonly port = 3001,
  ) {}

  public async start(): Promise<void> {
    if (this.server !== undefined) {
      return
    }

    this.server = createServer(async (request, response) => {
      response.setHeader('Access-Control-Allow-Origin', '*')
      response.setHeader('Access-Control-Allow-Headers', 'content-type,mcp-session-id')
      response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')

      if (request.method === 'OPTIONS') {
        response.statusCode = 204
        response.end()
        return
      }

      const url = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? 'localhost'}`,
      )

      if (url.pathname === '/') {
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({
          name: 'Web Design Agent',
          version: '0.2.0',
          mcp: '/mcp',
          authentication: 'none',
        }))
        return
      }

      if (url.pathname !== '/mcp') {
        response.statusCode = 404
        response.end('Not found')
        return
      }

      if (request.method !== 'POST') {
        response.statusCode = 405
        response.end('Method not allowed')
        return
      }

      const mcpServer = this.builder.build()
      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
      })

      const close = async (): Promise<void> => {
        try {
          await transport.close()
        } finally {
          await mcpServer.close()
        }
      }

      response.once('close', () => {
        void close()
      })

      try {
        // SDK 1.30 declares the Node transport as implementing Transport, but
        // its optional callback accessors remain `T | undefined`. With
        // exactOptionalPropertyTypes enabled that declaration is not
        // structurally assignable to Transport. Keep the compatibility cast
        // at this third-party boundary instead of relaxing project strictness.
        await mcpServer.connect(transport as unknown as Transport)
        await transport.handleRequest(request, response)
      } catch (error) {
        if (!response.headersSent) {
          response.setHeader('content-type', 'application/json')
        }

        response.statusCode = 500
        response.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : String(error),
          },
          id: null,
        }))
      }
    })

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject)
      this.server?.listen(this.port, this.host, resolve)
    })
  }

  public async close(): Promise<void> {
    const current = this.server
    this.server = undefined

    if (current === undefined) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      current.close((error) => {
        if (error !== undefined) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }
}
