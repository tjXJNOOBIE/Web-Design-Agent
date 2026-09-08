#!/usr/bin/env node
import {StrandsAgentRuntimeBootstrap} from '@tjxjnoobie/strands-bridge'
import {WebDesignAgentRuntimeConfigBuilder} from '../agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntimeBuilder} from '../agent/runtime/WebDesignAgentRuntimeBuilder.js'
import {WebDesignAgentWorkflowHandler} from '../design/handler/WebDesignAgentWorkflowHandler.js'
import {WebDesignMcpHttpServer} from './http/WebDesignMcpHttpServer.js'
import {WebDesignMcpServerBuilder} from './server/WebDesignMcpServerBuilder.js'
import {WebDesignMcpStdioServer} from './stdio/WebDesignMcpStdioServer.js'
const config=new WebDesignAgentRuntimeConfigBuilder(process.env),workflow=new WebDesignAgentWorkflowHandler(new WebDesignAgentRuntimeBuilder(new StrandsAgentRuntimeBootstrap(),config)),builder=new WebDesignMcpServerBuilder(workflow,config.capabilities(),process.env);if(process.argv.includes('--stdio'))await new WebDesignMcpStdioServer(builder).start();else{const server=new WebDesignMcpHttpServer(builder,process.env['WEB_DESIGN_AGENT_HOST']??'0.0.0.0',Number(process.env['WEB_DESIGN_AGENT_PORT']??'3001'));await server.start();const close=async()=>{await server.close();process.exit(0)};process.once('SIGINT',()=>{void close()});process.once('SIGTERM',()=>{void close()})}
