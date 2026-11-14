CREATE TABLE "auth_sessions" (
	"token_hash" text PRIMARY KEY,
	"username" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_votes" (
	"report_id" integer,
	"voter_id" uuid,
	"vote_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_votes_pkey" PRIMARY KEY("report_id","voter_id"),
	CONSTRAINT "report_votes_vote_type_check" CHECK ("vote_type" IN ('major', 'minor'))
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"major" integer DEFAULT 0 NOT NULL,
	"minor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userinfo" (
	"username" text PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_username_userinfo_username_fkey" FOREIGN KEY ("username") REFERENCES "userinfo"("username") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_votes" ADD CONSTRAINT "report_votes_report_id_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE;