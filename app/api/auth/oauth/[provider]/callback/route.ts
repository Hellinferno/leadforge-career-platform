import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { oauthConnections, networkPeople } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  transformGoogleConnections,
  transformTwitterConnections,
  type OAuthProvider,
} from "@/lib/oauth-sync";
import { mergeNetwork, type NetworkData } from "@/lib/network";

function getEnv(req: NextRequest, name: string): string {
  // @ts-ignore Cloudflare runtime env injection
  const cfEnv = req.env || (globalThis as any)[name] || process.env[name];
  return typeof cfEnv === "string" ? cfEnv : "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const origin = url.origin;
  const redirectTarget = `${origin}/?tab=network`;

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${redirectTarget}&error=${encodeURIComponent(
        errorDescription || error || "Authentication cancelled"
      )}`
    );
  }

  let stateData: { ownerId: string; provider: string; timestamp: number };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
  } catch {
    return NextResponse.redirect(`${redirectTarget}&error=Invalid+OAuth+state`);
  }

  const provider = params.provider.toLowerCase() as OAuthProvider;
  const redirectUri = `${origin}/api/auth/oauth/${provider}/callback`;

  const db = getDb();

  try {
    if (provider === "google") {
      const clientId = getEnv(req, "GOOGLE_CLIENT_ID");
      const clientSecret = getEnv(req, "GOOGLE_CLIENT_SECRET");

      // Exchange code for token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        throw new Error("Failed to exchange authorization token with Google.");
      }

      const tokens = await tokenRes.json();
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token || "";

      // Fetch user profile info
      const userInfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const userInfo = await userInfoRes.json();
      const accountEmail = userInfo.email || "";
      const accountName = userInfo.name || "";
      const googleId = userInfo.id || accountEmail;

      // Fetch user's Google contacts
      const peopleRes = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,organizations,locations,urls&pageSize=1000",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      let importedCount = 0;
      if (peopleRes.ok) {
        const peopleData = await peopleRes.json();
        const normalized = transformGoogleConnections(peopleData, accountEmail);

        // Ingest into networkPeople table
        for (const person of normalized) {
          const identityKey = person.identities[0];
          const existing = await db
            .select()
            .from(networkPeople)
            .where(
              and(
                eq(networkPeople.ownerId, stateData.ownerId),
                eq(networkPeople.identityKey, identityKey)
              )
            )
            .limit(1);

          const now = new Date().toISOString();
          if (existing.length > 0) {
            const currentData = JSON.parse(existing[0].dataJson) as NetworkData;
            const merged = mergeNetwork(currentData, person);
            await db
              .update(networkPeople)
              .set({
                dataJson: JSON.stringify(merged),
                version: existing[0].version + 1,
                updatedAt: now,
              })
              .where(eq(networkPeople.id, existing[0].id));
          } else {
            await db.insert(networkPeople).values({
              id: crypto.randomUUID(),
              ownerId: stateData.ownerId,
              identityKey,
              dataJson: JSON.stringify(person),
              version: 1,
              createdAt: now,
              updatedAt: now,
            });
          }
          importedCount++;
        }
      }

      // Record or update OAuth connection
      const now = new Date().toISOString();
      const existingConn = await db
        .select()
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.ownerId, stateData.ownerId),
            eq(oauthConnections.provider, "google"),
            eq(oauthConnections.providerAccountId, googleId)
          )
        )
        .limit(1);

      if (existingConn.length > 0) {
        await db
          .update(oauthConnections)
          .set({
            accessToken,
            refreshToken: refreshToken || existingConn[0].refreshToken,
            accountEmail,
            accountName,
            syncedCount: importedCount,
            lastSyncedAt: now,
            updatedAt: now,
          })
          .where(eq(oauthConnections.id, existingConn[0].id));
      } else {
        await db.insert(oauthConnections).values({
          id: crypto.randomUUID(),
          ownerId: stateData.ownerId,
          provider: "google",
          providerAccountId: googleId,
          accountEmail,
          accountName,
          accessToken,
          refreshToken,
          syncedCount: importedCount,
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      return NextResponse.redirect(
        `${redirectTarget}&notice=${encodeURIComponent(
          `Google sync complete! Connected ${accountEmail} and indexed ${importedCount} contacts.`
        )}`
      );
    } else if (provider === "x") {
      // Twitter / X OAuth2 Token Exchange
      const clientId = getEnv(req, "TWITTER_CLIENT_ID");
      const clientSecret = getEnv(req, "TWITTER_CLIENT_SECRET");

      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64"
      );
      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: "challenge", // PKCE verifier
        }),
      });

      if (!tokenRes.ok) {
        throw new Error("Failed to authenticate with X / Twitter.");
      }

      const tokens = await tokenRes.json();
      const accessToken = tokens.access_token;

      // Get me
      const meRes = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      const twitterUser = meData.data;

      const now = new Date().toISOString();
      await db.insert(oauthConnections).values({
        id: crypto.randomUUID(),
        ownerId: stateData.ownerId,
        provider: "x",
        providerAccountId: twitterUser.id,
        accountName: twitterUser.name,
        accountEmail: `@${twitterUser.username}`,
        accessToken,
        syncedCount: 0,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.redirect(
        `${redirectTarget}&notice=${encodeURIComponent(
          `Connected @${twitterUser.username} via X OAuth!`
        )}`
      );
    } else if (provider === "linkedin") {
      // LinkedIn OpenID Connect
      const clientId = getEnv(req, "LINKEDIN_CLIENT_ID");
      const clientSecret = getEnv(req, "LINKEDIN_CLIENT_SECRET");

      const tokenRes = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );

      if (!tokenRes.ok) {
        throw new Error("Failed to authenticate with LinkedIn.");
      }

      const tokens = await tokenRes.json();
      const accessToken = tokens.access_token;

      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileRes.json();

      const now = new Date().toISOString();
      await db.insert(oauthConnections).values({
        id: crypto.randomUUID(),
        ownerId: stateData.ownerId,
        provider: "linkedin",
        providerAccountId: profile.sub,
        accountEmail: profile.email || "",
        accountName: profile.name || "",
        accessToken,
        syncedCount: 1,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.redirect(
        `${redirectTarget}&notice=${encodeURIComponent(
          `LinkedIn connected successfully for ${profile.name}!`
        )}`
      );
    }

    return NextResponse.redirect(redirectTarget);
  } catch (err: any) {
    return NextResponse.redirect(
      `${redirectTarget}&error=${encodeURIComponent(err.message || "OAuth sync failed")}`
    );
  }
}
