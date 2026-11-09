"use client";
import {useEffect, useRef, useState} from 'react';
import {ArrowRight,ArrowUpRight,BriefcaseBusiness,Building2,Check,CheckCircle2,ExternalLink,FileText,Globe2,GraduationCap,Link2,LoaderCircle,Mail,Plus,Search,Sparkles,Trash2,Upload,Users} from 'lucide-react';
import {CONTACT_TYPES,EMPTY_JOB,JOB_STATUSES,JOB_TYPES,searchLinks,validateJob,type EditableJob,type Job} from '../lib/career';
import {EMPTY_LEAD,STAGES,STAGE_LABELS,type Lead,type Profile} from '../lib/leads';
import {Modal,api,date} from './ui';
import {linkedToJob,type SearchContext} from '../lib/actions';
import JobScraperModal from './job-scraper-modal';
import {populateProfileFromResume, type ResumeData, type SavedResumeRecord} from '../lib/resume';
export type EditableContact=typeof EMPTY_LEAD;
export function Discovery({profile,onAdd,onAddJob,companyResearch,starterPeople,initialMode='people',initialContext}:{initialContext?:SearchContext|null;initialMode?:string;profile:Profile;onAdd:(contact:EditableContact)=>void;onAddJob:(job:EditableJob)=>void;companyResearch:React.ReactNode;starterPeople:React.ReactNode}){
  const[mode,setMode]=useState(initialMode),[company,setCompany]=useState(initialContext?.company||''),[role,setRole]=useState(initialContext?.role||profile.targetRole||'AI / Data Science internship'),[location,setLocation]=useState(initialContext?.location||profile.targetLocation||'India + remote'),[kind,setKind]=useState(initialContext?.contactType||'employee'),[institution,setInstitution]=useState(''),[jobType,setJobType]=useState(initialContext?.jobType||'internship');
  const links=searchLinks(company,role,location,kind,jobType,institution);
  const attachedJobUrl=initialContext&&company===initialContext.company&&role===initialContext.role?initialContext.jobUrl:'';
  return <>{initialContext&&<div className="search-context-banner"><BriefcaseBusiness size={17}/><span>People search for <strong>{initialContext.company} · {initialContext.role}</strong></span>{initialContext.jobUrl&&<a href={initialContext.jobUrl} target="_blank" rel="noopener noreferrer">View opening <ExternalLink size={12}/></a>}</div>}<div className="discovery-tabs" aria-label="Discovery options">{[{id:'starters',label:'Starter shortlist',icon:Users},{id:'people',label:'People search',icon:Search},{id:'jobs',label:'Internships & jobs',icon:BriefcaseBusiness},{id:'company',label:'Company contacts',icon:Globe2}].map(item=><button key={item.id} className={mode===item.id?'active':''} onClick={()=>setMode(item.id)}><item.icon size={16}/>{item.label}</button>)}</div>
    {mode==='starters'?starterPeople:mode==='company'?companyResearch:<div className="career-discovery-grid"><section className="card discovery-form"><div className="section-kicker">{mode==='people'?<Link2 size={17}/>:<BriefcaseBusiness size={17}/>}TARGETED SEARCH</div><h2>{mode==='people'?'Find the right person.':'Find a role worth pursuing.'}</h2><p>{mode==='people'?'Start with a company or an opening. Look for someone connected to the team you want to join.':'Search current listings on LinkedIn and company career pages, then save promising openings here.'}</p><label>Target company {mode==='jobs'?'(optional)':''}<input value={company} onChange={e=>setCompany(e.target.value)} placeholder="e.g. a company from your shortlist"/></label><label>Your target role<input value={role} onChange={e=>setRole(e.target.value)} placeholder="Machine learning intern, data analyst…"/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="India, Bengaluru, remote…"/></label>{mode==='people'?<label>Who are you looking for?<select value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(CONTACT_TYPES).filter(([k])=>k!=='company_inbox').map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>:<label>Opportunity type<select value={jobType} onChange={e=>setJobType(e.target.value)}>{Object.entries(JOB_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>}
    {mode==='people'&&kind==='alumni'&&<label>Shared college / institution<input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Enter your institution to narrow the search"/></label>}<div className="discovery-actions"><a className="button primary full" href={mode==='people'?links.linkedinPeople:links.linkedinJobs} target="_blank" rel="noopener noreferrer"><Link2 size={16}/>Open LinkedIn {mode==='people'?'people search':'jobs search'}<ArrowUpRight size={15}/></a><a className="button secondary full" href={mode==='people'?links.publicPeople:links.careerPages} target="_blank" rel="noopener noreferrer"><Search size={16}/>{mode==='people'?'Search public profile results':'Search company career pages'}<ArrowUpRight size={15}/></a></div>{mode==='jobs'&&<a className="text-button remote-search" href={links.remoteJobs} target="_blank" rel="noopener noreferrer">Also search remote roles <ArrowUpRight size={14}/></a>}<p className="discovery-footnote">Results open in a new tab. This app does not automatically import LinkedIn profiles or confirm that a person can refer or hire you.</p></section>
    <section className="card search-guide"><div className="section-kicker"><GraduationCap size={17}/>MAKE EACH CONTACT RELEVANT</div><h2>{mode==='people'?'A name is only the beginning.':'Connect a role to a person.'}</h2>{mode==='people'?<><p>Check the person’s current role and company on their profile before adding them.</p><div className="guide-item"><span>1</span><div><strong>Recruiter or talent acquisition</strong><p>Ask about eligibility, openings, and the right application process.</p></div></div><div className="guide-item"><span>2</span><div><strong>Employee on the relevant team</strong><p>Show your project evidence and ask if they would be comfortable referring you.</p></div></div><div className="guide-item"><span>3</span><div><strong>Hiring manager or team lead</strong><p>Connect what you have built to the specific work their team does.</p></div></div><div className="guide-item"><span>4</span><div><strong>Alumni connection</strong><p>Record the shared background only when you have confirmed it.</p></div></div><button className="button secondary full" onClick={()=>onAdd({...EMPTY_LEAD,company,contactType:kind,jobTitle:role,jobUrl:attachedJobUrl,country:location})}><Plus size={16}/>Save a person you found</button></>:<><p>Check the listing’s requirements and application instructions. Save the exact URL to keep your request specific.</p><div className="guide-item"><span>1</span><div><strong>Save the opening</strong><p>Keep the role, job link, location, and application status together.</p></div></div><div className="guide-item"><span>2</span><div><strong>Find a relevant person</strong><p>Search that company’s recruiters and employees using the People tab.</p></div></div><div className="guide-item"><span>3</span><div><strong>Link the opening to the contact</strong><p>Your draft can include the exact role, resume, and portfolio links.</p></div></div><button className="button secondary full" onClick={()=>onAddJob({...EMPTY_JOB,company,title:role,location,type:jobType})}><Plus size={16}/>Save an opening you found</button></>}<div className="soft-note"><Mail size={16}/><div>Messages are drafted for your review. Sending and LinkedIn connection requests stay manual.</div></div></section></div>}
  </>;
}
export function ContactForm({initial,id,jobs,onClose,onSave,busy}:{initial:EditableContact;id?:string;jobs:Job[];onClose:()=>void;onSave:(contact:EditableContact,id?:string)=>Promise<void>;busy:boolean}){
  const[form,setForm]=useState(initial),[error,setError]=useState('');
  const field=(key:keyof EditableContact,label:string,placeholder='',type='text')=><label>{label}<input type={type} value={form[key]} maxLength={1000} required={key==='company'} placeholder={placeholder} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>;
  return <Modal title={id?'Contact details':'Add a career contact'} subtitle="Save who they are, why they are relevant, and the opening you want to discuss." onClose={onClose}><form onSubmit={async e=>{e.preventDefault();setError('');try{await onSave(form,id);}catch(e){setError((e as Error).message);}}}>{['public_research','linkedin_search','custom_scraper'].includes(form.sourceKind)&&<div className="soft-note">{form.sourceKind==='custom_scraper'?'Custom public-page scrape · retrieved':form.sourceKind==='linkedin_search'?'Legacy LinkedIn search result · retrieved':'Public-source starter · reviewed'} {date(form.researchedAt)}. Confirm the current role and company before saving. Indexed experience may describe past employment. Source evidence is retained in the notes below.</div>}<div className="form-grid">{field('name','Name','Name from their profile')}{field('company','Company *','Current employer')}{field('role','Their current role','Recruiter, ML engineer, team lead…')}<label>Contact type<select value={form.contactType} onChange={e=>setForm({...form,contactType:e.target.value})}>{Object.entries(CONTACT_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{field('linkedInUrl','LinkedIn profile / company URL','https://www.linkedin.com/in/…')}{field('email','Published or supplied email','Optional','email')}{field('phone','Published or supplied phone','Optional','tel')}{field('emailSourceUrl','Email evidence URL','Page publishing the email')}{field('phoneSourceUrl','Phone evidence URL','Page publishing the phone')}<label>Stage<select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{STAGES.map(s=><option key={s} value={s}>{STAGE_LABELS[s]}</option>)}</select></label>{field('country','Location','India, remote…')}{field('website','Company website','company.com')}<label className="span-2">Link a saved opportunity<select defaultValue="" onChange={e=>{const job=jobs.find(j=>j.id===e.target.value);if(job)setForm({...form,company:form.company||job.company,jobTitle:job.title,jobUrl:job.url});}}><option value="">Choose an opening, or enter it below</option>{jobs.filter(j=>!form.company.trim()||j.company.trim().toLowerCase()===form.company.trim().toLowerCase()).map(j=><option key={j.id} value={j.id}>{j.company} · {j.title}</option>)}</select></label>{field('jobTitle','Opportunity you are targeting','Data science internship')}{field('jobUrl','Job listing URL','Exact opening URL')}{field('sourceUrl','Evidence / source URL','Where you found their details')}{field('nextActionAt','Follow-up date','','date')}<label className="span-2">Why this person or team is relevant<textarea rows={2} value={form.relevance} maxLength={1000} placeholder="Add confirmed context. Avoid assuming you know them or that they can refer you." onChange={e=>setForm({...form,relevance:e.target.value})}/></label><label className="span-2">Notes<textarea rows={3} value={form.notes} maxLength={5000} placeholder="Profile observations, messages sent, response, and next action." onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>{error&&<p className="error" role="alert">{error}</p>}<div className="modal-foot"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>}Save contact</button></div></form></Modal>;
}
export function OpportunityForm({initial,id,onClose,onSave,busy}:{initial:EditableJob;id?:string;onClose:()=>void;onSave:(job:EditableJob,id?:string)=>Promise<void>;busy:boolean}){
  const[form,setForm]=useState(initial),[error,setError]=useState('');const field=(key:keyof EditableJob,label:string,placeholder='',type='text')=><label>{label}<input type={type} value={form[key]} required={key==='company'||key==='title'} maxLength={1000} placeholder={placeholder} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>;
  return <Modal title={id?'Opportunity details':'Save an internship or job'} subtitle="Keep the exact opening and your next action in one place." onClose={onClose}><form onSubmit={async e=>{e.preventDefault();setError('');try{await onSave(validateJob(form),id);}catch(e){setError((e as Error).message);}}}><div className="form-grid">{field('company','Company *')}{field('title','Role / job title *')}{field('url','Listing URL','Company careers or job-board link')}{field('location','Location','India, Bengaluru, remote…')}<label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{Object.entries(JOB_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(JOB_STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{field('nextActionAt','Next action / follow-up','','date')}<label className="span-2">Requirements, application notes, and next steps<textarea rows={4} maxLength={5000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>{error&&<p className="error" role="alert">{error}</p>}<div className="modal-foot"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>}Save opportunity</button></div></form></Modal>;
}
export function Opportunities({jobs,leads,onEdit,onDelete,onFindPerson,onSearch,onResearch,onShortlist,onSaveJob,onFindScrapedPerson}:{onShortlist:(job:Job)=>void;onResearch:(job:Job,kind:string)=>void;jobs:Job[];leads:Lead[];onEdit:(job:Job)=>void;onDelete:(job:Job)=>void;onFindPerson:(job:Job)=>void;onSearch:()=>void;onSaveJob?:(job:EditableJob)=>Promise<void>;onFindScrapedPerson?:(company:string,role:string,url:string)=>void}){
  const[search,setSearch]=useState(''),[status,setStatus]=useState('all'),[showScraper,setShowScraper]=useState(false);
  const visible=jobs.filter(j=>(status==='all'||j.status===status)&&[j.company,j.title,j.location,j.notes].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <section className="lead-panel"><div className="panel-heading"><div><h2>Saved opportunities <span>{jobs.length}</span></h2><p>Connect each opening to your application and referral efforts.</p></div><div className="button-row"><button className="button primary small" onClick={()=>setShowScraper(true)}><Globe2 size={15}/>Scrape Live Openings & Match</button><button className="button secondary small" onClick={onSearch}><Search size={15}/>Find openings</button></div></div><div className="filters"><div className="search-field"><Search size={16}/><input aria-label="Search opportunities" placeholder="Search company, role, or location…" value={search} onChange={e=>setSearch(e.target.value)}/></div><label className="filter-select"><select aria-label="Filter opportunity status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(JOB_STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>{visible.length?<div className="job-cards">{visible.map(job=><article className="job-card" key={job.id}><div className="job-card-top"><span className="job-company-icon"><Building2 size={21}/></span><div><button className="job-title-button" onClick={()=>onEdit(job)}>{job.title}</button><p>{job.company} · {job.location||'Location not added'}</p></div><span className={'stage stage-'+job.status}>{JOB_STATUSES[job.status as keyof typeof JOB_STATUSES]}</span></div><div className="job-card-meta"><span><BriefcaseBusiness size={13}/>{JOB_TYPES[job.type as keyof typeof JOB_TYPES]}</span><span><Users size={13}/>{leads.filter(l=>linkedToJob(l,job)).length} contact(s) linked to this opening</span>{job.nextActionAt&&<span>Next action: {date(job.nextActionAt)}</span>}</div>{job.notes&&<p className="job-notes">{job.notes.slice(0,240)}{job.notes.length>240?'…':''}</p>}<div className="job-research-actions"><button className="button primary small" onClick={()=>onShortlist(job)}><Users size={14}/>View shortlist</button><button className="button secondary small" onClick={()=>onResearch(job,'employee')}><Users size={14}/>Find referrers</button><button className="button secondary small" onClick={()=>onResearch(job,'recruiter')}><Search size={14}/>Find recruiters</button></div><div className="job-card-actions">{job.url&&<a className="source-link" href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13}/>View listing</a>}<button className="text-button" onClick={()=>onFindPerson(job)}><Plus size={14}/>Add relevant contact</button><button className="icon-button" aria-label={'Delete '+job.title} onClick={()=>onDelete(job)}><Trash2 size={15}/></button></div></article>)}</div>:<div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={27}/></div><h3>{jobs.length?'No matching opportunities':'An opening makes your request specific.'}</h3><p>{jobs.length?'Change your filters to find saved roles.':'Search current internships and jobs, then save a promising role.'}</p><div className="button-row" style={{justifyContent:'center'}}><button className="button primary" onClick={()=>setShowScraper(true)}><Globe2 size={15}/>Scrape Live Openings & Match</button><button className="button secondary" onClick={onSearch}>Search queries <ArrowRight size={15}/></button></div></div>}{showScraper&&<JobScraperModal leads={leads} onClose={()=>setShowScraper(false)} onSaveJob={async j=>{if(onSaveJob)await onSaveJob(j);}} onFindPerson={(comp,role,url)=>{setShowScraper(false);if(onFindScrapedPerson)onFindScrapedPerson(comp,role,url);}}/>}</section>;
}
export function CareerProfile({
  profile,
  onSave,
  busy,
  onOpenResumeBuilder,
}: {
  profile: Profile;
  onSave: (profile: Profile) => Promise<void>;
  busy: boolean;
  onOpenResumeBuilder?: () => void;
}) {
  const [form, setForm] = useState(profile);
  const [error, setError] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const [resumes, setResumes] = useState<SavedResumeRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ resumes: SavedResumeRecord[] }>('/api/resumes')
      .then(res => {
        if (cancelled) return;
        const list = res.resumes || [];
        setResumes(list);
        const primary = list.find(r => r.isPrimary) || list[0];
        if (primary) setSelectedResumeId(primary.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  const applyResumeToProfile = (resumeRecord: SavedResumeRecord) => {
    const fields = populateProfileFromResume(resumeRecord.data, resumeRecord.targetRole);
    setForm(prev => ({
      ...prev,
      targetRole: fields.targetRole || prev.targetRole,
      education: fields.education || prev.education,
      skills: fields.skills || prev.skills,
      evidence: fields.evidence || prev.evidence,
      portfolioUrl: fields.portfolioUrl || prev.portfolioUrl,
      signature: fields.signature || prev.signature,
      targetLocation: fields.targetLocation || prev.targetLocation,
    }));
    setSyncNotice(`Profile fields filled from "${resumeRecord.title}". Click "Save career profile" below to persist changes.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setSyncNotice('');
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        const resumeData = (json.data || json) as ResumeData;
        const fields = populateProfileFromResume(resumeData);
        setForm(prev => ({
          ...prev,
          targetRole: fields.targetRole || prev.targetRole,
          education: fields.education || prev.education,
          skills: fields.skills || prev.skills,
          evidence: fields.evidence || prev.evidence,
          portfolioUrl: fields.portfolioUrl || prev.portfolioUrl,
          signature: fields.signature || prev.signature,
          targetLocation: fields.targetLocation || prev.targetLocation,
        }));
        setSyncNotice(`Parsed resume JSON (${file.name}) and populated profile fields!`);
      } else if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const res = await api<{ ok: boolean; profileFields?: any; error?: string }>('/api/resumes', {
          action: 'parse_pdf',
          base64,
        });
        if (res.profileFields) {
          const fields = res.profileFields;
          setForm(prev => ({
            ...prev,
            targetRole: fields.targetRole || prev.targetRole,
            education: fields.education || prev.education,
            skills: fields.skills || prev.skills,
            evidence: fields.evidence || prev.evidence,
            portfolioUrl: fields.portfolioUrl || prev.portfolioUrl,
            signature: fields.signature || prev.signature,
            targetLocation: fields.targetLocation || prev.targetLocation,
          }));
          setSyncNotice(`Extracted text from PDF (${file.name}) and autofilled profile!`);
        } else if (res.error) {
          throw new Error(res.error);
        }
      } else {
        const text = await file.text();
        const res = await api<{ ok: boolean; profileFields?: any; error?: string }>('/api/resumes', {
          action: 'parse_text',
          text,
        });
        if (res.profileFields) {
          const fields = res.profileFields;
          setForm(prev => ({
            ...prev,
            targetRole: fields.targetRole || prev.targetRole,
            education: fields.education || prev.education,
            skills: fields.skills || prev.skills,
            evidence: fields.evidence || prev.evidence,
            portfolioUrl: fields.portfolioUrl || prev.portfolioUrl,
            signature: fields.signature || prev.signature,
            targetLocation: fields.targetLocation || prev.targetLocation,
          }));
          setSyncNotice(`Extracted text from file (${file.name}) and autofilled profile!`);
        } else if (res.error) {
          throw new Error(res.error);
        }
      }
    } catch (err) {
      setError(`Failed to read resume file: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const field = (key: keyof Profile, label: string, placeholder = '', type = 'text') => (
    <label>
      {label}
      <input
        type={type}
        value={form[key]}
        maxLength={2000}
        placeholder={placeholder}
        required={key === 'signature'}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <div className="settings-grid">
      <section className="card">
        <div className="section-kicker">
          <GraduationCap size={17} />YOUR CAREER PROFILE
        </div>
        <h2>Give people a reason to help.</h2>
        <p>Use details you can support with your resume or projects. These fields personalize your messages.</p>

        {/* Built Resume Integration Card */}
        <div className="resume-sync-banner">
          <div className="resume-sync-header">
            <div className="resume-sync-title">
              <FileText size={18} />
              <strong>Already Built Resume & ATS Integration</strong>
            </div>
            {onOpenResumeBuilder && (
              <button
                type="button"
                className="text-button"
                onClick={onOpenResumeBuilder}
              >
                Open ATS Resume Builder <ArrowRight size={13} />
              </button>
            )}
          </div>

          <p className="resume-sync-desc">
            Select an existing resume you built in Leadforge or upload a PDF/JSON resume file to auto-populate your verified skills, education, and project evidence.
          </p>

          {resumes.length > 0 && (
            <div className="resume-sync-controls">
              <label className="resume-select-label">
                <span className="sr-only">Choose a built resume</span>
                <select
                  value={selectedResumeId}
                  onChange={e => setSelectedResumeId(e.target.value)}
                  aria-label="Select an already built resume"
                >
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.targetRole || 'General'}{r.isPrimary ? ' · Primary' : ''})
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="button primary small"
                onClick={() => selectedResume && applyResumeToProfile(selectedResume)}
              >
                <Sparkles size={14} /> Autofill Profile from Resume
              </button>
            </div>
          )}

          <div className="resume-sync-upload-row">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.json,.txt,.md"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="button secondary small"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <LoaderCircle size={14} className="spin" /> : <Upload size={14} />}
              Upload Resume File (PDF / JSON / Text)
            </button>
            <span className="resume-sync-hint">
              Extracts text and auto-fills profile fields
            </span>
          </div>

          {syncNotice && (
            <div className="resume-sync-notice" role="status">
              <CheckCircle2 size={16} />
              <span>{syncNotice}</span>
            </div>
          )}
        </div>

        <form onSubmit={async e => {
          e.preventDefault();
          setError('');
          try {
            await onSave(form);
          } catch (e) {
            setError((e as Error).message);
          }
        }}>
          {field('signature', 'Your name / signature', 'Ravi')}
          {field('education', 'Education / current study', 'Your degree and current stage')}
          {field('targetRole', 'Target roles', 'AI / Data Science internship')}
          {field('targetLocation', 'Target locations', 'India + remote')}
          {field('skills', 'Relevant skills', 'Only skills you can demonstrate')}
          <label>
            Project evidence
            <textarea
              rows={4}
              value={form.evidence}
              maxLength={2000}
              placeholder="Describe one relevant project, what you built, and a result you can substantiate."
              onChange={e => setForm({ ...form, evidence: e.target.value })}
            />
          </label>
          <div className="resume-link-field">
            {field('resumeUrl', 'Resume link', 'A shareable resume URL (Drive, Notion, Overleaf, or app)')}
            {selectedResume && (
              <div className="resume-quick-suggest">
                <span>Quick fill:</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setForm(f => ({ ...f, resumeUrl: `/resume?id=${selectedResume.id}` }))}
                >
                  Use Built ATS Resume ({selectedResume.title})
                </button>
              </div>
            )}
          </div>
          {field('portfolioUrl', 'GitHub / portfolio link', 'https://github.com/your-username')}
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
            Save career profile
          </button>
        </form>
      </section>

      <div>
        <section className="card workspace-info">
          <GraduationCap size={25} />
          <h2>Built for your next opportunity.</h2>
          <p>Your profile is private inside this app. Only include links you intend to share in your copied message drafts.</p>
          <div className="info-row">
            <Link2 size={17} />
            <div>
              <strong>People discovery</strong>
              <small>Crawl public pages for people, emails, and phones with source evidence.</small>
            </div>
          </div>
          <div className="info-row">
            <BriefcaseBusiness size={17} />
            <div>
              <strong>Opportunity tracking</strong>
              <small>Save listings, application progress, and next actions.</small>
            </div>
          </div>
          <div className="info-row">
            <Mail size={17} />
            <div>
              <strong>Relevant requests</strong>
              <small>Draft a referral request or hiring enquiry with your evidence.</small>
            </div>
          </div>
          <div className="soft-note">
            No guaranteed referrals, hiring decisions, or verified contact database. Names and profile details are saved after you review the source.
          </div>
        </section>
        <section className="card">
          <h3>Start with these four details.</h3>
          <div className="career-checklist">
            <p>1. The exact internship or role you want.</p>
            <p>2. One project that shows relevant ability.</p>
            <p>3. A working resume and portfolio link.</p>
            <p>4. A specific reason to contact that person.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
