#!/usr/bin/env node
import {readFileSync} from 'node:fs'

import {StrandsAgentRuntimeBootstrap} from '@tjxjnoobie/strands-bridge'

import {WebDesignAgentRuntimeConfigBuilder} from '../agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntimeBuilder} from '../agent/runtime/WebDesignAgentRuntimeBuilder.js'
import type {DesignGenerationRequest} from '../design/data/DesignGenerationRequest.js'
import {WebDesignAgentWorkflowHandler} from '../design/handler/WebDesignAgentWorkflowHandler.js'
import {WebDesignAgentCliHandler} from './WebDesignAgentCliHandler.js'
import {WebDesignAgentCliInputError} from './error/WebDesignAgentCliInputError.js'

function input(args: string[]): DesignGenerationRequest {
  const referenceIndex = args.indexOf('--reference')
  if (referenceIndex >= 0) {
    const referenceImageUrl = args[referenceIndex + 1]
    if (
      referenceImageUrl === undefined ||
      referenceImageUrl.trim().length === 0 ||
      referenceImageUrl.startsWith('--')
    ) {
      throw new WebDesignAgentCliInputError(
        '--reference requires an HTTP(S) reference image URL.',
      )
    }

    const prompt = args
      .filter((_, index) => index !== referenceIndex && index !== referenceIndex + 1)
      .join(' ')
      .trim()

    return {
      prompt,
      sourceMode: 'reference-image',
      referenceImageUrl,
    }
  }

  if (args.includes('--concept-first')) {
    throw new WebDesignAgentCliInputError(
      'Concept-first is interactive. Use the MCP surface and create-design-concepts.',
    )
  }

  return {
    prompt:
      args.join(' ').trim() ||
      (process.stdin.isTTY ? '' : readFileSync(0, 'utf8').trim()),
  }
}

async function main(): Promise<void> {
  const config = new WebDesignAgentRuntimeConfigBuilder(process.env)
  const workflow = new WebDesignAgentWorkflowHandler(
    new WebDesignAgentRuntimeBuilder(
      new StrandsAgentRuntimeBootstrap(),
      config,
    ),
  )

  process.stdout.write(
    `${await new WebDesignAgentCliHandler(workflow).handle(input(process.argv.slice(2)))}\n`,
  )
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
