import { getCurrentUser } from "../../../auth";
import { scrapeJobsFromInput } from "../../../../lib/job-scraper";

export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Sign in to search opportunities.", needsSignIn: true }, 401);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);

  try {
    const raw = await request.text();
    if (raw.length > 5000) throw new Error("Search input is too long.");
    const body = JSON.parse(raw);

    const query = String(body.query || "").trim();
    const role = String(body.role || "").trim();

    if (!query) throw new Error("Enter a company name, careers URL, or Greenhouse/Lever link.");

    const result = await scrapeJobsFromInput(query, role);
    return json(result);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
}
