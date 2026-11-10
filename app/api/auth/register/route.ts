import {env} from 'cloudflare:workers';
import {createSession,passwordHash,sameOrigin,sessionCookie} from '../../../../lib/auth-core';
import {loginKey,reserveLoginSql} from '../../../../lib/auth-rate';
import {DEFAULT_PROFILE} from '../../../../lib/leads';

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
  if(!env.DB||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)return move(request,'/login?error=setup&tab=register');

  const contentType=request.headers.get('content-type')||'';
  if(!contentType.startsWith('application/x-www-form-urlencoded')||Number(request.headers.get('content-length')||0)>4096){
    return move(request,'/login?error=invalid&tab=register');
  }

  try{
    const body=await request.text();
    if(body.length>4096)return move(request,'/login?error=invalid&tab=register');

    const now=Date.now();
    const key=await loginKey(request.headers.get('CF-Connecting-IP')||'local',env.SESSION_SECRET);
    const bucket=Math.floor(now/900000);

    const limitResult=await env.DB.prepare(reserveLoginSql).bind(key,bucket,now+900000).run();
    if(!limitResult.meta.changes)return move(request,'/login?error=limit&tab=register');

    const params=new URLSearchParams(body);
    const rawEmail=(params.get('email')||'').trim().toLowerCase();
    const rawPassword=params.get('password')||'';
    const rawName=(params.get('name')||'').trim().slice(0,100);

    if(!rawEmail||!/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(rawEmail)){
      return move(request,'/login?error=invalid_email&tab=register');
    }

    if(rawPassword.length<8||rawPassword.length>256){
      return move(request,'/login?error=password_length&tab=register');
    }

    // Check if user already exists
    const existing=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(rawEmail).first();
    if(existing){
      return move(request,'/login?error=email_exists&tab=register');
    }

    const userId=`user:${crypto.randomUUID()}`;
    const hash=await passwordHash(rawPassword);
    const nowIso=new Date().toISOString();
    const name=rawName||rawEmail.split('@')[0];

    // Create user and initialize default profile
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO users(id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(userId, rawEmail, hash, name, nowIso, nowIso),
      env.DB.prepare(
        'INSERT INTO profiles(owner_id, business_name, offer, signature, target_market, education, skills, evidence, target_role, target_location, resume_url, portfolio_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        userId,
        '',
        '',
        name,
        DEFAULT_PROFILE.targetMarket,
        DEFAULT_PROFILE.education,
        '',
        '',
        DEFAULT_PROFILE.targetRole,
        DEFAULT_PROFILE.targetLocation,
        '',
        ''
      ),
      env.DB.prepare('DELETE FROM auth_attempts WHERE key=?').bind(key),
    ]);

    const token=await createSession(
      env.SESSION_SECRET,
      hash,
      Math.floor(now/1000),
      userId,
      {email:rawEmail,name}
    );

    return move(request,'/',sessionCookie(new URL(request.url).origin,token));
  }catch{
    return move(request,'/login?error=unavailable&tab=register');
  }
}
