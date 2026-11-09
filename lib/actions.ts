import type {Lead,Profile} from './leads.ts';
import type {Job} from './career.ts';
export type SearchContext={company:string;role:string;location:string;contactType:string;jobUrl:string;jobType:string;key:string};
export function peopleSearchForJob(job:Job,contactType='employee'):SearchContext{
  return{company:job.company,role:job.title,location:job.location,contactType,jobUrl:job.url,jobType:job.type,key:job.id+':'+contactType};
}
export function linkedToJob(contact:Lead,job:Job):boolean{
  if(contact.company.trim().toLowerCase()!==job.company.trim().toLowerCase())return false;
  if(contact.jobUrl&&job.url)return contact.jobUrl===job.url;
  return !!contact.jobTitle&&contact.jobTitle.trim().toLowerCase()===job.title.trim().toLowerCase();
}
export function actionQueue(contacts:Lead[],jobs:Job[],day:string){
  const contactActions=contacts.filter(c=>c.nextActionAt&&c.nextActionAt<=day&&!['offer','won','closed','do_not_contact'].includes(c.stage)).map(c=>({kind:'contact' as const,id:c.id,date:c.nextActionAt,overdue:c.nextActionAt<day,record:c}));
  const jobActions=jobs.filter(j=>j.nextActionAt&&j.nextActionAt<=day&&!['offer','closed'].includes(j.status)).map(j=>({kind:'job' as const,id:j.id,date:j.nextActionAt,overdue:j.nextActionAt<day,record:j}));
  return[...contactActions,...jobActions].sort((a,b)=>a.date.localeCompare(b.date)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
}
export function profileChecklist(profile:Profile){return[
  {label:'Choose a target role',done:!!profile.targetRole.trim()},
  {label:'Add project evidence',done:!!profile.evidence.trim()},
  {label:'Add a shareable resume link',done:!!profile.resumeUrl.trim()},
  {label:'Add a portfolio or GitHub link',done:!!profile.portfolioUrl.trim()},
];}
