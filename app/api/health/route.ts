import {env} from 'cloudflare:workers';
import {isPasswordHash} from '../../../lib/auth-core';
export const dynamic='force-dynamic';
export async function GET(){try{if(!env.DB||!env.SESSION_SECRET||env.SESSION_SECRET.length<32||!isPasswordHash(env.OWNER_PASSWORD_HASH||''))throw new Error();await env.DB.prepare('SELECT key FROM auth_attempts LIMIT 1').all();await env.DB.prepare('SELECT id FROM leads LIMIT 1').all();return Response.json({status:'ready'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({status:'setup_required'},{status:503,headers:{'Cache-Control':'no-store'}});}}
