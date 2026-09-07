import assert from 'node:assert/strict'
import test from 'node:test'

import { WebDesignAgentRuntimeConfigBuilder } from '../../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import { WebDesignAgentCliHandler } from '../../src/cli/WebDesignAgentCliHandler.js'
import { WebDesignAgentCliInputError } from '../../src/cli/error/WebDesignAgentCliInputError.js'
import { FakeStrandsAgentRuntime } from '../fake/FakeStrandsAgentRuntime.js'
import { FakeStrandsAgentRuntimeBootstrap } from '../fake/FakeStrandsAgentRuntimeBootstrap.js'

test('rejectsBlankRequestBeforeCreatingRuntime', async () => {
  const runtime = new FakeStrandsAgentRuntime('unused')
  const bootstrap = new FakeStrandsAgentRuntimeBootstrap(runtime)
  const handler = new WebDesignAgentCliHandler(bootstrap, new WebDesignAgentRuntimeConfigBuilder({}))

  await assert.rejects(handler.handle('   '), WebDesignAgentCliInputError)
  assert.equal(bootstrap.createCalls, 0)
})

test('delegatesNormalizedRequestAndClosesRuntime', async () => {
  const runtime = new FakeStrandsAgentRuntime('complete')
  const bootstrap = new FakeStrandsAgentRuntimeBootstrap(runtime)
  const handler = new WebDesignAgentCliHandler(bootstrap, new WebDesignAgentRuntimeConfigBuilder({}))

  const result = await handler.handle('  do the work  ')

  assert.equal(result, 'complete')
  assert.equal(bootstrap.createCalls, 1)
  assert.equal(runtime.invokeCalls, 1)
  assert.equal(runtime.lastInvokeArgs, 'do the work')
  assert.equal(runtime.closeCalls, 1)
  assert.equal(runtime.isClosed(), true)
})

test('closesRuntimeWhenInvocationFails', async () => {
  const runtime = new FakeStrandsAgentRuntime('unused')
  const invocationError = new Error('model failed')
  runtime.invokeError = invocationError
  const bootstrap = new FakeStrandsAgentRuntimeBootstrap(runtime)
  const handler = new WebDesignAgentCliHandler(bootstrap, new WebDesignAgentRuntimeConfigBuilder({}))

  await assert.rejects(handler.handle('do the work'), invocationError)
  assert.equal(runtime.closeCalls, 1)
})
