#!/usr/bin/env node
import {StrandsAgentRuntimeBootstrap} from '@tjxjnoobie/strands-bridge'

import {WebDesignAgentRuntimeConfigBuilder} from '../agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntimeBuilder} from '../agent/runtime/WebDesignAgentRuntimeBuilder.js'
import {WebDesignAgentWorkflowHandler} from '../design/handler/WebDesignAgentWorkflowHandler.js'
import {WebDesignAgentPreviewRuntime} from '../design/preview/WebDesignAgentPreviewRuntime.js'
import {WebDesignMcpHttpServer} from './http/WebDesignMcpHttpServer.js'
import {WebDesignMcpPublicDeploymentValidator} from './http/WebDesignMcpPublicDeploymentValidator.js'
import {WebDesignMcpServerBuilder} from './server/WebDesignMcpServerBuilder.js'
import {WebDesignMcpStdioServer} from './stdio/WebDesignMcpStdioServer.js'

const environment = process.env
const config = new WebDesignAgentRuntimeConfigBuilder(environment)
const bootstrap = new StrandsAgentRuntimeBootstrap()

if (process.argv.includes('--stdio')) {
  const runtimeBuilder = new WebDesignAgentRuntimeBuilder(bootstrap, config)
  const workflow = new WebDesignAgentWorkflowHandler(runtimeBuilder)
  const builder = new WebDesignMcpServerBuilder(
    workflow,
    runtimeBuilder.capabilities(),
    environment,
  )

  await new WebDesignMcpStdioServer(builder).start()
} else {
  const configuredCapabilities = config.capabilities()
  new WebDesignMcpPublicDeploymentValidator().validate(
    configuredCapabilities,
    environment,
  )

  const maxConcurrentRequests = Number(
    environment['WEB_DESIGN_AGENT_MAX_CONCURRENT_REQUESTS'] ?? '4',
  )
  const previewRuntime = configuredCapabilities.browser
    ? new WebDesignAgentPreviewRuntime(maxConcurrentRequests)
    : undefined
  const previewBaseUrl = configuredCapabilities.browser
    ? environment['WEB_DESIGN_AGENT_PUBLIC_BASE_URL']?.trim()
    : undefined
  const runtimeBuilder = new WebDesignAgentRuntimeBuilder(
    bootstrap,
    config,
    previewRuntime,
    previewBaseUrl,
  )
  const workflow = new WebDesignAgentWorkflowHandler(runtimeBuilder)
  const builder = new WebDesignMcpServerBuilder(
    workflow,
    runtimeBuilder.capabilities(),
    environment,
  )

  const server = new WebDesignMcpHttpServer(
    builder,
    environment['WEB_DESIGN_AGENT_HOST'] ?? '0.0.0.0',
    Number(environment['WEB_DESIGN_AGENT_PORT'] ?? '3001'),
    {
      maxConcurrentRequests,
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
    previewRuntime,
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
