import {createHash, randomBytes} from 'node:crypto'

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

export interface WebDesignAgentPreviewResponseData {
  readonly html: string
  readonly contentSecurityPolicy: string
}

export class WebDesignAgentPreviewPublication {
  private closed = false

  public constructor(
    public readonly targets: Readonly<
      Record<DesignCandidateId, DesignCandidatePreviewTargetData>
    >,
    private readonly releasePublication: () => void,
  ) {}

  public close(): void {
    if (this.closed) return
    this.closed = true
    this.releasePublication()
  }
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

interface PreviewDocumentEntry {
  readonly publicationId: string
  readonly html: string
}

export class WebDesignAgentPreviewRuntime {
  private readonly documents = new Map<string, PreviewDocumentEntry>()
  private readonly publicationPaths = new Map<string, readonly string[]>()

  public constructor(
    private readonly maximumActivePublications = 4,
    private readonly maximumPublicationBytes = 2_000_000,
    private readonly exportBuilder = new DesignExportBuilder(),
  ) {
    this.assertPositiveInteger(
      maximumActivePublications,
      'maximumActivePublications',
    )
    this.assertPositiveInteger(
      maximumPublicationBytes,
      'maximumPublicationBytes',
    )
  }

  public publish(
    candidates: readonly DesignCandidateData[],
    publicBaseUrl: string,
  ): WebDesignAgentPreviewPublication {
    if (this.publicationPaths.size >= this.maximumActivePublications) {
      throw new Error(
        'Web Design Agent preview publication capacity is exhausted.',
      )
    }

    const baseUrl = this.normalizeBaseUrl(publicBaseUrl)
    const publicationId = randomBytes(24).toString('base64url')
    const targets = {} as Record<
      DesignCandidateId,
      DesignCandidatePreviewTargetData
    >
    const pendingDocuments: Array<{readonly path: string; readonly html: string}> = []
    let publicationBytes = 0

    for (const candidate of candidates) {
      const exported = this.exportBuilder.build(candidate, candidate.visualState)
      const fingerprint = this.fingerprint(candidate)
      const path = `/preview/${publicationId}/${candidate.id.toLowerCase()}/${fingerprint}/`
      publicationBytes += Buffer.byteLength(exported.standaloneHtml, 'utf8')
      pendingDocuments.push({path, html: exported.standaloneHtml})
      targets[candidate.id] = {
        candidateId: candidate.id,
        fingerprint,
        url: new URL(path, baseUrl).href,
      }
    }

    if (publicationBytes > this.maximumPublicationBytes) {
      throw new Error(
        `Web Design Agent final preview exceeds ${this.maximumPublicationBytes} bytes.`,
      )
    }

    const paths = pendingDocuments.map((document) => document.path)
    for (const document of pendingDocuments) {
      this.documents.set(document.path, {
        publicationId,
        html: document.html,
      })
    }
    this.publicationPaths.set(publicationId, paths)

    return new WebDesignAgentPreviewPublication(targets, () => {
      this.release(publicationId)
    })
  }

  public read(path: string): WebDesignAgentPreviewResponseData | undefined {
    const entry = this.documents.get(path)
    if (entry === undefined) return undefined

    return {
      html: entry.html,
      contentSecurityPolicy: PREVIEW_CONTENT_SECURITY_POLICY,
    }
  }

  public close(): void {
    this.documents.clear()
    this.publicationPaths.clear()
  }

  private release(publicationId: string): void {
    const paths = this.publicationPaths.get(publicationId)
    if (paths === undefined) return

    for (const path of paths) {
      const entry = this.documents.get(path)
      if (entry?.publicationId === publicationId) {
        this.documents.delete(path)
      }
    }
    this.publicationPaths.delete(publicationId)
  }

  private normalizeBaseUrl(value: string): URL {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new TypeError('Web Design Agent public base URL must use HTTP(S).')
    }
    if (url.username.length > 0 || url.password.length > 0) {
      throw new TypeError('Web Design Agent public base URL must not contain credentials.')
    }
    if (url.search.length > 0 || url.hash.length > 0) {
      throw new TypeError('Web Design Agent public base URL must not contain query or fragment data.')
    }
    if (url.pathname !== '/') {
      throw new TypeError('Web Design Agent public base URL must be an origin without a path prefix.')
    }
    return url
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

  private assertPositiveInteger(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive integer.`)
    }
  }
}
