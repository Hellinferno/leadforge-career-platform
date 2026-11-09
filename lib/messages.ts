export type SavedDraft={id:string;contactId:string;goal:'referral'|'hiring';step:number;subject:string;body:string;version:number;createdAt:string;updatedAt:string};
export type DraftInput={contactId:string;goal:'referral'|'hiring';step:number;subject:string;body:string;expectedVersion:number|null};
export function validateDraft(input:unknown):DraftInput{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid message draft.');const r=input as Record<string,unknown>;
  if(typeof r.contactId!=='string'||!r.contactId||r.contactId.length>100)throw new Error('Choose a saved contact.');
  if(r.goal!=='referral'&&r.goal!=='hiring')throw new Error('Choose a referral or hiring message.');
  if(!Number.isInteger(r.step)||Number(r.step)<0||Number(r.step)>2)throw new Error('Choose a valid message step.');
  if(typeof r.subject!=='string'||r.subject.length>500||typeof r.body!=='string'||!r.body.trim()||r.body.length>10000)throw new Error('Add a message body of up to 10,000 characters and a subject of up to 500 characters.');
  if(r.expectedVersion!=null&&(!Number.isSafeInteger(r.expectedVersion)||Number(r.expectedVersion)<1))throw new Error('Invalid saved draft version.');
  return{contactId:r.contactId,goal:r.goal,step:Number(r.step),subject:r.subject,body:r.body,expectedVersion:r.expectedVersion==null?null:Number(r.expectedVersion)};
}
export function editorKey(contactId:string,goal:string,step:number){return `${contactId}:${goal}:${step}`;}
