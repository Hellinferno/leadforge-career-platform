import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), dedupeKey: text("dedupe_key").notNull(),
  name: text("name").notNull().default(""), company: text("company").notNull(), email: text("email").notNull().default(""),
  phone:text("phone").notNull().default(""),emailSourceUrl:text("email_source_url").notNull().default(""),phoneSourceUrl:text("phone_source_url").notNull().default(""),
  website: text("website").notNull().default(""), role: text("role").notNull().default(""), industry: text("industry").notNull().default(""),
  country: text("country").notNull().default(""), stage: text("stage").notNull().default("new"), notes: text("notes").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""), sourceKind: text("source_kind").notNull().default("manual"),
  researchedAt: text("researched_at").notNull().default(""), nextActionAt: text("next_action_at").notNull().default(""),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
  linkedInUrl: text("linkedin_url").notNull().default(""), contactType: text("contact_type").notNull().default("employee"),
  jobTitle: text("job_title").notNull().default(""), jobUrl: text("job_url").notNull().default(""), relevance: text("relevance").notNull().default(""),
}, table => [uniqueIndex("leads_owner_dedupe").on(table.ownerId, table.dedupeKey)]);
export const profiles = sqliteTable("profiles", {
  ownerId: text("owner_id").primaryKey(), businessName: text("business_name").notNull().default(""),
  offer: text("offer").notNull().default(""), signature: text("signature").notNull().default("Ravi"), targetMarket: text("target_market").notNull().default("USA / UK"),
  education: text("education").notNull().default(""), skills: text("skills").notNull().default(""),
  evidence: text("evidence").notNull().default(""), targetRole: text("target_role").notNull().default("AI / Data Science internship"),
  targetLocation: text("target_location").notNull().default("India + remote"), resumeUrl: text("resume_url").notNull().default(""), portfolioUrl: text("portfolio_url").notNull().default(""),
});
export const jobs = sqliteTable("jobs",{
  id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),dedupeKey:text("dedupe_key").notNull(),
  company:text("company").notNull(),title:text("title").notNull(),url:text("url").notNull().default(""),
  location:text("location").notNull().default(""),type:text("type").notNull().default("internship"),status:text("status").notNull().default("saved"),
  notes:text("notes").notNull().default(""),nextActionAt:text("next_action_at").notNull().default(""),
  createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
},t=>[uniqueIndex("jobs_owner_dedupe").on(t.ownerId,t.dedupeKey)]);
export const messageDrafts=sqliteTable("message_drafts",{
  id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),contactId:text("contact_id").notNull(),
  goal:text("goal").notNull(),step:integer("step").notNull(),subject:text("subject").notNull().default(""),body:text("body").notNull(),
  version:integer("version").notNull().default(1),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
},t=>[uniqueIndex("drafts_owner_contact_goal_step").on(t.ownerId,t.contactId,t.goal,t.step)]);

export const activityEntries=sqliteTable("activity_entries",{
  id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),contactId:text("contact_id").notNull(),requestId:text("request_id").notNull(),
  eventType:text("event_type").notNull(),channel:text("channel").notNull(),occurredOn:text("occurred_on").notNull(),
  notes:text("notes").notNull().default(""),message:text("message").notNull().default(""),stageAfter:text("stage_after").notNull().default(""),
  followUpOn:text("follow_up_on"),createdAt:text("created_at").notNull(),
},t=>[uniqueIndex("activity_owner_request").on(t.ownerId,t.requestId),index("activity_owner_contact_date").on(t.ownerId,t.contactId,t.occurredOn,t.createdAt)]);

export const peopleSearchCache=sqliteTable("people_search_cache",{
  ownerId:text("owner_id").notNull(),queryHash:text("query_hash").notNull(),pageJson:text("page_json").notNull(),expiresAt:integer("expires_at").notNull(),
},t=>[uniqueIndex("people_cache_owner_query").on(t.ownerId,t.queryHash),index("people_cache_owner_expiry").on(t.ownerId,t.expiresAt)]);
export const peopleSearchLimits=sqliteTable("people_search_limits",{
  ownerId:text("owner_id").primaryKey(),dayKey:text("day_key").notNull(),dayCount:integer("day_count").notNull(),monthKey:text("month_key").notNull(),monthCount:integer("month_count").notNull(),nextAllowedAt:integer("next_allowed_at").notNull(),
});

export const networkPeople=sqliteTable("network_people",{
  id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),identityKey:text("identity_key").notNull(),
  dataJson:text("data_json").notNull(),version:integer("version").notNull().default(1),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
},t=>[uniqueIndex("network_owner_identity").on(t.ownerId,t.identityKey),index("network_owner_updated").on(t.ownerId,t.updatedAt)]);

export const authAttempts=sqliteTable("auth_attempts",{key:text("key").primaryKey(),bucket:integer("bucket").notNull(),attempts:integer("attempts").notNull(),expiresAt:integer("expires_at").notNull()});

export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull().default("Untitled Resume"),
  targetRole: text("target_role").notNull().default(""),
  dataJson: text("data_json").notNull(),
  isPrimary: integer("is_primary").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, t => [index("resumes_owner_updated").on(t.ownerId, t.updatedAt)]);
