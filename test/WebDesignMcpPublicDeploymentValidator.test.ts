import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignMcpPublicDeploymentValidator} from '../src/mcp/http/WebDesignMcpPublicDeploymentValidator.js'

const validator = new WebDesignMcpPublicDeploymentValidator()
const BROWSER_CAPABILITIES = {
  components: false,
  browser: true,
  conceptImages: false,
}

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
    () => validator.validate(BROWSER_CAPABILITIES, {}),
    /refusing to expose browser capability.*egress.*isolated/i,
  )
})

test('refuses browser deployment without a public preview base origin', () => {
  assert.throws(
    () =>
      validator.validate(BROWSER_CAPABILITIES, {
        WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED: 'true',
      }),
    /requires WEB_DESIGN_AGENT_PUBLIC_BASE_URL/i,
  )
})

test('refuses insecure or non-origin public preview URLs', () => {
  for (const publicBaseUrl of [
    'http://design.example/',
    'https://user:pass@design.example/',
    'https://design.example/path',
    'https://design.example/?query=1',
    'https://design.example/#fragment',
  ]) {
    assert.throws(
      () =>
        validator.validate(BROWSER_CAPABILITIES, {
          WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED: 'true',
          WEB_DESIGN_AGENT_PUBLIC_BASE_URL: publicBaseUrl,
        }),
      /PUBLIC_BASE_URL/i,
    )
  }
})

test('allows browser deployment with isolated egress and canonical HTTPS origin', () => {
  assert.doesNotThrow(() =>
    validator.validate(BROWSER_CAPABILITIES, {
      WEB_DESIGN_AGENT_PUBLIC_BROWSER_EGRESS_ISOLATED: 'true',
      WEB_DESIGN_AGENT_PUBLIC_BASE_URL: 'https://design.example/',
    }),
  )
})
