import handler from 'vinext/server/fetch-handler';
export default {async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const url=new URL(request.url),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(!local&&url.protocol!=='https:'){url.protocol='https:';return Response.redirect(url.href,308);}
  const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-authenticated-user-')||key==='x-leadforge-origin')headers.delete(key);headers.set('x-leadforge-origin',url.origin);
  const response=await handler.fetch(new Request(request,{headers}),env,ctx);const out=new Response(response.body,response);
  out.headers.set('X-Content-Type-Options','nosniff');out.headers.set('Referrer-Policy','strict-origin-when-cross-origin');out.headers.set('X-Frame-Options','DENY');if(!local)out.headers.set('Strict-Transport-Security','max-age=31536000');return out;
}};
