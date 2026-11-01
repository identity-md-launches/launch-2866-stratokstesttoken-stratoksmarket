// Optional local-only asynchronous adviser. World ticks never await inference.
import {actionSignature} from './cognition-rules.js';
const needs=c=>Object.fromEntries(['hunger','thirst','energy','warmth','health'].map(k=>[k,Math.round(c[k])]));
export function captureRequest(world,c,obs,cands) {
  const sorted=[...cands].sort((a,b)=>b.u-a.u), unique=[]; const signatures=new Set(),primitives=new Set();
  // Include the best option, then alternative primitives, then fill remaining slots.
  for(const diverse of [true,false]) for(const q of sorted){
    const s=q.seq.steps[0],sig=actionSignature(s);
    if(unique.length>=6||signatures.has(sig)||(diverse&&primitives.has(s.prim)))continue;
    signatures.add(sig);primitives.add(s.prim);
    unique.push({id:`${s.prim}_${unique.length}`,key:s.key,signature:sig,step:structuredClone(s),score:Math.round(q.u*100)/100});
  }
  return {resident:c.id,tick:world.tick,position:{x:c.x,y:c.y},needs:needs(c),options:unique,
    context:{needs:needs(c),inventory:{...c.inventory},environment:{...obs.ambient},goal:c.mind.goals?.find(g=>g.status==='active')?.kind??null,
      seen:{foodNodes:obs.nodes.filter(n=>['bush','cactus','fish','shellfish','lichen'].includes(n.kind)&&n.units>0).length,water:!!obs.water,fires:obs.fires.length,neighbors:obs.creatures.length},
      experiences:c.mind.episodes.slice(-2).map(e=>({action:e.key,success:e.success,reward:Math.round(e.reward*100)/100})),
      options:unique.map(q=>({id:q.id,action:q.key,score:q.score}))}};
}
export function parseReply(content,request){
  if(typeof content!=='string'||content.length>2048)throw Error('invalid-response');
  const v=JSON.parse(content);
  if(!v||Object.keys(v).some(k=>!['choice','reason'].includes(k))||typeof v.reason!=='string'||v.reason.length>400)throw Error('invalid-response');
  const option=request.options.find(q=>q.id===v.choice);if(!option)throw Error('unknown-choice');
  return {option,reason:v.reason.replace(/[\u0000-\u001f]/g,' ').slice(0,160)};
}
export function startCognition(world,{url,model='qwen3:1.7b',intervalMs=60000,timeoutMs=45000,pilotCount=3,fetchImpl=fetch,now=Date.now,autoStart=true}={}) {
  const endpoint=new URL(url);
  if(!['http:','https:'].includes(endpoint.protocol)||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw Error('invalid local model endpoint');
  const limit=Math.max(1,Math.min(3,pilotCount)),pilots=[];
  const queue=new Map(),asked=new Map(); let running=false,stopped=false,nextAt=0,controller;
  function refreshPilots(){
    for(let i=pilots.length-1;i>=0;i--)if(!world.getCreature(pilots[i])){queue.delete(pilots[i]);asked.delete(pilots[i]);pilots.splice(i,1);}
    if(pilots.length<limit)for(const c of world.creatures.slice().sort((a,b)=>a.id-b.id)){
      if(pilots.length>=limit)break;
      if(world.isAdult(c)&&!pilots.includes(c.id))pilots.push(c.id);
    }
  }
  refreshPilots();
  const stats={requested:0,accepted:0,rejected:0,failed:0,lastLatencyMs:null,lastError:null};
  const offer=(c,obs,cands)=>{
    if(stopped||world.mode!=='full'||!pilots.includes(c.id)||!cands.length)return;
    if(c.hunger>80||c.thirst>80||c.health<30||obs.fires.some(f=>Math.max(Math.abs(f.x-c.x),Math.abs(f.y-c.y))<=1))return;
    if(c.mind.localModel?.pending?.status==='pending'&&world.tick<=c.mind.localModel.pending.expiresTick)return;
    queue.set(c.id,captureRequest(world,c,obs,cands));
  };
  world.onCognitionCandidates=offer;world.localModelEnabled=true;
  async function runOnce(){
    if(stopped)return false;refreshPilots();
    if(running||now()<nextAt||world.mode!=='full')return false;
    const requests=[...queue.values()].sort((a,b)=>(asked.get(a.resident)??0)-(asked.get(b.resident)??0)||a.resident-b.resident);
    const req=requests.find(r=>world.getCreature(r.resident)&&world.tick-r.tick<=30);
    for(const r of requests)if(world.tick-r.tick>30||!world.getCreature(r.resident))queue.delete(r.resident);
    if(!req)return false;
    queue.delete(req.resident);running=true;nextAt=now()+Math.max(1000,intervalMs);asked.set(req.resident,now());stats.requested++;
    controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs),started=now();
    try{
      const response=await fetchImpl(new URL('/api/chat',endpoint),{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({model,stream:false,think:false,keep_alive:'5m',
        messages:[{role:'system',content:'Advise one simulated creature using ONLY its supplied observations, inventory and experiences. Higher hunger/thirst means greater need; lower warmth/health/energy means greater need. Choose exactly one offered id. Scores are the existing learned planner preferences, not facts. Return JSON choice and a brief reason (12 words). Do not invent events or capabilities. /no_think'},{role:'user',content:JSON.stringify(req.context)}],
        format:{type:'object',properties:{choice:{type:'string',enum:req.options.map(q=>q.id)},reason:{type:'string'}},required:['choice','reason'],additionalProperties:false},
        options:{num_ctx:1536,num_predict:64,num_thread:1,temperature:0,seed:req.resident}})});
      if(!response.ok)throw Error('model-http-'+response.status);
      // Read a bounded response, including servers that omit Content-Length.
      const reader=response.body.getReader();let body='',bytes=0;const decoder=new TextDecoder();
      while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>16384){await reader.cancel();throw Error('response-too-large');}body+=decoder.decode(r.value,{stream:true});}body+=decoder.decode();
      const envelope=JSON.parse(body);if(envelope.done!==true||envelope.done_reason==='length')throw Error('incomplete-response');
      const {option,reason}=parseReply(envelope.message?.content,req),c=world.getCreature(req.resident);
      if(stopped||!c||world.tick-req.tick>120){stats.rejected++;return false;}
      c.mind.localModel??={v:1,history:[],pending:null};
      c.mind.localModel.pending={status:'pending',model,requestedTick:req.tick,receivedTick:world.tick,expiresTick:world.tick+120,position:req.position,needs:req.needs,signature:option.signature,key:option.key,reason};
      stats.accepted++;stats.lastError=null;return true;
    }catch(e){stats.failed++;stats.lastError=controller.signal.aborted?'timeout-or-stop':String(e.message).slice(0,80);return false;}
    finally{clearTimeout(timer);stats.lastLatencyMs=now()-started;running=false;controller=null;}
  }
  const timer=autoStart?setInterval(()=>{void runOnce();},1000):null;timer?.unref();
  return {offer,runOnce,status:()=>({enabled:!stopped,mode:'bounded-adviser-pilot',model,pilots,intervalMs,queued:queue.size,running,...stats,
      residents:pilots.map(id=>{const c=world.getCreature(id),m=c?.mind.localModel;return{id,name:c?.name??null,pending:!!m?.pending,selectedInRecentHistory:(m?.history??[]).filter(e=>e.status==='selected').length,history:m?.history??[]};})}),
    stop(){stopped=true;if(timer)clearInterval(timer);controller?.abort();queue.clear();world.onCognitionCandidates=null;world.localModelEnabled=false;}};
}
