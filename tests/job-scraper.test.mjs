import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { POPULAR_TECH_ATS, scrapeJobsFromInput } from '../lib/job-scraper.ts';

describe('Job Scraper & ATS Discovery', () => {
  it('maps known tech company names to official ATS slugs', () => {
    assert.equal(POPULAR_TECH_ATS['stripe'].type, 'greenhouse');
    assert.equal(POPULAR_TECH_ATS['palantir'].type, 'lever');
    assert.equal(POPULAR_TECH_ATS['cloudflare'].name, 'Cloudflare');
  });

  it('rejects empty input cleanly', async () => {
    await assert.rejects(async () => {
      await scrapeJobsFromInput('   ');
    }, /Enter a company name, careers URL, or Greenhouse\/Lever link/);
  });
});
