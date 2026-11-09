import {env} from 'cloudflare:workers';
import {getCurrentUser} from '../../auth';
import {outboundEvent,sameActivity,validateActivity,type ActivityEntry} from '../../../lib/activity';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const columns='id,contact_id AS contactId,request_id AS requestId,event_type AS eventType,channel,occurred_on AS occurredOn,notes,message,stage_after AS stageAfter,follow_up_on AS followUpOn,created_at AS createdAt';
const stale=()=>json({error:'This contact changed in another session. Copy your notes, close this dialog, and refresh the workspace before retrying.'},409);
export async function GET(request:Request){
  const user=await getCurrentUser();if(!user)return json({error:'Sign in to read your journal.',needsSignIn:true},401);
  const contactId=new URL(request.url).searchParams.get('contactId');if(!contactId||contactId.length>100)return json({error:'Choose a saved contact.'},400);
  try{if(!env.DB)return json({error:'Journal storage is unavailable.'},503);
    if(!await env.DB.prepare('SELECT id FROM leads WHERE id=? AND owner_id=?').bind(contactId,user.userId).first())return json({error:'Contact not found.'},404);
    const result=await env.DB.prepare(`SELECT ${columns} FROM activity_entries WHERE owner_id=? AND contact_id=? ORDER BY occurred_on DESC,created_at DESC,id DESC LIMIT 101`).bind(user.userId,contactId).all();return json({entries:result.results.slice(0,100),hasOlder:result.results.length>100});
  }catch{return json({error:'Could not load the outreach journal. Please retry.'},503);}
}
export async function POST(request:Request){
  const user=await getCurrentUser();if(!user)return json({error:'Sign in to save journal entries.',needsSignIn:true},401);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  try{if(!env.DB)return json({error:'Journal storage is unavailable.'},503);
    const raw=await request.text();if(raw.length>30000)throw new Error('Journal request is too large.');const body=JSON.parse(raw);
    if(body.action==='delete'){
      if(typeof body.id!=='string'||body.id.length>100)throw new Error('Choose a journal entry.');
      const result=await env.DB.prepare('DELETE FROM activity_entries WHERE id=? AND owner_id=?').bind(body.id,user.userId).run();return result.meta.changes?json({ok:true}):json({error:'Entry not found.'},404);
    }
    if(body.action!=='create')throw new Error('Invalid action.');const r=validateActivity(body.entry);
    const contact=await env.DB.prepare('SELECT id,stage,updated_at AS updatedAt FROM leads WHERE id=? AND owner_id=?').bind(r.contactId,user.userId).first<{id:string;stage:string;updatedAt:string}>();if(!contact)return json({error:'Contact not found.'},404);
    const findRequest=()=>env.DB!.prepare(`SELECT ${columns} FROM activity_entries WHERE owner_id=? AND request_id=?`).bind(user.userId,r.requestId).first<ActivityEntry>();
    const prior=await findRequest();if(prior)return sameActivity(prior,r)?json({entry:prior,replayed:true}):json({error:'This request was already saved with different details. Close the dialog and open a new entry.'},409);
    const isOutbound=outboundEvent(r.eventType),changesContact=r.stageAfter!==''||r.followUpOn!==null;
    if(isOutbound&&['closed','do_not_contact'].includes(contact.stage))return json({error:'This contact is closed or marked Do not contact. Record a private note instead.'},400);
    if(changesContact&&r.expectedContactUpdatedAt!==contact.updatedAt)return stale();
    const id=crypto.randomUUID(),now=new Date().toISOString();
    const result=await env.DB.batch([
      env.DB.prepare("INSERT INTO activity_entries(id,owner_id,contact_id,request_id,event_type,channel,occurred_on,notes,message,stage_after,follow_up_on,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM leads WHERE id=? AND owner_id=? AND (?=0 OR updated_at=?) AND (?=0 OR stage NOT IN ('closed','do_not_contact'))) ON CONFLICT(owner_id,request_id) DO NOTHING").bind(id,user.userId,r.contactId,r.requestId,r.eventType,r.channel,r.occurredOn,r.notes,r.message,r.stageAfter,r.followUpOn,now,r.contactId,user.userId,changesContact?1:0,r.expectedContactUpdatedAt,isOutbound?1:0),
      env.DB.prepare("UPDATE leads SET stage=CASE WHEN ?='' THEN stage ELSE ? END,next_action_at=CASE WHEN ? IS NULL THEN next_action_at ELSE ? END,updated_at=? WHERE id=? AND owner_id=? AND ?=1 AND EXISTS(SELECT 1 FROM activity_entries WHERE id=? AND owner_id=?)").bind(r.stageAfter,r.stageAfter,r.followUpOn,r.followUpOn,now,r.contactId,user.userId,changesContact?1:0,id,user.userId),
    ]);
    const saved=await findRequest();if(!saved)return stale();if(!sameActivity(saved,r))return json({error:'This request was already saved with different details.'},409);
    return json({entry:saved,replayed:!result[0].meta.changes});
  }catch(error){const message=(error as Error).message;return /D1_|SQLITE|database|binding/i.test(message)?json({error:'Could not save this journal entry. Keep the dialog open and retry.'},503):json({error:message},400);}
}
