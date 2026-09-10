import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_WEB_DESIGN_AGENT_MODEL_ID,
  WebDesignAgentRuntimeConfigBuilder,
} from '../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'

test('pins the default Strands model instead of inheriting a moving SDK default', () => {
  const builder = new WebDesignAgentRuntimeConfigBuilder({})

  assert.equal(builder.buildDirector().agent.model, DEFAULT_WEB_DESIGN_AGENT_MODEL_ID)
  assert.equal(builder.buildCandidate('A').agent.model, DEFAULT_WEB_DESIGN_AGENT_MODEL_ID)
  assert.equal(builder.buildCritic().agent.model, DEFAULT_WEB_DESIGN_AGENT_MODEL_ID)
  assert.equal(builder.buildConcept().agent.model, DEFAULT_WEB_DESIGN_AGENT_MODEL_ID)
})

test('allows deployment to override the pinned model id', () => {
  const builder = new WebDesignAgentRuntimeConfigBuilder({
    WEB_DESIGN_AGENT_MODEL_ID: 'us.amazon.nova-pro-v1:0',
  })

  assert.equal(builder.buildDirector().agent.model, 'us.amazon.nova-pro-v1:0')
  assert.equal(builder.buildCandidate('B').agent.model, 'us.amazon.nova-pro-v1:0')
})
