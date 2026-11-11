export function normalizePhone(input) {
  const value = String(input ?? '').trim().replace(/[\s()-]/g, '');
  if (/^0[789][01]\d{8}$/.test(value)) return '+234' + value.slice(1);
  if (/^234[789][01]\d{8}$/.test(value)) return '+' + value;
  if (/^\+[1-9]\d{7,14}$/.test(value)) return value;
  return null;
}
export function cleanCode(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
}
export function parseCommand(text) {
  const raw = String(text ?? '').trim();
  if (!raw || /^HELP$/i.test(raw)) return { kind: 'help' };
  const report = raw.match(/^(?:GIDA\s+)?FIX\s+([A-Za-z0-9-]{2,20})\s+(.{5,300})$/is);
  if (report) return { kind: 'fix', code: cleanCode(report[1]), detail: report[2].trim().replace(/\s+/g, ' ') };
  const status = raw.match(/^STATUS\s+(GF-\d{4,8})$/i);
  if (status) return { kind: 'status', id: status[1].toUpperCase() };
  return { kind: 'invalid' };
}
export function makeId(nextId) { return `GF-${String(nextId).padStart(4, '0')}`; }
export const STATUSES = ['open', 'in_progress', 'resolved'];
export function shortDate(iso) { return new Date(iso).toISOString(); }
export function seedData(demo, now = new Date().toISOString()) {
  const units = demo ? [
    { code:'KAD101', tenantName:'Amina (demo)', tenantPhone:'+2348010000001', managerName:'Bello (demo)', managerPhone:'+2348010000011' },
    { code:'KAD102', tenantName:'Sadiq (demo)', tenantPhone:'+2348010000002', managerName:'Bello (demo)', managerPhone:'+2348010000011' },
    { code:'KAD103', tenantName:'Hauwa (demo)', tenantPhone:'+2348010000003', managerName:'Bello (demo)', managerPhone:'+2348010000011' }
  ] : [];
  const when = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
  const tickets = demo ? [
    { id:'GF-0003', code:'KAD103', detail:'Corridor light stopped working', status:'resolved', createdAt:when(40), updatedAt:when(12), history:[{status:'open',at:when(40)},{status:'resolved',at:when(12)}] },
    { id:'GF-0002', code:'KAD102', detail:'Water tap is broken in the kitchen', status:'in_progress', createdAt:when(18), updatedAt:when(5), history:[{status:'open',at:when(18)},{status:'in_progress',at:when(5)}] },
    { id:'GF-0001', code:'KAD101', detail:'Roof leaking after rainfall', status:'open', createdAt:when(3), updatedAt:when(3), history:[{status:'open',at:when(3)}] }
  ] : [];
  return {units, tickets, messages: [], nextId:demo?4:1, receivedIds:[], createdAt:now};
}
export function createTicket(data, phone, code, detail) {
  const unit = data.units.find(u => u.code === code);
  if (!unit || unit.tenantPhone !== phone) return { error:'UNREGISTERED' };
  const now = new Date().toISOString();
  const ticket = {id:makeId(data.nextId++), code, detail, status:'open', createdAt:now, updatedAt:now, history:[{status:'open',at:now}]};
  data.tickets.unshift(ticket);
  return {ticket, unit};
}
export function getTicketForTenant(data, phone, id) {
  const ticket = data.tickets.find(t=>t.id===id);
  if (!ticket) return null;
  const unit = data.units.find(u=>u.code===ticket.code);
  return unit?.tenantPhone === phone ? ticket : null;
}
export function transitionTicket(data, id, status) {
  if (!STATUSES.includes(status)) return {error:'INVALID_STATUS'};
  const ticket = data.tickets.find(t=>t.id===id);
  if (!ticket) return {error:'NOT_FOUND'};
  if (ticket.status === status) return {ticket,changed:false};
  const now = new Date().toISOString();
  ticket.status=status; ticket.updatedAt=now; ticket.history.push({status,at:now});
  return {ticket,changed:true};
}
export function stats(data) {
  return {total:data.tickets.length,open:data.tickets.filter(t=>t.status==='open').length,in_progress:data.tickets.filter(t=>t.status==='in_progress').length,resolved:data.tickets.filter(t=>t.status==='resolved').length,units:data.units.length};
}
