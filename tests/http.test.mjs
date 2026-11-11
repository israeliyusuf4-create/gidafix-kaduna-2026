import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
const root=path.resolve(import.meta.dirname,'..');
function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port))})})}
async function fetchJson(url,method='GET',body,headers={}){
 const reply=await fetch(url,{method,headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});return {status:reply.status,data:await reply.json()};
}
test('full tenant-SMS → dashboard → manager-update → tenant-notification flow',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gidafix-test-'));const port=await freePort();
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),DEMO_MODE:'true',AT_MODE:'mock',GIDAFIX_ADMIN_TOKEN:'test-admin',WEBHOOK_SECRET:'test-webhook',DATA_FILE:path.join(folder,'db.json')},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
 const base=`http://127.0.0.1:${port}`;
 try{
  let live=false;for(let i=0;i<70;i++){try{const r=await fetch(base+'/health');if(r.ok){live=true;break}}catch{}await new Promise(r=>setTimeout(r,40))};assert.ok(live,`server did not start: ${stderr}`);
  const auth={Authorization:'Bearer test-admin'};
  const unauthorized=await fetchJson(base+'/api/state');assert.equal(unauthorized.status,401);
  const first=await fetchJson(base+'/api/state','GET',null,auth);assert.equal(first.data.units.length,3);
  const denied=await fetchJson(base+'/api/at/inbound','POST',{from:'+2348010000001',text:'FIX KAD101 roof leaking'});assert.equal(denied.status,403);
  const report=await fetchJson(base+'/api/simulate','POST',{from:'08010000001',text:'FIX KAD101 kitchen pipe leaking'},auth);assert.equal(report.status,200);assert.equal(report.data.action,'created');
  const after=await fetchJson(base+'/api/state','GET',null,auth);assert.equal(after.data.tickets.length,4);assert.equal(after.data.messages.length,2);assert.ok(after.data.messages.every(m=>m.state==='simulated'));
  const id=report.data.ticket;
  const update=await fetchJson(base+`/api/tickets/${id}/status`,'POST',{status:'resolved'},auth);assert.equal(update.status,200);assert.equal(update.data.notification.state,'simulated');
  const status=await fetchJson(base+'/api/at/inbound?token=test-webhook','POST',{from:'+2348010000001',text:`STATUS ${id}`,id:'provider-m1'});assert.equal(status.status,200);assert.equal(status.data.action,'status');
  const duplicate=await fetchJson(base+'/api/at/inbound?token=test-webhook','POST',{from:'+2348010000001',text:`STATUS ${id}`,id:'provider-m1'});assert.equal(duplicate.data.duplicate,true);
  const final=await fetchJson(base+'/api/state','GET',null,auth);assert.equal(final.data.tickets[0].status,'resolved');assert.equal(final.data.messages.length,4);
  const add=await fetchJson(base+'/api/units','POST',{code:'KAD104',tenantName:'Test Tenant',tenantPhone:'08010000004',managerName:'Manager',managerPhone:'08010000011'},auth);assert.equal(add.status,201);
 } finally {child.kill();fs.rmSync(folder,{recursive:true,force:true})}
});
