import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignMcpPublicDeploymentValidator} from '../src/mcp/http/WebDesignMcpPublicDeploymentValidator.js'

const validator = new WebDesignMcpPublicDeploymentValidator()

test('allows public NoAuth HTTP when browser capability is disabled', () => {
  assert.doesNotThrow(() =>
    validator.validate(
      {components: true, browser: false, conceptImages: false},
      {},
    ),
  )
})

test('refuses public browser capability without deployment egress isolation', () => {
  assert.throws(
    () =>
      validator.validate(
        {components: false, browser: true, conceptImages: false},
        {},
      ),
    /refusing to expose browser capability.*egress.*isolated/i,
  )
})

test('allows public browser capability only after the deployment declares isolated egress', () => {
  assert.doesNotThrow(() =>
    validator.validate(
      {components: false, browser: true, conceptImages: false},
      {WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED: 'true'},
    ),
  )
})
