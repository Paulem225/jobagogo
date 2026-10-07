CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"remote" boolean DEFAULT false NOT NULL,
	"job_types" text[] DEFAULT '{}' NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"bio" text,
	"email" text,
	"linkedin" text,
	"phone" text,
	"diploma" text,
	"last_job_title" text,
	"is_premium" boolean DEFAULT false NOT NULL,
	"premium_until" timestamp with time zone,
	"push_token" text,
	"notifications_enabled" boolean DEFAULT false NOT NULL,
	"last_profession_change_at" timestamp with time zone,
	"device_secret_hash" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"logo_url" text,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"remote" boolean DEFAULT false NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"job_type" text DEFAULT 'CDI' NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"source" text NOT NULL,
	"source_url" text,
	"posted_at" text,
	"experience_years" integer,
	"sector" text,
	"diploma_required" text,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"hub2_payment_link_id" text NOT NULL,
	"purchase_reference" text NOT NULL,
	"plan" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_link_expires_at" timestamp with time zone,
	"premium_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "premium_payments_hub2_payment_link_id_unique" UNIQUE("hub2_payment_link_id"),
	CONSTRAINT "premium_payments_purchase_reference_unique" UNIQUE("purchase_reference")
);
--> statement-breakpoint
CREATE TABLE "profession_change_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"hub2_payment_link_id" text NOT NULL,
	"purchase_reference" text NOT NULL,
	"requested_title" text NOT NULL,
	"amount" integer DEFAULT 2000 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_link_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profession_change_payments_hub2_payment_link_id_unique" UNIQUE("hub2_payment_link_id"),
	CONSTRAINT "profession_change_payments_purchase_reference_unique" UNIQUE("purchase_reference")
);
--> statement-breakpoint
CREATE TABLE "cv_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"extracted_text" text,
	"analysis" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"description" text NOT NULL,
	"photo_base64" text,
	"photo_mime_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;