import test from 'node:test';
import assert from 'node:assert/strict';
import {Expanse,expectedHoldings} from '../server/src/expanse/engine.js';
import {startCognition,parseReply} from '../server/src/expanse/cognition.js';
import {actionSignature,usableAdvice,finishAdvice,LLM_BONUS} from '../server/src/expanse/cognition-rules.js';
const create=()=>Expanse.create({initialCount:4},{seed:7});
const response=choice=>new Response(JSON.stringify({done:true,message:{content:JSON.stringify({choice,reason:'Try an available action.'})}}),{headers:{'Content-Type':'application/json'}});
function offer(w,svc){const c=w.creatures[0];c.age=10000;c.hunger=20;c.thirst=20;c.health=100;w.decide(c);return c;}
// Mode off has no service calls, no extra persisted fields and identical seeded evolution.
test('disabled cognition preserves deterministic evolution and exact restart',()=>{
 const w=create(),b=Expanse.fromState(w.toState());w.run(60);b.run(60);assert.deepEqual(w.toState(),b.toState());
 assert.ok(w.creatures.every(c=>!c.mind.localModel));
 const restored=Expanse.fromState(w.toState());w.run(5);restored.run(5);assert.deepEqual(w.toState(),restored.toState());
});
test('model sees only bounded actual decision choices, writes one receipt and cannot invent an action',async()=>{
 const w=create();w.creatures.forEach(c=>c.age=10000);let captured;
 const svc=startCognition(w,{url:'http://localhost:11434',autoStart:false,fetchImpl:async(url,opts)=>{captured=JSON.parse(opts.body);return response(captured.format.properties.choice.enum[0]);}});
 const c=offer(w,svc);assert.ok(await svc.runOnce());
 assert.equal(captured.think,false);assert.ok(captured.format.properties.choice.enum.length<=6);
 const before=structuredClone(c.mind.localModel.pending);
 assert.equal(before.status,'pending');assert.ok(before.signature);assert.ok(!captured.messages[1].content.includes('wallet'));
 w.decide(c);assert.equal(c.mind.localModel.pending,null);assert.equal(c.mind.localModel.history.length,1);
 assert.ok(['selected','considered','unavailable'].includes(c.mind.localModel.history[0].status));
 const restored=Expanse.fromState(w.toState());assert.deepEqual(restored.getCreature(c.id).mind.localModel,c.mind.localModel);
 svc.stop();assert.equal(w.localModelEnabled,false);
});
test('invalid choices, truncated output and oversized response fail without modifying creature memory',async()=>{
 for(const body of [{done:true,message:{content:'{"choice":"invent_a_city","reason":"x"}'}},{done:true,done_reason:'length',message:{content:'{}'}},'x'.repeat(17000)]){
  const w=create();w.creatures.forEach(c=>c.age=10000);
  const svc=startCognition(w,{url:'http://localhost',autoStart:false,fetchImpl:async()=>new Response(typeof body==='string'?body:JSON.stringify(body))});
  const c=offer(w,svc);assert.equal(await svc.runOnce(),false);assert.equal(c.mind.localModel,undefined);assert.equal(svc.status().failed,1);svc.stop();
 }
 assert.throws(()=>parseReply('{"choice":"x","reason":"x","execute":"bad"}',{options:[]}));
});
test('one request at a time, bounded queue and late stopped replies cannot change world',async()=>{
 const w=create();w.creatures.forEach(c=>c.age=10000);let resolve,calls=0;
 const svc=startCognition(w,{url:'http://localhost',autoStart:false,fetchImpl:async(u,o)=>{calls++;const q=JSON.parse(o.body).format.properties.choice.enum[0];await new Promise(r=>resolve=r);return response(q);}});
 for(const c of w.creatures)w.decide(c);assert.ok(svc.status().queued<=3);
 const running=svc.runOnce();assert.equal(await svc.runOnce(),false);assert.equal(calls,1);svc.stop();resolve();await running;
 assert.ok(w.creatures.every(c=>!c.mind.localModel));
});
test('timeouts fall back without blocking world ticks',async()=>{
 const w=create();w.creatures.forEach(c=>c.age=10000);
 const svc=startCognition(w,{url:'http://localhost',autoStart:false,timeoutMs:10,fetchImpl:async(u,{signal})=>new Promise((r,j)=>signal.addEventListener('abort',()=>j(Error('abort'))))});
 offer(w,svc);const tick=w.tick,p=svc.runOnce();w.run(5);assert.equal(w.tick,tick+5);assert.equal(await p,false);assert.equal(svc.status().lastError,'timeout-or-stop');svc.stop();
});
test('advice is bounded, context-sensitive, expires, and is disabled without the runtime switch',()=>{
 const w=create(),c=w.creatures[0],a={status:'pending',receivedTick:0,expiresTick:120,position:{x:c.x,y:c.y},needs:Object.fromEntries(['hunger','thirst','energy','warmth','health'].map(k=>[k,c[k]]))};
 c.mind.localModel={pending:a,history:[]};assert.equal(usableAdvice(c,1,true),a);assert.equal(usableAdvice(c,1,false),null);assert.equal(usableAdvice(c,121,true),null);
 c.hunger+=21;assert.equal(usableAdvice(c,1,true),null);c.hunger-=21;c.x+=4;assert.equal(usableAdvice(c,1,true),null);
 for(let i=0;i<9;i++)finishAdvice(c,{...a},i,true,true);assert.equal(c.mind.localModel.history.length,6);assert.equal(LLM_BONUS,0.5);
});
test('emergency reflex overrides any proposed action and ledger remains exact',()=>{
 const w=create(),c=w.creatures[0];w.localModelEnabled=true;c.inventory={berry:1};w.totals.gathered.berry=(w.totals.gathered.berry??0)+1;c.hunger=99;
 c.mind.localModel={history:[],pending:{status:'pending',receivedTick:0,expiresTick:120,position:{x:c.x,y:c.y},needs:Object.fromEntries(['hunger','thirst','energy','warmth','health'].map(k=>[k,c[k]])),signature:actionSignature({prim:'rest'}),key:'rest'}};
 w.decide(c);assert.equal(c.plan.source,'reflex');assert.equal(c.mind.localModel.history.length,0);
 w.run(20);const h=w.holdings(),x=expectedHoldings(w.totals);for(const k of new Set([...Object.keys(h),...Object.keys(x)]))assert.equal(h[k]??0,x[k]??0,k);
});
test('bad model configuration cannot prevent the world service starting',async()=>{
 const {startExpanse}=await import('../server/src/expanse/server.js');
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stratoks-cognition-'));
 const svc=startExpanse({dataDir:dir,seed:7,initialCount:2,port:0,tickMs:10,cognition:{url:'not a URL'}});
 try{
  await new Promise(r=>svc.server.listening?r():svc.server.once('listening',r));
  const base='http://127.0.0.1:'+svc.server.address().port;
  assert.deepEqual(await (await fetch(base+'/api/expanse/cognition')).json(),{enabled:false,unavailable:true});
  assert.equal((await (await fetch(base+'/healthz')).json()).ok,true);
 }finally{await svc.stop();fs.rmSync(dir,{recursive:true,force:true});}
});
test('a natural pilot death frees its queue slot for an existing adult, never creates a resident',async()=>{
 const w=create();w.creatures.forEach(c=>c.age=10000);
 const svc=startCognition(w,{url:'http://localhost',autoStart:false});
 const initial=[...svc.status().pilots],replacement=w.creatures.find(c=>!initial.includes(c.id)).id;
 w.creatures=w.creatures.filter(c=>c.id!==initial[0]);const count=w.creatures.length;
 await svc.runOnce();assert.equal(w.creatures.length,count);assert.equal(svc.status().pilots.length,3);
 assert.ok(svc.status().pilots.includes(replacement));assert.ok(!svc.status().pilots.includes(initial[0]));svc.stop();
});
