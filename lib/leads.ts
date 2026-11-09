import {CONTACT_TYPES,normalizeLinkedIn} from "./career.ts";
export const STAGES = ["new", "contacted", "replied", "referral_requested", "referred", "interview", "offer", "closed", "do_not_contact"] as const;
export const STAGE_LABELS: Record<string, string> = {new:"To contact", contacted:"Contacted", replied:"Replied", referral_requested:"Referral requested", referred:"Referred", interview:"Interview", offer:"Offer", closed:"Closed", do_not_contact:"Do not contact", meeting:"Interview", won:"Offer"};
export type Lead = {id:string;name:string;company:string;email:string;phone:string;emailSourceUrl:string;phoneSourceUrl:string;website:string;role:string;industry:string;country:string;stage:string;notes:string;sourceUrl:string;sourceKind:string;researchedAt:string;nextActionAt:string;createdAt:string;updatedAt:string;linkedInUrl:string;contactType:string;jobTitle:string;jobUrl:string;relevance:string;};
export type Profile = {businessName:string;offer:string;signature:string;targetMarket:string;education:string;skills:string;evidence:string;targetRole:string;targetLocation:string;resumeUrl:string;portfolioUrl:string};
export const DEFAULT_PROFILE: Profile = {businessName:"",offer:"",signature:"Ravi",targetMarket:"USA / UK",education:"Pursuing a BS in Applied AI and Data Science; studying CA",skills:"",evidence:"",targetRole:"AI / Data Science internship",targetLocation:"India + remote",resumeUrl:"",portfolioUrl:""};
export const EMPTY_LEAD = {name:"",company:"",email:"",phone:"",emailSourceUrl:"",phoneSourceUrl:"",website:"",role:"",industry:"",country:"",stage:"new",notes:"",sourceUrl:"",sourceKind:"manual",researchedAt:"",nextActionAt:"",linkedInUrl:"",contactType:"employee",jobTitle:"",jobUrl:"",relevance:""};
export function normalizeWebsite(value:string):string {
  if(!value.trim())return "";
  if(/^[a-z][a-z0-9+.-]*:/i.test(value.trim())&&!/^https?:\/\//i.test(value.trim()))throw new Error("Use an HTTP or HTTPS website.");
  let url:URL;try{url=new URL(/^https?:\/\//i.test(value.trim())?value.trim():`https://${value.trim()}`);}catch{throw new Error("Enter a valid website URL.");}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error("Use an HTTP or HTTPS website without credentials.");
  url.hash="";return url.toString();
}
export function validateLead(input:unknown){
  if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("Invalid contact record.");
  const raw=input as Record<string,unknown>,record:Record<string,string>={};
  for(const [key,fallback]of Object.entries(EMPTY_LEAD)){
    if(raw[key]!=null&&typeof raw[key]!=="string")throw new Error(`${key} must be text.`);
    record[key]=String(raw[key]??fallback).trim();
    if(record[key].length>(key==="notes"?5000:1000))throw new Error(`${key} is too long.`);
  }
  if(!record.company)throw new Error("Company name is required.");
  record.email=record.email.toLowerCase();
  if(record.email&&!/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(record.email))throw new Error("Enter a valid email address.");
  record.phone=record.phone.replace(/^'(?=\+[\d(])/,'');
  if(record.phone){const main=record.phone.replace(/\s*(?:ext\.?|x)\s*\d+$/i,'');const digits=main.replace(/\D/g,'');if(record.phone.length>60||!/^\+?[\d().\s-]+(?:(?:ext\.?|x)\s*\d+)?$/i.test(record.phone)||digits.length<7||digits.length>15)throw new Error("Enter a published phone number with 7–15 digits.");}
  record.emailSourceUrl=normalizeWebsite(record.emailSourceUrl);record.phoneSourceUrl=normalizeWebsite(record.phoneSourceUrl);
  record.website=normalizeWebsite(record.website);record.sourceUrl=normalizeWebsite(record.sourceUrl);record.jobUrl=normalizeWebsite(record.jobUrl);record.linkedInUrl=normalizeLinkedIn(record.linkedInUrl);
  if(!Object.hasOwn(CONTACT_TYPES,record.contactType))throw new Error("Choose a valid contact type.");
  if(record.stage==="meeting")record.stage="interview";if(record.stage==="won")record.stage="offer";
  if(!STAGES.includes(record.stage as typeof STAGES[number]))throw new Error("Choose a valid lead stage.");
  if(!["manual","csv","public_website","public_research","linkedin_search","custom_scraper"].includes(record.sourceKind))throw new Error("Invalid source type.");
  if(record.nextActionAt&&(!/^\d{4}-\d{2}-\d{2}$/.test(record.nextActionAt)||!Number.isFinite(Date.parse(`${record.nextActionAt}T12:00:00Z`))||new Date(`${record.nextActionAt}T12:00:00Z`).toISOString().slice(0,10)!==record.nextActionAt))throw new Error("Choose a valid follow-up date.");
  if(record.researchedAt&&!Number.isFinite(Date.parse(record.researchedAt)))throw new Error("Invalid research date.");
  return record as unknown as typeof EMPTY_LEAD;
}
export function dedupeKey(record:Pick<Lead,"email"|"company"|"name"|"website"|"role">&{linkedInUrl?:string;phone?:string}):string{
  if(record.email)return `email:${record.email.toLowerCase().trim()}`;
  if(record.linkedInUrl)return `linkedin:${normalizeLinkedIn(record.linkedInUrl)}`;
  if(record.phone)return `phone:${[record.company,record.name].map(s=>s.trim().toLowerCase()).join("|")}|${record.phone.replace(/\D/g,"")}`;
  return `contact:${[record.company,record.name,record.website,record.role].map(s=>s.trim().toLowerCase()).join("|")}`;
}
export function parseCsv(text:string):Record<string,string>[] {
  text=text.replace(/^\uFEFF/,"");const rows:string[][]=[];let row:string[]=[],value="",quoted=false,closed=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;}
    else if(c==='"'){if(value||closed)throw new Error("Malformed CSV quote.");quoted=true;}
    else if(c===','){row.push(value);value="";closed=false;}
    else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value="";closed=false;}
    else{if(closed&&!/\s/.test(c))throw new Error("Unexpected text after a quoted CSV field.");if(!closed)value+=c;}
  }
  if(quoted)throw new Error("CSV contains an unclosed quoted field.");row.push(value);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.length<2)throw new Error("CSV needs a header row and at least one contact.");
  if(rows.length>1001)throw new Error("Import up to 1,000 contacts per file.");
  const aliases:Record<string,string>={phone_number:"phone",telephone:"phone",email_source_url:"emailSourceUrl",emailsourceurl:"emailSourceUrl",phone_source_url:"phoneSourceUrl",phonesourceurl:"phoneSourceUrl",linkedin_url:"linkedInUrl",linkedinurl:"linkedInUrl",profile_url:"linkedInUrl",contact_type:"contactType",contacttype:"contactType",opportunity_title:"jobTitle",jobtitle:"jobTitle",job_url:"jobUrl",joburl:"jobUrl",contact_name:"name",full_name:"name",company_name:"company",organization:"company",organisation:"company",email_address:"email",domain:"website",title:"role",job_title:"role",location:"country",source_url:"sourceUrl",sourceurl:"sourceUrl",next_action_at:"nextActionAt",nextactionat:"nextActionAt",follow_up:"nextActionAt",source_kind:"sourceKind",sourcekind:"sourceKind",researched_at:"researchedAt",researchedat:"researchedAt"};
  const headers=rows.shift()!.map(h=>{const clean=h.trim().toLowerCase().replace(/[ -]+/g,"_");return aliases[clean]||clean;});
  if(new Set(headers).size!==headers.length)throw new Error("CSV contains duplicate columns.");
  if(!headers.includes("company"))throw new Error('Add a "company" column to your CSV.');
  return rows.map((cells,i)=>{if(cells.length!==headers.length)throw new Error(`Row ${i+2} has the wrong number of columns.`);return Object.fromEntries(headers.map((h,j)=>[h,cells[j].trim()]));});
}
export function exportCsv(records:(typeof EMPTY_LEAD)[]):string{
  const columns=["name","company","email","phone","emailSourceUrl","phoneSourceUrl","website","role","industry","country","stage","notes","sourceUrl","sourceKind","researchedAt","nextActionAt","linkedInUrl","contactType","jobTitle","jobUrl","relevance"]as const;
  const escape=(s:string)=>`"${(/^[\s]*[=+@-]/.test(s)?"'":"")+s.replace(/"/g,'""')}"`;
  return [columns.join(","),...records.map(r=>columns.map(c=>escape(r[c]||"")).join(","))].join("\r\n");
}
export type DraftGoal="referral"|"hiring";
export function makeDrafts(lead:Lead,profile:Profile,goal?:DraftGoal){
  if(lead.stage==="do_not_contact"||lead.stage==="closed")return [];
  const mode=goal||(lead.contactType==='recruiter'||lead.contactType==='hiring_manager'||lead.contactType==='founder'||lead.contactType==='company_inbox'?'hiring':'referral');
  const hello=lead.name?`Hi ${lead.name.split(" ")[0]},`:`Hi ${lead.company} team,`;
  const role=lead.jobTitle||profile.targetRole||'[specific role]';
  const intro=[`I'm ${profile.signature.split(" ")[0]}.`,profile.education?profile.education.replace(/[.!?]+$/,'')+'.':'',profile.skills?`My relevant skills include ${profile.skills}.`:''].filter(Boolean).join(' ');
  const evidence=profile.evidence?`\n\nRelevant project experience: ${profile.evidence}`:'\n\n[Add one relevant project or skill you can demonstrate.]';
  const context=lead.relevance?`\n\n${lead.relevance}`:'';
  const links=[lead.jobUrl?`Role: ${lead.jobUrl}`:'',profile.resumeUrl?`Resume: ${profile.resumeUrl}`:'',profile.portfolioUrl?`Portfolio: ${profile.portfolioUrl}`:''].filter(Boolean).join('\n');
  const ask=mode==='referral'?`If my background looks relevant, would you be comfortable referring me for this role, or pointing me to the right person? I understand if you're unable to help.`:`Are you hiring for this role, or could you point me to the appropriate application process?`;
  const subject=mode==='referral'?`Referral enquiry — ${role} at ${lead.company}`:`${role} opportunity at ${lead.company}`;
  const body=`${hello}\n\n${intro} I'm interested in ${role} at ${lead.company}.${context}${evidence}\n\n${ask}${links?'\n\n'+links:''}\n\nThank you for your time.\n${profile.signature}`;
  const connection=`Hi${lead.name?' '+lead.name.split(' ')[0]:''}, I'm ${profile.signature.split(' ')[0]} and exploring ${role} opportunities at ${lead.company}. I'd appreciate connecting and learning about your team's work.`;
  return[
    {day:0,label:'Connection note',subject:'LinkedIn connection request',body:connection.length>200?'Hi, I’m exploring opportunities at your company and would appreciate connecting to learn about your team’s work. Thanks, '+profile.signature.split(' ')[0]:connection,channel:'LinkedIn'},
    {day:0,label:mode==='referral'?'Referral request':'Hiring enquiry',subject,body,channel:'Email or LinkedIn DM'},
    {day:7,label:'One follow-up',subject:`Re: ${subject}`,body:`${hello}\n\nFollowing up once on my interest in ${role} at ${lead.company}. ${mode==='referral'?"If you have a moment to review my background, I'd appreciate any guidance on the role or a possible referral.":"I'd appreciate any guidance on whether this opportunity is open and how to apply."}\n\nI understand you're busy, and no further response is needed if you can't help.\n\nThank you,\n${profile.signature}`,channel:'Email or LinkedIn DM'}
  ];
}
