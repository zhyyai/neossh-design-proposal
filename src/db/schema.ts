import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

export const hosts = pgTable("hosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  hostname: text("hostname").notNull(),
  port: integer("port").notNull().default(22),
  username: text("username").notNull().default("root"),
  authType: text("auth_type").notNull().default("key"), // key | password | agent
  groupName: text("group_name").notNull().default("default"),
  tags: text("tags").array(),
  color: text("color").notNull().default("#00ff9c"),
  notes: text("notes"),
  lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Host = typeof hosts.$inferSelect;
export type NewHost = typeof hosts.$inferInsert;

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostLabel: text("host_label").notNull(),
  target: text("target").notNull(),
  mode: text("mode").notNull().default("ssh"), // ssh | sandbox
  status: text("status").notNull().default("active"), // active | closed | terminated
  exitCode: integer("exit_code"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export type SessionRecord = typeof sessions.$inferSelect;
export type NewSessionRecord = typeof sessions.$inferInsert;

export const commandLogs = pgTable("command_logs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  hostLabel: text("host_label").notNull(),
  command: text("command").notNull(),
  risk: text("risk").notNull().default("safe"), // safe | warn | danger
  executedAt: timestamp("executed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CommandLog = typeof commandLogs.$inferSelect;

export const snippets = pgTable("snippets", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  command: text("command").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  danger: boolean("danger").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;

export const tunnels = pgTable("tunnels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull().default("local"), // local | remote | dynamic
  localPort: integer("local_port").notNull(),
  remoteHost: text("remote_host").notNull(),
  remotePort: integer("remote_port").notNull(),
  viaHost: text("via_host").notNull(),
  status: text("status").notNull().default("active"), // active | stopped
  bytesTotal: integer("bytes_total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Tunnel = typeof tunnels.$inferSelect;
export type NewTunnel = typeof tunnels.$inferInsert;

export const recordings = pgTable("recordings", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionLabel: text("session_label").notNull(),
  target: text("target").notNull(),
  mode: text("mode").notNull().default("ssh"),
  data: text("data").notNull(), // JSON array of [tMs, chunk]
  bytes: integer("bytes").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;
