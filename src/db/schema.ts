import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// The first four tables use Better Auth's standard field names. The adapter
// maps these camelCase properties to their snake_case PostgreSQL columns.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [index("session_user_id_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("account_user_id_idx").on(table.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("projects_owner_id_idx").on(table.ownerId, table.createdAt)]);

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("endpoints_project_id_idx").on(table.projectId)]);

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  endpointId: text("endpoint_id").notNull().references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("received"),
  replayedFromEventId: text("replayed_from_event_id"),
  method: text("method").notNull().default("POST"),
  contentType: text("content_type"),
  headers: jsonb("headers").$type<Record<string, string>>().notNull(),
  bodyText: text("body_text"),
  bodyJson: jsonb("body_json").$type<unknown>(),
  bodyBase64: text("body_base64").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  receivedAt: createdAt(),
}, (table) => [
  index("events_project_received_idx").on(table.projectId, table.receivedAt),
  index("events_endpoint_received_idx").on(table.endpointId, table.receivedAt),
  index("events_replayed_from_idx").on(table.replayedFromEventId),
]);

export const replays = pgTable("replays", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  originalEventId: text("original_event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  replayedEventId: text("replayed_event_id").references(() => events.id, { onDelete: "set null" }),
  status: text("status").notNull(),
  responseStatus: integer("response_status"),
  errorMessage: text("error_message"),
  createdAt: createdAt(),
}, (table) => [
  index("replays_project_created_idx").on(table.projectId, table.createdAt),
  uniqueIndex("replays_replayed_event_unique_idx").on(table.replayedEventId),
]);
