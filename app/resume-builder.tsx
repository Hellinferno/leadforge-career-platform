"use client";

import { useState, useMemo, useRef } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  Sparkles,
  ExternalLink,
  Printer,
  Copy,
  FolderGit2,
  GraduationCap,
  BriefcaseBusiness,
  Award,
  Layers,
  Search,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  Link2,
} from "lucide-react";
import {
  DEFAULT_RESUME,
  COMMON_DATA_SKILLS,
  analyzeJobFit,
  validateResume,
  type ResumeData,
  type EducationItem,
  type ExperienceItem,
  type ProjectItem,
  type CertificationItem,
  type SavedResumeRecord,
} from "../lib/resume";
import type { Job } from "../lib/career";
import type { Profile } from "../lib/leads";
import { api, download } from "./ui";

type EditorTab = "personal" | "summary" | "experience" | "projects" | "education" | "skills" | "certifications" | "match";

type Props = {
  profile: Profile;
  jobs: Job[];
  onProfileSynced?: () => void;
};

export default function ResumeBuilder({ profile, jobs, onProfileSynced }: Props) {
  const [resumes, setResumes] = useState<SavedResumeRecord[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [resume, setResume] = useState<ResumeData>(DEFAULT_RESUME);
  const [activeTab, setActiveTab] = useState<EditorTab>("personal");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Job Matcher State
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [customJdText, setCustomJdText] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load resumes on mount
  useState(() => {
    loadResumes();
  });

  async function loadResumes() {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ resumes: SavedResumeRecord[] }>("/api/resumes");
      if (res.resumes && res.resumes.length > 0) {
        setResumes(res.resumes);
        const primary = res.resumes.find(r => r.isPrimary) || res.resumes[0];
        setCurrentId(primary.id);
        setResume(primary.data);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const selectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);
  const activeJd = selectedJob ? `${selectedJob.title} at ${selectedJob.company}\n${selectedJob.notes}` : customJdText;

  const matchAnalysis = useMemo(() => {
    return analyzeJobFit(resume, activeJd);
  }, [resume, activeJd]);

  // Updates helper
  const updatePersonal = (field: keyof ResumeData["personal"], value: string) => {
    setResume(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  const saveResume = async () => {
    setSaving(true);
    setError("");
    try {
      const validated = validateResume(resume);
      const res = await api<{ ok: boolean; resume: SavedResumeRecord }>("/api/resumes", {
        action: "save",
        id: currentId,
        title: resume.personal.title || "My Resume",
        targetRole: resume.personal.title || "Data Analyst",
        data: validated,
      });

      setNotice("Resume saved successfully!");
      setTimeout(() => setNotice(""), 3500);

      setResumes(prev => {
        const idx = prev.findIndex(r => r.id === currentId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = res.resume;
          return updated;
        }
        return [res.resume, ...prev];
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const syncToProfile = async () => {
    setSaving(true);
    setError("");
    try {
      await api("/api/resumes", {
        action: "sync_to_profile",
        data: resume,
        targetRole: resume.personal.title,
      });
      setNotice("Synced target role, projects & skills into your Career Profile!");
      setTimeout(() => setNotice(""), 4000);
      if (onProfileSynced) onProfileSynced();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const printResume = () => {
    window.print();
  };

  const exportJson = () => {
    download(
      `${(resume.personal.fullName || "resume").toLowerCase().replace(/\s+/g, "-")}-resume.json`,
      JSON.stringify(resume, null, 2),
      "application/json"
    );
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const validated = validateResume(parsed);
        setResume(validated);
        setNotice("Resume imported from JSON file.");
        setTimeout(() => setNotice(""), 3500);
      } catch (err) {
        setError(`Failed to import JSON: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  // Education helpers
  const addEducation = () => {
    const newItem: EducationItem = {
      id: `edu-${Date.now()}`,
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      gpa: "",
      highlights: "",
    };
    setResume(prev => ({ ...prev, education: [...prev.education, newItem] }));
  };

  const updateEducation = (id: string, field: keyof EducationItem, value: string) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.map(item => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeEducation = (id: string) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.filter(item => item.id !== id),
    }));
  };

  // Experience helpers
  const addExperience = () => {
    const newItem: ExperienceItem = {
      id: `exp-${Date.now()}`,
      company: "",
      role: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      bullets: [""],
    };
    setResume(prev => ({ ...prev, experience: [...prev.experience, newItem] }));
  };

  const updateExperience = (id: string, field: keyof ExperienceItem, value: any) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map(item => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeExperience = (id: string) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.filter(item => item.id !== id),
    }));
  };

  const updateExpBullet = (expId: string, index: number, value: string) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map(exp => {
        if (exp.id !== expId) return exp;
        const bullets = [...exp.bullets];
        bullets[index] = value;
        return { ...exp, bullets };
      }),
    }));
  };

  const addExpBullet = (expId: string) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map(exp => (exp.id === expId ? { ...exp, bullets: [...exp.bullets, ""] } : exp)),
    }));
  };

  const removeExpBullet = (expId: string, index: number) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map(exp => {
        if (exp.id !== expId) return exp;
        return { ...exp, bullets: exp.bullets.filter((_, i) => i !== index) };
      }),
    }));
  };

  // Projects helpers
  const addProject = () => {
    const newItem: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: "",
      role: "Lead Analyst",
      liveUrl: "",
      githubUrl: "",
      date: "",
      toolsUsed: "",
      bullets: [""],
    };
    setResume(prev => ({ ...prev, projects: [...prev.projects, newItem] }));
  };

  const updateProject = (id: string, field: keyof ProjectItem, value: any) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.map(item => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeProject = (id: string) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.filter(item => item.id !== id),
    }));
  };

  const updateProjBullet = (projId: string, index: number, value: string) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.map(proj => {
        if (proj.id !== projId) return proj;
        const bullets = [...proj.bullets];
        bullets[index] = value;
        return { ...proj, bullets };
      }),
    }));
  };

  const addProjBullet = (projId: string) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.map(proj => (proj.id === projId ? { ...proj, bullets: [...proj.bullets, ""] } : proj)),
    }));
  };

  const removeProjBullet = (projId: string, index: number) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.map(proj => {
        if (proj.id !== projId) return proj;
        return { ...proj, bullets: proj.bullets.filter((_, i) => i !== index) };
      }),
    }));
  };

  // Skills helpers
  const addSkill = (category: keyof ResumeData["skills"], skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (resume.skills[category].includes(trimmed)) return;
    setResume(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: [...prev.skills[category], trimmed],
      },
    }));
  };

  const removeSkill = (category: keyof ResumeData["skills"], skill: string) => {
    setResume(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter(s => s !== skill),
      },
    }));
  };

  // Certifications helpers
  const addCertification = () => {
    const newItem: CertificationItem = {
      id: `cert-${Date.now()}`,
      name: "",
      issuer: "",
      date: "",
      url: "",
    };
    setResume(prev => ({ ...prev, certifications: [...prev.certifications, newItem] }));
  };

  const updateCertification = (id: string, field: keyof CertificationItem, value: string) => {
    setResume(prev => ({
      ...prev,
      certifications: prev.certifications.map(item => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeCertification = (id: string) => {
    setResume(prev => ({
      ...prev,
      certifications: prev.certifications.filter(item => item.id !== id),
    }));
  };

  return (
    <div className="resume-builder-workspace">
      {/* Action / Toolbar Header */}
      <section className="resume-toolbar-header card">
        <div className="toolbar-left">
          <div className="resume-icon-badge">
            <FileText size={22} />
          </div>
          <div>
            <h2>ATS Resume Builder & Matcher</h2>
            <p>Design an ATS-friendly resume tailored for Data Analytics, internships & job referrals.</p>
          </div>
        </div>

        <div className="toolbar-actions">
          <div className="template-select-wrap">
            <span className="template-label">Style:</span>
            <select
              aria-label="Resume Template Style"
              value={resume.template}
              onChange={e => setResume(prev => ({ ...prev, template: e.target.value as any }))}
            >
              <option value="modern">Modern Minimal (Recommended)</option>
              <option value="classic">Classic Academic (Harvard 1-Page)</option>
              <option value="tech">Tech / Data Specialist</option>
              <option value="minimal">Clean Compact</option>
            </select>
          </div>

          <button className="button secondary small" onClick={syncToProfile} disabled={saving} title="Update Career Profile with resume facts">
            <Link2 size={15} /> Sync Profile
          </button>

          <button className="button secondary small" onClick={exportJson} title="Export JSON backup">
            <Download size={15} /> JSON
          </button>

          <button className="button secondary small" onClick={() => fileInputRef.current?.click()} title="Import JSON file">
            <Upload size={15} /> Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept=".json,application/json"
            onChange={e => {
              if (e.target.files?.[0]) importJson(e.target.files[0]);
            }}
          />

          <button className="button secondary small" onClick={printResume} title="Export or print PDF">
            <Printer size={15} /> Print / Save PDF
          </button>

          <button className="button primary small" onClick={saveResume} disabled={saving}>
            <Save size={15} /> {saving ? "Saving..." : "Save Resume"}
          </button>
        </div>
      </section>

      {notice && (
        <div className="resume-alert success" role="status">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}
      {error && (
        <div className="resume-alert error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Main Split Layout: Editor Left, Live Preview Right */}
      <div className="resume-split-grid">
        {/* Left Column: Editor Tabs */}
        <div className="resume-editor-pane card">
          {/* Navigation Sub-Tabs */}
          <nav className="resume-subnav" aria-label="Resume Sections">
            <button
              className={`subnav-btn ${activeTab === "personal" ? "active" : ""}`}
              onClick={() => setActiveTab("personal")}
            >
              Contact
            </button>
            <button
              className={`subnav-btn ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`subnav-btn ${activeTab === "experience" ? "active" : ""}`}
              onClick={() => setActiveTab("experience")}
            >
              Experience
            </button>
            <button
              className={`subnav-btn ${activeTab === "projects" ? "active" : ""}`}
              onClick={() => setActiveTab("projects")}
            >
              Projects ({resume.projects.length})
            </button>
            <button
              className={`subnav-btn ${activeTab === "education" ? "active" : ""}`}
              onClick={() => setActiveTab("education")}
            >
              Education
            </button>
            <button
              className={`subnav-btn ${activeTab === "skills" ? "active" : ""}`}
              onClick={() => setActiveTab("skills")}
            >
              Skills
            </button>
            <button
              className={`subnav-btn ${activeTab === "certifications" ? "active" : ""}`}
              onClick={() => setActiveTab("certifications")}
            >
              Certs
            </button>
            <button
              className={`subnav-btn match-tab-btn ${activeTab === "match" ? "active" : ""}`}
              onClick={() => setActiveTab("match")}
            >
              <Sparkles size={14} /> ATS Match ({matchAnalysis.score}%)
            </button>
          </nav>

          {/* Tab 1: Personal Info */}
          {activeTab === "personal" && (
            <div className="editor-section">
              <h3>Personal Details & Links</h3>
              <p className="editor-desc">This header appears at the top of your resume.</p>
              <div className="form-grid">
                <label>
                  Full Name *
                  <input
                    value={resume.personal.fullName}
                    onChange={e => updatePersonal("fullName", e.target.value)}
                    placeholder="e.g. Ravi Kumar"
                  />
                </label>
                <label>
                  Professional Title
                  <input
                    value={resume.personal.title}
                    onChange={e => updatePersonal("title", e.target.value)}
                    placeholder="e.g. Data Analyst | Applied AI"
                  />
                </label>
                <label>
                  Email Address
                  <input
                    value={resume.personal.email}
                    onChange={e => updatePersonal("email", e.target.value)}
                    placeholder="e.g. name@example.com"
                  />
                </label>
                <label>
                  Phone Number
                  <input
                    value={resume.personal.phone}
                    onChange={e => updatePersonal("phone", e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                </label>
                <label className="span-2">
                  Location
                  <input
                    value={resume.personal.location}
                    onChange={e => updatePersonal("location", e.target.value)}
                    placeholder="e.g. Bangalore, India (Open to Remote / Relocation)"
                  />
                </label>
                <label>
                  LinkedIn Profile URL
                  <input
                    value={resume.personal.linkedinUrl}
                    onChange={e => updatePersonal("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </label>
                <label>
                  GitHub URL
                  <input
                    value={resume.personal.githubUrl}
                    onChange={e => updatePersonal("githubUrl", e.target.value)}
                    placeholder="https://github.com/username"
                  />
                </label>
                <label className="span-2">
                  Portfolio / Personal Website URL
                  <input
                    value={resume.personal.portfolioUrl}
                    onChange={e => updatePersonal("portfolioUrl", e.target.value)}
                    placeholder="https://yourportfolio.dev"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Tab 2: Professional Summary */}
          {activeTab === "summary" && (
            <div className="editor-section">
              <h3>Professional Summary</h3>
              <p className="editor-desc">A brief 2–3 sentence value proposition highlighting your skills and focus.</p>
              <textarea
                rows={6}
                value={resume.summary}
                maxLength={2000}
                placeholder="Detail-oriented Data Analyst with proficiency in SQL, Python, and PowerBI..."
                onChange={e => setResume(prev => ({ ...prev, summary: e.target.value }))}
              />
              <div className="summary-suggestions">
                <strong>Quick Template Injections:</strong>
                <div className="suggestion-buttons">
                  <button
                    type="button"
                    className="suggestion-chip"
                    onClick={() =>
                      setResume(prev => ({
                        ...prev,
                        summary:
                          "Aspiring Data Analyst with rigorous foundations in SQL, Python (Pandas/NumPy), and interactive dashboard design (PowerBI/Tableau). Experienced in exploratory data analysis, KPI reporting, and translating raw datasets into actionable executive insights.",
                      }))
                    }
                  >
                    + Data Analytics Intern / Entry-level
                  </button>
                  <button
                    type="button"
                    className="suggestion-chip"
                    onClick={() =>
                      setResume(prev => ({
                        ...prev,
                        summary:
                          "Data Scientist & AI Specialist with proven track record in statistical modeling, machine learning pipelines, and predictive analytics. Skilled in PostgreSQL, Scikit-learn, and communicating data findings to cross-functional stakeholders.",
                      }))
                    }
                  >
                    + Data Science & ML Specialist
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Experience */}
          {activeTab === "experience" && (
            <div className="editor-section">
              <div className="section-title-row">
                <div>
                  <h3>Work & Internship Experience</h3>
                  <p className="editor-desc">List internships, part-time, or full-time roles.</p>
                </div>
                <button type="button" className="button secondary small" onClick={addExperience}>
                  <Plus size={14} /> Add Role
                </button>
              </div>

              {resume.experience.map((exp, expIdx) => (
                <div key={exp.id} className="editor-block">
                  <div className="editor-block-header">
                    <h4>Role #{expIdx + 1}</h4>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => removeExperience(exp.id)}
                      title="Remove role"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Company / Organization
                      <input
                        value={exp.company}
                        placeholder="Company Name"
                        onChange={e => updateExperience(exp.id, "company", e.target.value)}
                      />
                    </label>
                    <label>
                      Job Title
                      <input
                        value={exp.role}
                        placeholder="e.g. Data Analytics Intern"
                        onChange={e => updateExperience(exp.id, "role", e.target.value)}
                      />
                    </label>
                    <label>
                      Location
                      <input
                        value={exp.location}
                        placeholder="e.g. Bangalore, India or Remote"
                        onChange={e => updateExperience(exp.id, "location", e.target.value)}
                      />
                    </label>
                    <label>
                      Dates / Duration
                      <input
                        value={`${exp.startDate}${exp.endDate ? " - " + exp.endDate : ""}`}
                        placeholder="e.g. June 2025 - Aug 2025"
                        onChange={e => updateExperience(exp.id, "startDate", e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="bullets-editor">
                    <label className="bullets-label">Bullet Points (Accomplishments & Metrics):</label>
                    {exp.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="bullet-input-row">
                        <span>•</span>
                        <input
                          value={bullet}
                          placeholder="e.g. Designed and deployed 4 interactive PowerBI dashboards..."
                          onChange={e => updateExpBullet(exp.id, bIdx, e.target.value)}
                        />
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => removeExpBullet(exp.id, bIdx)}
                          disabled={exp.bullets.length <= 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="text-button" onClick={() => addExpBullet(exp.id)}>
                      <Plus size={13} /> Add bullet point
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Projects */}
          {activeTab === "projects" && (
            <div className="editor-section">
              <div className="section-title-row">
                <div>
                  <h3>Projects & Technical Portfolio</h3>
                  <p className="editor-desc">Essential for demonstrating real-world data analytics ability.</p>
                </div>
                <button type="button" className="button secondary small" onClick={addProject}>
                  <Plus size={14} /> Add Project
                </button>
              </div>

              {resume.projects.map((proj, pIdx) => (
                <div key={proj.id} className="editor-block">
                  <div className="editor-block-header">
                    <h4>Project #{pIdx + 1}</h4>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => removeProject(proj.id)}
                      title="Remove project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Project Title
                      <input
                        value={proj.title}
                        placeholder="e.g. E-Commerce Churn Prediction & Cohort Analysis"
                        onChange={e => updateProject(proj.id, "title", e.target.value)}
                      />
                    </label>
                    <label>
                      Tools & Technologies Used
                      <input
                        value={proj.toolsUsed}
                        placeholder="e.g. Python, SQL, Tableau, PostgreSQL"
                        onChange={e => updateProject(proj.id, "toolsUsed", e.target.value)}
                      />
                    </label>
                    <label>
                      GitHub Repo URL
                      <input
                        value={proj.githubUrl}
                        placeholder="https://github.com/..."
                        onChange={e => updateProject(proj.id, "githubUrl", e.target.value)}
                      />
                    </label>
                    <label>
                      Live Demo / Article URL
                      <input
                        value={proj.liveUrl}
                        placeholder="https://..."
                        onChange={e => updateProject(proj.id, "liveUrl", e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="bullets-editor">
                    <label className="bullets-label">Project Accomplishments & Technical Details:</label>
                    {proj.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="bullet-input-row">
                        <span>•</span>
                        <input
                          value={bullet}
                          placeholder="e.g. Developed churn prediction pipeline with 84% ROC-AUC using Random Forest..."
                          onChange={e => updateProjBullet(proj.id, bIdx, e.target.value)}
                        />
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => removeProjBullet(proj.id, bIdx)}
                          disabled={proj.bullets.length <= 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="text-button" onClick={() => addProjBullet(proj.id)}>
                      <Plus size={13} /> Add bullet point
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 5: Education */}
          {activeTab === "education" && (
            <div className="editor-section">
              <div className="section-title-row">
                <div>
                  <h3>Education & Academics</h3>
                  <p className="editor-desc">Degrees, institutions, GPA, and relevant coursework.</p>
                </div>
                <button type="button" className="button secondary small" onClick={addEducation}>
                  <Plus size={14} /> Add Education
                </button>
              </div>

              {resume.education.map((edu, eduIdx) => (
                <div key={edu.id} className="editor-block">
                  <div className="editor-block-header">
                    <h4>School / Degree #{eduIdx + 1}</h4>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => removeEducation(edu.id)}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <label className="span-2">
                      Institution / University
                      <input
                        value={edu.institution}
                        placeholder="e.g. Indian Institute of Technology"
                        onChange={e => updateEducation(edu.id, "institution", e.target.value)}
                      />
                    </label>
                    <label>
                      Degree
                      <input
                        value={edu.degree}
                        placeholder="e.g. Bachelor of Science"
                        onChange={e => updateEducation(edu.id, "degree", e.target.value)}
                      />
                    </label>
                    <label>
                      Field of Study
                      <input
                        value={edu.fieldOfStudy}
                        placeholder="e.g. Applied AI & Data Science"
                        onChange={e => updateEducation(edu.id, "fieldOfStudy", e.target.value)}
                      />
                    </label>
                    <label>
                      Graduation Year / Dates
                      <input
                        value={edu.endDate}
                        placeholder="e.g. 2026 (Expected) or 2022 - 2026"
                        onChange={e => updateEducation(edu.id, "endDate", e.target.value)}
                      />
                    </label>
                    <label>
                      GPA / Score (optional)
                      <input
                        value={edu.gpa}
                        placeholder="e.g. 8.8 / 10.0"
                        onChange={e => updateEducation(edu.id, "gpa", e.target.value)}
                      />
                    </label>
                    <label className="span-2">
                      Highlights / Relevant Coursework
                      <textarea
                        rows={2}
                        value={edu.highlights}
                        placeholder="e.g. Coursework: Database Systems, Applied Statistics, Machine Learning, Business Analytics."
                        onChange={e => updateEducation(edu.id, "highlights", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 6: Skills */}
          {activeTab === "skills" && (
            <div className="editor-section">
              <h3>Technical & Analytical Skills</h3>
              <p className="editor-desc">Categorized skills make ATS parsing easy and clear.</p>

              {(
                [
                  { key: "languages", label: "Programming & Query Languages" },
                  { key: "frameworksAndLibraries", label: "BI, Frameworks & Libraries" },
                  { key: "toolsAndDatabases", label: "Databases, Cloud & Platforms" },
                  { key: "competencies", label: "Core Methodologies & Analytics" },
                ] as const
              ).map(category => (
                <div key={category.key} className="skill-category-block">
                  <label>{category.label}:</label>
                  <div className="skill-chip-wrap">
                    {resume.skills[category.key].map(skill => (
                      <span key={skill} className="skill-chip">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(category.key, skill)}
                          aria-label={`Remove ${skill}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    placeholder={`Type a skill and press Enter (e.g. SQL, Python, PowerBI)...`}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value;
                        addSkill(category.key, val);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              ))}

              <div className="suggested-skills-box">
                <strong>Suggested Data Skills:</strong>
                <div className="suggested-chips">
                  {COMMON_DATA_SKILLS.filter(
                    s =>
                      !resume.skills.languages.includes(s) &&
                      !resume.skills.frameworksAndLibraries.includes(s) &&
                      !resume.skills.toolsAndDatabases.includes(s) &&
                      !resume.skills.competencies.includes(s)
                  )
                    .slice(0, 16)
                    .map(s => (
                      <button
                        key={s}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => {
                          if (["SQL", "Python", "R"].includes(s)) addSkill("languages", s);
                          else if (["PowerBI", "Tableau", "Excel", "Pandas", "NumPy"].includes(s))
                            addSkill("frameworksAndLibraries", s);
                          else if (["PostgreSQL", "BigQuery", "Snowflake", "Git"].includes(s))
                            addSkill("toolsAndDatabases", s);
                          else addSkill("competencies", s);
                        }}
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Certifications */}
          {activeTab === "certifications" && (
            <div className="editor-section">
              <div className="section-title-row">
                <div>
                  <h3>Certifications & Credentials</h3>
                  <p className="editor-desc">Industry credentials from Google, Microsoft, AWS, etc.</p>
                </div>
                <button type="button" className="button secondary small" onClick={addCertification}>
                  <Plus size={14} /> Add Certification
                </button>
              </div>

              {resume.certifications.map(cert => (
                <div key={cert.id} className="editor-block">
                  <div className="editor-block-header">
                    <h4>{cert.name || "New Certification"}</h4>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => removeCertification(cert.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Certification Title
                      <input
                        value={cert.name}
                        placeholder="e.g. Google Data Analytics Professional Certificate"
                        onChange={e => updateCertification(cert.id, "name", e.target.value)}
                      />
                    </label>
                    <label>
                      Issuing Organization
                      <input
                        value={cert.issuer}
                        placeholder="e.g. Google / Coursera"
                        onChange={e => updateCertification(cert.id, "issuer", e.target.value)}
                      />
                    </label>
                    <label>
                      Date Earned
                      <input
                        value={cert.date}
                        placeholder="e.g. 2025"
                        onChange={e => updateCertification(cert.id, "date", e.target.value)}
                      />
                    </label>
                    <label>
                      Verification URL
                      <input
                        value={cert.url}
                        placeholder="https://..."
                        onChange={e => updateCertification(cert.id, "url", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 8: ATS Job Match & Tailoring Tool */}
          {activeTab === "match" && (
            <div className="editor-section match-analysis-pane">
              <div className="match-score-card">
                <div className="score-circle">
                  <span>{matchAnalysis.score}%</span>
                  <small>ATS Match</small>
                </div>
                <div className="score-meta">
                  <h3>Job Description Keyword Match</h3>
                  <p>Compare this resume against target job requirements to pass initial recruiter and ATS filters.</p>
                </div>
              </div>

              <div className="form-grid">
                <label className="span-2">
                  Select a Saved Opportunity:
                  <select
                    value={selectedJobId}
                    onChange={e => {
                      setSelectedJobId(e.target.value);
                      if (e.target.value) setCustomJdText("");
                    }}
                  >
                    <option value="">-- Or paste custom job description below --</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.company} - {job.title} ({job.location || "Remote"})
                      </option>
                    ))}
                  </select>
                </label>

                {!selectedJobId && (
                  <label className="span-2">
                    Or Paste Job Description Text:
                    <textarea
                      rows={5}
                      value={customJdText}
                      placeholder="Paste job requirements, responsibilities and desired skills here..."
                      onChange={e => setCustomJdText(e.target.value)}
                    />
                  </label>
                )}
              </div>

              {/* Matched Keywords */}
              <div className="keywords-box">
                <h4>
                  <CheckCircle2 size={16} className="text-emerald" /> Matched Keywords ({matchAnalysis.matchedKeywords.length})
                </h4>
                <div className="keyword-chips">
                  {matchAnalysis.matchedKeywords.length > 0 ? (
                    matchAnalysis.matchedKeywords.map(k => (
                      <span key={k} className="keyword-chip matched">
                        ✓ {k}
                      </span>
                    ))
                  ) : (
                    <span className="muted">No matching keywords found yet.</span>
                  )}
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="keywords-box">
                <h4>
                  <AlertCircle size={16} className="text-amber" /> Missing High-Impact Keywords ({matchAnalysis.missingKeywords.length})
                </h4>
                <div className="keyword-chips">
                  {matchAnalysis.missingKeywords.length > 0 ? (
                    matchAnalysis.missingKeywords.map(k => (
                      <button
                        key={k}
                        type="button"
                        className="keyword-chip missing"
                        onClick={() => {
                          if (["sql", "python", "r"].includes(k)) addSkill("languages", k.toUpperCase());
                          else if (["powerbi", "tableau", "excel", "pandas", "numpy"].includes(k))
                            addSkill("frameworksAndLibraries", k);
                          else if (["postgresql", "bigquery", "snowflake", "aws", "gcp"].includes(k))
                            addSkill("toolsAndDatabases", k);
                          else addSkill("competencies", k);
                        }}
                        title="Click to add this keyword to your skills"
                      >
                        + Add {k}
                      </button>
                    ))
                  ) : (
                    <span className="muted">Great job! All detected JD keywords are covered in your resume.</span>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="recommendations-box">
                <h4>Optimization Tips:</h4>
                <ul>
                  {matchAnalysis.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: High-Fidelity Printable Resume Document Preview */}
        <div className="resume-preview-pane">
          <div className="preview-watermark-bar">
            <span>
              <Eye size={14} /> Live Print Preview (Standard Letter / A4)
            </span>
            <button className="button secondary small" onClick={printResume}>
              <Printer size={13} /> Print / Save as PDF
            </button>
          </div>

          <div id="printable-resume" className={`printable-resume-paper template-${resume.template}`}>
            {/* Header */}
            <header className="resume-paper-header">
              <h1 className="resume-name">{resume.personal.fullName || "Your Full Name"}</h1>
              {resume.personal.title && <p className="resume-title">{resume.personal.title}</p>}
              <div className="resume-contact-line">
                {resume.personal.email && <span>{resume.personal.email}</span>}
                {resume.personal.phone && <span>{resume.personal.phone}</span>}
                {resume.personal.location && <span>{resume.personal.location}</span>}
                {resume.personal.linkedinUrl && (
                  <a href={resume.personal.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                )}
                {resume.personal.githubUrl && (
                  <a href={resume.personal.githubUrl} target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                )}
                {resume.personal.portfolioUrl && (
                  <a href={resume.personal.portfolioUrl} target="_blank" rel="noopener noreferrer">
                    Portfolio
                  </a>
                )}
              </div>
            </header>

            {/* Summary */}
            {resume.summary && (
              <section className="resume-paper-section">
                <h2 className="section-heading">Professional Summary</h2>
                <div className="section-divider" />
                <p className="resume-summary-text">{resume.summary}</p>
              </section>
            )}

            {/* Technical Skills */}
            <section className="resume-paper-section">
              <h2 className="section-heading">Technical & Analytical Skills</h2>
              <div className="section-divider" />
              <div className="resume-skills-grid">
                {resume.skills.languages.length > 0 && (
                  <p>
                    <strong>Languages:</strong> {resume.skills.languages.join(", ")}
                  </p>
                )}
                {resume.skills.frameworksAndLibraries.length > 0 && (
                  <p>
                    <strong>Frameworks & BI:</strong> {resume.skills.frameworksAndLibraries.join(", ")}
                  </p>
                )}
                {resume.skills.toolsAndDatabases.length > 0 && (
                  <p>
                    <strong>Databases & Tools:</strong> {resume.skills.toolsAndDatabases.join(", ")}
                  </p>
                )}
                {resume.skills.competencies.length > 0 && (
                  <p>
                    <strong>Core Competencies:</strong> {resume.skills.competencies.join(", ")}
                  </p>
                )}
              </div>
            </section>

            {/* Projects */}
            {resume.projects.length > 0 && (
              <section className="resume-paper-section">
                <h2 className="section-heading">Selected Projects & Applications</h2>
                <div className="section-divider" />
                {resume.projects.map(proj => (
                  <article key={proj.id} className="resume-item">
                    <div className="resume-item-header">
                      <div className="item-title-wrap">
                        <strong className="item-title">{proj.title}</strong>
                        {proj.toolsUsed && <span className="item-tools"> | {proj.toolsUsed}</span>}
                      </div>
                      <div className="item-links">
                        {proj.githubUrl && (
                          <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer">
                            GitHub
                          </a>
                        )}
                        {proj.liveUrl && (
                          <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer">
                            Live Demo
                          </a>
                        )}
                      </div>
                    </div>
                    {proj.bullets.length > 0 && (
                      <ul className="resume-bullets">
                        {proj.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </section>
            )}

            {/* Experience */}
            {resume.experience.length > 0 && (
              <section className="resume-paper-section">
                <h2 className="section-heading">Work & Internship Experience</h2>
                <div className="section-divider" />
                {resume.experience.map(exp => (
                  <article key={exp.id} className="resume-item">
                    <div className="resume-item-header">
                      <div>
                        <strong className="item-title">{exp.role}</strong>
                        {exp.company && <span className="item-subtitle"> — {exp.company}</span>}
                      </div>
                      <div className="item-meta">
                        {exp.location && <span>{exp.location} | </span>}
                        <span>{exp.startDate}</span>
                      </div>
                    </div>
                    {exp.bullets.length > 0 && (
                      <ul className="resume-bullets">
                        {exp.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </section>
            )}

            {/* Education */}
            {resume.education.length > 0 && (
              <section className="resume-paper-section">
                <h2 className="section-heading">Education</h2>
                <div className="section-divider" />
                {resume.education.map(edu => (
                  <article key={edu.id} className="resume-item">
                    <div className="resume-item-header">
                      <div>
                        <strong className="item-title">{edu.institution}</strong>
                        <div className="item-degree">
                          {edu.degree}
                          {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                          {edu.gpa ? ` — GPA: ${edu.gpa}` : ""}
                        </div>
                      </div>
                      <div className="item-meta">{edu.endDate}</div>
                    </div>
                    {edu.highlights && <p className="edu-highlights">{edu.highlights}</p>}
                  </article>
                ))}
              </section>
            )}

            {/* Certifications */}
            {resume.certifications.length > 0 && (
              <section className="resume-paper-section">
                <h2 className="section-heading">Certifications & Honors</h2>
                <div className="section-divider" />
                <div className="resume-cert-list">
                  {resume.certifications.map(cert => (
                    <div key={cert.id} className="cert-row">
                      <span>
                        <strong>{cert.name}</strong> — {cert.issuer}
                      </span>
                      <span>{cert.date}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
