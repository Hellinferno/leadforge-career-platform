import {env} from "cloudflare:workers";
import {getCurrentUser} from "../../auth";
import {validateJob,jobKey} from "../../../lib/career";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
  const user=await getCurrentUser();if(!user)return json({error:"Sign in to manage opportunities.",needsSignIn:true},401);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:"Invalid request origin."},403);
  try{
    if(!env.DB)return json({error:"Opportunity storage is temporarily unavailable."},503);
    const raw=await request.text();if(raw.length>15000)throw new Error("Opportunity details are too long.");const body=JSON.parse(raw);
    if(body.action==='delete'){if(typeof body.id!=='string')throw new Error("Choose an opportunity.");const r=await env.DB.prepare("DELETE FROM jobs WHERE id=? AND owner_id=?").bind(body.id,user.userId).run();return r.meta.changes?json({ok:true}):json({error:"Opportunity not found."},404);}
    if(body.action!=='save')throw new Error("Invalid action.");const job=validateJob(body.job),now=new Date().toISOString();
    if(body.id!=null&&typeof body.id!=='string')throw new Error("Invalid opportunity ID.");
    const duplicate=await env.DB.prepare("SELECT id FROM jobs WHERE owner_id=? AND dedupe_key=? AND id!=?").bind(user.userId,jobKey(job),body.id||'').first();if(duplicate)return json({error:"This opportunity is already saved."},409);
    if(body.id){const r=await env.DB.prepare("UPDATE jobs SET dedupe_key=?,company=?,title=?,url=?,location=?,type=?,status=?,notes=?,next_action_at=?,updated_at=? WHERE id=? AND owner_id=?").bind(jobKey(job),job.company,job.title,job.url,job.location,job.type,job.status,job.notes,job.nextActionAt,now,body.id,user.userId).run();return r.meta.changes?json({ok:true}):json({error:"Opportunity not found."},404);}
    await env.DB.prepare("INSERT INTO jobs(id,owner_id,dedupe_key,company,title,url,location,type,status,notes,next_action_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.userId,jobKey(job),job.company,job.title,job.url,job.location,job.type,job.status,job.notes,job.nextActionAt,now,now).run();return json({ok:true});
  }catch(e){const message=(e as Error).message;return /D1_|SQLITE|database/i.test(message)?json({error:"Could not save this opportunity. Refresh before retrying."},503):json({error:message},400);}
}
