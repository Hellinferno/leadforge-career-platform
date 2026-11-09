import test from 'node:test';
import assert from 'node:assert/strict';
import {extractContacts,publishedPhone,scrapePublicContacts,validateCrawlInput,contactFromScrape,matchingSavedContact,reviewScrapedUpdate} from '../lib/scraper.ts';
import {EMPTY_LEAD,validateLead,exportCsv,parseCsv,dedupeKey} from '../lib/leads.ts';
import {publicIp} from '../lib/research.ts';
const origin='https://acme.com',page=origin+'/team';
const structured=`<title>Acme team</title><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Organization',name:'Acme'},{'@type':'Person',name:'Asha Rao',jobTitle:'Technical Recruiter',worksFor:{'@type':'Organization',name:'Acme'},email:'mailto:asha@acme.com',telephone:'+91 98765 43210',sameAs:'https://in.linkedin.com/in/asha?trk=public'}]})}</script><footer><a href="mailto:careers@acme.com">Careers</a><a href="tel:+1-202-555-0123">Office</a></footer>`;
test('Structured people retain explicit emails, phones and LinkedIn links while office details remain company contacts',()=>{
  const data=extractContacts(structured,page);const person=data.contacts.find(c=>c.scope==='person');assert.equal(person.name,'Asha Rao');assert.equal(person.email,'asha@acme.com');assert.equal(person.phone,'+91 98765 43210');assert.equal(person.linkedInUrl,'https://www.linkedin.com/in/asha');assert.equal(person.emailSourceUrl,page);assert.equal(person.phoneSourceUrl,page);
  assert.ok(data.contacts.some(c=>c.scope==='company'&&c.email==='careers@acme.com'&&!c.name));assert.ok(data.contacts.some(c=>c.scope==='company'&&c.phone==='+1-202-555-0123'));
});
test('A named person card associates only its own details, excluding hidden/script/comment data',()=>{
  const html='<title>People</title><article class="team-member"><h3>Bela Shah</h3><p class="role">Data Scientist</p><a href="mailto:bela%40acme.com">Email</a><a href="tel:%2B44%2020%207946%200123">Call</a><p hidden>hidden@acme.com</p></article><article class="team-member"><h3>Chirag Mehta</h3><p class="role">Engineer</p></article><footer>company@acme.com</footer><script>secret@acme.com</script><!-- no@acme.com --><span style="display: none">hidden2@acme.com</span>';
  const data=extractContacts(html,page,'Acme'),bela=data.contacts.find(c=>c.name==='Bela Shah'),chirag=data.contacts.find(c=>c.name==='Chirag Mehta');assert.equal(bela.email,'bela@acme.com');assert.equal(bela.phone,'+44 20 7946 0123');assert.equal(bela.role,'Data Scientist');assert.equal(chirag.email,'');assert.equal(chirag.phone,'');assert.ok(data.contacts.some(c=>c.email==='company@acme.com'&&c.scope==='company'));assert.ok(!JSON.stringify(data).includes('secret@'));assert.ok(!JSON.stringify(data).includes('hidden@'));assert.ok(!JSON.stringify(data).includes('no@'));
});
test('Nested person wrappers do not borrow a different person’s phone',()=>{
  const data=extractContacts('<div class="h-card"><h3>Asha Rao</h3><div class="h-card"><h3>Bela Shah</h3><a href="tel:+12025550123">Phone</a></div></div>',page,'Acme');assert.ok(!data.contacts.some(c=>c.name==='Asha Rao'&&c.phone));assert.ok(data.contacts.some(c=>c.name==='Bela Shah'&&c.phone));
});
test('An unstructured profile-linked name is discovered without attributing nearby company contact details',()=>{
  const data=extractContacts('<article><h3>Asha Rao</h3><a href="https://www.linkedin.com/in/asha">Profile</a><a href="mailto:careers@acme.com">Careers</a></article>',page,'Acme');const person=data.contacts.find(c=>c.scope==='person');assert.equal(person.name,'Asha Rao');assert.equal(person.email,'');assert.ok(data.contacts.some(c=>c.scope==='company'&&c.email==='careers@acme.com'));
  for(const ip of ['2001:db8::1','2002:a00:1::1','3fff::1'])assert.equal(publicIp(ip),false);assert.equal(publicIp('2606:4700:4700::1111'),true);
});
test('ContactPoint references resolve only within their named owner and shared organization details stay separate',()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Person',name:'Asha Rao',contactPoint:{'@id':'#asha-contact'}},{'@id':'#asha-contact','@type':'ContactPoint',email:'asha@acme.com'},{'@type':'Person',name:'Bela Shah'},{'@type':'Organization',name:'Acme',contactPoint:{'@type':'ContactPoint',email:'support@acme.com',telephone:'+12025550123'}}]})+'</script>';
  const data=extractContacts(html,page,'Acme');assert.equal(data.contacts.find(c=>c.name==='Asha Rao').email,'asha@acme.com');assert.equal(data.contacts.find(c=>c.name==='Bela Shah').email,'');assert.ok(data.contacts.some(c=>c.scope==='company'&&c.email==='support@acme.com'));
});
test('Phone extraction validates published numbers and visible obfuscated emails without guessing patterns',()=>{
  assert.equal(publishedPhone('tel:+91-98765-43210;ext=12'),'+91-98765-43210 ext 12');assert.equal(publishedPhone('2026-10-15'),'2026-10-15');assert.equal(publishedPhone('123'),'');assert.equal(publishedPhone('++123456789'),'');assert.equal(publishedPhone('12345678901234567'),'');
  const data=extractContacts('<p>jobs [at] acme [dot] com</p><p>2026-10-15</p>',page,'Acme');assert.ok(data.contacts.some(c=>c.email==='jobs@acme.com'));assert.ok(!data.contacts.some(c=>c.phone));
});
test('Source validation bounds requests and blocks local, credentialed or non-web inputs',()=>{
  assert.deepEqual(validateCrawlInput({urls:['acme.com/team?utm_source=x#bio'],company:' Acme ',followLinks:true}),{urls:[page],company:'Acme',followLinks:true});
  for(const patch of [{urls:[]},{urls:['a.com','b.com','c.com','d.com']},{urls:['http://127.0.0.1']},{urls:['https://user:pass@acme.com']},{followLinks:'yes'},{company:123}])assert.throws(()=>validateCrawlInput({urls:[page],company:'Acme',followLinks:true,...patch}));
});
test('Login/challenge pages fail as blocked, while a readable page with no contacts is distinct',()=>{
  assert.throws(()=>extractContacts('<title>Just a moment...</title><p>Checking your browser</p>',page),error=>error.kind==='blocked');assert.equal(extractContacts('<title>Acme</title><p>Welcome</p>',page).contacts.length,0);
});
function transport(pages,robots='User-agent: *\nAllow: /',ips=['93.184.216.34']){const calls=[];const fetcher=async(input,options)=>{const u=new URL(input);calls.push(u.href);if(u.hostname==='cloudflare-dns.com')return Response.json({Status:0,Answer:u.searchParams.get('type')==='A'?ips.map(data=>({type:1,data})):[]});assert.equal(options.redirect,'manual');assert.match(options.headers['User-Agent'],/^LeadforgeResearch\//);if(u.pathname==='/robots.txt')return new Response(robots,{headers:{'content-type':'text/plain'}});const value=pages[u.href];if(value instanceof Response)return new Response(null,{status:value.status,headers:value.headers});return value!==undefined?new Response(value,{headers:{'content-type':'text/html'}}):new Response('Not found',{status:404});};return{fetcher,calls};}
test('A direct crawl discovers contact/team links, never follows an off-domain link, and preserves field-level sources',async()=>{
  const t=transport({[origin+'/']:'<title>Acme</title><a href="/team">Team</a><a href="/contact">Contact</a><a href="https://evil.com/team">Other team</a>',[page]:structured,[origin+'/contact']:'<title>Contact</title><a href="mailto:hr@acme.com">Hiring</a>'});const result=await scrapePublicContacts({urls:[origin+'/'],company:'Acme',followLinks:true},t.fetcher);assert.equal(result.pages.filter(p=>p.status==='read').length,3);assert.ok(result.contacts.some(c=>c.email==='asha@acme.com'&&c.emailSourceUrl===page));assert.ok(result.contacts.some(c=>c.email==='hr@acme.com'&&c.emailSourceUrl===origin+'/contact'));assert.ok(!t.calls.some(u=>u.includes('evil.com')));assert.ok(!t.calls.some(u=>u.includes('serpapi')));
});
test('Robots exclusions, private DNS and unsafe redirects stop before protected content is fetched',async()=>{
  const denied=transport({[page]:structured},'User-agent: *\nDisallow: /');const blocked=await scrapePublicContacts({urls:[page],company:'Acme',followLinks:true},denied.fetcher);assert.equal(blocked.pages[0].status,'blocked');assert.equal(blocked.contacts.length,0);assert.ok(!denied.calls.includes(page));
  const local=transport({[page]:structured},'User-agent: *\nAllow: /',['10.0.0.1']);const localResult=await scrapePublicContacts({urls:[page],company:'Acme',followLinks:false},local.fetcher);assert.equal(localResult.pages[0].status,'blocked');assert.ok(!local.calls.includes(page));
  const redirect=transport({[page]:new Response('',{status:302,headers:{Location:'http://169.254.169.254/metadata'}})});const redirected=await scrapePublicContacts({urls:[page],company:'Acme',followLinks:false},redirect.fetcher);assert.notEqual(redirected.pages[0].status,'read');assert.ok(!redirect.calls.some(u=>u.startsWith('http://169.254')));
});
test('The crawler has page limits and distinguishes blocked HTTP from successful empty reads',async()=>{
  const pages={[origin+'/']:'<title>Acme</title>'+Array.from({length:12},(_,i)=>`<a href="/team-${i}">Team ${i}</a>`).join('')};for(let i=0;i<12;i++)pages[origin+'/team-'+i]='<p>People page</p>';const t=transport(pages);const result=await scrapePublicContacts({urls:[origin+'/'],company:'Acme',followLinks:true},t.fetcher);assert.ok(result.pages.length<=4);
  const failed=transport({[page]:new Response('Denied',{status:403})});const failResult=await scrapePublicContacts({urls:[page],company:'Acme',followLinks:false},failed.fetcher);assert.equal(failResult.pages[0].status,'blocked');
});
test('DNS transport failure can use the fallback resolver but an explicit private answer cannot',async()=>{
  const normal=transport({[page]:structured}),calls=[];const fallback=async(input,options)=>{const u=new URL(input);calls.push(u.hostname);if(u.hostname==='cloudflare-dns.com')throw new Error('Resolver timed out');if(u.hostname==='dns.google')return Response.json({Status:0,Answer:u.searchParams.get('type')==='A'?[{type:1,data:'93.184.216.34'}]:[]});return normal.fetcher(input,options);};const result=await scrapePublicContacts({urls:[page],company:'Acme',followLinks:false},fallback);assert.equal(result.pages[0].status,'read');assert.ok(calls.includes('dns.google'));
  const privateTransport=transport({[page]:structured},'User-agent: *\nAllow: /',['127.0.0.1']);const denied=await scrapePublicContacts({urls:[page],company:'Acme',followLinks:false},privateTransport.fetcher);assert.equal(denied.pages[0].status,'blocked');assert.ok(!privateTransport.calls.some(url=>url.includes('dns.google')));
});
test('Scraped records round-trip phone/source evidence through CSV and update matching saved people only',()=>{
  const person=extractContacts(structured,page).contacts.find(c=>c.scope==='person'),record=validateLead(contactFromScrape(person,'2026-10-15T17:00:00Z','ML Internship'));assert.equal(record.emailSourceUrl,page);assert.equal(record.sourceKind,'custom_scraper');const roundTrip=validateLead(parseCsv(exportCsv([record]))[0]);assert.equal(roundTrip.phone,record.phone);assert.equal(roundTrip.phoneSourceUrl,page);
  const lead={...EMPTY_LEAD,id:'one',name:'Asha Rao',company:'Acme',createdAt:'now',updatedAt:'now'};assert.equal(matchingSavedContact(person,[lead]).id,'one');assert.equal(matchingSavedContact({...person,name:'Other Person',email:'',linkedInUrl:''},[lead]),undefined);
  const office={...person,scope:'company',name:'',email:'',linkedInUrl:''};assert.equal(matchingSavedContact(office,[lead]),undefined);
  assert.notEqual(dedupeKey({...record,email:'',linkedInUrl:'',phone:'+12025550123'}),dedupeKey({...record,email:'',linkedInUrl:'',phone:'+12025550124'}));assert.throws(()=>validateLead({...record,phone:'not a phone'}));
});
test('Reviewing contact enrichment preserves the saved career context, stage, classification and next action',()=>{
  const person=extractContacts(structured,page).contacts.find(c=>c.scope==='person'),found=contactFromScrape(person,'2026-10-15T17:00:00Z','Different target');
  const lead={...EMPTY_LEAD,id:'one',name:'Asha Rao',company:'Acme',role:'Confirmed recruiter',contactType:'recruiter',relevance:'Discuss my project',jobTitle:'Original opening',jobUrl:'https://acme.com/jobs/1',stage:'do_not_contact',nextActionAt:'2026-11-01',country:'India',createdAt:'now',updatedAt:'now'};
  const update=reviewScrapedUpdate(lead,found);for(const key of ['role','contactType','relevance','jobTitle','jobUrl','stage','nextActionAt','country'])assert.equal(update[key],lead[key]);assert.equal(update.email,found.email);assert.equal(update.phone,found.phone);assert.equal(update.emailSourceUrl,page);
});
