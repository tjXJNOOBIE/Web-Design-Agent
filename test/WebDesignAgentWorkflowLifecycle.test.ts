import assert from 'node:assert/strict'
import test from 'node:test'

import {WebDesignAgentWorkflowHandler} from '../src/design/handler/WebDesignAgentWorkflowHandler.js'
import {generation} from './fixture/DesignFixture.js'

function workflowWithFailures(options: {
  readonly operationError?: Error
  readonly cleanupError?: Error
}): WebDesignAgentWorkflowHandler {
  const runtimeBuilder: any = {
    build: async () => ({
      generate: async () => {
        if (options.operationError !== undefined) {
          throw options.operationError
        }

        return generation()
      },
      refine: async () => {
        throw new Error('refine is not used by this test')
      },
      createConcepts: async () => {
        throw new Error('createConcepts is not used by this test')
      },
      close: async () => {
        if (options.cleanupError !== undefined) {
          throw options.cleanupError
        }
      },
    }),
  }

  return new WebDesignAgentWorkflowHandler(runtimeBuilder)
}

test('workflow preserves an operation failure when cleanup succeeds', async () => {
  const operationError = new Error('generation failed')
  const workflow = workflowWithFailures({operationError})

  await assert.rejects(
    () => workflow.generate({prompt: 'site'}),
    (error) => error === operationError,
  )
})

test('workflow reports cleanup failure after a successful operation', async () => {
  const cleanupError = new Error('cleanup failed')
  const workflow = workflowWithFailures({cleanupError})

  await assert.rejects(
    () => workflow.generate({prompt: 'site'}),
    (error) => error === cleanupError,
  )
})

test('workflow aggregates cleanup failure without replacing the operation failure', async () => {
  const operationError = new Error('generation failed')
  const cleanupError = new Error('cleanup failed')
  const workflow = workflowWithFailures({operationError, cleanupError})

  await assert.rejects(
    () => workflow.generate({prompt: 'site'}),
    (error) => {
      assert.ok(error instanceof AggregateError)
      assert.equal(error.cause, operationError)
      assert.deepEqual(error.errors, [operationError, cleanupError])
      assert.match(error.message, /operation and runtime cleanup both failed/i)
      return true
    },
  )
})

test('workflow rejects an already-cancelled request before runtime construction', async () => {
  let buildCalls = 0
  const runtimeBuilder: any = {
    build: async () => {
      buildCalls += 1
      throw new Error('runtime must not be constructed')
    },
  }
  const workflow = new WebDesignAgentWorkflowHandler(runtimeBuilder)
  const controller = new AbortController()
  controller.abort()

  await assert.rejects(
    () => workflow.generate({prompt: 'site'}, controller.signal),
    /cancelled before runtime construction/i,
  )
  assert.equal(buildCalls, 0)
})
