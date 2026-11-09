import { env } from "cloudflare:workers";
import { getCurrentUser } from "../../auth";
import {
  DEFAULT_RESUME,
  validateResume,
  parseResumeFromText,
  populateProfileFromResume,
  type ResumeData,
  type SavedResumeRecord,
} from "../../../lib/resume";
import { readPdfText } from "../../../lib/company-pdf";

export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Sign in to access your resumes.", needsSignIn: true }, 401);

  if (!env.DB) return json({ error: "Resume storage is temporarily unavailable." }, 503);

  const url = new URL(request.url);
  const requestedId = url.searchParams.get("id");

  try {
    if (requestedId) {
      const row = await env.DB.prepare(
        "SELECT id, title, target_role, data_json, is_primary, created_at, updated_at FROM resumes WHERE id=? AND owner_id=?"
      )
        .bind(requestedId, user.userId)
        .first<{
          id: string;
          title: string;
          target_role: string;
          data_json: string;
          is_primary: number;
          created_at: string;
          updated_at: string;
        }>();

      if (!row) return json({ error: "Resume not found." }, 404);

      return json({
        resume: {
          id: row.id,
          title: row.title,
          targetRole: row.target_role,
          data: JSON.parse(row.data_json),
          isPrimary: Boolean(row.is_primary),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    }

    // List all resumes for user
    const results = await env.DB.prepare(
      "SELECT id, title, target_role, data_json, is_primary, created_at, updated_at FROM resumes WHERE owner_id=? ORDER BY is_primary DESC, updated_at DESC"
    )
      .bind(user.userId)
      .all<{
        id: string;
        title: string;
        target_role: string;
        data_json: string;
        is_primary: number;
        created_at: string;
        updated_at: string;
      }>();

    let list = results.results || [];

    // If no resumes exist for this user, seed default resume automatically
    if (list.length === 0) {
      const initialId = crypto.randomUUID();
      const now = new Date().toISOString();
      const initialJson = JSON.stringify(DEFAULT_RESUME);

      await env.DB.prepare(
        "INSERT INTO resumes(id, owner_id, title, target_role, data_json, is_primary, created_at, updated_at) VALUES(?, ?, ?, ?, ?, 1, ?, ?)"
      )
        .bind(initialId, user.userId, "Data Analytics Master Resume", "Data Analyst", initialJson, now, now)
        .run();

      list = [
        {
          id: initialId,
          title: "Data Analytics Master Resume",
          target_role: "Data Analyst",
          data_json: initialJson,
          is_primary: 1,
          created_at: now,
          updated_at: now,
        },
      ];
    }

    return json({
      resumes: list.map(r => ({
        id: r.id,
        title: r.title,
        targetRole: r.target_role,
        data: JSON.parse(r.data_json),
        isPrimary: Boolean(r.is_primary),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Sign in to manage resumes.", needsSignIn: true }, 401);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);

  if (!env.DB) return json({ error: "Resume storage is temporarily unavailable." }, 503);

  try {
    const raw = await request.text();
    if (raw.length > 5000000) throw new Error("Resume payload is too large (max 5 MB).");
    const body = JSON.parse(raw);

    const action = body.action;

    if (action === "parse_pdf") {
      if (typeof body.base64 !== "string") throw new Error("Base64 PDF content is required.");
      const binStr = atob(body.base64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      const { pages } = await readPdfText(bytes);
      const fullText = pages.join("\n\n");
      const partialResume = parseResumeFromText(fullText);
      const profileFields = populateProfileFromResume(partialResume as ResumeData);
      return json({
        ok: true,
        text: fullText,
        resumeData: partialResume,
        profileFields,
      });
    }

    if (action === "parse_text") {
      if (typeof body.text !== "string") throw new Error("Text content is required.");
      const partialResume = parseResumeFromText(body.text);
      const profileFields = populateProfileFromResume(partialResume as ResumeData);
      return json({
        ok: true,
        resumeData: partialResume,
        profileFields,
      });
    }

    if (action === "delete") {
      if (typeof body.id !== "string") throw new Error("Resume ID is required.");
      const r = await env.DB.prepare("DELETE FROM resumes WHERE id=? AND owner_id=?").bind(body.id, user.userId).run();
      return r.meta.changes ? json({ ok: true }) : json({ error: "Resume not found." }, 404);
    }

    if (action === "set_primary") {
      if (typeof body.id !== "string") throw new Error("Resume ID is required.");
      await env.DB.prepare("UPDATE resumes SET is_primary=0 WHERE owner_id=?").bind(user.userId).run();
      await env.DB.prepare("UPDATE resumes SET is_primary=1 WHERE id=? AND owner_id=?").bind(body.id, user.userId).run();
      return json({ ok: true });
    }

    if (action === "sync_to_profile") {
      const data: ResumeData = validateResume(body.data);
      const targetRole = body.targetRole || data.personal.title || "Data Analyst";
      const education = data.education
        .map(e => `${e.institution} (${e.degree}${e.fieldOfStudy ? " in " + e.fieldOfStudy : ""})`)
        .join("; ")
        .slice(0, 500);
      const evidence = data.projects
        .map(p => `${p.title}: ${p.bullets[0] || p.toolsUsed || ""}`)
        .filter(Boolean)
        .slice(0, 2)
        .join(" | ")
        .slice(0, 1000);
      const skills = [
        ...data.skills.languages,
        ...data.skills.frameworksAndLibraries,
        ...data.skills.toolsAndDatabases,
      ]
        .slice(0, 15)
        .join(", ")
        .slice(0, 500);
      const portfolioUrl = (data.personal.portfolioUrl || data.personal.githubUrl || "").slice(0, 500);

      await env.DB.prepare(
        "UPDATE profiles SET target_role=COALESCE(NULLIF(?, ''), target_role), education=COALESCE(NULLIF(?, ''), education), evidence=COALESCE(NULLIF(?, ''), evidence), skills=COALESCE(NULLIF(?, ''), skills), portfolio_url=COALESCE(NULLIF(?, ''), portfolio_url) WHERE owner_id=?"
      )
        .bind(targetRole, education, evidence, skills, portfolioUrl, user.userId)
        .run();

      return json({ ok: true, synced: { targetRole, education, evidence, skills, portfolioUrl } });
    }

    if (action === "save") {
      const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID();
      const title = String(body.title || "Untitled Resume").trim().slice(0, 100);
      const targetRole = String(body.targetRole || "").trim().slice(0, 100);
      const isPrimary = Boolean(body.isPrimary);
      const validatedData = validateResume(body.data);
      const dataJson = JSON.stringify(validatedData);
      const now = new Date().toISOString();

      if (isPrimary) {
        await env.DB.prepare("UPDATE resumes SET is_primary=0 WHERE owner_id=?").bind(user.userId).run();
      }

      const existing = await env.DB.prepare("SELECT id FROM resumes WHERE id=? AND owner_id=?")
        .bind(id, user.userId)
        .first();

      if (existing) {
        await env.DB.prepare(
          "UPDATE resumes SET title=?, target_role=?, data_json=?, is_primary=?, updated_at=? WHERE id=? AND owner_id=?"
        )
          .bind(title, targetRole, dataJson, isPrimary ? 1 : 0, now, id, user.userId)
          .run();
      } else {
        await env.DB.prepare(
          "INSERT INTO resumes(id, owner_id, title, target_role, data_json, is_primary, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)"
        )
          .bind(id, user.userId, title, targetRole, dataJson, isPrimary ? 1 : 0, now, now)
          .run();
      }

      return json({
        ok: true,
        resume: {
          id,
          title,
          targetRole,
          data: validatedData,
          isPrimary,
          updatedAt: now,
        },
      });
    }

    throw new Error("Invalid action.");
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
}
