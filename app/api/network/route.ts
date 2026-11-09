import {env} from 'cloudflare:workers';
import {getCurrentUser} from '../../auth';
import {EMPTY_NETWORK,mergeNetwork,validateNetwork,type NetworkData,type NetworkPerson} from '../../../lib/network';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function db(){if(!env.DB)throw new Error('Network database is unavailable.');return env.DB;}
type Row={id:string;data_json:string;version:number;created_at:string;updated_at:string};
const person=(r:Row):NetworkPerson=>({...EMPTY_NETWORK,...JSON.parse(r.data_json),id:r.id,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at});
async function read(owner:string){const r=await db().prepare('SELECT id,data_json,version,created_at,updated_at FROM network_people WHERE owner_id=? ORDER BY updated_at DESC LIMIT 10001').bind(owner).all<Row>();return r.results.map(person);}
export async function GET(){const user=await getCurrentUser();if(!user)return json({error:'Sign in to open your private network.',needsSignIn:true},401);try{return json({people:await read(user.userId)});}catch{return json({error:'Your network could not be loaded. Please retry.'},503);}}
export async function POST(request:Request){
  const user=await getCurrentUser();if(!user)return json({error:'Sign in to save your network.',needsSignIn:true},401);const owner=user.userId,origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  try{
    const raw=await request.text();if(raw.length>1500000)return json({error:'Import batch is too large.'},413);const body=JSON.parse(raw),now=new Date().toISOString();
    if(body.action==='import'){
      if(!Array.isArray(body.people)||body.people.length<1||body.people.length>300)throw new Error('Import between 1 and 300 people per batch.');const incoming:NetworkData[]=body.people.map((p:unknown)=>validateNetwork(p));const all=await read(owner);if(all.length>10000)throw new Error('Network limit reached.');let count=all.length,inserted=0,updated=0,unchanged=0,conflicts=0;
      const byIdentity=new Map<string,NetworkPerson>();for(const p of all)for(const key of p.identities)byIdentity.set(key,p);
      for(const p of incoming){const matches=[...new Set(p.identities.map(k=>byIdentity.get(k)).filter(Boolean))] as NetworkPerson[];if(matches.length>1){conflicts++;continue;}const existing=matches[0];
        if(existing){const merged=mergeNetwork(existing,p),data=JSON.stringify(merged),before=JSON.stringify(validateNetwork(existing,true));if(data===before){unchanged++;continue;}
          const r=await db().prepare('UPDATE network_people SET data_json=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=?').bind(data,now,existing.id,owner,existing.version).run();if(!r.meta.changes){conflicts++;continue;}updated++;const next={...merged,id:existing.id,version:existing.version+1,createdAt:existing.createdAt,updatedAt:now};for(const key of merged.identities)byIdentity.set(key,next);
        }else{if(count>=10000)throw new Error('Network limit is 10,000 people. Earlier batches remain saved.');const id=crypto.randomUUID();const r=await db().prepare('INSERT INTO network_people(id,owner_id,identity_key,data_json,version,created_at,updated_at) VALUES(?,?,?,?,1,?,?) ON CONFLICT(owner_id,identity_key) DO NOTHING').bind(id,owner,p.identities[0],JSON.stringify(p),now,now).run();if(!r.meta.changes){conflicts++;continue;}inserted++;count++;const next={...p,id,version:1,createdAt:now,updatedAt:now};for(const key of p.identities)byIdentity.set(key,next);}
      }
      return json({inserted,updated,unchanged,conflicts});
    }
    if(typeof body.id!=='string'||body.id.length>100||!Number.isSafeInteger(body.version)||body.version<1)throw new Error('Choose a saved person and refresh before editing.');
    const row=await db().prepare('SELECT id,data_json,version,created_at,updated_at FROM network_people WHERE id=? AND owner_id=?').bind(body.id,owner).first<Row>();if(!row)return json({error:'Network person not found.'},404);if(row.version!==body.version)return json({error:'This person changed in another tab. Reload and try again.'},409);const current=person(row);
    if(body.action==='delete'){const result=await db().prepare('DELETE FROM network_people WHERE id=? AND owner_id=? AND version=?').bind(body.id,owner,body.version).run();return result.meta.changes?json({ok:true}):json({error:'This person changed. Reload and try again.'},409);}
    if(body.action==='update'){
      const editedEdges=Array.isArray(body.person?.edges)&&body.person.edges.length===current.edges.length?current.edges.map((e,i)=>({...e,via:body.person.edges[i]?.via,account:body.person.edges[i]?.account})):current.edges;const changed=validateNetwork({...body.person,edges:editedEdges});const data=validateNetwork({...changed,identities:[...new Set([...current.identities,...changed.identities])]},true);
      const all=await read(owner);if(all.some(p=>p.id!==current.id&&p.identities.some(k=>changed.identities.includes(k))))return json({error:'That profile belongs to another network record. Use Link profiles to combine them.'},409);
      const r=await db().prepare('UPDATE network_people SET data_json=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=?').bind(JSON.stringify(data),now,current.id,owner,body.version).run();return r.meta.changes?json({ok:true}):json({error:'This person changed. Reload and try again.'},409);
    }
    if(body.action==='merge'){
      if(typeof body.otherId!=='string'||body.otherId===body.id||!Number.isSafeInteger(body.otherVersion))throw new Error('Choose a different saved profile to link.');const otherRow=await db().prepare('SELECT id,data_json,version,created_at,updated_at FROM network_people WHERE id=? AND owner_id=?').bind(body.otherId,owner).first<Row>();if(!otherRow||otherRow.version!==body.otherVersion)return json({error:'The other profile changed or was removed. Reload and try again.'},409);
      const other=person(otherRow);const merged=mergeNetwork(current,other);if(current.notes&&other.notes&&current.notes!==other.notes)merged.notes=[current.notes,other.notes].join('\n').slice(0,3000);if(current.tags&&other.tags)merged.tags=[...new Set([...current.tags.split(','),...other.tags.split(',')].map(t=>t.trim()).filter(Boolean))].join(', ').slice(0,500);
      // A linked identity remains an alias so future imports find this person again.
      const data=JSON.stringify(merged);const result=await db().batch([
        db().prepare('UPDATE network_people SET data_json=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=? AND EXISTS(SELECT 1 FROM network_people WHERE id=? AND owner_id=? AND version=?)').bind(data,now,current.id,owner,current.version,other.id,owner,other.version),
        db().prepare('DELETE FROM network_people WHERE id=? AND owner_id=? AND version=? AND EXISTS(SELECT 1 FROM network_people WHERE id=? AND owner_id=? AND version=? AND data_json=? AND updated_at=?)').bind(other.id,owner,other.version,current.id,owner,current.version+1,data,now)
      ]);return result[0].meta.changes&&result[1].meta.changes?json({ok:true}):json({error:'A profile changed. Reload before linking again.'},409);
    }
    throw new Error('Invalid network action.');
  }catch(e){const message=(e as Error).message;return /D1_|SQLITE|database|binding/i.test(message)?json({error:'Network storage could not finish this request. Reload before retrying; completed imports remain saved.'},503):json({error:message||'Could not save the network.'},400);}
}
