#!/usr/bin/env node
import {readFileSync} from 'node:fs'
import {StrandsAgentRuntimeBootstrap} from '@tjxjnoobie/strands-bridge'
import {WebDesignAgentRuntimeConfigBuilder} from '../agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntimeBuilder} from '../agent/runtime/WebDesignAgentRuntimeBuilder.js'
import {WebDesignAgentWorkflowHandler} from '../design/handler/WebDesignAgentWorkflowHandler.js'
import type {DesignGenerationRequest} from '../design/data/DesignGenerationRequest.js'
import {WebDesignAgentCliHandler} from './WebDesignAgentCliHandler.js'
function input(args:string[]):DesignGenerationRequest{const index=args.indexOf('--reference');if(index>=0){const referenceImageUrl=args[index+1],prompt=args.filter((_,i)=>i!==index&&i!==index+1).join(' ').trim();return{prompt,sourceMode:'reference-image',...(referenceImageUrl?{referenceImageUrl}:{})}}if(args.includes('--concept-first'))throw new Error('Concept-first is interactive. Use the MCP surface and create-design-concepts.');return{prompt:args.join(' ').trim()||(process.stdin.isTTY?'':readFileSync(0,'utf8').trim())}}
async function main():Promise<void>{const config=new WebDesignAgentRuntimeConfigBuilder(process.env),workflow=new WebDesignAgentWorkflowHandler(new WebDesignAgentRuntimeBuilder(new StrandsAgentRuntimeBootstrap(),config));process.stdout.write(`${await new WebDesignAgentCliHandler(workflow).handle(input(process.argv.slice(2)))}\n`)}main().catch((error:unknown)=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1})
