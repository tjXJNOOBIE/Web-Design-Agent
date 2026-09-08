import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentRuntimeConfigBuilder} from '../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntime} from '../src/agent/runtime/WebDesignAgentRuntime.js'
import {WebDesignAgentRuntimeBuilder} from '../src/agent/runtime/WebDesignAgentRuntimeBuilder.js'
import {DesignExportBuilder} from '../src/design/export/DesignExportBuilder.js'
import {WebDesignAgentWorkflowHandler} from '../src/design/handler/WebDesignAgentWorkflowHandler.js'
import {DesignDistanceEvaluator} from '../src/design/validation/DesignDistanceEvaluator.js'
import {DesignGenerationResultParser} from '../src/design/validation/DesignGenerationResultParser.js'
import {OneShotDesignEvaluationHandler} from '../src/evaluation/handler/OneShotDesignEvaluationHandler.js'
import {PreviewDocumentBuilder} from '../src/mcp-app/PreviewDocumentBuilder.js'
import {candidate, generation} from './fixture/DesignFixture.js'
import {FakeBootstrap, FakeRuntime} from './fake/FakeStrands.js'

const json = () => JSON.stringify(generation())
const PUBLIC_TARGET = 'https://example.com/'

function browserToolEvent(
  candidateId: 'a' | 'b' | 'c',
  toolName: string,
  status: 'success' | 'error' = 'success',
  targetUrl = PUBLIC_TARGET,
): unknown {
  return {
    type: 'toolStreamUpdateEvent',
    event: {
      data: {
        type: 'afterToolCallEvent',
        agent: {id: `web-design-agent-candidate-${candidateId}`},
        toolUse: {
          name: toolName,
          ...(toolName === 'browser_navigate'
            ? {input: {url: targetUrl}}
            : {}),
        },
        result: {status},
      },
    },
  }
}

function browserInspectionEvents(
  candidateId: 'a' | 'b' | 'c',
  inspectionTool = 'browser_snapshot',
  inspectionStatus: 'success' | 'error' = 'success',
  targetUrl = PUBLIC_TARGET,
): unknown[] {
  return [
    browserToolEvent(candidateId, 'browser_navigate', 'success', targetUrl),
    browserToolEvent(candidateId, inspectionTool, inspectionStatus, targetUrl),
  ]
}

test('runtime config reports optional capabilities', () => {
  assert.deepEqual(
    new WebDesignAgentRuntimeConfigBuilder({
      API_KEY_21ST: 'x',
      WEB_DESIGN_AGENT_BROWSER_MCP_URL: 'https://browser',
      WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD: 'yes',
    }).capabilities(),
    {components: true, browser: true, conceptImages: true},
  )
})

test('runtime records browser validation false when browser is absent', async () => {
  const runtime = new FakeRuntime(json())
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: false, conceptImages: false},
  )
  const result = await agent.generate({prompt: 'site'})

  assert.equal(result.validation.browserValidated, false)
  assert.match(result.validation.notes.at(-1) ?? '', /browser validation was not executed/i)
  assert.ok(result.candidates.every((item) => item.browserEvidence.length === 0))
})

test('model cannot self-certify browser validation without observed Strands tool calls', async () => {
  const generated = generation()
  const runtime = new FakeRuntime(
    JSON.stringify({
      ...generated,
      candidates: generated.candidates.map((item) => ({
        ...item,
        browserEvidence: ['model claimed screenshot'],
      })),
      validation: {
        ...generated.validation,
        browserValidated: true,
        notes: ['model claimed the browser ran'],
      },
    }),
  )
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: true, conceptImages: false},
  )

  const result = await agent.generate({prompt: 'site'})

  assert.equal(result.validation.browserValidated, false)
  assert.ok(result.candidates.every((item) => item.browserEvidence.length === 0))
  assert.match(result.validation.notes[0] ?? '', /Agent note \(unverified\)/)
  assert.match(result.validation.notes.at(-1) ?? '', /candidates A, B, C/)
})

test('runtime grounds browser validation in navigation-bound candidate Strands tool events', async () => {
  const runtime = new FakeRuntime(json())
  runtime.streamEvents.push([
    ...browserInspectionEvents('a'),
    ...browserInspectionEvents('b'),
    ...browserInspectionEvents('c', 'browser_take_screenshot'),
  ])
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: true, conceptImages: false},
  )

  const result = await agent.generate({prompt: 'site'})

  assert.equal(result.validation.browserValidated, true)
  assert.match(result.candidates[0]?.browserEvidence[0] ?? '', /browser_snapshot.*example\.com/i)
  assert.match(result.candidates[1]?.browserEvidence[0] ?? '', /browser_snapshot.*example\.com/i)
  assert.match(result.candidates[2]?.browserEvidence[0] ?? '', /browser_take_screenshot.*example\.com/i)
  assert.match(result.validation.notes.at(-1) ?? '', /navigation-bound inspection/i)
})

test('snapshot without successful navigation cannot satisfy runtime inspection evidence', async () => {
  const runtime = new FakeRuntime(json())
  runtime.streamEvents.push([
    browserToolEvent('a', 'browser_snapshot'),
    browserToolEvent('b', 'browser_snapshot'),
    browserToolEvent('c', 'browser_take_screenshot'),
  ])
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: true, conceptImages: false},
  )

  const result = await agent.generate({prompt: 'site'})

  assert.equal(result.validation.browserValidated, false)
  assert.ok(result.candidates.every((item) => item.browserEvidence.length === 0))
})

test('failed navigation clears the browser target before a later snapshot', async () => {
  const runtime = new FakeRuntime(json())
  runtime.streamEvents.push([
    ...browserInspectionEvents('a'),
    ...browserInspectionEvents('b'),
    browserToolEvent('c', 'browser_navigate'),
    browserToolEvent('c', 'browser_navigate', 'error', 'https://other.example.com/'),
    browserToolEvent('c', 'browser_snapshot'),
  ])
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: true, conceptImages: false},
  )

  const result = await agent.generate({prompt: 'site'})

  assert.equal(result.validation.browserValidated, false)
  assert.deepEqual(result.candidates[2]?.browserEvidence, [])
  assert.match(result.validation.notes.at(-1) ?? '', /candidates C/)
})

test('runtime refinement carries visual state', async () => {
  const runtime = new FakeRuntime(JSON.stringify(candidate('B', 1)))
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: false, conceptImages: false},
  )
  const state = {...candidate('B', 1).visualState, radius: 4}

  await agent.refine({
    candidate: candidate('B', 1),
    visualState: state,
    feedback: 'sharper',
  })

  assert.match(runtime.invokes[0] ?? '', /"radius":4/)
})

test('runtime refinement replaces model evidence with observed selected-candidate evidence', async () => {
  const base = candidate('B', 1)
  const runtime = new FakeRuntime(
    JSON.stringify({...base, browserEvidence: ['invented evidence']}),
  )
  runtime.streamEvents.push([
    ...browserInspectionEvents('b', 'browser_take_screenshot'),
  ])
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: true, conceptImages: false},
  )

  const result = await agent.refine({
    candidate: base,
    visualState: base.visualState,
    feedback: 'keep this',
  })

  assert.equal(result.browserEvidence.length, 1)
  assert.match(result.browserEvidence[0] ?? '', /browser_take_screenshot.*example\.com/i)
})

test('runtime rejects a refinement result for a different candidate id', async () => {
  const runtime = new FakeRuntime(JSON.stringify(candidate('A', 0)))
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: false, conceptImages: false},
  )

  await assert.rejects(
    () =>
      agent.refine({
        candidate: candidate('B', 1),
        visualState: candidate('B', 1).visualState,
        feedback: 'refine B',
      }),
    /requested candidate B.*returned candidate A/i,
  )
})

test('runtime enforces requested multi-page routes', async () => {
  const runtime = new FakeRuntime(json())
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: false, conceptImages: false},
  )

  await assert.rejects(
    () => agent.generate({prompt: 'site', pages: ['/pricing']}),
    /missing requested page routes/,
  )
})

test('runtime refuses existing-site without browser capability', async () => {
  const runtime = new FakeRuntime(json())
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: false, conceptImages: false},
  )

  await assert.rejects(
    () =>
      agent.generate({
        prompt: 'redesign',
        sourceMode: 'existing-site',
        targetUrl: PUBLIC_TARGET,
      }),
    /requires configured browser/,
  )
})

test('runtime refuses existing-site mode when browser is configured but source inspection did not execute', async () => {
  const runtime = new FakeRuntime(json())
  const agent = new WebDesignAgentRuntime(
    runtime,
    [runtime],
    {components: false, browser: true, conceptImages: false},
  )

  await assert.rejects(
    () =>
      agent.generate({
        prompt: 'redesign',
        sourceMode: 'existing-site',
        targetUrl: PUBLIC_TARGET,
      }),
    /requires successful browser inspection of its source.*A, B, C/,
  )
})

test('runtime builder creates specialists before director and reverses close', async () => {
  const bootstrap = new FakeBootstrap()
  const runtime = await new WebDesignAgentRuntimeBuilder(
    bootstrap,
    new WebDesignAgentRuntimeConfigBuilder({}),
  ).build()

  assert.deepEqual(
    bootstrap.configs.map((config) => config.agent.id),
    [
      'web-design-agent-candidate-a',
      'web-design-agent-candidate-b',
      'web-design-agent-candidate-c',
      'web-design-agent-critic',
      'web-design-agent-director',
    ],
  )
  await runtime.close()
  assert.ok(bootstrap.runtimes.every((item) => item.closeCalls === 1))
})

test('runtime builder adds optional concept specialist', async () => {
  const bootstrap = new FakeBootstrap()
  await new WebDesignAgentRuntimeBuilder(
    bootstrap,
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD: 'true',
    }),
  ).build()

  assert.ok(
    bootstrap.configs.some(
      (config) => config.agent.id === 'web-design-agent-concept',
    ),
  )
})

test('export builder applies visual state and escapes closing scripts', () => {
  const base = candidate('A', 0)
  const changed = {
    ...base,
    document: {...base.document, javascript: 'x="</script>"'},
  }
  const output = new DesignExportBuilder().build(changed, {
    ...changed.visualState,
    radius: 5,
  })

  assert.match(output.standaloneHtml, /--wda-radius:5px/)
  assert.ok(!output.standaloneHtml.includes('x="</script>"'))
})

test('workflow closes runtime after success', async () => {
  let closed = 0
  const runtimeBuilder: any = {
    build: async () => ({
      generate: async () => generation(),
      refine: async () => candidate('A', 0),
      createConcepts: async () => ({prompt: 'x', concepts: []}),
      close: async () => {
        closed += 1
      },
    }),
  }

  await new WebDesignAgentWorkflowHandler(runtimeBuilder).generate({prompt: 'x'})
  assert.equal(closed, 1)
})

test('distance evaluator accepts structurally distinct candidates', () => {
  assert.equal(
    new DesignDistanceEvaluator().evaluate(generation().candidates).passed,
    true,
  )
})

test('distance evaluator rejects cosmetic variants', () => {
  const a = candidate('A', 0)
  const b = {...a, id: 'B' as const}
  const c = {...a, id: 'C' as const}

  assert.equal(new DesignDistanceEvaluator().evaluate([a, b, c]).passed, false)
})

test('parser accepts JSON wrapped in model prose', () => {
  assert.equal(
    new DesignGenerationResultParser().parseGeneration(`result\n${json()}\nend`)
      .candidates.length,
    3,
  )
})

test('parser rejects duplicate candidate ids', () => {
  const generated = generation()
  const invalid = {
    ...generated,
    candidates: [
      generated.candidates[0],
      generated.candidates[0],
      generated.candidates[2],
    ],
  }

  assert.throws(
    () => new DesignGenerationResultParser().parseGeneration(invalid),
    /exactly one candidate/,
  )
})

test('evaluation reports only objective metrics', async () => {
  const workflow: any = {
    generate: async () => ({
      ...generation(),
      validation: {...generation().validation, browserValidated: true},
    }),
  }

  assert.deepEqual(
    await new OneShotDesignEvaluationHandler(workflow).evaluate(['x', 'y']),
    {
      prompts: 2,
      successRate: 1,
      validCandidateRate: 1,
      distinctCandidateRate: 1,
      browserValidationRate: 1,
    },
  )
})

test('evaluation handles empty corpus', async () => {
  assert.equal(
    (await new OneShotDesignEvaluationHandler({} as any).evaluate([])).prompts,
    0,
  )
})

test('candidate contracts carry design system and page exports', () => {
  const designCandidate = candidate('A', 0)
  const output = new DesignExportBuilder().build(
    designCandidate,
    designCandidate.visualState,
  )

  assert.equal(designCandidate.designSystem.components[0], 'button')
  assert.equal(output.pages[0]?.path, '/stats')
})

test('preview document builder injects selected page with shared CSS', () => {
  const designCandidate = candidate('A', 0)
  const page = designCandidate.pages[0]
  assert.ok(page)

  const html = new PreviewDocumentBuilder().build(
    designCandidate,
    designCandidate.visualState,
    page,
  )

  assert.match(html, /A stats/)
  assert.match(html, /main\{display:block\}/)
})
