import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentPreviewRuntime} from '../src/design/preview/WebDesignAgentPreviewRuntime.js'
import {generation} from './fixture/DesignFixture.js'

const PUBLIC_BASE_URL = 'https://design.example/'

test('preview runtime publishes hermetic content-addressed final candidates', () => {
  const runtime = new WebDesignAgentPreviewRuntime()
  const generated = generation()
  const first = runtime.publish(generated.candidates, PUBLIC_BASE_URL)

  try {
    const aTarget = first.targets.A
    const aPath = new URL(aTarget.url).pathname
    const aPreview = runtime.read(aPath)

    assert.match(
      aTarget.url,
      /^https:\/\/design\.example\/preview\/[A-Za-z0-9_-]{32}\/a\/[a-f0-9]{64}\/$/,
    )
    assert.match(aPreview?.html ?? '', /A/i)
    assert.match(
      aPreview?.contentSecurityPolicy ?? '',
      /sandbox allow-scripts/i,
    )
    assert.match(
      aPreview?.contentSecurityPolicy ?? '',
      /connect-src 'none'/i,
    )

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
    const second = runtime.publish(changedCandidates, PUBLIC_BASE_URL)

    try {
      assert.notEqual(first.targets.A.fingerprint, second.targets.A.fingerprint)
      assert.notEqual(first.targets.A.url, second.targets.A.url)
      assert.equal(first.targets.B.fingerprint, second.targets.B.fingerprint)
    } finally {
      second.close()
    }
  } finally {
    const path = new URL(first.targets.A.url).pathname
    first.close()
    assert.equal(runtime.read(path), undefined)
    runtime.close()
  }
})

test('preview runtime enforces publication capacity', () => {
  const runtime = new WebDesignAgentPreviewRuntime(1)
  const first = runtime.publish(generation().candidates, PUBLIC_BASE_URL)

  try {
    assert.throws(
      () => runtime.publish(generation().candidates, PUBLIC_BASE_URL),
      /capacity is exhausted/i,
    )
  } finally {
    first.close()
    runtime.close()
  }
})

test('preview runtime rejects non-http public base URLs', () => {
  const runtime = new WebDesignAgentPreviewRuntime()

  try {
    assert.throws(
      () => runtime.publish(generation().candidates, 'file:///tmp/preview'),
      /must use HTTP\(S\)/i,
    )
  } finally {
    runtime.close()
  }
})
