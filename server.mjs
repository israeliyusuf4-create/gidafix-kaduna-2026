import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { Store } from './lib/store.mjs';
import { normalizePhone,cleanCode,parseCommand,createTicket,getTicketForTenant,transitionTicket,stats } from './lib/core.mjs';
import { createSmsSender } from './lib/sms.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000);
const demoMode=process.env.DEMO_MODE==='true';
const adminToken=process.env.GIDAFIX_ADMIN_TOKEN||'';
const webhookSecret=process.env.WEBHOOK_SECRET||'';
const atMode=(process.env.AT_MODE||'mock').toLowerCase();
const store = new Store(process.env.DATA_FILE||path.join(root,'data','gidafix.json'),demoMode);
const sendSms=createSmsSender();
if(process.env.NODE_ENV==='production' && !adminToken) console.warn('SECURITY: Set GIDAFIX_ADMIN_TOKEN for production (dashboard APIs disabled).');
if(process.env.NODE_ENV==='production' && !webhookSecret) console.warn('SECURITY: Set WEBHOOK_SECRET for production (webhook disabled).');
function json(res,status,body) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
function safeEqual(a,b) {const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function authorized(req) {
  if(adminToken) return safeEqual((req.headers.authorization||'').replace(/^Bearer\s+/i,''),adminToken);
  const host=String(req.headers.host||'').split(':')[0];
  return process.env.NODE_ENV!=='production' && ['localhost','127.0.0.1','[::1]'].includes(host);
}
function inboundAuthorized(req,url) {
  if(!webhookSecret) return process.env.NODE_ENV!=='production' && ['localhost','127.0.0.1'].includes(String(req.headers.host||'').split(':')[0]);
  return safeEqual(url.searchParams.get('token')||'', webhookSecret);
}
async function readBody(req) {
  let raw='';
  for await(const chunk of req) {raw+=chunk;if(raw.length>8192) throw Object.assign(new Error('Body too large'),{status:413});}
  if((req.headers['content-type']||'').includes('application/json')) return JSON.parse(raw||'{}');
  return Object.fromEntries(new URLSearchParams(raw));
}
async function deliver(phone,message) {
  const result={id:crypto.randomUUID(),phone,message,at:new Date().toISOString(),state:'pending',channel:atMode};
  try {const response=await sendSms(phone,message);result.state=response.state;result.providerMessageId=response.messageId??null;}
  catch(error) {result.state='failed';result.error=String(error.message).slice(0,160);}
  store.change(data=>{data.messages.unshift(result);data.messages=data.messages.slice(0,300);});
  return result;
}
async function handleTenantSms(body) {
  const phone=normalizePhone(body.from??body.phone);
  const command=parseCommand(body.text??body.message);
  if(!phone) return {ok:false,error:'Invalid sender phone'};
  const providerId=String(body.id||'').trim();
  if(providerId) {
    let already=false;
    store.change(data=>{already=data.receivedIds.includes(providerId);if(!already){data.receivedIds.push(providerId);data.receivedIds=data.receivedIds.slice(-2000);}});
    if(already) return {ok:true,duplicate:true};
  }
  if(command.kind==='help'||command.kind==='invalid') {
    await deliver(phone,'GidaFix: To report, text FIX KAD101 roof leaking. To check, text STATUS GF-0001. Use your registered phone number.');
    return {ok:true,action:'help'};
  }
  if(command.kind==='status') {
    const ticket=getTicketForTenant(store.read(),phone,command.id);
    const message=ticket?`GidaFix: ${ticket.id} (${ticket.code}) is ${ticket.status.replace('_',' ')}. Updated ${new Date(ticket.updatedAt).toLocaleDateString('en-GB')}.`:'GidaFix: Ticket not found for this registered phone number.';
    await deliver(phone,message);
    return {ok:true,action:'status',ticket:ticket?.id??null};
  }
  const {result}=store.change(data=>createTicket(data,phone,command.code,command.detail));
  if(result.error) {
    await deliver(phone,'GidaFix: This phone is not registered for that unit. Contact your landlord to register your number.');
    return {ok:true,action:'rejected',reason:'unregistered'};
  }
  await deliver(phone,`GidaFix: Report ${result.ticket.id} received for ${result.ticket.code}. Manager notified. Reply STATUS ${result.ticket.id} to check progress.`);
  await deliver(result.unit.managerPhone,`GidaFix: New report ${result.ticket.id} (${result.ticket.code}): ${result.ticket.detail.slice(0,85)}. Open your dashboard to respond.`);
  return {ok:true,action:'created',ticket:result.ticket.id};
}
function serveStatic(req,res,pathname) {
  const files={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css','/logo.svg':'logo.svg'};
  const relative=files[pathname];
  if(!relative) return json(res,404,{error:'Not found'});
  const file=relative==='logo.svg'?path.join(root,'assets','logo.svg'):path.join(root,'public',relative);
  const type=relative.endsWith('.html')?'text/html; charset=utf-8':relative.endsWith('.js')?'text/javascript; charset=utf-8':relative.endsWith('.svg')?'image/svg+xml':'text/css; charset=utf-8';
  res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});
  fs.createReadStream(file).pipe(res);
}
const server=http.createServer(async(req,res)=>{
  let url;
  try {
    url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
    const pathname=url.pathname;
    if(req.method==='GET'&&pathname==='/health') return json(res,200,{ok:true,service:'GidaFix'});
    if(req.method==='GET'&&pathname==='/api/config') return json(res,200,{demoMode,atMode,requiresLogin:!!adminToken,webhookConfigured:!!webhookSecret});
    if(req.method==='POST'&&pathname==='/api/at/inbound') {
      if(!inboundAuthorized(req,url)) return json(res,403,{error:'Invalid webhook secret'});
      const body=await readBody(req);
      // Africa's Talking retries unless the webhook returns HTTP 200.
      const result=await handleTenantSms(body);
      return json(res,200,result);
    }
    if(pathname.startsWith('/api/')) {
      if(!authorized(req)) return json(res,401,{error:adminToken?'Invalid dashboard access token':'Configure GIDAFIX_ADMIN_TOKEN before exposing this service'});
      if(req.method==='GET'&&pathname==='/api/state') {const data=store.read();return json(res,200,{...data,stats:stats(data)});}
      if(req.method==='POST'&&pathname==='/api/units') {
        const body=await readBody(req);
        const code=cleanCode(body.code);
        const tenantPhone=normalizePhone(body.tenantPhone), managerPhone=normalizePhone(body.managerPhone);
        const tenantName=String(body.tenantName??'').trim().slice(0,75);
        const managerName=String(body.managerName??'').trim().slice(0,75);
        if(code.length<3||!tenantPhone||!managerPhone||!tenantName||!managerName) return json(res,400,{error:'Enter a unit code, names and valid Nigerian/international phone numbers'});
        const {result}=store.change(data=>{if(data.units.some(u=>u.code===code)) return {error:'Unit code already exists'};if(data.units.length>=500) return {error:'Demo unit limit reached'};data.units.push({code,tenantName,tenantPhone,managerName,managerPhone});return {ok:true};});
        return json(res,result.error?400:201,result);
      }
      if(req.method==='POST'&&pathname==='/api/simulate') {
        if(!demoMode) return json(res,403,{error:'Simulator is disabled. Set DEMO_MODE=true for judging.'});
        const body=await readBody(req);
        const result=await handleTenantSms({from:body.from,text:body.text});
        return json(res,result.ok?200:400,result);
      }
      const match=pathname.match(/^\/api\/tickets\/(GF-\d{4,8})\/status$/);
      if(req.method==='POST'&&match) {
        const body=await readBody(req);
        const {result,data}=store.change(data=>transitionTicket(data,match[1],body.status));
        if(result.error) return json(res,result.error==='NOT_FOUND'?404:400,result);
        let notification=null;
        if(result.changed) {
          const unit=data.units.find(u=>u.code===result.ticket.code);
          if(unit) notification=await deliver(unit.tenantPhone,`GidaFix update: ${result.ticket.id} is now ${result.ticket.status.replace('_',' ')}. Reply STATUS ${result.ticket.id} to check.`);
        }
        return json(res,200,{...result,notification});
      }
      return json(res,404,{error:'API route not found'});
    }
    if(req.method==='GET') return serveStatic(req,res,pathname);
    return json(res,405,{error:'Method not allowed'});
  } catch(error) {
    console.error('Request error:',String(error.message));
    return json(res,error.status||400,{error:error.status?'Body too large':'Request could not be processed'});
  }
});
server.listen(port,'0.0.0.0',()=>console.log(`GidaFix ready at http://localhost:${port} • SMS ${atMode} • demo ${demoMode}`));
export {server};
