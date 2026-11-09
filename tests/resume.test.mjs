import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RESUME,
  validateResume,
  analyzeJobFit,
  populateProfileFromResume,
  parseResumeFromText,
} from '../lib/resume.ts';

describe('Resume Data and Tailoring Engine', () => {
  it('validates default resume successfully', () => {
    const validated = validateResume(DEFAULT_RESUME);
    assert.equal(validated.personal.fullName, 'Ravi Kumar');
    assert.equal(validated.skills.languages.length > 0, true);
    assert.equal(validated.projects.length >= 2, true);
    assert.equal(validated.template, 'modern');
  });

  it('rejects missing or empty full name', () => {
    assert.throws(() => {
      validateResume({ ...DEFAULT_RESUME, personal: { ...DEFAULT_RESUME.personal, fullName: '' } });
    }, /Full name is required/);
  });

  it('rejects oversized full name', () => {
    const hugeName = 'A'.repeat(500);
    assert.throws(() => {
      validateResume({
        ...DEFAULT_RESUME,
        personal: { ...DEFAULT_RESUME.personal, fullName: hugeName },
      });
    }, /Full name is too long/);
  });

  it('analyzes job fit and computes match score accurately', () => {
    const jd = 'We are looking for a Data Analyst proficient in SQL, Python, Tableau, and Snowflake. Experience with ETL and A/B Testing is required.';
    const analysis = analyzeJobFit(DEFAULT_RESUME, jd);
    assert.equal(typeof analysis.score, 'number');
    assert.equal(analysis.score > 0, true);
    assert.equal(analysis.matchedKeywords.includes('sql'), true);
    assert.equal(analysis.matchedKeywords.includes('python'), true);
    assert.equal(analysis.matchedKeywords.includes('tableau'), true);
    assert.equal(analysis.matchedKeywords.includes('snowflake'), true);
  });

  it('identifies missing keywords when job requests tools not in resume', () => {
    const jd = 'Looking for an expert in Looker, dbt, Apache Spark, and Airflow.';
    const analysis = analyzeJobFit(DEFAULT_RESUME, jd);
    assert.equal(analysis.missingKeywords.length > 0, true);
    assert.equal(analysis.recommendations.length > 0, true);
  });

  it('populates career profile fields from a resume data structure', () => {
    const fields = populateProfileFromResume(DEFAULT_RESUME, 'Senior Data Analyst', 'https://example.com/resume.pdf');
    assert.equal(fields.targetRole, 'Senior Data Analyst');
    assert.equal(fields.signature, 'Ravi Kumar');
    assert.equal(fields.resumeUrl, 'https://example.com/resume.pdf');
    assert.equal(fields.skills.includes('SQL'), true);
    assert.equal(fields.evidence.includes('E-Commerce Churn Prediction'), true);
    assert.equal(fields.education.includes('Bachelor of Science'), true);
  });

  it('parses raw resume text into structured fields', () => {
    const rawResumeText = `
      Priya Sharma
      Data Science Fellow
      priya.sharma@example.com | +91 91234 56789 | https://www.linkedin.com/in/priya-sharma
      https://github.com/priyasharma | https://priya-portfolio.io

      Education
      Bachelor of Technology in Computer Science, Delhi Technological University (2025)

      Skills
      Proficient in Python, SQL, Pandas, NumPy, PowerBI, Tableau, Scikit-learn, PostgreSQL

      Projects
      Customer Lifetime Value Analysis: Developed predictive machine learning model with 87% accuracy using Python and Scikit-learn.
      Fraud Detection Pipeline: Built streaming data pipeline with SQL and PostgreSQL.
    `;

    const parsed = parseResumeFromText(rawResumeText);
    assert.equal(parsed.personal?.fullName, 'Priya Sharma');
    assert.equal(parsed.personal?.email, 'priya.sharma@example.com');
    assert.equal(parsed.personal?.linkedinUrl, 'https://www.linkedin.com/in/priya-sharma');
    assert.equal(parsed.personal?.githubUrl, 'https://github.com/priyasharma');
    assert.equal(parsed.skills?.languages.includes('Python'), true);
    assert.equal(parsed.skills?.languages.includes('SQL'), true);

    const profileFields = populateProfileFromResume(parsed, 'Data Scientist');
    assert.equal(profileFields.targetRole, 'Data Scientist');
    assert.equal(profileFields.signature, 'Priya Sharma');
    assert.equal(profileFields.skills.includes('Python'), true);
  });
});
