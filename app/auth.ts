import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {OWNER_ID,cookieName,readSessionCookie,verifySession} from '../lib/auth-core';
export async function getCurrentUser(){const h=await headers(),origin=h.get('x-leadforge-origin');if(!origin||!env.SESSION_SECRET||!env.OWNER_PASSWORD_HASH)return null;try{const token=readSessionCookie(h.get('cookie')||'',cookieName(origin));if(!await verifySession(token,env.SESSION_SECRET,env.OWNER_PASSWORD_HASH))return null;return{userId:OWNER_ID,displayName:env.OWNER_NAME||'Ravi',email:'',fullName:env.OWNER_NAME||'Ravi'};}catch{return null;}}
