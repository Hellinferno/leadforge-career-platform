import {env} from 'cloudflare:workers';
import {createSession,isPasswordHash,sameOrigin,sessionCookie,verifyPassword} from '../../../../lib/auth-core';
import {loginKey,reserveLoginSql} from '../../../../lib/auth-rate';
export const dynamic='force-dynamic';
const move=(request:Request,path:string,cookie?:string)=>new Response(null,{status:303,headers:{Location:new URL(path,request.url).href,'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function POST(request:Request){
  if(!sameOrigin(request))return new Response('Invalid request origin.',{status:403});
  if(!env.DB||!env.SESSION_SECRET||env.SESSION_SECRET.length<32||!env.OWNER_PASSWORD_HASH||!isPasswordHash(env.OWNER_PASSWORD_HASH))return move(request,'/login?error=setup');
  if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')||Number(request.headers.get('content-length')||0)>4096)return move(request,'/login?error=invalid');
  try{const body=await request.text();if(body.length>4096)return move(request,'/login?error=invalid');const now=Date.now(),key=await loginKey(request.headers.get('CF-Connecting-IP')||'local',env.SESSION_SECRET),bucket=Math.floor(now/900000);
    const result=await env.DB.prepare(reserveLoginSql).bind(key,bucket,now+900000).run();if(!result.meta.changes)return move(request,'/login?error=limit');
    const password=new URLSearchParams(body).get('password')||'';if(!await verifyPassword(password,env.OWNER_PASSWORD_HASH))return move(request,'/login?error=invalid');
    await env.DB.batch([env.DB.prepare('DELETE FROM auth_attempts WHERE key=?').bind(key),env.DB.prepare('DELETE FROM auth_attempts WHERE expires_at<=?').bind(now)]);
    return move(request,'/',sessionCookie(new URL(request.url).origin,await createSession(env.SESSION_SECRET,env.OWNER_PASSWORD_HASH)));
  }catch{return move(request,'/login?error=unavailable');}
}
