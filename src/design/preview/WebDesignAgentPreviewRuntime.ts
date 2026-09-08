import {createHash} from 'node:crypto'
import {createServer, type Server, type ServerResponse} from 'node:http'
import type {AddressInfo} from 'node:net'

import type {
  DesignCandidateData,
  DesignCandidateId,
} from '../data/DesignCandidateData.js'
import {DesignExportBuilder} from '../export/DesignExportBuilder.js'

export interface DesignCandidatePreviewTargetData {
  readonly candidateId: DesignCandidateId
  readonly fingerprint: string
  readonly url: string
}

const PREVIEW_CONTENT_SECURITY_POLICY = [
  'sandbox allow-scripts',
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

export class WebDesignAgentPreviewRuntime {
  private server?: Server
  private origin?: string
  private readonly documents = new Map<string, string>()

  public constructor(
    private readonly exportBuilder = new DesignExportBuilder(),
  ) {}

  public async publish(
    candidates: readonly DesignCandidateData[],
  ): Promise<Readonly<Record<DesignCandidateId, DesignCandidatePreviewTargetData>>> {
    await this.start()

    const origin = this.origin
    if (origin === undefined) {
      throw new Error('Web Design Agent preview runtime did not expose an origin.')
    }

    const targets = {} as Record<
      DesignCandidateId,
      DesignCandidatePreviewTargetData
    >

    for (const candidate of candidates) {
      const exported = this.exportBuilder.build(candidate, candidate.visualState)
      const fingerprint = this.fingerprint(candidate)
      const path = `/candidate/${candidate.id.toLowerCase()}/${fingerprint}/`

      this.documents.set(path, exported.standaloneHtml)
      targets[candidate.id] = {
        candidateId: candidate.id,
        fingerprint,
        url: `${origin}${path}`,
      }
    }

    return targets
  }

  public async close(): Promise<void> {
    const server = this.server
    this.server = undefined
    this.origin = undefined
    this.documents.clear()

    if (server === undefined || !server.listening) return

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error === undefined) resolve()
        else reject(error)
      })
    })
  }

  private async start(): Promise<void> {
    if (this.server !== undefined) return

    const server = createServer((request, response) => {
      this.handleRequest(request.method, request.url, response)
    })

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => {
        reject(error)
      }

      server.once('error', onError)
      server.listen(0, '127.0.0.1', () => {
        server.off('error', onError)
        resolve()
      })
    })

    const address = server.address()
    if (address === null || typeof address === 'string') {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      throw new Error('Web Design Agent preview runtime could not resolve its TCP address.')
    }

    const port = (address as AddressInfo).port
    this.server = server
    this.origin = `http://127.0.0.1:${port}`
  }

  private handleRequest(
    method: string | undefined,
    rawUrl: string | undefined,
    response: ServerResponse,
  ): void {
    if (method !== 'GET') {
      response.statusCode = 405
      response.setHeader('Allow', 'GET')
      response.end('Method Not Allowed')
      return
    }

    const path = this.requestPath(rawUrl)
    const document = path === undefined ? undefined : this.documents.get(path)

    if (document === undefined) {
      response.statusCode = 404
      response.end('Not Found')
      return
    }

    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Content-Security-Policy', PREVIEW_CONTENT_SECURITY_POLICY)
    response.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
    )
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.end(document)
  }

  private requestPath(rawUrl: string | undefined): string | undefined {
    if (rawUrl === undefined) return undefined

    try {
      return new URL(rawUrl, 'http://127.0.0.1').pathname
    } catch {
      return undefined
    }
  }

  private fingerprint(candidate: DesignCandidateData): string {
    const exported = this.exportBuilder.build(candidate, candidate.visualState)
    const pages = [...exported.pages]
      .map((page) => ({
        path: page.path,
        title: page.title,
        standaloneHtml: page.standaloneHtml,
      }))
      .sort((left, right) => left.path.localeCompare(right.path))
    const artifact = JSON.stringify({
      home: exported.standaloneHtml,
      pages,
    })

    return createHash('sha256').update(artifact).digest('hex')
  }
}
