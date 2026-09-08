import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentRuntime} from '../src/agent/runtime/WebDesignAgentRuntime.js'
import {generation} from './fixture/DesignFixture.js'
import {FakeRuntime} from './fake/FakeStrands.js'

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
    new RegExp(`Candidate ${candidateId} final preview: (http[^\\n]+)`),
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

test('code-first validates only after exact final artifacts are content-addressed and inspected', async () => {
  const strands = new FakeRuntime(JSON.stringify(generation()))
  strands.streamEventFactory = (prompt) => finalPreviewEvents(prompt)
  const agent = new WebDesignAgentRuntime(
    strands,
    [strands],
    {
      components: false,
      browser: true,
      finalCandidatePreview: true,
      conceptImages: false,
    },
  )

  try {
    const result = await agent.generate({prompt: 'make a portfolio'})

    assert.equal(result.validation.browserValidated, true)
    assert.equal(strands.invokes.length, 2)
    assert.match(strands.invokes[1] ?? '', /inspect-final-code-first-previews/)
    assert.ok(
      result.candidates.every((candidate) =>
        candidate.browserEvidence.some((evidence) =>
          /127\.0\.0\.1:\d+\/candidate\/[abc]\/[a-f0-9]{64}/i.test(evidence),
        ),
      ),
    )
    assert.match(
      result.validation.notes.at(-1) ?? '',
      /exact final A\/B\/C artifacts.*content-addressed.*inspected/i,
    )
  } finally {
    await agent.close()
  }
})

test('wrong final preview target cannot certify the returned code-first candidate', async () => {
  const strands = new FakeRuntime(JSON.stringify(generation()))
  strands.streamEventFactory = (prompt) => finalPreviewEvents(prompt, 'C')
  const agent = new WebDesignAgentRuntime(
    strands,
    [strands],
    {
      components: false,
      browser: true,
      finalCandidatePreview: true,
      conceptImages: false,
    },
  )

  try {
    const result = await agent.generate({prompt: 'make a portfolio'})

    assert.equal(result.validation.browserValidated, false)
    assert.match(
      result.validation.notes.at(-1) ?? '',
      /final content-addressed preview inspection.*candidate C/i,
    )
  } finally {
    await agent.close()
  }
})
