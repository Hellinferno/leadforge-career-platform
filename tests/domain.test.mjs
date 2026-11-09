import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY_LEAD,DEFAULT_PROFILE,parseCsv,validateLead,dedupeKey,exportCsv,makeDrafts,normalizeWebsite} from '../lib/leads.ts';
import {parsePage,publicIp,publicUrl,decodeHtml,robotsRules,robotsAllows,researchWebsite} from '../lib/research.ts';

test('CSV handles BOM, aliases, embedded commas, quotes and newlines',()=>{
  const rows=parseCsv('\uFEFFcompany_name,full_name,email_address,notes\r\n"Acme, Inc.","Ravi","HELLO@ACME.COM","First line\nSecond ""quoted"" line"');
  assert.equal(rows[0].company,'Acme, Inc.');assert.equal(rows[0].name,'Ravi');assert.equal(rows[0].notes,'First line\nSecond "quoted" line');assert.equal(validateLead(rows[0]).email,'hello@acme.com');
});
test('CSV rejects missing companies, malformed quotes, duplicate columns and bad row lengths',()=>{
  for(const bad of ['name,email\nRavi,r@acme.com','company,company_name\nAcme,Acme','company,name\nAcme','company\n"Acme','company\n"Acme"junk'])assert.throws(()=>parseCsv(bad));
  assert.throws(()=>validateLead({company:''}));assert.throws(()=>validateLead({company:'Acme',email:'fake'}));
  assert.throws(()=>validateLead({company:'Acme',nextActionAt:'2026-02-30'}));assert.throws(()=>validateLead({company:'Acme',stage:'random'}));
});
test('Export is safely quoted, retains source fields and can be imported again',()=>{
  const lead={...EMPTY_LEAD,id:'a',company:'Acme, Inc.',name:'Ravi',notes:'One\n"Two"',sourceUrl:'https://acme.com/contact',nextActionAt:'2026-10-15',createdAt:'',updatedAt:''};
  const restored=validateLead(parseCsv(exportCsv([lead]))[0]);assert.equal(restored.notes,lead.notes);assert.equal(restored.company,lead.company);assert.equal(restored.sourceUrl,lead.sourceUrl);assert.equal(restored.nextActionAt,lead.nextActionAt);
  assert.match(exportCsv([{...lead,name:'=HYPERLINK("x")'}]),/'=HYPERLINK/);
});
test('Dedupe normalizes emails; company-only contacts retain separate roles',()=>{
  assert.equal(dedupeKey({...EMPTY_LEAD,company:'A',email:' Hello@Acme.com '}),dedupeKey({...EMPTY_LEAD,company:'B',email:'hello@acme.com'}));
  assert.notEqual(dedupeKey({...EMPTY_LEAD,company:'Acme',role:'Sales'}),dedupeKey({...EMPTY_LEAD,company:'Acme',role:'Support'}));
});
test('URL normalization does not allow credential URLs or non-web schemes',()=>{
  assert.equal(normalizeWebsite('acme.com'),'https://acme.com/');
  for(const bad of ['javascript:alert(1)','ftp://acme.com','https://me:secret@acme.com'])assert.throws(()=>normalizeWebsite(bad));
});
test('Career drafts use exact role, candidate evidence, and links; suppressed contacts are excluded',()=>{
  const lead={...EMPTY_LEAD,id:'a',company:'Acme',name:'Asha Kumar',jobTitle:'Machine Learning Intern',jobUrl:'https://acme.com/jobs/1',createdAt:'',updatedAt:''};
  const profile={...DEFAULT_PROFILE,evidence:'Built an invoice extraction project with a documented evaluation.',resumeUrl:'https://resume.example/ravi',portfolioUrl:'https://github.com/ravi'};
  const drafts=makeDrafts(lead,profile,'referral');assert.equal(drafts.length,3);assert.ok(drafts[0].body.length<=200);assert.match(drafts[1].body,/Hi Asha,/);assert.match(drafts[1].body,/invoice extraction/);assert.match(drafts[1].body,/https:\/\/acme.com\/jobs\/1/);assert.match(drafts[1].body,/would you be comfortable referring/);assert.match(drafts[1].subject,/Machine Learning Intern/);
  assert.match(makeDrafts({...lead,contactType:'recruiter'},profile)[1].body,/Are you hiring/);assert.deepEqual(makeDrafts({...lead,stage:'do_not_contact'},profile),[]);assert.deepEqual(makeDrafts({...lead,stage:'closed'},profile),[]);
});
test('Research extracts published emails and links without reading script/style/comment data',()=>{
  const page=parsePage('<title>Acme &amp; Co | Home</title><meta content="Useful tools" name="description"><a href="mailto:Sales%40acme.com?subject=Hi">Email us</a><p>support&#64;acme.com</p><script>hidden@acme.com</script><style>hidden2@acme.com</style><!--hidden3@acme.com--><a href="/contact">Contact</a><a href="https://other.com/contact">External</a><a href="/guide.pdf">Guide</a>','https://acme.com/');
  assert.deepEqual(page.emails,['sales@acme.com','support@acme.com']);assert.deepEqual(page.contactLinks,['https://acme.com/contact']);assert.equal(page.title,'Acme & Co | Home');assert.equal(page.description,'Useful tools');assert.equal(decodeHtml('x&#x40;y.com'),'x@y.com');
});
test('Research rejects local/reserved hosts and non-public DNS answers',()=>{
  for(const host of ['127.0.0.1','http://169.254.169.254','localhost','http://[::1]','https://acme.com:8443','https://user:pass@acme.com','hello.local','127.0.0.1.nip.io'])assert.throws(()=>publicUrl(host));
  for(const ip of ['10.0.0.1','127.0.0.1','172.16.1.2','192.168.1.1','169.254.169.254','100.64.0.1','::1','fd00::1','fe80::1','::ffff:127.0.0.1'])assert.equal(publicIp(ip),false,ip);
  assert.equal(publicIp('8.8.8.8'),true);assert.equal(publicIp('2606:4700:4700::1111'),true);
});
test('robots.txt uses longest matching rules and bot-specific groups',()=>{
  const rules=robotsRules('User-agent: *\nDisallow: /private\nAllow: /private/public\nDisallow: /*.pdf$');
  assert.equal(robotsAllows('/about',rules),true);assert.equal(robotsAllows('/private/contact',rules),false);assert.equal(robotsAllows('/private/public/team',rules),true);assert.equal(robotsAllows('/annual.pdf',rules),false);
  const bot=robotsRules('User-agent: *\nDisallow: /\nUser-agent: LeadforgeResearch\nAllow: /');assert.equal(robotsAllows('/contact',bot),true);
});
test('Full research checks DNS and robots, reads contact pages, and preserves evidence',async()=>{
  const saved=globalThis.fetch;const requests=[];
  globalThis.fetch=async(input)=>{const url=new URL(input);requests.push(url.href);
    if(url.hostname==='cloudflare-dns.com')return Response.json({Status:0,Answer:url.searchParams.get('type')==='A'?[{type:1,data:'8.8.8.8'}]:[]});
    if(url.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /private',{headers:{'Content-Type':'text/plain'}});
    if(url.pathname==='/')return new Response('<title>Acme | Home</title><a href="/contact">Contact</a><a href="/private/team">Team</a>',{headers:{'Content-Type':'text/html'}});
    if(url.pathname==='/contact')return new Response('<a href="mailto:hello@acme.com">Contact us</a>',{headers:{'Content-Type':'text/html'}});
    throw new Error('Unexpected URL '+url.href);
  };
  try{const result=await researchWebsite('https://acme.com');assert.equal(result.company,'Acme');assert.deepEqual(result.emails,[{email:'hello@acme.com',sourceUrl:'https://acme.com/contact'}]);assert.equal(result.pages.length,2);assert.ok(!requests.some(r=>r.includes('/private/team')));assert.ok(result.warnings.some(w=>w.includes('robots.txt')));}
  finally{globalThis.fetch=saved;}
});
test('Private DNS and redirected blocked pages are rejected before their content is fetched',async()=>{
  const saved=globalThis.fetch;let privatePageRead=false;
  globalThis.fetch=async(input)=>{const url=new URL(input);if(url.hostname==='cloudflare-dns.com')return Response.json({Status:0,Answer:url.searchParams.get('type')==='A'?[{type:1,data:'127.0.0.1'}]:[]});privatePageRead=true;throw new Error('Should not read private page');};
  try{await assert.rejects(researchWebsite('acme.com'));assert.equal(privatePageRead,false);}finally{globalThis.fetch=saved;}
  const requests=[];
  globalThis.fetch=async(input)=>{const url=new URL(input);requests.push(url.href);
    if(url.hostname==='cloudflare-dns.com')return Response.json({Status:0,Answer:url.searchParams.get('type')==='A'?[{type:1,data:'8.8.8.8'}]:[]});
    if(url.pathname==='/robots.txt')return new Response(url.hostname==='blocked.com'?'User-agent: *\nDisallow: /':'User-agent: *\nAllow: /',{headers:{'Content-Type':'text/plain'}});
    if(url.hostname==='acme.com')return new Response(null,{status:302,headers:{Location:'https://blocked.com/private'}});
    throw new Error('Forbidden page was fetched');
  };
  try{await assert.rejects(researchWebsite('acme.com'),/robots.txt/);assert.ok(!requests.includes('https://blocked.com/private'));}finally{globalThis.fetch=saved;}
});
