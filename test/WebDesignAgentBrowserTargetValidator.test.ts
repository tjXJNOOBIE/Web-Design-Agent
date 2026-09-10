import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentBrowserTargetValidator} from '../src/design/validation/WebDesignAgentBrowserTargetValidator.js'

const PUBLIC_IPV4 = '93.184.216.34'

function validator(addresses: readonly string[] = [PUBLIC_IPV4]) {
  return new WebDesignAgentBrowserTargetValidator(async () => addresses)
}

test('accepts a normal public https target and normalizes its hash away', async () => {
  assert.equal(
    await validator().validate('https://example.com/path#section', 'targetUrl'),
    'https://example.com/path',
  )
})

test('rejects non-http browser schemes and URL credentials', async () => {
  await assert.rejects(
    () => validator().validate('file:///etc/passwd', 'targetUrl'),
    /must use http or https/i,
  )
  await assert.rejects(
    () => validator().validate('https://user:pass@example.com/', 'targetUrl'),
    /must not contain URL credentials/i,
  )
})

test('rejects loopback, metadata, private, and internal-name targets', async () => {
  await assert.rejects(
    () => validator().validate('http://127.0.0.1/', 'targetUrl'),
    /private, loopback, link-local, metadata, reserved, or multicast/i,
  )
  await assert.rejects(
    () => validator().validate('http://169.254.169.254/latest/meta-data/', 'targetUrl'),
    /private, loopback, link-local, metadata, reserved, or multicast/i,
  )
  await assert.rejects(
    () => validator().validate('http://10.0.0.8/', 'targetUrl'),
    /private, loopback, link-local, metadata, reserved, or multicast/i,
  )
  await assert.rejects(
    () => validator().validate('https://metadata.google.internal/', 'targetUrl'),
    /public internet host/i,
  )
  await assert.rejects(
    () => validator().validate('https://service.internal/', 'targetUrl'),
    /public internet host/i,
  )
})

test('rejects DNS answers when any resolved address is not public', async () => {
  await assert.rejects(
    () => validator(['93.184.216.34', '10.0.0.5']).validate(
      'https://mixed.example/',
      'targetUrl',
    ),
    /private, loopback, link-local, metadata, reserved, or multicast/i,
  )
})

test('rejects nonstandard ports by default for the public browser surface', async () => {
  await assert.rejects(
    () => validator().validate('https://example.com:8443/', 'targetUrl'),
    /browser port.*not allowed/i,
  )
})

test('allows an explicitly injected public port policy', async () => {
  const custom = new WebDesignAgentBrowserTargetValidator(
    async () => [PUBLIC_IPV4],
    new Set([443, 8443]),
  )

  assert.equal(
    await custom.validate('https://example.com:8443/', 'targetUrl'),
    'https://example.com:8443/',
  )
})
