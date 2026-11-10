import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {OWNER_ID,cookieName,readSessionCookie,verifySession,parseSessionPayload} from '../lib/auth-core';

export async function getCurrentUser(){
  const h=await headers(),origin=h.get('x-leadforge-origin');
  if(!origin||!env.SESSION_SECRET)return null;

  try{
    const token=readSessionCookie(h.get('cookie')||'',cookieName(origin));
    if(!token)return null;

    const payload=parseSessionPayload(token);
    if(!payload||!payload.sub)return null;

    if(payload.sub===OWNER_ID){
      if(!env.OWNER_PASSWORD_HASH)return null;
      if(!await verifySession(token,env.SESSION_SECRET,env.OWNER_PASSWORD_HASH))return null;
      return{userId:OWNER_ID,displayName:env.OWNER_NAME||'Ravi',email:'',fullName:env.OWNER_NAME||'Ravi'};
    }

    if(payload.sub.startsWith('user:')&&env.DB){
      const row=await env.DB.prepare('SELECT id,email,password_hash,name FROM users WHERE id=?').bind(payload.sub).first<{id:string;email:string;password_hash:string;name:string}>();
      if(!row)return null;
      if(!await verifySession(token,env.SESSION_SECRET,row.password_hash))return null;
      return{userId:row.id,displayName:row.name||row.email.split('@')[0],email:row.email,fullName:row.name||row.email.split('@')[0]};
    }

    return null;
  }catch{
    return null;
  }
}
