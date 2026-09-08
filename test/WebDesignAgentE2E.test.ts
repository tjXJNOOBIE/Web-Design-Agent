import test from 'node:test'
import assert from 'node:assert/strict'
import {WebDesignAgentRuntimeConfigBuilder} from '../src/agent/config/WebDesignAgentRuntimeConfigBuilder.js'
import {WebDesignAgentRuntime} from '../src/agent/runtime/WebDesignAgentRuntime.js'
import {WebDesignAgentRuntimeBuilder} from '../src/agent/runtime/WebDesignAgentRuntimeBuilder.js'
import {DesignExportBuilder} from '../src/design/export/DesignExportBuilder.js'
import {WebDesignAgentWorkflowHandler} from '../src/design/handler/WebDesignAgentWorkflowHandler.js'
import {DesignDistanceEvaluator} from '../src/design/validation/DesignDistanceEvaluator.js'
import {DesignGenerationResultParser} from '../src/design/validation/DesignGenerationResultParser.js'
import {OneShotDesignEvaluationHandler} from '../src/evaluation/handler/OneShotDesignEvaluationHandler.js'
import {PreviewDocumentBuilder} from '../src/mcp-app/PreviewDocumentBuilder.js'
import {candidate,generation} from './fixture/DesignFixture.js'
import {FakeBootstrap,FakeRuntime} from './fake/FakeStrands.js'
const json=()=>JSON.stringify(generation())
test('runtime config reports optional capabilities',()=>{assert.deepEqual(new WebDesignAgentRuntimeConfigBuilder({API_KEY_21ST:'x',WEB_DESIGN_AGENT_BROWSER_MCP_URL:'https://browser',WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD:'yes'}).capabilities(),{components:true,browser:true,conceptImages:true})})
test('runtime downgrades browser validation without browser',async()=>{const r=new FakeRuntime(json()),runtime=new WebDesignAgentRuntime(r,[r],{components:false,browser:false,conceptImages:false}),result=await runtime.generate({prompt:'site'});assert.equal(result.validation.browserValidated,false);assert.match(result.validation.notes.at(-1)??'',/Browser validation not executed/)})
test('runtime refinement carries visual state',async()=>{const r=new FakeRuntime(JSON.stringify(candidate('B',1))),runtime=new WebDesignAgentRuntime(r,[r],{components:false,browser:false,conceptImages:false}),state={...candidate('B',1).visualState,radius:4};await runtime.refine({candidate:candidate('B',1),visualState:state,feedback:'sharper'});assert.match(r.invokes[0]??'',/"radius":4/)})
test('runtime enforces requested multi-page routes',async()=>{const r=new FakeRuntime(json()),runtime=new WebDesignAgentRuntime(r,[r],{components:false,browser:false,conceptImages:false});await assert.rejects(()=>runtime.generate({prompt:'site',pages:['/pricing']}),/missing requested page routes/)})
test('runtime refuses existing-site without browser',async()=>{const r=new FakeRuntime(json()),runtime=new WebDesignAgentRuntime(r,[r],{components:false,browser:false,conceptImages:false});await assert.rejects(()=>runtime.generate({prompt:'redesign',sourceMode:'existing-site',targetUrl:'https://x'}),/requires configured browser/)})
test('runtime builder creates specialists before director and reverses close',async()=>{const b=new FakeBootstrap(),runtime=await new WebDesignAgentRuntimeBuilder(b,new WebDesignAgentRuntimeConfigBuilder({})).build();assert.deepEqual(b.configs.map(c=>c.agent.id),['web-design-agent-candidate-a','web-design-agent-candidate-b','web-design-agent-candidate-c','web-design-agent-critic','web-design-agent-director']);await runtime.close();assert.ok(b.runtimes.every(r=>r.closeCalls===1))})
test('runtime builder adds optional concept specialist',async()=>{const b=new FakeBootstrap();await new WebDesignAgentRuntimeBuilder(b,new WebDesignAgentRuntimeConfigBuilder({WEB_DESIGN_AGENT_ENABLE_HIGGSFIELD:'true'})).build();assert.ok(b.configs.some(c=>c.agent.id==='web-design-agent-concept'))})
test('export builder applies visual state and escapes closing scripts',()=>{const base=candidate('A',0),c={...base,document:{...base.document,javascript:'x="</script>"'}},out=new DesignExportBuilder().build(c,{...c.visualState,radius:5});assert.match(out.standaloneHtml,/--wda-radius:5px/);assert.ok(!out.standaloneHtml.includes('x="</script>"'))})
test('workflow closes runtime after success',async()=>{let closed=0;const rb:any={build:async()=>({generate:async()=>generation(),refine:async()=>candidate('A',0),createConcepts:async()=>({prompt:'x',concepts:[]}),close:async()=>{closed++}})};await new WebDesignAgentWorkflowHandler(rb).generate({prompt:'x'});assert.equal(closed,1)})
test('distance evaluator accepts structurally distinct candidates',()=>assert.equal(new DesignDistanceEvaluator().evaluate(generation().candidates).passed,true))
test('distance evaluator rejects cosmetic variants',()=>{const a=candidate('A',0),b={...a,id:'B' as const},c={...a,id:'C' as const};assert.equal(new DesignDistanceEvaluator().evaluate([a,b,c]).passed,false)})
test('parser accepts JSON wrapped in model prose',()=>assert.equal(new DesignGenerationResultParser().parseGeneration(`result\n${json()}\nend`).candidates.length,3))
test('parser rejects duplicate candidate ids',()=>{const g=generation(),bad={...g,candidates:[g.candidates[0],g.candidates[0],g.candidates[2]]};assert.throws(()=>new DesignGenerationResultParser().parseGeneration(bad),/exactly one candidate/)})
test('evaluation reports only objective metrics',async()=>{const workflow:any={generate:async()=>({...generation(),validation:{...generation().validation,browserValidated:true}})};assert.deepEqual(await new OneShotDesignEvaluationHandler(workflow).evaluate(['x','y']),{prompts:2,successRate:1,validCandidateRate:1,distinctCandidateRate:1,browserValidationRate:1})})
test('evaluation handles empty corpus',async()=>assert.equal((await new OneShotDesignEvaluationHandler({} as any).evaluate([])).prompts,0))
test('candidate contracts carry design system and page exports',()=>{const c=candidate('A',0),out=new DesignExportBuilder().build(c,c.visualState);assert.equal(c.designSystem.components[0],'button');assert.equal(out.pages[0]?.path,'/stats')})
test('preview document builder injects selected page with shared CSS',()=>{const c=candidate('A',0),page=c.pages[0];assert.ok(page);const html=new PreviewDocumentBuilder().build(c,c.visualState,page);assert.match(html,/A stats/);assert.match(html,/main\{display:block\}/)})
