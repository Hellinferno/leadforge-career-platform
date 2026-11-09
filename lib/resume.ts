export type EducationItem = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  gpa: string;
  highlights: string;
};

export type ExperienceItem = {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
};

export type ProjectItem = {
  id: string;
  title: string;
  role: string;
  liveUrl: string;
  githubUrl: string;
  date: string;
  toolsUsed: string;
  bullets: string[];
};

export type CertificationItem = {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
};

export type ResumeSkills = {
  languages: string[];
  frameworksAndLibraries: string[];
  toolsAndDatabases: string[];
  competencies: string[];
};

export type ResumeData = {
  personal: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedinUrl: string;
    githubUrl: string;
    portfolioUrl: string;
  };
  summary: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: ResumeSkills;
  certifications: CertificationItem[];
  template: 'modern' | 'classic' | 'minimal' | 'tech';
};

export type SavedResumeRecord = {
  id: string;
  title: string;
  targetRole: string;
  data: ResumeData;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_RESUME: ResumeData = {
  personal: {
    fullName: 'Ravi Kumar',
    title: 'Data Analyst & Applied AI Specialist',
    email: 'ravi.analyst@example.com',
    phone: '+91 98765 43210',
    location: 'Bangalore, India (Open to Remote / Relocation)',
    linkedinUrl: 'https://www.linkedin.com/in/ravi-kumar-analytics',
    githubUrl: 'https://github.com/ravi-analytics',
    portfolioUrl: 'https://ravi-portfolio.dev',
  },
  summary:
    'Detail-oriented Data Analyst with strong technical background in SQL, Python, PowerBI, and statistical modeling. Proven experience building end-to-end analytics pipelines, exploratory data analysis, and predictive models that improve operational decision-making. Passionate about turning complex business questions into clear, actionable data stories.',
  education: [
    {
      id: 'edu-1',
      institution: 'Indian Institute of Technology / BITS',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Applied AI and Data Science',
      startDate: '2022',
      endDate: '2026 (Expected)',
      gpa: '8.8 / 10.0',
      highlights: 'Relevant Coursework: Advanced Database Systems, Applied Statistics, Machine Learning, Data Warehousing, Business Intelligence.',
    },
  ],
  experience: [
    {
      id: 'exp-1',
      company: 'DataFlow Technologies',
      role: 'Data Analytics Intern',
      location: 'Bangalore, India',
      startDate: 'June 2025',
      endDate: 'Aug 2025',
      current: false,
      bullets: [
        'Analyzed 500K+ transactional records using PostgreSQL and Python (Pandas/NumPy) to uncover customer retention drop-offs.',
        'Designed and deployed 4 interactive PowerBI dashboards for executive leadership, reducing ad-hoc weekly report turnaround time by 45%.',
        'Partnered with cross-functional product teams to design A/B testing experiments measuring engagement across new UI cohorts.',
      ],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'E-Commerce Churn Prediction & Cohort Analysis',
      role: 'Lead Analyst & Developer',
      liveUrl: 'https://ecommerce-churn-analytics.demo.dev',
      githubUrl: 'https://github.com/ravi-analytics/churn-prediction',
      date: '2025',
      toolsUsed: 'Python, Scikit-learn, SQL, Streamlit, PostgreSQL',
      bullets: [
        'Developed end-to-end customer churn prediction pipeline with 84% ROC-AUC using Random Forest and XGBoost.',
        'Executed RFM (Recency, Frequency, Monetary) segmentation identifying high-value customers at churn risk representing $120K in revenue.',
        'Created interactive Streamlit web application allowing marketing teams to simulate retention campaign ROI in real time.',
      ],
    },
    {
      id: 'proj-2',
      title: 'Global Supply Chain Logistics Optimization Dashboard',
      role: 'Data Analyst',
      liveUrl: '',
      githubUrl: 'https://github.com/ravi-analytics/supply-chain-bi',
      date: '2024 - 2025',
      toolsUsed: 'Tableau, SQL (BigQuery), Python, ETL',
      bullets: [
        'Engineered automated ETL workflows in Python to aggregate inventory metrics across 12 distribution centers with 99.8% pipeline uptime.',
        'Built comprehensive Tableau dashboards tracking freight transit latency, port delays, and delivery fulfillment benchmarks.',
      ],
    },
  ],
  skills: {
    languages: ['SQL (PostgreSQL, BigQuery, MySQL)', 'Python (Pandas, NumPy, Scikit-learn)', 'R', 'Bash'],
    frameworksAndLibraries: ['PowerBI', 'Tableau', 'Excel (VLOOKUP, Pivot Tables, Macros)', 'Streamlit', 'Statsmodels'],
    toolsAndDatabases: ['PostgreSQL', 'Snowflake', 'BigQuery', 'Git / GitHub', 'Jupyter', 'Docker'],
    competencies: [
      'Exploratory Data Analysis (EDA)',
      'Data Modeling & ETL Pipeline Design',
      'A/B Testing & Statistical Hypothesis Testing',
      'Cohort & Funnel Analysis',
      'Executive KPI Reporting',
    ],
  },
  certifications: [
    {
      id: 'cert-1',
      name: 'Google Data Analytics Professional Certificate',
      issuer: 'Coursera / Google',
      date: '2024',
      url: 'https://coursera.org/verify/professional-cert/google-data-analytics',
    },
    {
      id: 'cert-2',
      name: 'Microsoft Certified: Power BI Data Analyst Associate (PL-300)',
      issuer: 'Microsoft',
      date: '2025',
      url: 'https://learn.microsoft.com/credentials',
    },
  ],
  template: 'modern',
};

export const COMMON_DATA_SKILLS = [
  'SQL', 'Python', 'R', 'PowerBI', 'Tableau', 'Excel', 'Pandas', 'NumPy',
  'PostgreSQL', 'BigQuery', 'Snowflake', 'Statistics', 'A/B Testing',
  'Machine Learning', 'Data Modeling', 'ETL', 'Data Visualization',
  'Scikit-learn', 'Git', 'Data Warehousing', 'Business Intelligence',
  'Dashboard Design', 'Regression', 'Hypothesis Testing', 'Data Cleaning',
  'Apache Spark', 'Airflow', 'Database Optimization', 'KPI Reporting'
];

export function validateResume(input: unknown): ResumeData {
  if (!input || typeof input !== 'object') throw new Error('Invalid resume data.');
  const raw = input as Partial<ResumeData>;

  const personal = raw.personal || ({} as Partial<ResumeData['personal']>);
  const fullName = String(personal.fullName || '').trim();
  if (!fullName) throw new Error('Full name is required.');
  if (fullName.length > 100) throw new Error('Full name is too long.');

  const email = String(personal.email || '').trim();
  if (email && email.length > 200) throw new Error('Email is too long.');

  const education: EducationItem[] = Array.isArray(raw.education)
    ? raw.education.map((e, idx) => ({
        id: e.id || `edu-${idx + 1}`,
        institution: String(e.institution || '').trim().slice(0, 200),
        degree: String(e.degree || '').trim().slice(0, 150),
        fieldOfStudy: String(e.fieldOfStudy || '').trim().slice(0, 150),
        startDate: String(e.startDate || '').trim().slice(0, 50),
        endDate: String(e.endDate || '').trim().slice(0, 50),
        gpa: String(e.gpa || '').trim().slice(0, 50),
        highlights: String(e.highlights || '').trim().slice(0, 500),
      }))
    : [];

  const experience: ExperienceItem[] = Array.isArray(raw.experience)
    ? raw.experience.map((exp, idx) => ({
        id: exp.id || `exp-${idx + 1}`,
        company: String(exp.company || '').trim().slice(0, 200),
        role: String(exp.role || '').trim().slice(0, 200),
        location: String(exp.location || '').trim().slice(0, 100),
        startDate: String(exp.startDate || '').trim().slice(0, 50),
        endDate: String(exp.endDate || '').trim().slice(0, 50),
        current: Boolean(exp.current),
        bullets: Array.isArray(exp.bullets)
          ? exp.bullets.map(b => String(b || '').trim().slice(0, 1000)).filter(Boolean)
          : [],
      }))
    : [];

  const projects: ProjectItem[] = Array.isArray(raw.projects)
    ? raw.projects.map((proj, idx) => ({
        id: proj.id || `proj-${idx + 1}`,
        title: String(proj.title || '').trim().slice(0, 200),
        role: String(proj.role || '').trim().slice(0, 150),
        liveUrl: String(proj.liveUrl || '').trim().slice(0, 500),
        githubUrl: String(proj.githubUrl || '').trim().slice(0, 500),
        date: String(proj.date || '').trim().slice(0, 50),
        toolsUsed: String(proj.toolsUsed || '').trim().slice(0, 300),
        bullets: Array.isArray(proj.bullets)
          ? proj.bullets.map(b => String(b || '').trim().slice(0, 1000)).filter(Boolean)
          : [],
      }))
    : [];

  const cleanList = (list: unknown): string[] =>
    Array.isArray(list) ? list.map(item => String(item || '').trim().slice(0, 100)).filter(Boolean) : [];

  const skills: ResumeSkills = {
    languages: cleanList(raw.skills?.languages),
    frameworksAndLibraries: cleanList(raw.skills?.frameworksAndLibraries),
    toolsAndDatabases: cleanList(raw.skills?.toolsAndDatabases),
    competencies: cleanList(raw.skills?.competencies),
  };

  const certifications: CertificationItem[] = Array.isArray(raw.certifications)
    ? raw.certifications.map((c, idx) => ({
        id: c.id || `cert-${idx + 1}`,
        name: String(c.name || '').trim().slice(0, 200),
        issuer: String(c.issuer || '').trim().slice(0, 200),
        date: String(c.date || '').trim().slice(0, 50),
        url: String(c.url || '').trim().slice(0, 500),
      }))
    : [];

  const validTemplates = ['modern', 'classic', 'minimal', 'tech'] as const;
  const template = validTemplates.includes(raw.template as any) ? raw.template! : 'modern';

  return {
    personal: {
      fullName,
      title: String(personal.title || '').trim().slice(0, 150),
      email,
      phone: String(personal.phone || '').trim().slice(0, 100),
      location: String(personal.location || '').trim().slice(0, 150),
      linkedinUrl: String(personal.linkedinUrl || '').trim().slice(0, 300),
      githubUrl: String(personal.githubUrl || '').trim().slice(0, 300),
      portfolioUrl: String(personal.portfolioUrl || '').trim().slice(0, 300),
    },
    summary: String(raw.summary || '').trim().slice(0, 3000),
    education,
    experience,
    projects,
    skills,
    certifications,
    template,
  };
}

export type MatchAnalysis = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
};

export function analyzeJobFit(resume: ResumeData, jobDescription: string): MatchAnalysis {
  if (!jobDescription.trim()) {
    return {
      score: 100,
      matchedKeywords: [],
      missingKeywords: [],
      recommendations: ['Paste a job description or select an opportunity to run ATS keyword analysis.'],
    };
  }

  // Flatten all resume text for keyword search
  const resumeText = [
    resume.personal.title,
    resume.summary,
    ...resume.education.map(e => `${e.degree} ${e.fieldOfStudy} ${e.highlights}`),
    ...resume.experience.flatMap(e => [e.company, e.role, ...e.bullets]),
    ...resume.projects.flatMap(p => [p.title, p.toolsUsed, ...p.bullets]),
    ...resume.skills.languages,
    ...resume.skills.frameworksAndLibraries,
    ...resume.skills.toolsAndDatabases,
    ...resume.skills.competencies,
    ...resume.certifications.map(c => `${c.name} ${c.issuer}`),
  ].join(' ').toLowerCase();

  const jdLower = jobDescription.toLowerCase();

  // Candidate keyword pool (data analytics, tech, engineering keywords)
  const candidateKeywords = [
    'sql', 'python', 'r', 'excel', 'powerbi', 'power bi', 'tableau', 'pandas', 'numpy',
    'scikit-learn', 'postgresql', 'mysql', 'snowflake', 'bigquery', 'redshift', 'aws', 'gcp', 'azure',
    'etl', 'data pipeline', 'data modeling', 'data warehousing', 'a/b testing', 'statistics',
    'hypothesis testing', 'regression', 'clustering', 'machine learning', 'predictive modeling',
    'data visualization', 'dashboards', 'kpi', 'reporting', 'looker', 'metabase', 'git',
    'jupyter', 'spark', 'airflow', 'dbt', 'business intelligence', 'eda', 'communication',
    'problem solving', 'stakeholder management', 'cross-functional'
  ];

  const targetKeywordsInJd = candidateKeywords.filter(keyword => {
    // Escape for regex boundary
    const escaped = keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(jdLower);
  });

  if (targetKeywordsInJd.length === 0) {
    return {
      score: 80,
      matchedKeywords: [],
      missingKeywords: [],
      recommendations: ['No specialized technical keywords detected in this description. Ensure your general analytics and project evidence are clear.'],
    };
  }

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const keyword of targetKeywordsInJd) {
    const escaped = keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(resumeText)) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  const score = Math.round((matchedKeywords.length / targetKeywordsInJd.length) * 100);

  const recommendations: string[] = [];
  if (missingKeywords.length > 0) {
    recommendations.push(
      `Consider incorporating keywords like "${missingKeywords.slice(0, 4).join('", "')}" in your Skills or Project bullet points if you have experience with them.`
    );
  }
  if (!resume.projects.some(p => p.bullets.length > 0)) {
    recommendations.push('Add quantifiable impact bullets to your projects (e.g. "improved query speed by 30%", "analyzed 50K+ rows").');
  }
  if (!resume.summary.trim()) {
    recommendations.push('Add a 2-3 sentence targeted Professional Summary tailored to this role.');
  }

  return {
    score,
    matchedKeywords,
    missingKeywords,
    recommendations,
  };
}

export type ProfileFieldsFromResume = {
  signature?: string;
  targetRole: string;
  targetLocation?: string;
  education: string;
  evidence: string;
  skills: string;
  portfolioUrl?: string;
  resumeUrl?: string;
};

export function populateProfileFromResume(
  data: ResumeData,
  targetRole?: string,
  resumeShareUrl?: string
): ProfileFieldsFromResume {
  const role = targetRole?.trim() || data.personal.title || "Data Analyst";
  const signature = data.personal.fullName?.trim() || "";
  const targetLocation = data.personal.location?.trim() || "";

  const education = (data.education || [])
    .map(e => `${e.institution} (${e.degree}${e.fieldOfStudy ? " in " + e.fieldOfStudy : ""}${e.endDate ? ", " + e.endDate : ""})`)
    .filter(Boolean)
    .join("; ")
    .slice(0, 500);

  const evidence = (data.projects || [])
    .map(p => `${p.title}${p.toolsUsed ? " [" + p.toolsUsed + "]" : ""}: ${p.bullets?.[0] || ""}`)
    .filter(Boolean)
    .slice(0, 3)
    .join(" | ")
    .slice(0, 1000);

  const skills = [
    ...(data.skills?.languages || []),
    ...(data.skills?.frameworksAndLibraries || []),
    ...(data.skills?.toolsAndDatabases || []),
    ...(data.skills?.competencies || []),
  ]
    .filter(Boolean)
    .slice(0, 20)
    .join(", ")
    .slice(0, 500);

  const portfolioUrl = (data.personal.portfolioUrl || data.personal.githubUrl || data.personal.linkedinUrl || "").slice(0, 500);
  const resumeUrl = (resumeShareUrl || "").slice(0, 500);

  return {
    signature: signature || undefined,
    targetRole: role,
    targetLocation: targetLocation || undefined,
    education,
    evidence,
    skills,
    portfolioUrl: portfolioUrl || undefined,
    resumeUrl: resumeUrl || undefined,
  };
}

export function parseResumeFromText(rawText: string): Partial<ResumeData> {
  if (!rawText || typeof rawText !== "string") return {};
  const text = rawText.trim();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const emailMatch = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : "";

  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+91[\s-]?\d{10}/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
  const otherUrls = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const portfolioUrl = otherUrls.find(u => !u.includes("linkedin.com") && !u.includes("github.com")) || "";

  const skipWords = ["resume", "curriculum", "vitae", "cv", "profile", "contact", "summary", "experience", "education", "skills"];
  const candidateNameLine = lines.slice(0, 5).find(l => {
    const lower = l.toLowerCase();
    return l.length >= 2 && l.length <= 50 && !l.includes("@") && !l.includes("http") && !skipWords.some(w => lower === w || lower.startsWith(w + ":"));
  });
  const fullName = candidateNameLine || "";

  const detectedSkills: string[] = [];
  for (const skill of COMMON_DATA_SKILLS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) {
      detectedSkills.push(skill);
    }
  }

  const eduKeywords = ["bachelor", "master", "phd", "b.tech", "m.tech", "b.s.", "m.s.", "b.e.", "m.e.", "university", "institute", "college"];
  const educationLine = lines.find(l => {
    const lower = l.toLowerCase();
    return eduKeywords.some(k => lower.includes(k));
  }) || "";

  const projectKeywords = ["project", "developed", "built", "designed", "engineered", "analyzed", "deployed"];
  const projectLines = lines.filter(l => {
    const lower = l.toLowerCase();
    return l.length > 25 && l.length < 300 && projectKeywords.some(k => lower.includes(k));
  }).slice(0, 3);

  return {
    personal: {
      fullName,
      title: "",
      email,
      phone,
      location: "",
      linkedinUrl: linkedinMatch ? linkedinMatch[0] : "",
      githubUrl: githubMatch ? githubMatch[0] : "",
      portfolioUrl,
    },
    education: educationLine ? [{
      id: "edu-parsed",
      institution: educationLine,
      degree: "Degree",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      gpa: "",
      highlights: "",
    }] : [],
    projects: projectLines.map((line, idx) => ({
      id: `proj-parsed-${idx}`,
      title: `Project ${idx + 1}`,
      role: "Contributor",
      liveUrl: "",
      githubUrl: "",
      date: "",
      toolsUsed: "",
      bullets: [line],
    })),
    skills: {
      languages: detectedSkills.slice(0, 8),
      frameworksAndLibraries: detectedSkills.slice(8, 14),
      toolsAndDatabases: detectedSkills.slice(14, 20),
      competencies: detectedSkills.slice(20, 26),
    },
    summary: text.slice(0, 300),
  };
}
