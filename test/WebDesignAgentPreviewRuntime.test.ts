import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentPreviewRuntime} from '../src/design/preview/WebDesignAgentPreviewRuntime.js'
import {generation} from './fixture/DesignFixture.js'

test('preview runtime serves hermetic content-addressed final candidates', async () => {
  const runtime = new WebDesignAgentPreviewRuntime()

  try {
    const generated = generation()
    const first = await runtime.publish(generated.candidates)
    const response = await fetch(first.A.url)
    const html = await response.text()

    assert.equal(response.status, 200)
    assert.match(first.A.url, /\/candidate\/a\/[a-f0-9]{64}\/$/)
    assert.match(html, /A/i)
    assert.match(
      response.headers.get('content-security-policy') ?? '',
      /sandbox allow-scripts/i,
    )
    assert.match(
      response.headers.get('content-security-policy') ?? '',
      /connect-src 'none'/i,
    )
    assert.equal(response.headers.get('cache-control'), 'no-store')

    const changedCandidates = generated.candidates.map((candidate) =>
      candidate.id === 'A'
        ? {
            ...candidate,
            pages: candidate.pages.map((page) => ({
              ...page,
              html: `${page.html}<p>changed route artifact</p>`,
            })),
          }
        : candidate,
    )
    const second = await runtime.publish(changedCandidates)

    assert.notEqual(first.A.fingerprint, second.A.fingerprint)
    assert.notEqual(first.A.url, second.A.url)
    assert.equal(first.B.fingerprint, second.B.fingerprint)
  } finally {
    await runtime.close()
  }
})

test('preview runtime refuses unknown paths and non-GET methods', async () => {
  const runtime = new WebDesignAgentPreviewRuntime()

  try {
    const targets = await runtime.publish(generation().candidates)
    const unknown = await fetch(new URL('/not-a-preview', targets.A.url))
    const post = await fetch(targets.A.url, {method: 'POST'})

    assert.equal(unknown.status, 404)
    assert.equal(post.status, 405)
    assert.equal(post.headers.get('allow'), 'GET')
  } finally {
    await runtime.close()
  }
})
