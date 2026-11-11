import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/auth";
import { buildOAuthAuthUrl, type OAuthProvider } from "@/lib/oauth-sync";

function getEnv(req: NextRequest, name: string): string {
  // @ts-ignore Cloudflare runtime env injection
  const cfEnv = req.env || (globalThis as any)[name] || process.env[name];
  return typeof cfEnv === "string" ? cfEnv : "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = params.provider.toLowerCase() as OAuthProvider;
  if (!["google", "x", "linkedin"].includes(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/oauth/${provider}/callback`;

  // Get credentials based on provider
  let clientId = "";
  if (provider === "google") {
    clientId = getEnv(req, "GOOGLE_CLIENT_ID");
  } else if (provider === "x") {
    clientId = getEnv(req, "TWITTER_CLIENT_ID");
  } else if (provider === "linkedin") {
    clientId = getEnv(req, "LINKEDIN_CLIENT_ID");
  }

  if (!clientId) {
    return NextResponse.json(
      {
        error: `OAuth not configured for ${provider}. Please configure ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET.`,
      },
      { status: 501 }
    );
  }

  // Generate signed state parameter
  const statePayload = {
    ownerId: user.userId,
    provider,
    redirectUri,
    timestamp: Date.now(),
  };

  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  const authUrl = buildOAuthAuthUrl(provider, clientId, redirectUri, state);

  return NextResponse.redirect(authUrl);
}
