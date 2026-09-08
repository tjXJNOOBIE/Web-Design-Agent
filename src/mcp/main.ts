#!/usr/bin/env node
import {StrandsAgentRuntimeBootstrap} from '@tjxjnoobie/strands-bridge'

import {WebDesignAgentRuntimeConfigBuilder} from '../agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntimeBuilder} from '../agent/runtime/WebDesignAgentRuntimeBuilder.js'
import {WebDesignAgentWorkflowHandler} from '../design/handler/WebDesignAgentWorkflowHandler.js'
import {WebDesignMcpHttpServer} from './http/WebDesignMcpHttpServer.js'
import {WebDesignMcpServerBuilder} from './server/WebDesignMcpServerBuilder.js'
import {WebDesignMcpStdioServer} from './stdio/WebDesignMcpStdioServer.js'

const environment = process.env
const config = new WebDesignAgentRuntimeConfigBuilder(environment)
const workflow = new WebDesignAgentWorkflowHandler(
  new WebDesignAgentRuntimeBuilder(
    new StrandsAgentRuntimeBootstrap(),
    config,
  ),
)
const builder = new WebDesignMcpServerBuilder(
  workflow,
  config.capabilities(),
  environment,
)

if (process.argv.includes('--stdio')) {
  await new WebDesignMcpStdioServer(builder).start()
} else {
  const server = new WebDesignMcpHttpServer(
    builder,
    environment['WEB_DESIGN_AGENT_HOST'] ?? '0.0.0.0',
    Number(environment['WEB_DESIGN_AGENT_PORT'] ?? '3001'),
    {
      maxConcurrentRequests: Number(
        environment['WEB_DESIGN_AGENT_MAX_CONCURRENT_REQUESTS'] ?? '4',
      ),
      maxRequestBodyBytes: Number(
        environment['WEB_DESIGN_AGENT_MAX_REQUEST_BODY_BYTES'] ?? '1048576',
      ),
      requestReceiveTimeoutMs: Number(
        environment['WEB_DESIGN_AGENT_REQUEST_RECEIVE_TIMEOUT_MS'] ?? '30000',
      ),
      headersTimeoutMs: Number(
        environment['WEB_DESIGN_AGENT_HEADERS_TIMEOUT_MS'] ?? '15000',
      ),
    },
  )

  await server.start()

  const close = async (): Promise<void> => {
    try {
      await server.close()
    } catch (error) {
      process.exitCode = 1
      console.error(
        'Web Design Agent HTTP shutdown failed:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  process.once('SIGINT', () => {
    void close()
  })
  process.once('SIGTERM', () => {
    void close()
  })
}
