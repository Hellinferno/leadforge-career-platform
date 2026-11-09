import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTACT_TYPES,normalizeLinkedIn,searchLinks,validateJob,jobKey,EMPTY_JOB} from '../lib/career.ts';
import {EMPTY_LEAD,DEFAULT_PROFILE,validateLead,parseCsv,exportCsv,makeDrafts} from '../lib/leads.ts';

test('LinkedIn profile URLs are validated, canonicalized, and can round-trip through CSV',()=>{
  assert.equal(normalizeLinkedIn('https://uk.linkedin.com/in/ravi/?trk=test#about'),'https://www.linkedin.com/in/ravi');
  assert.equal(normalizeLinkedIn('https://www.linkedin.com/in/ravi/details/experience'),'https://www.linkedin.com/in/ravi');
  for(const bad of ['https://linkedin.com.evil.com/in/ravi','https://evil.com/in/ravi','https://user:password@linkedin.com/in/ravi','javascript:alert(1)','https://linkedin.com/search/results/people/'])assert.throws(()=>normalizeLinkedIn(bad));
  const record={...EMPTY_LEAD,id:'1',company:'Acme',name:'Asha',linkedInUrl:'https://www.linkedin.com/in/asha',jobTitle:'AI Intern',jobUrl:'https://acme.com/jobs/1',contactType:'recruiter',relevance:'The recruiting team lists this role.',createdAt:'',updatedAt:''};
  const restored=validateLead(parseCsv(exportCsv([record]))[0]);assert.equal(restored.linkedInUrl,record.linkedInUrl);assert.equal(restored.contactType,'recruiter');assert.equal(restored.jobTitle,record.jobTitle);assert.equal(restored.jobUrl,record.jobUrl);assert.equal(restored.relevance,record.relevance);
  assert.throws(()=>validateLead({...record,contactType:'__proto__'}));
});
test('Legacy saved contact stages are preserved as career equivalents',()=>{
  assert.equal(validateLead({...EMPTY_LEAD,company:'Acme',stage:'meeting'}).stage,'interview');assert.equal(validateLead({...EMPTY_LEAD,company:'Acme',stage:'won'}).stage,'offer');
});
test('Career searches point to the right destinations with user-entered context',()=>{
  const links=searchLinks('Acme & Co','Data Science Internship','Bengaluru','recruiter');
  const people=new URL(links.linkedinPeople),jobs=new URL(links.linkedinJobs),publicSearch=new URL(links.publicPeople);
  assert.equal(people.hostname,'www.linkedin.com');assert.equal(people.pathname,'/search/results/people/');assert.match(people.searchParams.get('keywords'),/Acme & Co/);assert.match(people.searchParams.get('keywords'),/talent acquisition/);assert.equal(jobs.searchParams.get('location'),'Bengaluru');assert.match(publicSearch.searchParams.get('q'),/site:linkedin.com\/in\//);
  assert.equal(new URL(searchLinks('Acme','ML Internship','India + remote','employee').linkedinJobs).searchParams.get('location'),'India');
  assert.match(new URL(searchLinks('Acme','ML Internship','India + remote','employee').remoteJobs).searchParams.get('keywords'),/remote/);
  assert.doesNotMatch(new URL(searchLinks('Acme','Data Science Internship','India','employee').linkedinPeople).searchParams.get('keywords'),/internship/i);
});
test('Opportunities validate required fields, statuses, URLs, and follow-up dates',()=>{
  const job=validateJob({...EMPTY_JOB,company:'Acme',title:'ML Intern',url:'acme.com/jobs/1',nextActionAt:'2026-10-20'});assert.equal(job.url,'https://acme.com/jobs/1');assert.equal(jobKey(job),'url:https://acme.com/jobs/1');
  for(const patch of [{company:''},{title:''},{status:'fake'},{status:'toString'},{type:'constructor'},{url:'javascript:alert(1)'},{nextActionAt:'2026-02-30'}])assert.throws(()=>validateJob({...job,...patch}));
});
test('Drafts distinguish referral requests from hiring enquiries and do not invent project evidence',()=>{
  const lead={...EMPTY_LEAD,id:'1',name:'Asha',company:'Acme',jobTitle:'ML Intern',createdAt:'',updatedAt:''},profile={...DEFAULT_PROFILE,education:'BS student',evidence:'',skills:''};
  const referral=makeDrafts(lead,profile,'referral')[1],hiring=makeDrafts(lead,profile,'hiring')[1];assert.match(referral.body,/would you be comfortable referring/);assert.match(hiring.body,/Are you hiring/);assert.doesNotMatch(hiring.body,/comfortable referring/);assert.match(referral.body,/\[Add one relevant project/);assert.doesNotMatch(referral.body,/award|expert|years of experience/i);
  for(const kind of Object.keys(CONTACT_TYPES))assert.equal(makeDrafts({...lead,contactType:kind},profile).length,3);
});
