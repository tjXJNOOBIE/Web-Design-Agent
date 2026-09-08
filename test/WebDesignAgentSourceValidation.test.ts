import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentRuntime} from '../src/agent/runtime/WebDesignAgentRuntime.js'
import {WebDesignAgentBrowserTargetValidator} from '../src/design/validation/WebDesignAgentBrowserTargetValidator.js'
import {candidate, generation} from './fixture/DesignFixture.js'
import {FakeRuntime} from './fake/FakeStrands.js'

const PUBLIC_IP = '93.184.216.34'
const PUBLIC_TARGET = 'https://example.com/'

function publicValidator() {
  return new WebDesignAgentBrowserTargetValidator(async () => [PUBLIC_IP])
}

function runtime(
  fake: FakeRuntime,
  capabilities = {components: false, browser: true, conceptImages: false},
) {
  return new WebDesignAgentRuntime(
    fake,
    [fake],
    capabilities,
    publicValidator(),
  )
}

function browserEvent(
  candidateId: 'a' | 'b' | 'c',
  toolName: string,
  targetUrl: string,
): unknown {
  return {
    type: 'toolStreamUpdateEvent',
    event: {
      data: {
        type: 'afterToolCallEvent',
        agent: {id: `web-design-agent-candidate-${candidateId}`},
        toolUse: {
          name: toolName,
          ...(toolName === 'browser_navigate' ? {input: {url: targetUrl}} : {}),
        },
        result: {status: 'success'},
      },
    },
  }
}

function sourceInspection(candidateId: 'a' | 'b' | 'c', targetUrl: string): unknown[] {
  return [
    browserEvent(candidateId, 'browser_navigate', targetUrl),
    browserEvent(candidateId, 'browser_snapshot', targetUrl),
  ]
}

test('source-dependent modes reject missing source inputs before invoking Strands', async () => {
  const referenceRuntime = new FakeRuntime(JSON.stringify(generation()))
  await assert.rejects(
    () =>
      runtime(referenceRuntime).generate({
        prompt: 'use this reference',
        sourceMode: 'reference-image',
      }),
    /reference-image mode requires referenceImageUrl/i,
  )
  assert.equal(referenceRuntime.invokes.length, 0)

  const siteRuntime = new FakeRuntime(JSON.stringify(generation()))
  await assert.rejects(
    () =>
      runtime(siteRuntime).generate({
        prompt: 'redesign it',
        sourceMode: 'existing-site',
      }),
    /existing-site mode requires targetUrl/i,
  )
  assert.equal(siteRuntime.invokes.length, 0)

  const conceptRuntime = new FakeRuntime(JSON.stringify(generation()))
  await assert.rejects(
    () =>
      runtime(conceptRuntime).generate({
        prompt: 'build from concept',
        sourceMode: 'concept-first',
      }),
    /concept-first mode requires a selectedConcept/i,
  )
  assert.equal(conceptRuntime.invokes.length, 0)
})

test('explicit private targetUrl is rejected before the Director can inspect it', async () => {
  const fake = new FakeRuntime(JSON.stringify(generation()))
  const agent = new WebDesignAgentRuntime(
    fake,
    [fake],
    {components: false, browser: true, conceptImages: false},
    new WebDesignAgentBrowserTargetValidator(async () => ['10.0.0.9']),
  )

  await assert.rejects(
    () =>
      agent.generate({
        prompt: 'redesign this',
        sourceMode: 'existing-site',
        targetUrl: 'https://private.example/',
      }),
    /private, loopback, link-local, metadata, reserved, or multicast/i,
  )
  assert.equal(fake.invokes.length, 0)
})

test('existing-site evidence must be bound to the validated requested source target', async () => {
  const fake = new FakeRuntime(JSON.stringify(generation()))
  const otherTarget = 'https://other.example.com/'
  fake.streamEvents.push([
    ...sourceInspection('a', otherTarget),
    ...sourceInspection('b', otherTarget),
    ...sourceInspection('c', otherTarget),
  ])

  await assert.rejects(
    () =>
      runtime(fake).generate({
        prompt: 'redesign this',
        sourceMode: 'existing-site',
        targetUrl: PUBLIC_TARGET,
      }),
    /requires successful browser inspection of its source.*A, B, C/i,
  )
})

test('existing-site succeeds only when every candidate inspects the validated source target', async () => {
  const fake = new FakeRuntime(JSON.stringify(generation()))
  fake.streamEvents.push([
    ...sourceInspection('a', PUBLIC_TARGET),
    ...sourceInspection('b', PUBLIC_TARGET),
    ...sourceInspection('c', PUBLIC_TARGET),
  ])

  const result = await runtime(fake).generate({
    prompt: 'redesign this',
    sourceMode: 'existing-site',
    targetUrl: PUBLIC_TARGET,
  })

  assert.equal(result.validation.browserValidated, true)
  assert.ok(result.candidates.every((item) => item.browserEvidence.length === 1))
})

test('selected concept image URL is validated before concept-first generation', async () => {
  const fake = new FakeRuntime(JSON.stringify(generation()))
  const agent = new WebDesignAgentRuntime(
    fake,
    [fake],
    {components: false, browser: false, conceptImages: false},
    new WebDesignAgentBrowserTargetValidator(async () => ['127.0.0.1']),
  )

  await assert.rejects(
    () =>
      agent.generate({
        prompt: 'use this concept',
        sourceMode: 'concept-first',
        selectedConcept: {
          id: 'A',
          title: 'Concept',
          thesis: 'Concept thesis',
          imageUrl: 'https://concept.example/image.png',
        },
      }),
    /private, loopback, link-local, metadata, reserved, or multicast/i,
  )
  assert.equal(fake.invokes.length, 0)
})

test('refinement cannot return a different candidate slot than requested', async () => {
  const fake = new FakeRuntime(JSON.stringify(candidate('A', 0)))

  await assert.rejects(
    () =>
      runtime(fake, {components: false, browser: false, conceptImages: false}).refine({
        candidate: candidate('B', 1),
        visualState: candidate('B', 1).visualState,
        feedback: 'refine selected B',
      }),
    /requested candidate B.*returned candidate A/i,
  )
})
