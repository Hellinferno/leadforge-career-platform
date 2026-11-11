/**
 * OAuth & Social Sync Provider Module (Happenstance Engine)
 * Supports Google (People / Contacts API), Twitter / X (OAuth 2.0 PKCE / User API),
 * and LinkedIn (OAuth 2.0 OpenID Connect).
 */

import { EMPTY_NETWORK, mergeNetwork, validateNetwork, type NetworkData, type Platform } from './network.ts';

export type OAuthProvider = 'google' | 'x' | 'linkedin';

export interface OAuthStatePayload {
  ownerId: string;
  provider: OAuthProvider;
  redirectUri: string;
  codeVerifier?: string;
  timestamp: number;
}

export interface ProviderConnectionInfo {
  id: string;
  provider: OAuthProvider;
  accountEmail: string;
  accountName: string;
  syncedCount: number;
  lastSyncedAt: string;
  connectedAt: string;
}

/**
 * Generates an OAuth 2.0 authorization URL for the target provider
 */
export function buildOAuthAuthUrl(
  provider: OAuthProvider,
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge?: string
): string {
  const u = new URL(
    provider === 'google'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : provider === 'x'
      ? 'https://twitter.com/i/oauth2/authorize'
      : 'https://www.linkedin.com/oauth/v2/authorization'
  );

  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('state', state);

  if (provider === 'google') {
    // Readonly contacts and basic profile info
    u.searchParams.set(
      'scope',
      'openid email profile https://www.googleapis.com/auth/contacts.readonly'
    );
    u.searchParams.set('access_type', 'offline');
    u.searchParams.set('prompt', 'consent');
  } else if (provider === 'x') {
    // Twitter OAuth 2.0 with PKCE
    u.searchParams.set('scope', 'users.read tweet.read follows.read offline.access');
    u.searchParams.set('code_challenge', codeChallenge || '');
    u.searchParams.set('code_challenge_method', 'S256');
  } else if (provider === 'linkedin') {
    u.searchParams.set('scope', 'openid profile email');
  }

  return u.toString();
}

/**
 * Normalizes contact entries fetched from Google People API into Leadforge NetworkData records.
 */
export function transformGoogleConnections(googleData: any, accountEmail: string): NetworkData[] {
  if (!googleData || !Array.isArray(googleData.connections)) {
    return [];
  }

  const people: NetworkData[] = [];
  for (const conn of googleData.connections) {
    try {
      const names = conn.names || [];
      const primaryName = names.find((n: any) => n.metadata?.primary) || names[0];
      const fullName = primaryName?.displayName || primaryName?.givenName;
      if (!fullName) continue;

      const emails = conn.emailAddresses || [];
      const email = emails[0]?.value?.trim().toLowerCase() || '';

      const orgs = conn.organizations || [];
      const primaryOrg = orgs.find((o: any) => o.metadata?.primary) || orgs[0];
      const company = primaryOrg?.name || '';
      const role = primaryOrg?.title || '';

      const locs = conn.locations || [];
      const location = locs[0]?.value || '';

      // Check URLs for LinkedIn or personal sites
      const urls = conn.urls || [];
      let linkedInUrl = '';
      let website = '';
      for (const u of urls) {
        const val = u.value || '';
        if (/linkedin\.com\/in\//i.test(val)) {
          linkedInUrl = val;
        } else if (/^https?:\/\//i.test(val) && !website) {
          website = val;
        }
      }

      const validated = validateNetwork({
        ...EMPTY_NETWORK,
        name: fullName,
        email,
        company,
        role,
        location,
        linkedInUrl,
        website,
        strength: 'known',
        edges: [
          {
            platform: 'linkedin' as Platform,
            relation: 'connection',
            via: '',
            account: accountEmail,
            connectedOn: new Date().toISOString().slice(0, 10),
            file: 'Google Contacts Sync',
          },
        ],
      });

      people.push(validated);
    } catch {
      // Ignore records with invalid metadata
    }
  }

  return people;
}

/**
 * Normalizes Twitter/X users into Leadforge NetworkData records.
 */
export function transformTwitterConnections(
  twitterUsers: any[],
  relation: 'following' | 'follower',
  accountUsername: string
): NetworkData[] {
  if (!Array.isArray(twitterUsers)) return [];

  const people: NetworkData[] = [];
  for (const u of twitterUsers) {
    try {
      const id = String(u.id || '');
      const username = String(u.username || '').replace(/^@/, '');
      const name = String(u.name || username || ('X account ' + id));
      const description = String(u.description || '');
      const location = String(u.location || '');

      const validated = validateNetwork({
        ...EMPTY_NETWORK,
        name,
        xUrl: username ? `https://x.com/${username}` : '',
        xAccountId: id,
        location,
        notes: description.slice(0, 500),
        edges: [
          {
            platform: 'x' as Platform,
            relation,
            via: '',
            account: accountUsername,
            connectedOn: new Date().toISOString().slice(0, 10),
            file: 'Twitter / X Sync',
          },
        ],
      });

      people.push(validated);
    } catch {
      // Skip invalid items
    }
  }

  return people;
}
