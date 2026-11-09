import test from 'node:test';
import assert from 'node:assert/strict';
import {actionQueue,linkedToJob,peopleSearchForJob,profileChecklist} from '../lib/actions.ts';
import {validateDraft,editorKey} from '../lib/messages.ts';
import {EMPTY_LEAD,DEFAULT_PROFILE} from '../lib/leads.ts';
import {EMPTY_JOB} from '../lib/career.ts';
const contact={...EMPTY_LEAD,id:'person',company:'Acme',name:'Asha',jobTitle:'ML Intern',jobUrl:'https://acme.com/jobs/1',createdAt:'now',updatedAt:'now'};
const job={...EMPTY_JOB,id:'job',company:'Acme',title:'ML Intern',url:'https://acme.com/jobs/1',location:'Bengaluru',createdAt:'now',updatedAt:'now'};

test('A saved opening carries exact role and listing context into employee or recruiter search',()=>{
  const context=peopleSearchForJob(job,'recruiter');assert.equal(context.company,job.company);assert.equal(context.role,job.title);assert.equal(context.jobUrl,job.url);assert.equal(context.location,job.location);assert.equal(context.contactType,'recruiter');assert.equal(peopleSearchForJob(job).contactType,'employee');
});
test('Opening contacts are specific to the listing, with a title fallback when a URL is unavailable',()=>{
  assert.equal(linkedToJob(contact,job),true);assert.equal(linkedToJob({...contact,jobUrl:'https://acme.com/jobs/2'},job),false);assert.equal(linkedToJob({...contact,company:'Other'},job),false);assert.equal(linkedToJob({...contact,jobUrl:''},job),true);assert.equal(linkedToJob({...contact,jobUrl:'',jobTitle:''},job),false);
});
test('Today queue includes due contacts and applications, sorts oldest first, and excludes terminal records',()=>{
  const queue=actionQueue([{...contact,nextActionAt:'2026-10-12'},{...contact,id:'old',nextActionAt:'2026-10-10'},{...contact,id:'future',nextActionAt:'2026-10-13'},{...contact,id:'blocked',stage:'do_not_contact',nextActionAt:'2026-10-01'},{...contact,id:'offer',stage:'offer',nextActionAt:'2026-10-01'}],[{...job,nextActionAt:'2026-10-11'},{...job,id:'closed-job',status:'closed',nextActionAt:'2026-10-01'}],'2026-10-12');
  assert.deepEqual(queue.map(x=>x.id),['old','job','person']);assert.deepEqual(queue.map(x=>x.kind),['contact','job','contact']);assert.equal(queue[0].overdue,true);assert.equal(queue[2].overdue,false);
});
test('Profile readiness reflects supplied evidence and links',()=>{
  assert.equal(profileChecklist(DEFAULT_PROFILE).filter(x=>x.done).length,1);assert.ok(profileChecklist({...DEFAULT_PROFILE,evidence:'My project',resumeUrl:'https://resume.example/ravi',portfolioUrl:'https://github.com/ravi'}).every(x=>x.done));
});
test('Draft validation preserves message text, restricts keys, and rejects invalid versions or oversized content',()=>{
  const draft={contactId:contact.id,goal:'referral',step:1,subject:'Referral request',body:'Hello Asha,\n\nMy project…',expectedVersion:null};assert.deepEqual(validateDraft(draft),draft);assert.equal(validateDraft({...draft,expectedVersion:2}).expectedVersion,2);assert.notEqual(editorKey('person','referral',0),editorKey('person','hiring',0));
  for(const patch of [{contactId:''},{goal:'spam'},{step:3},{step:'1'},{body:' '},{body:'x'.repeat(10001)},{subject:'x'.repeat(501)},{expectedVersion:0},{expectedVersion:1.2},{expectedVersion:Number.MAX_SAFE_INTEGER+1}])assert.throws(()=>validateDraft({...draft,...patch}));
});
