import {env} from 'cloudflare:workers';
import {getCurrentUser} from '../../auth';
import {scrapePublicContacts,validateCrawlInput,type CrawlResult} from '../../../lib/scraper';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
  const user=await getCurrentUser();if(!user)return json({error:'Sign in to run the contact scraper.',needsSignIn:true},401);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  try{
    if(!env.DB)return json({error:'Scraper storage is unavailable.'},503);
    const raw=await request.text();if(raw.length>7000)return json({error:'The source list is too large.'},413);const input=validateCrawlInput(JSON.parse(raw));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('custom-scraper-v1:'+JSON.stringify(input))))).map(x=>x.toString(16).padStart(2,'0')).join(''),now=Date.now();
    const cached=await env.DB.prepare('SELECT page_json FROM people_search_cache WHERE owner_id=? AND query_hash=? AND expires_at>?').bind(user.userId,hash,now).first<{page_json:string}>();
    if(cached){try{const result=JSON.parse(cached.page_json)as CrawlResult;if(Array.isArray(result.contacts)&&Array.isArray(result.pages))return json({...result,cached:true});}catch{/* Refresh malformed cached data. */}}
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)),part=(key:string)=>parts.find(p=>p.type===key)?.value||'',day=part('year')+'-'+part('month')+'-'+part('day'),month=day.slice(0,7);
    const grant=await env.DB.prepare("INSERT INTO people_search_limits(owner_id,day_key,day_count,month_key,month_count,next_allowed_at) VALUES(?,?,1,?,1,?) ON CONFLICT(owner_id) DO UPDATE SET day_key=excluded.day_key,day_count=CASE WHEN people_search_limits.day_key=excluded.day_key THEN people_search_limits.day_count+1 ELSE 1 END,month_key=excluded.month_key,month_count=CASE WHEN people_search_limits.month_key=excluded.month_key THEN people_search_limits.month_count+1 ELSE 1 END,next_allowed_at=excluded.next_allowed_at WHERE people_search_limits.next_allowed_at<=? AND (people_search_limits.day_key!=excluded.day_key OR people_search_limits.day_count<100)").bind(user.userId,day,month,now+15000,now).run();
    if(!grant.meta.changes)return json({error:'Wait 15 seconds between fresh runs. The app permits up to 100 fresh runs per India calendar day; cached results remain available.'},429);
    const result=await scrapePublicContacts(input),finished=Date.now();
    // Failed/blocked runs remain retryable rather than being cached as empty success.
    if(result.pages.some(p=>p.status==='read')){try{await env.DB.batch([env.DB.prepare('INSERT INTO people_search_cache(owner_id,query_hash,page_json,expires_at) VALUES(?,?,?,?) ON CONFLICT(owner_id,query_hash) DO UPDATE SET page_json=excluded.page_json,expires_at=excluded.expires_at').bind(user.userId,hash,JSON.stringify(result),finished+900000),env.DB.prepare('DELETE FROM people_search_cache WHERE owner_id=? AND expires_at<=?').bind(user.userId,finished)]);}catch{/* Return the completed scrape if only caching fails. */}}
    return json({...result,cached:false});
  }catch(error){const message=(error as Error).message;return /D1_|SQLITE|database|binding/i.test(message)?json({error:'Storage could not complete this run. Try again later.'},503):json({error:message||'Could not run the scraper.'},400);}
}
