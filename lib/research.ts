export type ResearchResult={website:string;company:string;description:string;emails:{email:string;sourceUrl:string}[];pages:{url:string;title:string}[];warnings:string[];researchedAt:string};
export function publicUrl(input:string):URL{
  let url:URL;try{url=new URL(/^https?:\/\//i.test(input)?input:`https://${input}`);}catch{throw new Error("Enter a valid company website, such as company.com.");}
  const host=url.hostname.toLowerCase();
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||(host.includes(':'))||/^[\d.]+$/.test(host)||!host.includes('.')||/(^|\.)(localhost|local|internal|test|example|invalid)$/.test(host)||host.endsWith('.nip.io')||host.endsWith('.sslip.io'))throw new Error("Research is available for public company domains only.");
  url.hash="";return url;
}
export function publicIp(ip:string):boolean{
  if(ip.includes(':'))return /^[23][0-9a-f]{3}:/i.test(ip)&&!/^2001:(?:db8:|0:|10:|20:)|^2002:|^3fff:/i.test(ip);
  const p=ip.split('.').map(Number);if(p.length!==4||p.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  const[a,b]=p;
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0))||(a===198&&(b===18||b===19))||(a===192&&b===0&&p[2]===2)||(a===198&&b===51&&p[2]===100)||(a===203&&b===0&&p[2]===113));
}
export function decodeHtml(text:string):string{
  const entities:Record<string,string>={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',commat:'@'};
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return c>0&&c<=0x10ffff?String.fromCodePoint(c):"";}).replace(/&(amp|quot|apos|lt|gt|nbsp|commat);/gi,(_,s:string)=>(entities[s.toLowerCase()]||"" ));
}
export function parsePage(html:string,url:string){
  const title=decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/\s+/g," ").trim().slice(0,200);
  const meta=html.match(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/i)?.[0]||"";
  const description=decodeHtml(meta.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]||"").trim().slice(0,350);
  const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"").replace(/<!--[\s\S]*?-->/g,"");
  const mailto=[...clean.matchAll(/href\s*=\s*["']mailto:([^"'?]+)/gi)].map(m=>{try{return decodeURIComponent(decodeHtml(m[1]));}catch{return decodeHtml(m[1]);}}).join(" ");
  const visible=decodeHtml(clean.replace(/<[^>]*>/g," "));
  const emails=[...new Set(((mailto+" "+visible).match(/[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,63}/gi)||[]).map(e=>e.toLowerCase()).filter(e=>e.length<=254&&!/\.(png|jpg|svg|webp|gif|woff)$/i.test(e)))].slice(0,20);
  const contactLinks=[...clean.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap(m=>{
    try{const link=new URL(decodeHtml(m[1]),url),label=decodeHtml(m[2].replace(/<[^>]*>/g," "));return link.origin===new URL(url).origin&&/contact|about|team/i.test(link.pathname+" "+label)&&!/[?#]/.test(link.href)&&!(/\.(pdf|zip|png|jpg)$/i.test(link.pathname))?[link.href]:[];}catch{return [];}
  });
  return{title,description,emails,contactLinks:[...new Set(contactLinks)]};
}
type Rule={allow:boolean;pattern:string};
export function robotsRules(text:string):Rule[]{
  const groups:{agents:string[];rules:Rule[]}[]=[];let agents:string[]=[],rules:Rule[]=[];
  for(const line of text.split(/\r?\n/)){const clean=line.split('#')[0].trim(),match=clean.match(/^([^:]+):\s*(.*)$/);if(!match)continue;const key=match[1].trim().toLowerCase(),value=match[2].trim();
    if(key==='user-agent'){if(rules.length){groups.push({agents,rules});agents=[];rules=[];}agents.push(value.toLowerCase());}
    else if((key==='allow'||key==='disallow')&&agents.length&&value){rules.push({allow:key==='allow',pattern:value});}
  }
  if(agents.length)groups.push({agents,rules});
  const exact=groups.filter(g=>g.agents.some(a=>a!=='*'&&'leadforgeresearch'.includes(a)));
  return(exact.length?exact:groups.filter(g=>g.agents.includes('*'))).flatMap(g=>g.rules);
}
export function robotsAllows(path:string,rules:Rule[]):boolean{
  let best=-1,allowed=true;
  for(const rule of rules){const tail=rule.pattern.endsWith('$')?'$':'',pattern=rule.pattern.replace(/\$$/,'').split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');if(new RegExp('^'+pattern+tail).test(path)){const specificity=rule.pattern.replace(/[*$]/g,'').length;if(specificity>best||(specificity===best&&rule.allow)){best=specificity;allowed=rule.allow;}}}
  return allowed;
}
export async function researchWebsite(input:string):Promise<ResearchResult>{
  const initial=publicUrl(input.trim());initial.search="";
  const checked=new Set<string>();const deadline=Date.now()+27000;
  async function checkDns(host:string){
    if(checked.has(host))return;
    const answers=await Promise.all(['A','AAAA'].map(async type=>{
      const res=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,{headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(4000)});
      if(!res.ok)throw new Error("Could not confirm this public website. Try again or add the lead manually.");
      const data=await res.json() as {Status:number;Answer?:{type:number;data:string}[]};
      if(data.Status!==0)throw new Error("This website could not be found.");return(data.Answer||[]).filter(a=>a.type===1||a.type===28).map(a=>a.data);
    }));
    const ips=answers.flat();if(!ips.length||ips.some(ip=>!publicIp(ip)))throw new Error("This domain does not resolve exclusively to public addresses.");checked.add(host);
  }
  async function load(inputUrl:URL,maxBytes=750000,forPage=false){
    let url=inputUrl;
    for(let redirect=0;redirect<4;redirect++){
      if(Date.now()>deadline)throw new Error("Research timed out. Try a direct contact-page URL.");
      publicUrl(url.href);await checkDns(url.hostname);
      if(forPage&&!await allowed(url))throw new Error("This page excludes automated research in robots.txt.");
      const response=await fetch(url.href,{redirect:'manual',headers:{'User-Agent':'LeadforgeResearch/1.0','Accept':'text/html,text/plain;q=0.9'},signal:AbortSignal.timeout(6000)});
      if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw new Error("Website returned an invalid redirect.");await response.body?.cancel();url=publicUrl(new URL(location,url).href);continue;}
      if(!response.ok){await response.body?.cancel();throw new Error(`Website returned HTTP ${response.status}. You can review it manually.`);}
      if(!/text\/(html|plain)|application\/xhtml/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw new Error("This URL is not a readable web page.");}
      const reader=response.body?.getReader();if(!reader)throw new Error("Website returned an empty page.");let bytes=0,text="";const decoder=new TextDecoder();
      while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>maxBytes){await reader.cancel();throw new Error("This page is too large to research. Try its contact page.");}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();return{url:url.href,text};
    }
    throw new Error("The website redirected too many times.");
  }
  const result:ResearchResult={website:initial.origin,company:initial.hostname.replace(/^www\./,''),description:"",emails:[],pages:[],warnings:[],researchedAt:new Date().toISOString()};
  const robotsByOrigin=new Map<string,Rule[]>();
  async function allowed(url:URL){
    if(!robotsByOrigin.has(url.origin)){
      try{const robot=await load(new URL('/robots.txt',url),256000);robotsByOrigin.set(url.origin,robotsRules(robot.text));}
      catch(error){if(/HTTP 404|HTTP 410/.test((error as Error).message))robotsByOrigin.set(url.origin,[]);else throw new Error("Could not confirm this site's research permissions. Open the website and add its public details manually.");}
    }
    return robotsAllows(url.pathname+url.search,robotsByOrigin.get(url.origin)!);
  }
  if(!await allowed(initial))throw new Error("This website's robots.txt excludes this page from automated research. You can review it manually.");
  async function page(url:URL){
    if(!await allowed(url)){result.warnings.push(`${url.pathname} is excluded by robots.txt.`);return null;}
    const loaded=await load(url,750000,true);const finalUrl=new URL(loaded.url);if(!await allowed(finalUrl))throw new Error("Redirected page excludes automated research.");
    const parsed=parsePage(loaded.text,loaded.url);result.pages.push({url:loaded.url,title:parsed.title||finalUrl.pathname});
    for(const email of parsed.emails)if(!result.emails.some(e=>e.email===email)&&result.emails.length<20)result.emails.push({email,sourceUrl:loaded.url});
    return parsed;
  }
  const home=await page(initial);
  if(home){result.company=home.title.split(/[|–—]/)[0].trim().slice(0,120)||result.company;result.description=home.description;
    for(const link of home.contactLinks.slice(0,2)){if(result.pages.some(p=>p.url===link))continue;try{await page(publicUrl(link));}catch(e){result.warnings.push((e as Error).message);}}
  }
  if(!result.emails.length)result.warnings.push("No readable public email was found. The company may use a contact form, hide addresses, or require JavaScript.");
  return result;
}
