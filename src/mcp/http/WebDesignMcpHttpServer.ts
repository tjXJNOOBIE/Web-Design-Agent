import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from 'node:http'

import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js'
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import type {WebDesignMcpServerBuilder} from '../server/WebDesignMcpServerBuilder.js'

const DEFAULT_MAX_CONCURRENT_REQUESTS = 4
const DEFAULT_MAX_REQUEST_BODY_BYTES = 1_048_576
const DEFAULT_REQUEST_RECEIVE_TIMEOUT_MS = 30_000
const DEFAULT_HEADERS_TIMEOUT_MS = 15_000

export interface WebDesignMcpHttpServerLimits {
  readonly maxConcurrentRequests?: number
  readonly maxRequestBodyBytes?: number
  readonly requestReceiveTimeoutMs?: number
  readonly headersTimeoutMs?: number
}

class WebDesignMcpHttpRequestError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly rpcCode: number,
    message: string,
  ) {
    super(message)
  }
}

export class WebDesignMcpHttpServer {
  private server: HttpServer | undefined
  private activeMcpRequests = 0
  private readonly maxConcurrentRequests: number
  private readonly maxRequestBodyBytes: number
  private readonly requestReceiveTimeoutMs: number
  private readonly headersTimeoutMs: number

  public constructor(
    private readonly builder: WebDesignMcpServerBuilder,
    private readonly host = '0.0.0.0',
    private readonly port = 3001,
    limits: WebDesignMcpHttpServerLimits = {},
  ) {
    this.maxConcurrentRequests = this.positiveInteger(
      limits.maxConcurrentRequests ?? DEFAULT_MAX_CONCURRENT_REQUESTS,
      'maxConcurrentRequests',
    )
    this.maxRequestBodyBytes = this.positiveInteger(
      limits.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
      'maxRequestBodyBytes',
    )
    this.requestReceiveTimeoutMs = this.positiveInteger(
      limits.requestReceiveTimeoutMs ?? DEFAULT_REQUEST_RECEIVE_TIMEOUT_MS,
      'requestReceiveTimeoutMs',
    )
    this.headersTimeoutMs = this.positiveInteger(
      limits.headersTimeoutMs ?? DEFAULT_HEADERS_TIMEOUT_MS,
      'headersTimeoutMs',
    )
    this.positiveInteger(port, 'port')

    if (this.headersTimeoutMs > this.requestReceiveTimeoutMs) {
      throw new RangeError(
        'headersTimeoutMs must not exceed requestReceiveTimeoutMs.',
      )
    }
  }

  public async start(): Promise<void> {
    if (this.server !== undefined) return

    const server = createServer((request, response) => {
      void this.handleRequest(request, response)
    })
    server.requestTimeout = this.requestReceiveTimeoutMs
    server.headersTimeout = this.headersTimeoutMs
    this.server = server

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(this.port, this.host, resolve)
    })
  }

  public async close(): Promise<void> {
    const current = this.server
    this.server = undefined

    if (current === undefined) return

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

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    this.applyCors(response)

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
      response.end(
        JSON.stringify({
          name: 'Web Design Agent',
          version: '0.2.0',
          mcp: '/mcp',
          authentication: 'none',
        }),
      )
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

    if (this.activeMcpRequests >= this.maxConcurrentRequests) {
      response.setHeader('retry-after', '5')
      this.writeJsonRpcError(
        response,
        429,
        -32001,
        'Web Design Agent is at its anonymous request concurrency limit.',
      )
      request.resume()
      return
    }

    this.activeMcpRequests += 1
    try {
      await this.handleMcpRequest(request, response)
    } finally {
      this.activeMcpRequests -= 1
    }
  }

  private async handleMcpRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    let closePromise: Promise<void> | undefined
    let mcpServer: ReturnType<WebDesignMcpServerBuilder['build']> | undefined
    let transport: StreamableHTTPServerTransport | undefined

    const close = (): Promise<void> => {
      closePromise ??= (async () => {
        try {
          await transport?.close()
        } finally {
          await mcpServer?.close()
        }
      })()
      return closePromise
    }

    response.once('close', () => {
      void close()
    })

    try {
      const parsedBody = await this.readJsonBody(request)
      mcpServer = this.builder.build()
      transport = new StreamableHTTPServerTransport({enableJsonResponse: true})

      // SDK 1.30 declares the Node transport as implementing Transport, but
      // its optional callback accessors remain `T | undefined`. With
      // exactOptionalPropertyTypes enabled that declaration is not
      // structurally assignable to Transport. Keep the compatibility cast
      // at this third-party boundary instead of relaxing project strictness.
      await mcpServer.connect(transport as unknown as Transport)
      await transport.handleRequest(request, response, parsedBody)
    } catch (error) {
      if (response.writableEnded) return

      if (error instanceof WebDesignMcpHttpRequestError) {
        this.writeJsonRpcError(
          response,
          error.statusCode,
          error.rpcCode,
          error.message,
        )
        return
      }

      if (response.headersSent) {
        response.end()
        return
      }

      this.writeJsonRpcError(
        response,
        500,
        -32603,
        'Internal Web Design Agent server error.',
      )
    } finally {
      await close().catch(() => undefined)
    }
  }

  private async readJsonBody(request: IncomingMessage): Promise<unknown> {
    const contentEncoding = request.headers['content-encoding']
    if (
      contentEncoding !== undefined &&
      contentEncoding.trim().toLowerCase() !== 'identity'
    ) {
      request.resume()
      throw new WebDesignMcpHttpRequestError(
        415,
        -32000,
        'Compressed MCP request bodies are not supported.',
      )
    }

    const declaredLength = this.parseContentLength(request)
    if (
      declaredLength !== undefined &&
      declaredLength > this.maxRequestBodyBytes
    ) {
      request.resume()
      throw this.requestBodyTooLargeError()
    }

    const chunks: Buffer[] = []
    let receivedBytes = 0

    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      receivedBytes += buffer.length

      if (receivedBytes > this.maxRequestBodyBytes) {
        request.resume()
        throw this.requestBodyTooLargeError()
      }

      chunks.push(buffer)
    }

    if (receivedBytes === 0) {
      throw new WebDesignMcpHttpRequestError(
        400,
        -32700,
        'MCP request body must contain JSON.',
      )
    }

    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
    } catch {
      throw new WebDesignMcpHttpRequestError(
        400,
        -32700,
        'MCP request body contains invalid JSON.',
      )
    }
  }

  private parseContentLength(request: IncomingMessage): number | undefined {
    const header = request.headers['content-length']
    if (header === undefined) return undefined

    const parsed = Number(header)
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new WebDesignMcpHttpRequestError(
        400,
        -32600,
        'Invalid Content-Length header.',
      )
    }

    return parsed
  }

  private requestBodyTooLargeError(): WebDesignMcpHttpRequestError {
    return new WebDesignMcpHttpRequestError(
      413,
      -32002,
      `MCP request body exceeds ${this.maxRequestBodyBytes} bytes.`,
    )
  }

  private applyCors(response: ServerResponse): void {
    response.setHeader('access-control-allow-origin', '*')
    response.setHeader(
      'access-control-allow-headers',
      [
        'accept',
        'content-type',
        'mcp-method',
        'mcp-name',
        'mcp-protocol-version',
        'mcp-session-id',
      ].join(','),
    )
    response.setHeader('access-control-allow-methods', 'POST,OPTIONS')
    response.setHeader('access-control-expose-headers', 'mcp-session-id')
  }

  private writeJsonRpcError(
    response: ServerResponse,
    statusCode: number,
    code: number,
    message: string,
  ): void {
    if (!response.headersSent) {
      response.statusCode = statusCode
      response.setHeader('content-type', 'application/json')
    }

    response.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {code, message},
        id: null,
      }),
    )
  }

  private positiveInteger(value: number, name: string): number {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive integer.`)
    }

    return value
  }
}
