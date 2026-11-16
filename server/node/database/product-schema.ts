import { sql } from "drizzle-orm";
import { pgSchema, uuid, varchar, text, timestamp, integer, bigint, boolean, index, uniqueIndex, check, primaryKey, jsonb } from "drizzle-orm/pg-core";
import { recipes } from "./schema";

// Isolated namespace: never alter any of the accepted 17 public catalog tables.
export const product = pgSchema("savora_product");
// New revision range is disjoint from every legacy int32 revision, including deleted rows.
// https://orm.drizzle.team/docs/sequences
export const kitchenRevision = product.sequence("kitchen_revision", {
  startWith: 2147483648, minValue: 2147483648, maxValue: 9007199254740990, increment: 1, cache: 1, cycle: false,
});
const time = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
export const accounts = product.table("accounts", {
  id: uuid().primaryKey(), email: varchar({ length: 254 }).notNull().unique(),
  displayName: varchar("display_name", { length: 80 }).notNull(), passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false), disabled: boolean().notNull().default(false),
  credentialVersion: integer("credential_version").notNull().default(1),
  role: varchar({ length: 16 }).notNull().default("User"), createdAt: time("created_at").notNull().defaultNow(),
}, t => [check("account_role", sql`${t.role} IN ('User','Contributor','Editor','Moderator','Admin')`),
  check("account_version", sql`${t.credentialVersion} > 0`)]);
export const sessions = product.table("sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: time("created_at").notNull().defaultNow(), lastSeenAt: time("last_seen_at").notNull().defaultNow(),
  expiresAt: time("expires_at").notNull(),
}, t => [index("sessions_account").on(t.accountId), index("sessions_expiry").on(t.expiresAt)]);
export const actionTokens = product.table("action_tokens", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  purpose: varchar({ length: 16 }).notNull(), credentialVersion: integer("credential_version").notNull(),
  expiresAt: time("expires_at").notNull(), consumedAt: time("consumed_at"),
}, t => [index("tokens_account").on(t.accountId), check("token_purpose", sql`${t.purpose} IN ('VerifyEmail','ResetPassword')`)]);
export const mailOutbox = product.table("mail_outbox", {
  id: uuid().primaryKey(), dedupeKey: varchar("dedupe_key", { length: 128 }).notNull().unique(),
  payload: text(), status: varchar({ length: 16 }).notNull().default("Pending"),
  attempts: integer().notNull().default(0), nextAttemptAt: time("next_attempt_at").notNull().defaultNow(),
  leaseToken: uuid("lease_token"), leaseUntil: time("lease_until"),
  expiresAt: time("expires_at").notNull(), lastError: varchar("last_error", { length: 32 }),
  createdAt: time("created_at").notNull().defaultNow(), completedAt: time("completed_at"),
}, t => [index("outbox_due").on(t.status, t.nextAttemptAt),
  check("outbox_status", sql`${t.status} IN ('Pending','Sending','Sent','Dead','Expired')`),
  check("outbox_attempts", sql`${t.attempts} BETWEEN 0 AND 8`),
  check("outbox_lease", sql`(${t.status} = 'Sending') = (${t.leaseToken} IS NOT NULL AND ${t.leaseUntil} IS NOT NULL)`),
  check("outbox_payload", sql`(${t.status} IN ('Pending','Sending')) = (${t.payload} IS NOT NULL)`)]);
export const authLimits = product.table("auth_limits", {
  key: varchar({ length: 64 }).primaryKey(), windowStart: time("window_start").notNull(),
  count: integer().notNull(),
}, t => [index("limits_expiry").on(t.windowStart), check("limits_positive", sql`${t.count} BETWEEN 1 AND 10000`)]);
export const kitchenStates = product.table("kitchen_states", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "restrict" }),
  status: varchar({ length: 16 }), privateNote: varchar("private_note", { length: 4000 }),
  servings: integer().notNull().default(1), revision: bigint({ mode: "number" }).notNull(), updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.accountId, t.recipeId] }),
  check("kitchen_status", sql`${t.status} IS NULL OR ${t.status} IN ('Want to cook','Cooking','Cooked','Favorite')`),
  check("kitchen_content", sql`${t.status} IS NOT NULL OR ${t.privateNote} IS NOT NULL`),
  check("kitchen_bounds", sql`${t.servings} BETWEEN 1 AND 100 AND ${t.revision} > 0`)]);
export const writeReceipts = product.table("write_receipts", {
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  scope: varchar({ length: 160 }).notNull(), key: varchar({ length: 128 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }).notNull(), response: jsonb().notNull(),
  expiresAt: time("expires_at").notNull().default(sql`now()+interval '30 days'`),
}, t => [primaryKey({ columns: [t.accountId, t.scope, t.key] }), index("receipt_expiry").on(t.expiresAt)]);

export const submissions = product.table("submissions", {
  id: uuid().primaryKey(), ownerId: uuid("owner_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  state: varchar({ length: 16 }).notNull().default("Draft"), revision: integer().notNull().default(1),
  version: integer().notNull().default(0), content: jsonb().notNull(),
  reviewerId: uuid("reviewer_id").references(() => accounts.id, { onDelete: "restrict" }),
  updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [index("submissions_owner").on(t.ownerId, t.id), index("submissions_queue").on(t.state, t.id),
  check("submission_state", sql`${t.state} IN ('Draft','Submitted','InReview','NeedsChanges','Approved','Rejected')`),
  check("submission_versions", sql`${t.revision}>0 AND ${t.version}>=0`),
  check("submission_content", sql`jsonb_typeof(${t.content})='object' AND octet_length(${t.content}::text)<=100000`),
  check("submission_reviewer", sql`(${t.state} IN ('InReview','Approved','Rejected')) = (${t.reviewerId} IS NOT NULL)`),
  check("submission_no_self_review", sql`${t.reviewerId} IS NULL OR ${t.reviewerId}<>${t.ownerId}`)]);
export const submissionVersions = product.table("submission_versions", {
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "restrict" }),
  version: integer().notNull(), content: jsonb().notNull(), createdAt: time("created_at").notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.submissionId, t.version] }), check("submission_version_positive", sql`${t.version}>0`)]);
export const submissionEvents = product.table("submission_events", {
  submissionId: uuid("submission_id").notNull().references(() => submissions.id, { onDelete: "restrict" }),
  revision: integer().notNull(), actorId: uuid("actor_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  fromState: varchar("from_state", { length: 16 }), toState: varchar("to_state", { length: 16 }).notNull(),
  reason: varchar({ length: 2000 }), createdAt: time("created_at").notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.submissionId, t.revision] })]);

export const kitchenDocuments = product.table("kitchen_documents", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  content: jsonb().notNull(), revision: bigint({ mode: "number" }).notNull(), updatedAt: time("updated_at").notNull().defaultNow(),
}, t => [check("kitchen_document_size", sql`jsonb_typeof(${t.content})='object' AND octet_length(${t.content}::text)<=100000`),
  check("kitchen_document_revision", sql`${t.revision}>0 AND ${t.revision}<=9007199254740990`)]);
export const submissionPublications = product.table("submission_publications", {
  submissionId: uuid("submission_id").primaryKey().references(() => submissions.id, { onDelete: "restrict" }),
  version: integer().notNull(), recipeId: uuid("recipe_id").notNull().unique().references(() => recipes.id, { onDelete: "restrict" }),
  publishedBy: uuid("published_by").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  publishedAt: time("published_at").notNull().defaultNow(), withdrawnAt: time("withdrawn_at"),
}, t => [check("publication_version", sql`${t.version}>0`)]);
export const communityPosts = product.table("community_posts", {
  id: uuid().primaryKey(), authorId: uuid("author_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  space: varchar({ length: 40 }).notNull(), body: varchar({ length: 4000 }).notNull(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "restrict" }),
  hidden: boolean().notNull().default(false), createdAt: time("created_at").notNull().defaultNow(),
}, t => [index("community_feed").on(t.space, t.id), index("community_author").on(t.authorId, t.id),
  check("community_space", sql`${t.space} IN ('The shared table','Technique exchange','Family recipe circle','Cookbook club')`),
  check("community_body", sql`length(btrim(${t.body}))>0`)]);
export const communityReplies = product.table("community_replies", {
  id: uuid().primaryKey(), postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "restrict" }),
  authorId: uuid("author_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  body: varchar({ length: 2000 }).notNull(), hidden: boolean().notNull().default(false), createdAt: time("created_at").notNull().defaultNow(),
}, t => [index("community_reply_post").on(t.postId, t.id), check("community_reply_body", sql`length(btrim(${t.body}))>0`)]);
export const communityMarks = product.table("community_marks", {
  postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "restrict" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }), kind: varchar({ length: 16 }).notNull(),
}, t => [primaryKey({ columns: [t.postId, t.accountId, t.kind] }), index("community_saved").on(t.accountId, t.kind, t.postId),
  check("community_mark_kind", sql`${t.kind} IN ('Helpful','Saved')`)]);
export const communityReports = product.table("community_reports", {
  id: uuid().primaryKey(), postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "restrict" }),
  reporterId: uuid("reporter_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  reason: varchar({ length: 1000 }).notNull(), createdAt: time("created_at").notNull().defaultNow(), resolvedAt: time("resolved_at"),
}, t => [index("community_report_queue").on(t.resolvedAt, t.id),
  uniqueIndex("community_report_actor").on(t.postId, t.reporterId),
]);
export const communityEvents = product.table("community_events", {
  id: uuid().primaryKey(), postId: uuid("post_id").notNull().references(() => communityPosts.id, { onDelete: "restrict" }),
  actorId: uuid("actor_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  action: varchar({ length: 24 }).notNull(), reason: varchar({ length: 1000 }).notNull(), createdAt: time("created_at").notNull().defaultNow(),
}, t => [index("community_audit").on(t.postId, t.id), check("community_event_action", sql`${t.action} IN ('owner-remove','hide','dismiss')`)]);
