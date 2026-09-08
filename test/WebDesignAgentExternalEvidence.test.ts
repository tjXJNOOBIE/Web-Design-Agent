import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentToolEvidenceCollector} from '../src/agent/evidence/WebDesignAgentToolEvidenceCollector.js'
import {WebDesignAgentRuntime} from '../src/agent/runtime/WebDesignAgentRuntime.js'
import {generation} from './fixture/DesignFixture.js'
import {FakeRuntime} from './fake/FakeStrands.js'

function toolEvent(
  agentId: string,
  toolName: string,
  status: 'success' | 'error' = 'success',
): unknown {
  return {
    type: 'afterToolCallEvent',
    agent: {id: agentId},
    toolUse: {name: toolName},
    result: {status},
  }
}

function wrappedToolEvent(
  agentId: string,
  toolName: string,
  status: 'success' | 'error' = 'success',
): unknown {
  return {
    type: 'toolStreamUpdateEvent',
    event: {data: toolEvent(agentId, toolName, status)},
  }
}

function conceptJson(): string {
  return JSON.stringify({
    concepts: [
      {
        id: 'A',
        title: 'Editorial',
        thesis: 'Editorial product storytelling',
        imageUrl: 'https://example.test/a.png',
      },
      {
        id: 'B',
        title: 'Operational',
        thesis: 'Dense operational product surface',
        imageUrl: 'https://example.test/b.png',
      },
      {
        id: 'C',
        title: 'Spatial',
        thesis: 'Spatial layered interaction model',
        imageUrl: 'https://example.test/c.png',
      },
    ],
  })
}

test('attributes component and concept provider calls from native Strands events', () => {
  const evidence = new WebDesignAgentToolEvidenceCollector()

  evidence.record(
    wrappedToolEvent(
      'web-design-agent-candidate-a',
      'components_search_components',
    ),
  )
  evidence.record(
    toolEvent(
      'web-design-agent-candidate-b',
      'components_search_components',
      'error',
    ),
  )
  evidence.record(
    toolEvent('web-design-agent-concept', 'assets_generate_image'),
  )

  assert.deepEqual(evidence.componentEvidence('A'), [
    'components_search_components executed successfully.',
  ])
  assert.deepEqual(evidence.missingComponentResearch(), ['B', 'C'])
  assert.equal(evidence.hasConceptProviderCall(), true)
  assert.deepEqual(evidence.conceptProviderEvidence(), [
    'assets_generate_image executed successfully.',
  ])
})

test('concept-first rejects a model result when no provider tool call was observed', async () => {
  const runtime = new FakeRuntime(conceptJson())
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: false, conceptImages: true},
  )

  await assert.rejects(
    () => agent.createConcepts('explore a site'),
    /no successful runtime evidence from the configured image provider/i,
  )
})

test('concept-first returns runtime-grounded provider evidence', async () => {
  const runtime = new FakeRuntime(conceptJson())
  runtime.streamEvents.push([
    wrappedToolEvent('web-design-agent-concept', 'assets_generate_image'),
  ])
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: false, conceptImages: true},
  )

  const result = await agent.createConcepts('explore a site')

  assert.equal(result.concepts.length, 3)
  assert.deepEqual(result.providerEvidence, [
    'assets_generate_image executed successfully.',
  ])
})

test('generation reports which candidates actually used configured component research', async () => {
  const runtime = new FakeRuntime(JSON.stringify(generation()))
  runtime.streamEvents.push([
    toolEvent('web-design-agent-candidate-a', 'components_search_components'),
    toolEvent('web-design-agent-candidate-b', 'components_get_component'),
    toolEvent('web-design-agent-candidate-c', 'components_search_components'),
  ])
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: true, browser: false, conceptImages: false},
  )

  const result = await agent.generate({prompt: 'site'})

  assert.match(
    result.validation.notes.at(-1) ?? '',
    /component research was observed for candidates A, B, and C/i,
  )
})
