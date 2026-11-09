import test from 'node:test';
import assert from 'node:assert/strict';
import {STARTER_PEOPLE,starterContact,starterAlreadySaved} from '../lib/starter-people.ts';
import {DEFAULT_PROFILE,EMPTY_LEAD,validateLead} from '../lib/leads.ts';
import {EMPTY_JOB} from '../lib/career.ts';
import {outboundEvent,recommendedStage,sameActivity,validDay,validateActivity} from '../lib/activity.ts';

const entry={contactId:'person',requestId:'ce7d1f35-9202-4d58-954b-77b072cf7f9e',eventType:'referral_requested',channel:'linkedin',occurredOn:'2026-10-12',notes:'Sent a specific request',message:'Hi, my project…',stageAfter:'referral_requested',followUpOn:'2026-10-19',expectedContactUpdatedAt:'2026-10-12T12:00:00Z',outboundConfirmed:true};
test('Starter review keeps evidence separate from personal relevance and never invents contact details',()=>{
  for(const person of STARTER_PEOPLE){const contact=validateLead(starterContact(person,DEFAULT_PROFILE));assert.equal(contact.email,'');assert.equal(contact.relevance,'');assert.equal(contact.sourceKind,'public_research');assert.equal(contact.sourceUrl,person.sourceUrl);assert.equal(contact.researchedAt,'2026-10-12');assert.equal(contact.jobUrl,'');assert.ok(contact.notes.includes('Recheck current role'));}
  assert.equal(STARTER_PEOPLE.find(p=>p.company==='FinBox').location,'');
});
test('Starter contacts link only to openings at their own company, and duplicate checking survives case differences',()=>{
  const person=STARTER_PEOPLE[0],job={...EMPTY_JOB,id:'j',company:person.company.toUpperCase(),title:'ML Intern',url:'https://example.com/jobs/1',createdAt:'now',updatedAt:'now'};
  const contact=starterContact(person,DEFAULT_PROFILE,job);assert.equal(contact.jobTitle,job.title);assert.equal(contact.jobUrl,job.url);
  assert.throws(()=>starterContact(person,DEFAULT_PROFILE,{...job,company:'Other'}));
  const lead={...EMPTY_LEAD,id:'p',name:person.name.toUpperCase(),company:person.company.toLowerCase(),createdAt:'now',updatedAt:'now'};assert.equal(starterAlreadySaved(person,[lead]),true);assert.equal(starterAlreadySaved(person,[{...lead,name:'Other',linkedInUrl:person.linkedInUrl}]),true);assert.equal(starterAlreadySaved(person,[]),false);
});
test('Outreach validation requires explicit manual sending confirmation and a contact version for updates',()=>{
  assert.deepEqual(validateActivity(entry),entry);
  for(const eventType of ['connection_sent','referral_requested','hiring_enquiry_sent','followup_sent']){assert.ok(outboundEvent(eventType));assert.throws(()=>validateActivity({...entry,eventType,outboundConfirmed:false}));}
  assert.doesNotThrow(()=>validateActivity({...entry,eventType:'replied',outboundConfirmed:false}));
  assert.throws(()=>validateActivity({...entry,expectedContactUpdatedAt:''}));
  assert.doesNotThrow(()=>validateActivity({...entry,eventType:'note',stageAfter:'',followUpOn:null,expectedContactUpdatedAt:'',outboundConfirmed:false}));
});
test('Journal input rejects impossible dates, arbitrary stages, unknown channels and oversized snapshots',()=>{
  assert.equal(validDay('2024-02-29'),true);assert.equal(validDay('2026-02-29'),false);
  for(const patch of [{occurredOn:'2026-02-30'},{followUpOn:'2026-13-01'},{followUpOn:123},{followUpOn:undefined},{stageAfter:'fake'},{channel:'sms'},{eventType:'auto_send'},{message:'x'.repeat(10001)},{notes:'x'.repeat(3001)},{requestId:'short'},{contactId:''},{eventType:'note',notes:' '}])assert.throws(()=>validateActivity({...entry,...patch}));
  assert.equal(validateActivity({...entry,followUpOn:''}).followUpOn,'');assert.equal(validateActivity({...entry,followUpOn:null}).followUpOn,null);
});
test('Suggested stages advance suitable contacts but never regress interviews, offers or stopped records',()=>{
  assert.equal(recommendedStage('connection_sent','new'),'contacted');assert.equal(recommendedStage('referral_requested','contacted'),'referral_requested');assert.equal(recommendedStage('referred','referral_requested'),'referred');assert.equal(recommendedStage('replied','referral_requested'),'');assert.equal(recommendedStage('connection_sent','interview'),'');assert.equal(recommendedStage('offer','interview'),'offer');
  for(const stage of ['offer','closed','do_not_contact'])assert.equal(recommendedStage('replied',stage),'');assert.equal(recommendedStage('followup_sent','contacted'),'');assert.equal(recommendedStage('note','new'),'');
});
test('Retry matching ignores the refreshed version but detects changed contact, text and next-action intent',()=>{
  const saved={...entry,id:'id',createdAt:'now'};assert.equal(sameActivity(saved,{...entry,expectedContactUpdatedAt:'later'}),true);
  for(const patch of [{contactId:'other'},{message:'Changed'},{followUpOn:null},{stageAfter:''},{occurredOn:'2026-10-11'}])assert.equal(sameActivity(saved,{...entry,...patch}),false);
});
