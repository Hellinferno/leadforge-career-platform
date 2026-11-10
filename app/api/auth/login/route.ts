import {env} from 'cloudflare:workers';
import {createSession,isPasswordHash,sameOrigin,sessionCookie,verifyPassword,OWNER_ID} from '../../../../lib/auth-core';
import {loginKey,reserveLoginSql} from '../../../../lib/auth-rate';

export const dynamic='force-dynamic';

const move=(request:Request,path:string,cookie?:string)=>
  new Response(null,{
    status:303,
    headers:{
      Location:new URL(path,request.url).href,
      'Cache-Control':'no-store',
      ...(cookie?{'Set-Cookie':cookie}:{})
    }
  });

export async function POST(request:Request){
  if(!sameOrigin(request))return new Response('Invalid request origin.',{status:403});
  if(!env.DB||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)return move(request,'/login?error=setup');

  const contentType=request.headers.get('content-type')||'';
  if(!contentType.startsWith('application/x-www-form-urlencoded')||Number(request.headers.get('content-length')||0)>4096){
    return move(request,'/login?error=invalid');
  }

  try{
    const body=await request.text();
    if(body.length>4096)return move(request,'/login?error=invalid');

    const now=Date.now();
    const key=await loginKey(request.headers.get('CF-Connecting-IP')||'local',env.SESSION_SECRET);
    const bucket=Math.floor(now/900000);

    const limitResult=await env.DB.prepare(reserveLoginSql).bind(key,bucket,now+900000).run();
    if(!limitResult.meta.changes)return move(request,'/login?error=limit');

    const params=new URLSearchParams(body);
    const email=(params.get('email')||'').trim().toLowerCase();
    const password=params.get('password')||'';

    // Case 1: User login by Email + Password
    if(email){
      const user=await env.DB.prepare(
        'SELECT id, email, password_hash, name FROM users WHERE email=?'
      ).bind(email).first<{id:string;email:string;password_hash:string;name:string}>();

      if(!user||!await verifyPassword(password,user.password_hash)){
        return move(request,'/login?error=invalid');
      }

      await env.DB.batch([
        env.DB.prepare('DELETE FROM auth_attempts WHERE key=?').bind(key),
        env.DB.prepare('DELETE FROM auth_attempts WHERE expires_at<=?').bind(now),
      ]);

      const token=await createSession(
        env.SESSION_SECRET,
        user.password_hash,
        Math.floor(now/1000),
        user.id,
        {email:user.email,name:user.name}
      );

      return move(request,'/',sessionCookie(new URL(request.url).origin,token));
    }

    // Case 2: Legacy single-owner password login
    if(env.OWNER_PASSWORD_HASH&&isPasswordHash(env.OWNER_PASSWORD_HASH)){
      if(!await verifyPassword(password,env.OWNER_PASSWORD_HASH)){
        return move(request,'/login?error=invalid');
      }

      await env.DB.batch([
        env.DB.prepare('DELETE FROM auth_attempts WHERE key=?').bind(key),
        env.DB.prepare('DELETE FROM auth_attempts WHERE expires_at<=?').bind(now),
      ]);

      const token=await createSession(
        env.SESSION_SECRET,
        env.OWNER_PASSWORD_HASH,
        Math.floor(now/1000),
        OWNER_ID
      );

      return move(request,'/',sessionCookie(new URL(request.url).origin,token));
    }

    return move(request,'/login?error=invalid');
  }catch{
    return move(request,'/login?error=unavailable');
  }
}
