import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone,parseCommand,seedData,createTicket,getTicketForTenant,transitionTicket,stats} from '../lib/core.mjs';
test('Nigerian phone number normalization',()=>{
  assert.equal(normalizePhone('0801 000 0001'),'+2348010000001');
  assert.equal(normalizePhone('2348010000001'),'+2348010000001');
  assert.equal(normalizePhone('+2348010000001'),'+2348010000001');
  assert.equal(normalizePhone('fish'),null);
});
test('SMS command parser accepts repair reports and status checks',()=>{
  assert.deepEqual(parseCommand('FIX KAD101 roof leaking'),{kind:'fix',code:'KAD101',detail:'roof leaking'});
  assert.deepEqual(parseCommand('GIDA FIX kad101 broken water pump'),{kind:'fix',code:'KAD101',detail:'broken water pump'});
  assert.deepEqual(parseCommand('STATUS GF-0002'),{kind:'status',id:'GF-0002'});
  assert.equal(parseCommand('hello').kind,'invalid');
});
test('only registered unit phone may report and view its ticket',()=>{
  const data=seedData(false);
  data.units.push({code:'A100',tenantName:'Test Tenant',tenantPhone:'+2348010000001',managerName:'Test Manager',managerPhone:'+2348010000002'});
  assert.equal(createTicket(data,'+2348010000003','A100','Leaking roof').error,'UNREGISTERED');
  const report=createTicket(data,'+2348010000001','A100','Leaking roof');
  assert.equal(report.ticket.id,'GF-0001');
  assert.equal(stats(data).open,1);
  assert.equal(getTicketForTenant(data,'+2348010000003','GF-0001'),null);
  assert.equal(getTicketForTenant(data,'+2348010000001','GF-0001')?.status,'open');
  const updated=transitionTicket(data,'GF-0001','resolved');
  assert.equal(updated.ticket.status,'resolved');
  assert.equal(stats(data).resolved,1);
  assert.equal(updated.ticket.history.length,2);
});
test('mock SMS intentionally never touches the network',async()=>{
  const {createSmsSender}=await import('../lib/sms.mjs');
  const result=await createSmsSender({AT_MODE:'mock'})('+2348010000001','Test SMS');
  assert.equal(result.state,'simulated');
});
test('Africa’s Talking sandbox SMS uses documented form and API key header',async()=>{
  const {createSmsSender}=await import('../lib/sms.mjs');
  const previous=globalThis.fetch;
  let captured;
  globalThis.fetch=async(url,options)=>{
    captured={url,options};
    return {ok:true,text:async()=>JSON.stringify({SMSMessageData:{Recipients:[{number:'+2348010000001',statusCode:101,status:'Sent',messageId:'test-id'}]}})};
  };
  try{
    const send=createSmsSender({AT_MODE:'sandbox',AT_USERNAME:'sandbox',AT_API_KEY:'test-key'});
    const result=await send('+2348010000001','Unit repair update');
    assert.equal(result.state,'accepted_by_provider');
    assert.equal(captured.url,'https://api.sandbox.africastalking.com/version1/messaging');
    assert.equal(captured.options.headers.apiKey,'test-key');
    assert.equal(captured.options.body.get('username'),'sandbox');
    assert.equal(captured.options.body.get('message'),'Unit repair update');
  } finally {globalThis.fetch=previous}
});
