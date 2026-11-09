import {env} from 'cloudflare:workers';
import {getCurrentUser} from '../../auth';
import {validateDraft,type SavedDraft} from '../../../lib/messages';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const columns='id,contact_id AS contactId,goal,step,subject,body,version,created_at AS createdAt,updated_at AS updatedAt';
const conflict=()=>json({error:'This draft changed in another session. Copy your changes, then reload the saved version.'},409);
export async function GET(request:Request){
  const user=await getCurrentUser();if(!user)return json({error:'Sign in to read saved drafts.',needsSignIn:true},401);
  const contactId=new URL(request.url).searchParams.get('contactId');if(!contactId||contactId.length>100)return json({error:'Choose a saved contact.'},400);
  try{if(!env.DB)return json({error:'Draft storage is unavailable.'},503);
    const contact=await env.DB.prepare('SELECT id FROM leads WHERE id=? AND owner_id=?').bind(contactId,user.userId).first();if(!contact)return json({error:'Contact not found.'},404);
    const result=await env.DB.prepare(`SELECT ${columns} FROM message_drafts WHERE owner_id=? AND contact_id=? ORDER BY goal,step`).bind(user.userId,contactId).all();return json({drafts:result.results});
  }catch{return json({error:'Could not load saved drafts. Please retry.'},503);}
}
export async function POST(request:Request){
  const user=await getCurrentUser();if(!user)return json({error:'Sign in to save drafts.',needsSignIn:true},401);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  try{
    if(!env.DB)return json({error:'Draft storage is unavailable.'},503);
    const raw=await request.text();if(raw.length>30000)throw new Error('Draft request is too large.');const body=JSON.parse(raw);if(body.action!=='save')throw new Error('Invalid action.');const r=validateDraft(body.draft);
    const contact=await env.DB.prepare('SELECT id,stage FROM leads WHERE id=? AND owner_id=?').bind(r.contactId,user.userId).first();if(!contact)return json({error:'Contact not found.'},404);if(['do_not_contact','closed'].includes(String(contact.stage)))return json({error:'This contact is closed or marked Do not contact.'},400);
    const existing=await env.DB.prepare(`SELECT ${columns} FROM message_drafts WHERE owner_id=? AND contact_id=? AND goal=? AND step=?`).bind(user.userId,r.contactId,r.goal,r.step).first<SavedDraft>();
    if(existing?.subject===r.subject&&existing.body===r.body)return json({draft:existing});
    const now=new Date().toISOString();
    if(existing){
      if(existing.version!==r.expectedVersion)return conflict();
      const result=await env.DB.prepare('UPDATE message_drafts SET subject=?,body=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=?').bind(r.subject,r.body,now,existing.id,user.userId,r.expectedVersion).run();if(!result.meta.changes)return conflict();
    }else{
      if(r.expectedVersion!==null)return conflict();
      const result=await env.DB.prepare("INSERT INTO message_drafts(id,owner_id,contact_id,goal,step,subject,body,version,created_at,updated_at) SELECT ?,?,?,?,?,?,?,1,?,? WHERE EXISTS(SELECT 1 FROM leads WHERE id=? AND owner_id=?) ON CONFLICT(owner_id,contact_id,goal,step) DO NOTHING").bind(crypto.randomUUID(),user.userId,r.contactId,r.goal,r.step,r.subject,r.body,now,now,r.contactId,user.userId).run();if(!result.meta.changes)return conflict();
    }
    const saved=await env.DB.prepare(`SELECT ${columns} FROM message_drafts WHERE owner_id=? AND contact_id=? AND goal=? AND step=?`).bind(user.userId,r.contactId,r.goal,r.step).first();if(!saved)return json({error:'The contact or draft no longer exists.'},404);return json({draft:saved});
  }catch(error){const message=(error as Error).message;return /D1_|SQLITE|database|binding/i.test(message)?json({error:'Could not save this draft. Please retry.'},503):json({error:message},400);}
}
