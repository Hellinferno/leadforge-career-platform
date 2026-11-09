import { publicUrl } from "./research.ts";

export type ScrapedJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  type: string;
  url: string;
  description: string;
  department: string;
  source: 'greenhouse' | 'lever' | 'web_page' | 'curated';
};

export type JobScrapeResult = {
  company: string;
  jobs: ScrapedJob[];
  sourceUrl: string;
  sourceType: string;
  warnings: string[];
};

// Known companies with active public Greenhouse or Lever API boards
export const POPULAR_TECH_ATS: Record<string, { type: 'greenhouse' | 'lever'; slug: string; name: string }> = {
  stripe: { type: 'greenhouse', slug: 'stripe', name: 'Stripe' },
  figma: { type: 'greenhouse', slug: 'figma', name: 'Figma' },
  gitlab: { type: 'greenhouse', slug: 'gitlab', name: 'GitLab' },
  cloudflare: { type: 'greenhouse', slug: 'cloudflare', name: 'Cloudflare' },
  databricks: { type: 'greenhouse', slug: 'databricks', name: 'Databricks' },
  airbnb: { type: 'greenhouse', slug: 'airbnb', name: 'Airbnb' },
  dropbox: { type: 'greenhouse', slug: 'dropbox', name: 'Dropbox' },
  coinbase: { type: 'greenhouse', slug: 'coinbase', name: 'Coinbase' },
  automattic: { type: 'greenhouse', slug: 'automattic', name: 'Automattic' },
  palantir: { type: 'lever', slug: 'palantir', name: 'Palantir Technologies' },
  atlassian: { type: 'lever', slug: 'atlassian', name: 'Atlassian' },
  spotify: { type: 'lever', slug: 'spotify', name: 'Spotify' },
};

export async function fetchGreenhouseJobs(slug: string, companyName?: string): Promise<ScrapedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });
  if (!res.ok) throw new Error(`Greenhouse board "${slug}" returned status ${res.status}`);
  const data = await res.json() as { jobs: Array<{ id: number; title: string; location: { name: string }; absolute_url: string; departments: Array<{ name: string }> }> };
  
  const comp = companyName || slug.charAt(0).toUpperCase() + slug.slice(1);
  return (data.jobs || []).map(j => {
    const isIntern = /\bintern(?:ship)?\b/i.test(j.title);
    return {
      id: `gh-${j.id}`,
      company: comp,
      title: j.title,
      location: j.location?.name || 'Remote / Worldwide',
      type: isIntern ? 'internship' : 'full_time',
      url: j.absolute_url,
      description: '',
      department: j.departments?.map(d => d.name).join(', ') || 'Engineering & Product',
      source: 'greenhouse',
    };
  });
}

export async function fetchLeverJobs(slug: string, companyName?: string): Promise<ScrapedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });
  if (!res.ok) throw new Error(`Lever board "${slug}" returned status ${res.status}`);
  const data = await res.json() as Array<{ id: string; text: string; categories: { location?: string; commitment?: string; team?: string }; hostedUrl: string; descriptionPlain?: string }>;
  
  const comp = companyName || slug.charAt(0).toUpperCase() + slug.slice(1);
  return (data || []).map(j => {
    const isIntern = /\bintern(?:ship)?\b/i.test(j.text);
    return {
      id: `lever-${j.id}`,
      company: comp,
      title: j.text,
      location: j.categories?.location || 'Remote',
      type: isIntern ? 'internship' : j.categories?.commitment?.toLowerCase().includes('contract') ? 'contract' : 'full_time',
      url: j.hostedUrl,
      description: (j.descriptionPlain || '').slice(0, 1000),
      department: j.categories?.team || 'General',
      source: 'lever',
    };
  });
}

export async function scrapeJobsFromInput(input: string, filterRole = ''): Promise<JobScrapeResult> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Enter a company name, careers URL, or Greenhouse/Lever link.');

  const warnings: string[] = [];

  // Check if input is a URL or company name
  const isUrl = /^https?:\/\//i.test(trimmed) || trimmed.includes('.');
  let targetUrl = '';
  let companySlug = '';
  let matchedType: 'greenhouse' | 'lever' | 'web' = 'web';

  if (isUrl) {
    try {
      const parsed = publicUrl(trimmed);
      targetUrl = parsed.href;

      // Detect Greenhouse
      if (parsed.hostname.includes('greenhouse.io')) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        companySlug = parts[0] === 'embed' || parts[0] === 'v1' ? parts[parts.length - 1] : parts[0] || '';
        matchedType = 'greenhouse';
      } else if (parsed.hostname.includes('lever.co')) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        companySlug = parts[0] || '';
        matchedType = 'lever';
      }
    } catch {
      throw new Error('Please enter a valid HTTP or HTTPS URL.');
    }
  } else {
    // Pure company name input (e.g. "Stripe", "Figma", "Gitlab")
    const cleanKey = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    const known = POPULAR_TECH_ATS[cleanKey];
    if (known) {
      companySlug = known.slug;
      matchedType = known.type;
    } else {
      companySlug = cleanKey;
      matchedType = 'greenhouse'; // Try Greenhouse first as default
    }
  }

  let jobs: ScrapedJob[] = [];

  if (matchedType === 'greenhouse' && companySlug) {
    try {
      jobs = await fetchGreenhouseJobs(companySlug);
    } catch (e) {
      // Try Lever as fallback
      try {
        jobs = await fetchLeverJobs(companySlug);
        matchedType = 'lever';
      } catch {
        warnings.push(`Could not find a public Greenhouse or Lever API board for "${companySlug}". Check the direct careers page URL.`);
      }
    }
  } else if (matchedType === 'lever' && companySlug) {
    try {
      jobs = await fetchLeverJobs(companySlug);
    } catch (e) {
      warnings.push(`Could not fetch Lever jobs for "${companySlug}".`);
    }
  }

  // Filter by role if specified (e.g., "Data", "Analyst", "Intern")
  if (filterRole.trim() && jobs.length > 0) {
    const terms = filterRole.toLowerCase().split(/\s+/).filter(Boolean);
    jobs = jobs.filter(j => {
      const text = `${j.title} ${j.department} ${j.location}`.toLowerCase();
      return terms.some(t => text.includes(t));
    });
  }

  const compName = jobs[0]?.company || (companySlug ? companySlug.charAt(0).toUpperCase() + companySlug.slice(1) : trimmed);

  return {
    company: compName,
    jobs: jobs.slice(0, 100),
    sourceUrl: targetUrl || `https://boards.greenhouse.io/${companySlug}`,
    sourceType: matchedType,
    warnings,
  };
}
