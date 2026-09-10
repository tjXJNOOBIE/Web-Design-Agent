import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentRuntimeConfigBuilder} from '../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntimeBuilder} from '../src/agent/runtime/WebDesignAgentRuntimeBuilder.js'
import {WebDesignAgentPreviewRuntime} from '../src/design/preview/WebDesignAgentPreviewRuntime.js'
import {FakeBootstrap} from './fake/FakeStrands.js'

const PUBLIC_BASE_URL = 'https://design.example/'

test('browser plus public preview composition advertises final candidate binding', () => {
  const previewRuntime = new WebDesignAgentPreviewRuntime()
  const builder = new WebDesignAgentRuntimeBuilder(
    new FakeBootstrap(),
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_BROWSER_MCP_URL: 'https://browser.example/mcp',
    }),
    previewRuntime,
    PUBLIC_BASE_URL,
  )

  try {
    assert.equal(builder.capabilities().browser, true)
    assert.equal(builder.capabilities().finalCandidatePreview, true)
  } finally {
    previewRuntime.close()
  }
})

test('browser without a composed public preview does not claim final candidate binding', () => {
  const builder = new WebDesignAgentRuntimeBuilder(
    new FakeBootstrap(),
    new WebDesignAgentRuntimeConfigBuilder({
      WEB_DESIGN_AGENT_ENABLE_PLAYWRIGHT: 'true',
    }),
  )

  assert.equal(builder.capabilities().browser, true)
  assert.equal(builder.capabilities().finalCandidatePreview, undefined)
})

test('public preview without browser capability does not claim validation support', () => {
  const previewRuntime = new WebDesignAgentPreviewRuntime()
  const builder = new WebDesignAgentRuntimeBuilder(
    new FakeBootstrap(),
    new WebDesignAgentRuntimeConfigBuilder({}),
    previewRuntime,
    PUBLIC_BASE_URL,
  )

  try {
    assert.equal(builder.capabilities().browser, false)
    assert.equal(builder.capabilities().finalCandidatePreview, undefined)
  } finally {
    previewRuntime.close()
  }
})
