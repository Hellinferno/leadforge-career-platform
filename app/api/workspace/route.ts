import {env} from "cloudflare:workers";
import {getCurrentUser} from "../../auth";
import {DEFAULT_PROFILE,dedupeKey,validateLead} from "../../../lib/leads";
import {webUrl} from "../../../lib/career";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
function db(){if(!env.DB)throw new Error("Contact storage is temporarily unavailable.");return env.DB;}
const fields={name:"name",company:"company",email:"email",phone:"phone",emailSourceUrl:"email_source_url",phoneSourceUrl:"phone_source_url",website:"website",role:"role",industry:"industry",country:"country",stage:"stage",notes:"notes",sourceUrl:"source_url",sourceKind:"source_kind",researchedAt:"researched_at",nextActionAt:"next_action_at",linkedInUrl:"linkedin_url",contactType:"contact_type",jobTitle:"job_title",jobUrl:"job_url",relevance:"relevance"};
const profileFields={businessName:"business_name",offer:"offer",signature:"signature",targetMarket:"target_market",education:"education",skills:"skills",evidence:"evidence",targetRole:"target_role",targetLocation:"target_location",resumeUrl:"resume_url",portfolioUrl:"portfolio_url"};
const keys=Object.keys(fields) as (keyof typeof fields)[],names=Object.values(fields);
const columns=['id',...Object.entries(fields).map(([key,column])=>`${column} AS ${key}`),'created_at AS createdAt','updated_at AS updatedAt'].join(',');
export async function GET(){
  const user=await getCurrentUser();if(!user)return json({error:"Sign in to open your private career workspace.",needsSignIn:true},401);
  try{
    const [contacts,profile,jobs]=await Promise.all([
      db().prepare(`SELECT ${columns} FROM leads WHERE owner_id=? ORDER BY updated_at DESC`).bind(user.userId).all(),
      db().prepare(`SELECT ${Object.entries(profileFields).map(([key,col])=>`${col} AS ${key}`).join(',')} FROM profiles WHERE owner_id=?`).bind(user.userId).first(),
      db().prepare("SELECT id,company,title,url,location,type,status,notes,next_action_at AS nextActionAt,created_at AS createdAt,updated_at AS updatedAt FROM jobs WHERE owner_id=? ORDER BY updated_at DESC").bind(user.userId).all()
    ]);
    return json({leads:contacts.results.map(r=>({...r,stage:r.stage==='meeting'?'interview':r.stage==='won'?'offer':r.stage})),profile:{...DEFAULT_PROFILE,...(profile||{})},jobs:jobs.results});
  }catch{return json({error:"Could not load your career workspace. Please try again."},503);}
}
export async function POST(request:Request){
  const user=await getCurrentUser();if(!user)return json({error:"Sign in to save contacts.",needsSignIn:true},401);
  const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return json({error:"Invalid request origin."},403);
  try{
    const raw=await request.text();if(raw.length>2000000)return json({error:"Import file is too large."},413);const body=JSON.parse(raw);
    if(body.action==="save_profile"){
      const profile:Record<string,string>={};for(const key of Object.keys(DEFAULT_PROFILE)){const value=body.profile?.[key]??DEFAULT_PROFILE[key as keyof typeof DEFAULT_PROFILE];if(typeof value!=="string"||value.length>2000)throw new Error("Invalid career profile.");profile[key]=value.trim();}
      if(!profile.signature)throw new Error("Add your name or signature.");profile.resumeUrl=webUrl(profile.resumeUrl);profile.portfolioUrl=webUrl(profile.portfolioUrl);
      const cols=Object.values(profileFields),pkeys=Object.keys(profileFields);
      await db().prepare(`INSERT INTO profiles(owner_id,${cols.join(',')}) VALUES(?,${cols.map(()=>'?').join(',')}) ON CONFLICT(owner_id) DO UPDATE SET ${cols.map(c=>`${c}=excluded.${c}`).join(',')}`).bind(user.userId,...pkeys.map(k=>profile[k])).run();return json({ok:true});
    }
    if(body.action==="delete"){
      if(typeof body.id!=="string")throw new Error("Choose a contact to delete.");const result=await db().batch([db().prepare("DELETE FROM message_drafts WHERE contact_id=? AND owner_id=?").bind(body.id,user.userId),db().prepare("DELETE FROM activity_entries WHERE contact_id=? AND owner_id=?").bind(body.id,user.userId),db().prepare("DELETE FROM leads WHERE id=? AND owner_id=?").bind(body.id,user.userId)]);return result[2].meta.changes?json({ok:true}):json({error:"Contact not found."},404);
    }
    if(body.action==="update"){
      if(typeof body.id!=="string")throw new Error("Choose a contact to edit.");const r=validateLead(body.lead),now=new Date().toISOString();
      const duplicate=await db().prepare("SELECT id FROM leads WHERE owner_id=? AND id!=? AND (dedupe_key=? OR (?!='' AND email=?) OR (?!='' AND linkedin_url=?))").bind(user.userId,body.id,dedupeKey(r),r.email,r.email,r.linkedInUrl,r.linkedInUrl).first();if(duplicate)return json({error:"A contact with these details already exists."},409);
      const result=await db().prepare(`UPDATE leads SET dedupe_key=?,${names.map(c=>`${c}=?`).join(',')},updated_at=? WHERE id=? AND owner_id=?`).bind(dedupeKey(r),...keys.map(k=>r[k]),now,body.id,user.userId).run();return result.meta.changes?json({ok:true}):json({error:"Contact not found."},404);
    }
    if(body.action!=="create"&&body.action!=="import")throw new Error("Invalid action.");const rawRecords=body.action==="create"?[body.lead]:body.leads;
    if(!Array.isArray(rawRecords)||!rawRecords.length||rawRecords.length>1000)throw new Error("Import between 1 and 1,000 contacts.");
    const records=rawRecords.map((r,i)=>{try{return validateLead(r);}catch(e){throw new Error(`Contact ${i+1}: ${(e as Error).message}`);}}),now=new Date().toISOString();let inserted=0;
    for(let i=0;i<records.length;i+=50){const results=await db().batch(records.slice(i,i+50).map(r=>db().prepare(`INSERT INTO leads(id,owner_id,dedupe_key,${names.join(',')},created_at,updated_at) SELECT ${Array(names.length+5).fill('?').join(',')} WHERE NOT EXISTS(SELECT 1 FROM leads WHERE owner_id=? AND (dedupe_key=? OR (?!='' AND email=?) OR (?!='' AND linkedin_url=?))) ON CONFLICT(owner_id,dedupe_key) DO NOTHING`).bind(crypto.randomUUID(),user.userId,dedupeKey(r),...keys.map(k=>r[k]),now,now,user.userId,dedupeKey(r),r.email,r.email,r.linkedInUrl,r.linkedInUrl)));inserted+=results.reduce((sum,r)=>sum+(r.meta.changes||0),0);}
    return json({ok:true,inserted,skipped:records.length-inserted});
  }catch(error){const message=(error as Error).message;if(/D1_|SQLITE|database|binding/i.test(message))return json({error:"Storage could not finish this request. Refresh your contacts before retrying."},503);return json({error:message||"Could not save this request."},400);}
}
