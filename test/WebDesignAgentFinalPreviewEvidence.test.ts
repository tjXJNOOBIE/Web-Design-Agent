import assert from 'node:assert/strict'
import test from 'node:test'

import {DEFAULT_WEB_DESIGN_AGENT_INVOCATION_POLICY} from '../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntime} from '../src/agent/runtime/WebDesignAgentRuntime.js'
import {WebDesignAgentBrowserTargetValidator} from '../src/design/validation/WebDesignAgentBrowserTargetValidator.js'
import {WebDesignAgentPreviewRuntime} from '../src/design/preview/WebDesignAgentPreviewRuntime.js'
import {generation} from './fixture/DesignFixture.js'
import {FakeRuntime} from './fake/FakeStrands.js'

const PUBLIC_BASE_URL = 'https://design.example/'

function browserInspectionEvents(
  candidateId: 'a' | 'b' | 'c',
  targetUrl: string,
): unknown[] {
  return [
    {
      type: 'toolStreamUpdateEvent',
      event: {
        data: {
          type: 'afterToolCallEvent',
          agent: {id: `web-design-agent-candidate-${candidateId}`},
          toolUse: {name: 'browser_navigate', input: {url: targetUrl}},
          result: {status: 'success'},
        },
      },
    },
    {
      type: 'toolStreamUpdateEvent',
      event: {
        data: {
          type: 'afterToolCallEvent',
          agent: {id: `web-design-agent-candidate-${candidateId}`},
          toolUse: {name: 'browser_snapshot'},
          result: {status: 'success'},
        },
      },
    },
  ]
}

function previewUrl(prompt: string, candidateId: 'A' | 'B' | 'C'): string {
  const match = prompt.match(
    new RegExp(`Candidate ${candidateId} final preview: (https[^\\n]+)`),
  )
  assert.ok(match?.[1], `Missing final preview URL for candidate ${candidateId}.`)
  return match[1]
}

function finalPreviewEvents(prompt: string, wrongCandidate?: 'A' | 'B' | 'C'): unknown[] {
  if (!prompt.includes('OPERATION: inspect-final-code-first-previews')) return []

  return (['A', 'B', 'C'] as const).flatMap((candidateId) => {
    const target =
      candidateId === wrongCandidate
        ? 'https://example.com/not-the-final-preview'
        : previewUrl(prompt, candidateId)

    return browserInspectionEvents(
      candidateId.toLowerCase() as 'a' | 'b' | 'c',
      target,
    )
  })
}

function buildAgent(strands: FakeRuntime, previewRuntime: WebDesignAgentPreviewRuntime) {
  return new WebDesignAgentRuntime(
    strands,
    [strands],
    {
      components: false,
      browser: true,
      finalCandidatePreview: true,
      conceptImages: false,
    },
    DEFAULT_WEB_DESIGN_AGENT_INVOCATION_POLICY,
    new WebDesignAgentBrowserTargetValidator(async () => ['93.184.216.34']),
    undefined,
    undefined,
    previewRuntime,
    PUBLIC_BASE_URL,
  )
}

test('code-first validates only after exact final artifacts are content-addressed and inspected', async () => {
  const strands = new FakeRuntime(JSON.stringify(generation()))
  strands.streamEventFactory = (prompt) => finalPreviewEvents(prompt)
  const previewRuntime = new WebDesignAgentPreviewRuntime()
  const agent = buildAgent(strands, previewRuntime)

  try {
    const result = await agent.generate({prompt: 'make a portfolio'})

    assert.equal(result.validation.browserValidated, true)
    assert.equal(strands.invokes.length, 2)
    assert.match(strands.invokes[1] ?? '', /inspect-final-code-first-previews/)
    assert.ok(
      result.candidates.every((candidate) =>
        candidate.browserEvidence.some((evidence) =>
          /design\.example\/preview\/[A-Za-z0-9_-]{32}\/[abc]\/[a-f0-9]{64}/i.test(evidence),
        ),
      ),
    )
    assert.match(
      result.validation.notes.at(-1) ?? '',
      /exact final A\/B\/C artifacts.*content-addressed.*inspected/i,
    )
  } finally {
    await agent.close()
    previewRuntime.close()
  }
})

test('wrong final preview target cannot certify the returned code-first candidate', async () => {
  const strands = new FakeRuntime(JSON.stringify(generation()))
  strands.streamEventFactory = (prompt) => finalPreviewEvents(prompt, 'C')
  const previewRuntime = new WebDesignAgentPreviewRuntime()
  const agent = buildAgent(strands, previewRuntime)

  try {
    const result = await agent.generate({prompt: 'make a portfolio'})

    assert.equal(result.validation.browserValidated, false)
    assert.match(
      result.validation.notes.at(-1) ?? '',
      /final render-bound content-addressed preview inspection.*candidate C/i,
    )
  } finally {
    await agent.close()
    previewRuntime.close()
  }
})
