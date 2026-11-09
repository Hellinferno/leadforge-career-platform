"use client";

import { useState } from "react";
import {
  Globe2,
  Search,
  Plus,
  ExternalLink,
  Check,
  LoaderCircle,
  Building2,
  Users,
  BriefcaseBusiness,
  Sparkles,
  Link2,
} from "lucide-react";
import { POPULAR_TECH_ATS, type ScrapedJob, type JobScrapeResult } from "../lib/job-scraper";
import type { Lead } from "../lib/leads";
import type { EditableJob } from "../lib/career";
import { api, Modal } from "./ui";

type Props = {
  leads: Lead[];
  onClose: () => void;
  onSaveJob: (job: EditableJob) => Promise<void>;
  onFindPerson: (company: string, role: string, url: string) => void;
};

export default function JobScraperModal({ leads, onClose, onSaveJob, onFindPerson }: Props) {
  const [query, setQuery] = useState<string>("Stripe");
  const [roleFilter, setRoleFilter] = useState<string>("Data");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<JobScrapeResult | null>(null);
  const [savedJobUrls, setSavedJobUrls] = useState<Set<string>>(new Set());

  const searchJobs = async (targetQuery = query, targetRole = roleFilter) => {
    setBusy(true);
    setError("");
    try {
      const data = await api<JobScrapeResult>("/api/jobs/scrape", {
        query: targetQuery,
        role: targetRole,
      });
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (scraped: ScrapedJob) => {
    const jobData: EditableJob = {
      company: scraped.company,
      title: scraped.title,
      url: scraped.url,
      location: scraped.location,
      type: scraped.type,
      status: "saved",
      notes: `Scraped via ${scraped.source} API.\nDepartment: ${scraped.department}\n${scraped.description ? "Summary: " + scraped.description : ""}`,
      nextActionAt: "",
    };
    await onSaveJob(jobData);
    setSavedJobUrls(prev => new Set(prev).add(scraped.url));
  };

  // Find contacts at this company
  const companyContacts = (company: string) => {
    return leads.filter(l => l.company.trim().toLowerCase() === company.trim().toLowerCase());
  };

  return (
    <Modal
      title="Live Job & Internship Discovery"
      subtitle="Scrape official career boards (Greenhouse, Lever) and match openings with your referral network."
      onClose={onClose}
    >
      <div className="job-scraper-modal-content">
        {/* Search Bar */}
        <form
          className="job-scraper-search-form"
          onSubmit={e => {
            e.preventDefault();
            searchJobs();
          }}
        >
          <div className="form-grid">
            <label>
              Target Company or ATS Link *
              <input
                value={query}
                required
                maxLength={200}
                placeholder="e.g. Stripe, Databricks, Cloudflare or boards.greenhouse.io/..."
                onChange={e => setQuery(e.target.value)}
              />
            </label>
            <label>
              Filter Roles (e.g. Data, Intern, ML)
              <input
                value={roleFilter}
                maxLength={100}
                placeholder="Data, Analyst, Intern, Engineer..."
                onChange={e => setRoleFilter(e.target.value)}
              />
            </label>
          </div>

          {/* Quick Preset Buttons */}
          <div className="popular-company-presets">
            <span className="preset-label">Popular Live Boards:</span>
            {["Stripe", "Databricks", "Cloudflare", "Palantir", "Figma", "GitLab"].map(comp => (
              <button
                key={comp}
                type="button"
                className="preset-chip"
                onClick={() => {
                  setQuery(comp);
                  searchJobs(comp, roleFilter);
                }}
              >
                {comp}
              </button>
            ))}
          </div>

          <div className="modal-search-actions">
            <button className="button primary" disabled={busy || !query.trim()}>
              {busy ? <LoaderCircle size={16} className="spin" /> : <Search size={16} />} Search Openings
            </button>
          </div>
        </form>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        {/* Results List */}
        {result && (
          <div className="scraped-results-wrap">
            <div className="scraped-results-header">
              <div>
                <h4>
                  {result.company} Openings ({result.jobs.length})
                </h4>
                <p>Official openings fetched via public {result.sourceType} board.</p>
              </div>
              <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                Board Source <ExternalLink size={12} />
              </a>
            </div>

            {result.warnings.length > 0 && (
              <div className="soft-note">
                {result.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}

            {result.jobs.length > 0 ? (
              <div className="scraped-jobs-grid">
                {result.jobs.map(job => {
                  const matches = companyContacts(job.company);
                  const isSaved = savedJobUrls.has(job.url);

                  return (
                    <article key={job.id} className="scraped-job-card">
                      <div className="scraped-job-top">
                        <div>
                          <h5>{job.title}</h5>
                          <span className="scraped-job-meta">
                            {job.company} · {job.location} · {job.department}
                          </span>
                        </div>
                        <span className={`stage stage-${job.type === "internship" ? "new" : "interview"}`}>
                          {job.type === "internship" ? "Internship" : "Full-time"}
                        </span>
                      </div>

                      {/* Referral Match Banner */}
                      <div className="referral-match-banner">
                        <Users size={14} />
                        {matches.length > 0 ? (
                          <span className="match-found">
                            <strong>{matches.length} contact(s)</strong> at {job.company} could refer you!
                          </span>
                        ) : (
                          <span className="match-none">No saved contacts at {job.company} yet.</span>
                        )}
                      </div>

                      <div className="scraped-job-actions">
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="source-link">
                          View Listing <ExternalLink size={12} />
                        </a>

                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() => onFindPerson(job.company, job.title, job.url)}
                          title="Search employees & recruiters at this company"
                        >
                          <Users size={13} /> Find Referrers
                        </button>

                        <button
                          type="button"
                          className="button primary small"
                          disabled={isSaved}
                          onClick={() => handleSave(job)}
                        >
                          {isSaved ? <Check size={14} /> : <Plus size={14} />}
                          {isSaved ? "Saved" : "Save Opportunity"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <BriefcaseBusiness size={24} />
                <p>No active openings found matching "{roleFilter}". Try clearing or broadening your role filter.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
