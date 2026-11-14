import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Registered MavFix accounts. Passwords are stored as salted scrypt hashes.
export const userinfo = pgTable("userinfo", {
  username: text().primaryKey(),
  email: text().notNull().unique(),
  password: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Login sessions. Only a SHA-256 hash of the session cookie is stored.
export const authSessions = pgTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  username: text()
    .notNull()
    .references(() => userinfo.username, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Campus issue reports.
export const reports = pgTable("reports", {
  id: serial().primaryKey(),
  title: text().notNull(),
  category: text().notNull().default(""),
  location: text().notNull().default(""),
  description: text().notNull().default(""),
  status: text().notNull().default("Open"),
  major: integer().notNull().default(0),
  minor: integer().notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One major/minor vote per browser per report.
export const reportVotes = pgTable(
  "report_votes",
  {
    reportId: integer("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id").notNull(),
    voteType: text("vote_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.reportId, table.voterId] }),
    check("report_votes_vote_type_check", sql`${table.voteType} IN ('major', 'minor')`),
  ],
);
