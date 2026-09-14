import type {
  DesignCandidateData,
  DesignPageData,
  DesignPageExportData,
  VisualStateData,
} from './WebDesignMcpAppTypes.js'

export class PreviewDocumentBuilder {
  public build(
    candidate: DesignCandidateData,
    visualState: VisualStateData,
    page?: DesignPageData,
  ): string {
    const home = this.buildStandalone(
      candidate.document.html,
      candidate.document.css,
      candidate.document.javascript,
      visualState,
      candidate.title,
    )
    if (page === undefined) return home

    const exportedPage = this.buildPage(candidate, page, visualState)
    return exportedPage.standaloneHtml
  }

  private buildPage(
    candidate: DesignCandidateData,
    page: DesignPageData,
    visualState: VisualStateData,
  ): DesignPageExportData {
    return {
      path: page.path,
      title: page.title,
      html: page.html,
      javascript: page.javascript,
      standaloneHtml: this.buildStandalone(
        page.html,
        candidate.document.css,
        page.javascript,
        visualState,
        page.title,
      ),
    }
  }

  private buildStandalone(
    html: string,
    css: string,
    javascript: string,
    visualState: VisualStateData,
    title: string,
  ): string {
    const root =
      `:root{--wda-density:${visualState.density};` +
      `--wda-spacing:${visualState.spacingScale};` +
      `--wda-radius:${visualState.radius}px;` +
      `--wda-font-scale:${visualState.fontScale};` +
      `--wda-hero-scale:${visualState.heroScale};` +
      `--wda-contrast:${visualState.contrast};` +
      `--wda-depth:${visualState.depth};` +
      `--wda-motion:${visualState.motion};}`
    const script = javascript.replaceAll('</script', '<\\/script')
    return (
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      `<title>${this.escapeHtml(title)}</title>` +
      `<style>${root}\n${css}</style></head><body>${html}` +
      (script.length === 0 ? '' : `<script>${script}</script>`) +
      '</body></html>'
    )
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
  }
}
