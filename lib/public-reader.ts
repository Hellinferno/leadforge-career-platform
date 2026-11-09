import {publicUrl,publicIp,robotsRules,robotsAllows} from './research.ts';
export class PublicReadError extends Error{kind:'blocked'|'failed'|'unreadable';constructor(message:string,kind:'blocked'|'failed'|'unreadable'='failed'){super(message);this.kind=kind;}}
export function publicReader(fetcher:typeof fetch=fetch,budgetMs=24000,options:{allowPdf?:boolean}={}){
  const deadline=Date.now()+budgetMs,checked=new Set<string>(),permissions=new Map<string,ReturnType<typeof robotsRules>>(),nextAt=new Map<string,number>(),delays=new Map<string,number>();
  const signal=()=>AbortSignal.timeout(Math.max(1,Math.min(5500,deadline-Date.now())));
  async function dns(host:string){
    if(checked.has(host))return;
    async function resolve(endpoint:string){
      const answers=await Promise.all(['A','AAAA'].map(async type=>{const r=await fetcher(`${endpoint}?name=${encodeURIComponent(host)}&type=${type}`,{headers:{Accept:'application/dns-json'},signal:signal(),redirect:'error'});if(!r.ok)throw new PublicReadError('Public DNS could not be checked.');const d=await r.json() as {Status:number;Answer?:{type:number;data:string}[]};if(d.Status!==0)throw new PublicReadError('The domain could not be resolved.');return(d.Answer||[]).filter(x=>x.type===1||x.type===28).map(x=>x.data);}));
      const ips=answers.flat();if(!ips.length)throw new PublicReadError('No public address was returned for this domain.');if(ips.some(ip=>!publicIp(ip)))throw new PublicReadError('The domain does not resolve exclusively to public addresses.','blocked');
    }
    try{await resolve('https://cloudflare-dns.com/dns-query');}catch(error){if(error instanceof PublicReadError&&error.kind==='blocked')throw error;await resolve('https://dns.google/resolve');}
    checked.add(host);
  }
  async function load(start:URL,robot=false):Promise<{url:string;html:string;pdf?:Uint8Array}>{
    let url=start;
    for(let hop=0;hop<4;hop++){
      if(Date.now()>=deadline)throw new PublicReadError('Crawl time limit reached; use a direct team or contact page.');
      url=publicUrl(url.href);
      if(!robot&&/\/(?:authwall|login|signin|sign-in|logout|signout|checkpoint|oauth|unsubscribe)(?:\/|$)/i.test(url.pathname))throw new PublicReadError('This URL is a sign-in or account-action page.','blocked');
      await dns(url.hostname);
      if(!robot){await allowed(url);const wait=(nextAt.get(url.origin)||0)-Date.now();if(wait>0){if(Date.now()+wait>=deadline)throw new PublicReadError('The site crawl delay exceeds this run’s time budget.','blocked');await new Promise(r=>setTimeout(r,wait));}nextAt.set(url.origin,Date.now()+(delays.get(url.origin)||350));}
      const response=await fetcher(url.href,{redirect:'manual',headers:{'User-Agent':'LeadforgeResearch/2.0 (public contact discovery)','Accept':robot?'text/plain':options.allowPdf?'text/html,application/pdf,application/xhtml+xml;q=0.9,text/plain;q=0.5':'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5'},signal:signal()});
      if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new PublicReadError('The page redirected without a destination.');url=publicUrl(new URL(location,url).href);continue;}
      if(robot&&[404,410].includes(response.status)){await response.body?.cancel();return{url:url.href,html:''};}
      if(!response.ok){await response.body?.cancel();throw new PublicReadError(`The site returned HTTP ${response.status}.`,[401,403,429,999].includes(response.status)?'blocked':'failed');}
      if(!robot&&options.allowPdf&&/application\/pdf/i.test(response.headers.get('content-type')||'')){
        const reader=response.body?.getReader();if(!reader)throw new PublicReadError('The PDF response was empty.','unreadable');let bytes=0;const chunks:Uint8Array[]=[];while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>3000000){await reader.cancel();throw new PublicReadError('PDFs are limited to 3 MB per document.','unreadable');}chunks.push(chunk.value);}const pdf=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){pdf.set(chunk,offset);offset+=chunk.length;}if(new TextDecoder().decode(pdf.subarray(0,5))!=='%PDF-')throw new PublicReadError('The response is not a readable PDF.','unreadable');return{url:url.href,html:'',pdf};
      }
      if(!/text\/(html|plain)|application\/xhtml/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw new PublicReadError('This is not an HTML or text page.','unreadable');}
      const reader=response.body?.getReader();if(!reader)throw new PublicReadError('The response was empty.','unreadable');let bytes=0,html='';const decoder=new TextDecoder(),max=robot?256000:900000;
      while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>max){await reader.cancel();throw new PublicReadError('The page exceeds the size limit. Try a smaller contact page.','unreadable');}html+=decoder.decode(chunk.value,{stream:true});}html+=decoder.decode();
      if(robot&&/<(?:!doctype|html|head|body)\b/i.test(html))throw new PublicReadError('The site did not return readable robots.txt permissions.','blocked');
      return{url:url.href,html};
    }
    throw new PublicReadError('The URL redirected too many times.');
  }
  async function allowed(url:URL){
    if(!permissions.has(url.origin)){let robot:{url:string;html:string};try{robot=await load(new URL('/robots.txt',url),true);}catch{throw new PublicReadError('The site’s crawl permissions could not be checked.','blocked');}permissions.set(url.origin,robotsRules(robot.html));const delay=Number(robot.html.match(/^crawl-delay:\s*([\d.]+)/im)?.[1]||0);delays.set(url.origin,Number.isFinite(delay)?Math.max(350,delay*1000):350);}
    if(!robotsAllows(url.pathname+url.search,permissions.get(url.origin)!))throw new PublicReadError('robots.txt excludes this page from this crawler.','blocked');
  }
  return{read:(url:string)=>load(publicUrl(url)),remaining:()=>deadline-Date.now()};
}
