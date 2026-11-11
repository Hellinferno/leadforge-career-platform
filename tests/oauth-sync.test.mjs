import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOAuthAuthUrl,
  transformGoogleConnections,
  transformTwitterConnections,
} from '../lib/oauth-sync.ts';

describe('OAuth & Social Sync Engine (Happenstance)', () => {
  it('builds standard OAuth2 authorization URLs with correct scopes', () => {
    const googleUrl = buildOAuthAuthUrl(
      'google',
      'test-google-client',
      'https://myapp.com/callback',
      'state123'
    );
    assert.ok(googleUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
    assert.ok(googleUrl.includes('client_id=test-google-client'));
    assert.ok(googleUrl.includes('contacts.readonly'));

    const twitterUrl = buildOAuthAuthUrl(
      'x',
      'test-twitter-client',
      'https://myapp.com/callback',
      'state456',
      'challengeXYZ'
    );
    assert.ok(twitterUrl.startsWith('https://twitter.com/i/oauth2/authorize'));
    assert.ok(twitterUrl.includes('code_challenge=challengeXYZ'));
    assert.ok(twitterUrl.includes('follows.read'));

    const linkedinUrl = buildOAuthAuthUrl(
      'linkedin',
      'test-linkedin-client',
      'https://myapp.com/callback',
      'state789'
    );
    assert.ok(linkedinUrl.startsWith('https://www.linkedin.com/oauth/v2/authorization'));
    assert.ok(linkedinUrl.includes('client_id=test-linkedin-client'));
  });

  it('transforms Google People API connections into normalized NetworkData', () => {
    const mockGoogleData = {
      connections: [
        {
          names: [{ displayName: 'Sundar Pichai', metadata: { primary: true } }],
          emailAddresses: [{ value: 'sundar@google.com' }],
          organizations: [{ name: 'Google', title: 'CEO', metadata: { primary: true } }],
          locations: [{ value: 'Mountain View, CA' }],
          urls: [{ value: 'https://www.linkedin.com/in/sundarpichai' }],
        },
      ],
    };

    const people = transformGoogleConnections(mockGoogleData, 'user@gmail.com');
    assert.equal(people.length, 1);
    assert.equal(people[0].name, 'Sundar Pichai');
    assert.equal(people[0].company, 'Google');
    assert.equal(people[0].role, 'CEO');
    assert.equal(people[0].email, 'sundar@google.com');
    assert.equal(people[0].linkedInUrl, 'https://www.linkedin.com/in/sundarpichai');
    assert.equal(people[0].edges[0].file, 'Google Contacts Sync');
    assert.equal(people[0].strength, 'known');
  });

  it('transforms Twitter/X users into normalized NetworkData', () => {
    const mockTwitterUsers = [
      {
        id: '44196397',
        name: 'Elon Musk',
        username: 'elonmusk',
        description: 'Occupy Mars',
        location: 'Texas',
      },
    ];

    const people = transformTwitterConnections(mockTwitterUsers, 'following', 'myhandle');
    assert.equal(people.length, 1);
    assert.equal(people[0].name, 'Elon Musk');
    assert.equal(people[0].xUrl, 'https://x.com/elonmusk');
    assert.equal(people[0].xAccountId, '44196397');
    assert.equal(people[0].location, 'Texas');
    assert.equal(people[0].notes, 'Occupy Mars');
    assert.equal(people[0].edges[0].platform, 'x');
    assert.equal(people[0].edges[0].relation, 'following');
  });
});
