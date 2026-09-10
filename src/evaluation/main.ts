#!/usr/bin/env node
import {StrandsAgentRuntimeBootstrap} from '@tjxjnoobie/strands-bridge'
import {WebDesignAgentRuntimeConfigBuilder} from '../agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntimeBuilder} from '../agent/runtime/WebDesignAgentRuntimeBuilder.js'
import {WebDesignAgentWorkflowHandler} from '../design/handler/WebDesignAgentWorkflowHandler.js'
import {ONE_SHOT_DESIGN_PROMPT_CORPUS} from './data/OneShotDesignPromptCorpus.js'
import {OneShotDesignEvaluationHandler} from './handler/OneShotDesignEvaluationHandler.js'
const args=process.argv.slice(2),corpus=args.length?args:ONE_SHOT_DESIGN_PROMPT_CORPUS,workflow=new WebDesignAgentWorkflowHandler(new WebDesignAgentRuntimeBuilder(new StrandsAgentRuntimeBootstrap(),new WebDesignAgentRuntimeConfigBuilder(process.env)));new OneShotDesignEvaluationHandler(workflow).evaluate(corpus).then(result=>process.stdout.write(`${JSON.stringify(result,null,2)}\n`)).catch((error:unknown)=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1})
