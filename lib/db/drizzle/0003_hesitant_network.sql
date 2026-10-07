CREATE TABLE "auth_review_demo_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_review_demo_attempts_attempt_key_unique" UNIQUE("attempt_key")
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;