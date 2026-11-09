import {STAGES} from './leads.ts';
export const EVENTS={connection_sent:'Connection request sent',referral_requested:'Referral request sent',hiring_enquiry_sent:'Hiring enquiry sent',followup_sent:'Follow-up sent',replied:'Response received',referred:'Referral received',interview:'Interview update',offer:'Offer received',note:'Private note'} as const;
export const CHANNELS={linkedin:'LinkedIn',email:'Email',other:'Other'} as const;
export type EventType=keyof typeof EVENTS;
export type ActivityInput={contactId:string;requestId:string;eventType:EventType;channel:keyof typeof CHANNELS;occurredOn:string;notes:string;message:string;stageAfter:string;followUpOn:string|null;expectedContactUpdatedAt:string;outboundConfirmed:boolean};
export type ActivityEntry=Omit<ActivityInput,'expectedContactUpdatedAt'|'outboundConfirmed'> & {id:string;createdAt:string};
export function outboundEvent(event:string){return ['connection_sent','referral_requested','hiring_enquiry_sent','followup_sent'].includes(event);}
export function validDay(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function recommendedStage(event:EventType,current:string){
  if(['closed','do_not_contact','offer'].includes(current))return '';
  const desired:Partial<Record<EventType,string>>={connection_sent:'contacted',hiring_enquiry_sent:'contacted',referral_requested:'referral_requested',replied:'replied',referred:'referred',interview:'interview',offer:'offer'};
  const next=desired[event],rank=['new','contacted','replied','referral_requested','referred','interview','offer'];
  return next&&rank.indexOf(next)>rank.indexOf(current)?next:'';
}
export function validateActivity(input:unknown):ActivityInput{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid journal entry.');
  const r=input as Record<string,unknown>;
  for(const key of ['contactId','requestId','eventType','channel','occurredOn','notes','message','stageAfter','expectedContactUpdatedAt'])if(typeof r[key]!=='string')throw new Error(`${key} must be text.`);
  if(!r.contactId||String(r.contactId).length>100||!r.requestId||!/^[a-zA-Z0-9_-]{16,100}$/.test(String(r.requestId)))throw new Error('Invalid contact or request identifier.');
  if(!Object.hasOwn(EVENTS,String(r.eventType))||!Object.hasOwn(CHANNELS,String(r.channel)))throw new Error('Choose a valid event and channel.');
  if(!validDay(String(r.occurredOn)))throw new Error('Choose a valid activity date.');
  if(String(r.notes).length>3000||String(r.message).length>10000)throw new Error('Keep notes within 3,000 and the message within 10,000 characters.');
  if(r.eventType==='note'&&!String(r.notes).trim())throw new Error('Write a note before saving.');
  if(r.stageAfter!==''&&!STAGES.includes(r.stageAfter as typeof STAGES[number]))throw new Error('Choose a valid contact stage.');
  if(r.followUpOn!==null&&(typeof r.followUpOn!=='string'||(r.followUpOn!==''&&!validDay(r.followUpOn))))throw new Error('Choose a valid next action date.');
  if(String(r.expectedContactUpdatedAt).length>100||((r.stageAfter!==''||r.followUpOn!==null)&&!r.expectedContactUpdatedAt))throw new Error('Reload this contact before changing its next action.');
  if(typeof r.outboundConfirmed!=='boolean'||(outboundEvent(String(r.eventType))&&!r.outboundConfirmed))throw new Error('Confirm that you already sent this message yourself.');
  return {contactId:String(r.contactId),requestId:String(r.requestId),eventType:r.eventType as EventType,channel:r.channel as keyof typeof CHANNELS,occurredOn:String(r.occurredOn),notes:String(r.notes),message:String(r.message),stageAfter:String(r.stageAfter),followUpOn:r.followUpOn as string|null,expectedContactUpdatedAt:String(r.expectedContactUpdatedAt),outboundConfirmed:r.outboundConfirmed};
}
export function sameActivity(existing:ActivityEntry,input:ActivityInput){return (['contactId','eventType','channel','occurredOn','notes','message','stageAfter','followUpOn'] as const).every(k=>existing[k]===input[k]);}
