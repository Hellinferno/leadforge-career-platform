export const CONTACT_TYPES={employee:"Employee / potential referrer",recruiter:"Recruiter / talent acquisition",hiring_manager:"Hiring manager",alumni:"Alumni connection",founder:"Founder / team lead",company_inbox:"Company contact / inbox"};
export const JOB_STATUSES={saved:"Saved",applied:"Applied",assessment:"Assessment",interview:"Interview",offer:"Offer",closed:"Closed"};
export const JOB_TYPES={internship:"Internship",full_time:"Full-time",part_time:"Part-time",contract:"Contract"};
export type Job={id:string;company:string;title:string;url:string;location:string;type:string;status:string;notes:string;nextActionAt:string;createdAt:string;updatedAt:string};
export const EMPTY_JOB={company:"",title:"",url:"",location:"",type:"internship",status:"saved",notes:"",nextActionAt:""};
export type EditableJob=typeof EMPTY_JOB;
export function normalizeLinkedIn(value:string):string{
  if(!value.trim())return "";let url:URL;
  try{url=new URL(/^https?:\/\//i.test(value.trim())?value.trim():`https://${value.trim()}`);}catch{throw new Error("Enter a LinkedIn profile or company URL.");}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||!(url.hostname==='linkedin.com'||url.hostname.endsWith('.linkedin.com'))||!/^\/(in|pub|company)\/[^/]+/.test(url.pathname))throw new Error("Use a LinkedIn profile or company page URL.");
  url.protocol='https:';url.hostname='www.linkedin.com';url.search='';url.hash='';url.pathname=url.pathname.replace(/\/+$/,'');if(/^\/(in|company)\//.test(url.pathname))url.pathname=url.pathname.split('/').slice(0,3).join('/');return url.toString();
}
export function webUrl(value:string):string{
  if(!value.trim())return "";let url:URL;
  if(/^[a-z][a-z0-9+.-]*:/i.test(value.trim())&&!/^https?:\/\//i.test(value.trim()))throw new Error("Use an HTTP or HTTPS URL.");
  try{url=new URL(/^https?:\/\//i.test(value.trim())?value.trim():`https://${value.trim()}`);}catch{throw new Error("Enter a valid URL.");}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error("Use an HTTP or HTTPS URL without credentials.");url.hash='';return url.toString();
}
export function validateJob(input:unknown):EditableJob{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error("Invalid opportunity.");const raw=input as Record<string,unknown>,r:Record<string,string>={};
  for(const[key,fallback]of Object.entries(EMPTY_JOB)){if(raw[key]!=null&&typeof raw[key]!=='string')throw new Error(`${key} must be text.`);r[key]=String(raw[key]??fallback).trim();if(r[key].length>(key==='notes'?5000:1000))throw new Error(`${key} is too long.`);}
  if(!r.company||!r.title)throw new Error("Company and job title are required.");if(!Object.hasOwn(JOB_TYPES,r.type)||!Object.hasOwn(JOB_STATUSES,r.status))throw new Error("Choose a valid opportunity type and status.");r.url=webUrl(r.url);
  if(r.nextActionAt&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.nextActionAt)||!Number.isFinite(Date.parse(`${r.nextActionAt}T12:00:00Z`))||new Date(`${r.nextActionAt}T12:00:00Z`).toISOString().slice(0,10)!==r.nextActionAt))throw new Error("Choose a valid follow-up date.");
  return r as unknown as EditableJob;
}
export function jobKey(job:EditableJob){return job.url?`url:${job.url}`:`job:${[job.company,job.title,job.location,job.type].map(s=>s.toLowerCase().trim()).join('|')}`;}
export function searchLinks(company:string,role:string,location:string,contactType:string,opportunityType='internship',institution=''){
  const teamRole=role.replace(/\bintern(?:ship)?s?\b|\bentry[- ]level\b/gi,'').trim();
  const peopleTerms:Record<string,string>={recruiter:'recruiter OR "talent acquisition"',hiring_manager:(teamRole?teamRole+' ':'')+'(manager OR head OR lead)',employee:teamRole||'data science OR machine learning',alumni:[institution.trim(),teamRole].filter(Boolean).join(' ')||'alumni',founder:'founder OR cofounder',company_inbox:'careers OR recruitment'};
  const clean=(s:string)=>s.replace(/["\r\n]/g,' ').trim();
  const terms=peopleTerms[contactType]||peopleTerms.employee;
  const searchLocation=clean(location).replace(/\s*(?:\+|,|\/)\s*remote(?:\s*roles?)?/ig,'').trim();
  const region=/^remote$/i.test(searchLocation)?'':searchLocation;
  const linkedKeywords=[clean(company),terms].filter(Boolean).join(' ');
  const publicQuery=['site:linkedin.com/in/',company?`"${clean(company)}"`:'',`(${terms})`,region].filter(Boolean).join(' ');
  const jobKeywords=[clean(company),clean(role),opportunityType==='internship'&&!/\bintern(?:ship)?\b/i.test(role)?'internship':''].filter(Boolean).join(' ');
  return {
    linkedinPeople:`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedKeywords)}`,
    publicPeople:`https://www.google.com/search?q=${encodeURIComponent(publicQuery)}`,
    linkedinJobs:`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobKeywords)}&location=${encodeURIComponent(region)}`,
    remoteJobs:`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobKeywords+' remote')}&location=${encodeURIComponent(region)}`,
    careerPages:`https://www.google.com/search?q=${encodeURIComponent([clean(company),clean(role),opportunityType==='internship'?'internship':'jobs',clean(location),'careers'].filter(Boolean).join(' '))}`
  };
}
