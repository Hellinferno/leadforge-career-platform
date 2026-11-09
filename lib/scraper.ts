import {parseDocument,DomUtils} from 'htmlparser2';
import {publicUrl} from './research.ts';
import {publicReader,PublicReadError} from './public-reader.ts';
import {normalizeLinkedIn} from './career.ts';
import {EMPTY_LEAD,type Lead} from './leads.ts';
export type ScrapedContact={key:string;name:string;company:string;role:string;email:string;phone:string;linkedInUrl:string;website:string;location:string;sourceUrl:string;emailSourceUrl:string;phoneSourceUrl:string;method:string;scope:'person'|'company';evidence:string};
export type CrawlInput={urls:string[];company:string;followLinks:boolean};
export type CrawlResult={contacts:ScrapedContact[];pages:{url:string;title:string;status:'read'|'blocked'|'failed'|'unreadable';reason:string}[];researchedAt:string;warnings:string[];cached?:boolean};
type Node=ReturnType<typeof parseDocument>['children'][number];
const compact=(s:string,max=500)=>s.replace(/\s+/g,' ').trim().slice(0,max);
const elements=(root:Node)=>DomUtils.findAll(()=>true,'children'in root?root.children:[]).slice(0,20000);
function visible(node:Node){let n:Node|null=node,depth=0;while(n&&depth++<100){if('attribs'in n&&(Object.hasOwn(n.attribs,'hidden')||n.attribs['aria-hidden']==='true'||/display\s*:\s*none|visibility\s*:\s*hidden/i.test(n.attribs.style||'')))return false;n=n.parent as Node|null;}return true;}
function text(node:Node,depth=0):string{if(depth>60||!visible(node))return'';if(node.type==='text')return node.data;if('name'in node&&/^(script|style|noscript|template|svg|head)$/i.test(node.name))return'';return 'children'in node?node.children.map(c=>text(c,depth+1)).join(' '):'';}
const prop=(node:Node,key:string)=>elements(node).find(e=>(e.attribs.itemprop||e.attribs.property||'').split(/\s+/).some(p=>p===key||p.endsWith(':'+key)));
const value=(node:Node|undefined)=>node&&'attribs'in node?compact(node.attribs.content||node.attribs.href||text(node)):node?compact(text(node)):'';
function emailValues(raw:string){const normalized=raw.replace(/\s*(?:\[at\]|\(at\))\s*/gi,'@').replace(/\s*(?:\[dot\]|\(dot\))\s*/gi,'.');return [...new Set((normalized.match(/[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,63}/gi)||[]).map(x=>x.toLowerCase()).filter(x=>x.length<=254&&!/\.(png|jpg|svg|webp|gif|woff)$/i.test(x)))].slice(0,30);}
export function publishedPhone(raw:string){let s=raw.replace(/^tel:/i,'').split('?')[0].replace(/;ext=/i,' ext ').trim();try{s=decodeURIComponent(s);}catch{}s=compact(s,60);const main=s.split(/\bext\.?\s*|\bx\s*(?=\d)/i)[0],digits=main.replace(/\D/g,'');return /^\+?[\d\s().-]+$/.test(main)&&digits.length>=7&&digits.length<=15?s:'';}
function contactsWithin(node:Node){const es=elements(node).filter(visible),links=es.filter(e=>e.name==='a'),raw=compact(text(node),120000);const emails=emailValues(raw+' '+links.map(l=>{try{return decodeURIComponent(l.attribs.href||'');}catch{return l.attribs.href||'';}}).filter(x=>/^mailto:/i.test(x)).join(' '));const phones=[...links.filter(l=>/^tel:/i.test(l.attribs.href||'')).map(l=>publishedPhone(l.attribs.href)),...es.filter(e=>/(?:^|\s)telephone(?:\s|$)/.test(e.attribs.itemprop||'')).map(e=>publishedPhone(value(e))),...[...raw.matchAll(/(?:phone|telephone|mobile|call|tel)\s*[:：]?\s*(\+?[\d(][\d\s().-]{6,28}\d)/gi)].map(m=>publishedPhone(m[1]))].filter(Boolean);return{emails,phones:[...new Map(phones.map(p=>[p.replace(/\D/g,''),p])).values()].slice(0,20),links};}
function personName(s:string){return /^[\p{L}\p{M}.'’ -]{3,100}$/u.test(s)&&s.split(/\s+/).length>=2&&s.split(/\s+/).length<=7&&!/contact us|our team|about us|get in touch|support|sales team|talent acquisition|engineering team|read more|learn more/i.test(s);}
function linkedIn(raw:unknown,base:string){for(const candidate of (Array.isArray(raw)?raw:[raw])){if(typeof candidate!=='string')continue;try{const u=new URL(candidate,base);if(/^\/in\//.test(u.pathname))return normalizeLinkedIn(u.href);}catch{}}return'';}
export function validateCrawlInput(raw:unknown):CrawlInput{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid crawl request.');const r=raw as Record<string,unknown>;
  if(!Array.isArray(r.urls)||!r.urls.length||r.urls.length>3||r.urls.some(u=>typeof u!=='string'||u.length>1500))throw new Error('Enter one to three public website or profile URLs.');
  if(typeof r.company!=='string'||r.company.length>120||typeof r.followLinks!=='boolean')throw new Error('Invalid company or crawl options.');
  return{urls:[...new Set(r.urls.map(u=>{const url=publicUrl(String(u).trim());url.hash='';for(const key of [...url.searchParams.keys()])if(/^(utm_|trk|tracking|ref)/i.test(key))url.searchParams.delete(key);return url.href;}))],company:r.company.trim(),followLinks:r.followLinks};
}
export function extractContacts(html:string,url:string,companyContext=''){
  const root=parseDocument(html,{decodeEntities:true}),all=elements(root),contacts:ScrapedContact[]=[],warnings:string[]=[],claimedEmails=new Set<string>(),claimedPhones=new Set<string>();
  const title=compact(DomUtils.textContent(all.find(e=>e.name==='title')||[]),200);
  if(/^(sign[ -]?in|log[ -]?in|access denied|just a moment|robot check|security verification|attention required|forbidden)/i.test(title))throw new PublicReadError('The site returned a sign-in, security, or access-denied page.','blocked');
  const nodes:Record<string,unknown>[]=[];
  function walk(v:unknown,depth=0){if(depth>12||nodes.length>=1000||!v||typeof v!=='object')return;if(Array.isArray(v)){for(const x of v)walk(x,depth+1);return;}const o=v as Record<string,unknown>;nodes.push(o);for(const x of Object.values(o))if(x&&typeof x==='object')walk(x,depth+1);}
  for(const script of all.filter(e=>e.name==='script'&&(e.attribs.type||'').toLowerCase()==='application/ld+json').slice(0,20)){const raw=DomUtils.textContent(script);if(raw.length>180000)continue;try{walk(JSON.parse(raw));}catch{warnings.push('A structured-data block could not be read.');}}
  const ids=new Map(nodes.filter(n=>typeof n['@id']==='string').map(n=>[String(n['@id']),n]));
  const resolve=(v:unknown):Record<string,unknown>|undefined=>v&&typeof v==='object'&&!Array.isArray(v)?(ids.get(String((v as Record<string,unknown>)['@id']))||v)as Record<string,unknown>:undefined;
  const str=(v:unknown,max=300)=>typeof v==='string'?compact(v,max):'';
  const isType=(o:Record<string,unknown>,type:string)=>(Array.isArray(o['@type'])?o['@type']:[o['@type']]).some(t=>typeof t==='string'&&(t===type||t.endsWith('/'+type)));
  const organization=nodes.find(n=>isType(n,'Organization')&&!isType(n,'Person'));
  const company=str(organization?.name,120)||companyContext||new URL(url).hostname.replace(/^www\./,'');
  function add(data:Partial<ScrapedContact> & {scope:'person'|'company';method:string}){
    const row:ScrapedContact={key:'',name:'',company,role:'',email:'',phone:'',linkedInUrl:'',website:new URL(url).origin,location:'',sourceUrl:url,emailSourceUrl:'',phoneSourceUrl:'',evidence:'',...data};
    if(row.email){row.emailSourceUrl=url;claimedEmails.add(row.email);}if(row.phone){row.phoneSourceUrl=url;claimedPhones.add(row.phone.replace(/\D/g,''));}
    const old=contacts.find(c=>row.linkedInUrl&&c.linkedInUrl===row.linkedInUrl||row.scope==='person'&&c.scope==='person'&&c.name.toLowerCase()===row.name.toLowerCase()&&c.company.toLowerCase()===row.company.toLowerCase());
    if(old){for(const key of ['email','phone','role','linkedInUrl','emailSourceUrl','phoneSourceUrl']as const)if(!old[key]&&row[key])old[key]=row[key];return;}
    row.key=[row.scope,row.name,row.email,row.phone,row.linkedInUrl,url].join('|');contacts.push(row);
  }
  for(const n of nodes.filter(n=>isType(n,'Person')).slice(0,100)){
    const name=str(n.name,100)||[str(n.givenName,50),str(n.familyName,50)].filter(Boolean).join(' ');if(!personName(name))continue;
    const cp=(Array.isArray(n.contactPoint)?n.contactPoint:[n.contactPoint]).map(resolve).filter(Boolean),email=emailValues([str(n.email),...cp.map(c=>str(c?.email))].join(' '))[0]||'',phone=publishedPhone(str(n.telephone))||cp.map(c=>publishedPhone(str(c?.telephone))).find(Boolean)||'',works=resolve(n.worksFor),location=resolve(n.workLocation)||resolve(n.address);
    add({scope:'person',name,company:str(works?.name,120)||company,role:str(n.jobTitle),email,phone,linkedInUrl:linkedIn([...(Array.isArray(n.sameAs)?n.sameAs:[n.sameAs]),n.url],url),location:str(location?.addressLocality,100),method:'Person structured data',evidence:'The page explicitly associates these fields with this named person.'});
  }
  const cards=all.filter(e=>visible(e)&&(/(?:^|\s)(?:vcard|h-card|team-member(?:-card)?|staff-member|person-card|member-card|profile-card|employee-card)(?:\s|$)/i.test(e.attribs.class||'')||/(?:schema.org\/Person)(?:\s|$)/i.test(e.attribs.itemtype||'')||e.attribs.typeof==='Person')).slice(0,150);
  const cardSet=new Set(cards);
  for(const card of cards){if(elements(card).some(e=>cardSet.has(e)))continue;const content=compact(text(card),6000);if(content.length>5000)continue;const es=elements(card),named=prop(card,'name')||es.find(e=>/(?:^|\s)(?:fn|p-name|name|member-name|person-name|team-member-name)(?:\s|$)/i.test(e.attribs.class||''))||es.find(e=>/^h[2-4]$/.test(e.name));const name=value(named);if(!personName(name))continue;const data=contactsWithin(card),role=value(prop(card,'jobTitle'))||value(es.find(e=>/(?:^|\s)(?:role|title|job-title|position|p-job-title)(?:\s|$)/i.test(e.attribs.class||'')));
    add({scope:'person',name,role,email:data.emails[0]||'',phone:data.phones[0]||'',linkedInUrl:linkedIn(data.links.map(l=>l.attribs.href),url),method:'Named person card',evidence:'Name and contact fields occur together inside one person card on the page.'});
  }
  // Generic profile links can identify people in otherwise unstructured team
  // cards. They do not establish ownership of nearby emails or office phones.
  for(const anchor of all.filter(e=>e.name==='a'&&visible(e)&&linkedIn(e.attribs.href,url)).slice(0,100)){
    let container=anchor.parent as Node|null;
    for(let depth=0;container&&depth<4;depth++,container=container.parent as Node|null){
      if('name'in container&&/^(html|body|main|nav|footer)$/i.test(container.name))break;
      const es=elements(container),headings=es.filter(e=>/^h[1-4]$/.test(e.name)&&personName(value(e)));
      if(headings.length===1&&es.filter(e=>e.name==='a'&&linkedIn(e.attribs.href,url)).length===1&&compact(text(container),2200).length<2000){
        add({scope:'person',name:value(headings[0]),linkedInUrl:linkedIn(anchor.attribs.href,url),method:'Profile-linked heading',evidence:'A name and LinkedIn profile occur in one small page block. Nearby email/phone ownership was not established.'});break;
      }
    }
  }
  const publicData=contactsWithin(root);
  for(const email of publicData.emails.filter(e=>!claimedEmails.has(e)))add({scope:'company',email,role:/^(career|jobs|hr|recruit|talent)/i.test(email)?'Published hiring inbox':'Published company inbox',method:'Published email',evidence:'Published on the page without an explicit association to a named person.'});
  for(const phone of publicData.phones.filter(p=>!claimedPhones.has(p.replace(/\D/g,''))))add({scope:'company',phone,role:'Published company phone',method:'Published phone',evidence:'Published on the page without an explicit association to a named person.'});
  // Organization JSON-LD may publish contact details that are not in visible text.
  for(const n of nodes.filter(n=>isType(n,'Organization'))){const cps=(Array.isArray(n.contactPoint)?n.contactPoint:[n.contactPoint]).map(resolve).filter(Boolean);for(const item of [n,...cps]){const email=emailValues(str(item?.email))[0],phone=publishedPhone(str(item?.telephone));if(email&&!claimedEmails.has(email))add({scope:'company',company:str(n.name,120)||company,email,role:'Published company inbox',method:'Organization structured data',evidence:'The page associates this address with the organization, not a named person.'});if(phone&&!claimedPhones.has(phone.replace(/\D/g,'')))add({scope:'company',company:str(n.name,120)||company,phone,role:'Published company phone',method:'Organization structured data',evidence:'The page associates this phone with the organization, not a named person.'});}}
  const links=all.filter(e=>e.name==='a'&&visible(e)).flatMap(a=>{try{const u=publicUrl(new URL(a.attribs.href||'',url).href),label=compact(text(a),120);if(u.origin!==new URL(url).origin||u.search||/\.(pdf|zip|jpe?g|png|svg|webp|css|js)$/i.test(u.pathname)||!/(?:contact|about|team|people|staff|leadership|career|recruit|faculty|directory)/i.test(u.pathname+' '+label))return[];return[u.href];}catch{return[];}});
  if(contacts.length===0&&/javascript|enable scripts/i.test(compact(text(root),600)))warnings.push('This page may require JavaScript; only returned HTML can be read.');
  return{title,company,contacts:contacts.slice(0,100),links:[...new Set(links)].slice(0,20),warnings};
}
export async function scrapePublicContacts(input:CrawlInput,fetcher:typeof fetch=fetch):Promise<CrawlResult>{
  const reader=publicReader(fetcher),queue=[...input.urls],seen=new Set<string>(),origins=new Map<string,number>(),result:CrawlResult={contacts:[],pages:[],researchedAt:new Date().toISOString(),warnings:[]};
  while(queue.length&&result.pages.length<6&&reader.remaining()>500){
    const url=queue.shift()!;if(seen.has(url))continue;seen.add(url);const origin=new URL(url).origin,count=origins.get(origin)||0;if(count>=4)continue;origins.set(origin,count+1);
    try{const loaded=await reader.read(url);seen.add(loaded.url);const parsed=extractContacts(loaded.html,loaded.url,input.company);result.pages.push({url:loaded.url,title:parsed.title||new URL(loaded.url).pathname,status:'read',reason:''});result.warnings.push(...parsed.warnings);
      for(const row of parsed.contacts){const old=result.contacts.find(c=>row.linkedInUrl&&c.linkedInUrl===row.linkedInUrl||row.email&&c.email===row.email&&row.scope===c.scope&&(row.scope==='company'||row.name.toLowerCase()===c.name.toLowerCase())||row.scope==='person'&&c.scope==='person'&&row.name.toLowerCase()===c.name.toLowerCase()&&row.company.toLowerCase()===c.company.toLowerCase()||row.scope==='company'&&row.phone&&c.phone.replace(/\D/g,'')===row.phone.replace(/\D/g,'')&&c.company===row.company);if(old){for(const field of ['email','phone','linkedInUrl','role','emailSourceUrl','phoneSourceUrl']as const)if(!old[field]&&row[field])old[field]=row[field];}else if(result.contacts.length<150)result.contacts.push(row);}
      if(input.followLinks){const ranked=parsed.links.sort((a,b)=>Number(/contact|team|people|staff/i.test(new URL(b).pathname))-Number(/contact|team|people|staff/i.test(new URL(a).pathname)));for(const link of ranked)if(!seen.has(link)&&!queue.includes(link)&&queue.length<20)queue.push(link);}
    }catch(error){const e=error as Error;result.pages.push({url,title:new URL(url).hostname,status:error instanceof PublicReadError?error.kind:'failed',reason:/abort|timeout/i.test(e.name)?'This page timed out.':e.message.slice(0,250)});}
  }
  if(queue.length)result.warnings.push('The run reached its page or time budget. Run a specific team/contact URL to cover more.');
  if(!result.contacts.length)result.warnings.push('No published contacts were extracted. Check the page outcomes: a blocked page is not evidence that no contact exists.');
  result.warnings=[...new Set(result.warnings)].slice(0,10);return result;
}
export function contactFromScrape(row:ScrapedContact,at:string,jobTitle=''){
  return{...EMPTY_LEAD,name:row.name,company:row.company,role:row.role,email:row.email,phone:row.phone,emailSourceUrl:row.emailSourceUrl,phoneSourceUrl:row.phoneSourceUrl,website:row.website,country:row.location,linkedInUrl:row.linkedInUrl,sourceUrl:row.sourceUrl,sourceKind:'custom_scraper',researchedAt:at,contactType:row.scope==='company'?'company_inbox':/recruit|talent acquisition|human resources/i.test(row.role)?'recruiter':'employee',jobTitle,notes:`Custom public-page scraper · ${at}\nExtraction: ${row.method}.\n${row.evidence}\nSource: ${row.sourceUrl}\nEmail/phone are published, not deliverability-verified. Current employment and hiring relevance need review.`};
}
export function matchingSavedContact(row:ScrapedContact,leads:Lead[]){return leads.find(l=>row.linkedInUrl&&l.linkedInUrl===row.linkedInUrl||row.email&&l.email===row.email||row.scope==='person'&&l.name.trim().toLowerCase()===row.name.toLowerCase()&&l.company.trim().toLowerCase()===row.company.toLowerCase()||row.scope==='company'&&row.phone&&l.contactType==='company_inbox'&&l.phone?.replace(/\D/g,'')===row.phone.replace(/\D/g,'')&&l.company.toLowerCase()===row.company.toLowerCase());}
export function reviewScrapedUpdate(lead:Lead,found:ReturnType<typeof contactFromScrape>){
  return{...lead,email:found.email||lead.email,phone:found.phone||lead.phone,emailSourceUrl:found.email?found.emailSourceUrl:lead.emailSourceUrl,phoneSourceUrl:found.phone?found.phoneSourceUrl:lead.phoneSourceUrl,linkedInUrl:found.linkedInUrl||lead.linkedInUrl,website:lead.website||found.website,sourceUrl:found.sourceUrl,sourceKind:found.sourceKind,researchedAt:found.researchedAt,notes:(lead.notes+'\n\n'+found.notes).slice(-5000)};
}
