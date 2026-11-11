// Africa's Talking documented SMS v1 REST API, intentionally no npm dependencies.
export function createSmsSender(config = process.env) {
  const mode = (config.AT_MODE || 'mock').toLowerCase();
  if(!['mock','sandbox','live'].includes(mode)) throw new Error('AT_MODE must be mock, sandbox, or live');
  return async (phone, message) => {
    if (mode === 'mock') return {mode, state:'simulated', response:'No external SMS sent'};
    if(!config.AT_API_KEY || !config.AT_USERNAME) throw new Error('AT_API_KEY and AT_USERNAME are required for API calls');
    if(mode==='sandbox' && config.AT_USERNAME !== 'sandbox') throw new Error('Sandbox username must be sandbox');
    const url=mode==='live'?'https://api.africastalking.com/version1/messaging':'https://api.sandbox.africastalking.com/version1/messaging';
    const form = new URLSearchParams({username:config.AT_USERNAME,to:phone,message});
    if(config.AT_SENDER_ID) form.set('from',config.AT_SENDER_ID);
    const reply = await fetch(url,{method:'POST',headers:{'apiKey':config.AT_API_KEY,'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(12000)});
    const raw=await reply.text();
    if(!reply.ok) throw new Error(`Africa's Talking HTTP ${reply.status}: ${raw.slice(0,160)}`);
    let parsed;
    try { parsed=JSON.parse(raw); } catch { throw new Error('Africa\'s Talking returned an invalid response'); }
    const recipients=parsed.SMSMessageData?.Recipients ?? [];
    const target=recipients.find(r=>r.number===phone)??recipients[0];
    if(target && ![100,101,102].includes(Number(target.statusCode))) throw new Error(`SMS rejected by provider: ${target.status||target.statusCode}`);
    // Accepted by API is NOT the same as delivered to handset.
    return {mode,state:'accepted_by_provider',response:target?.status ?? 'API accepted',messageId:target?.messageId??null};
  };
}
