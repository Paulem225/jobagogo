CREATE TABLE "job_push_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
-- Canonicalize the source identity before enforcing uniqueness. The application
-- uses the same conservative normalization: trim, remove fragments and trailing
-- slashes, then lowercase the URL.
UPDATE "jobs"
SET "source_url" = lower(
  regexp_replace(
    regexp_replace(btrim("source_url"), '#.*$', ''),
    '/+$',
    ''
  )
)
WHERE "source_url" IS NOT NULL AND btrim("source_url") <> '';
--> statement-breakpoint
UPDATE "jobs"
SET "dedupe_key" = CASE
  WHEN "source_url" IS NOT NULL AND btrim("source_url") <> ''
    THEN 'url:' || "source_url"
  ELSE 'fallback:' ||
    lower(regexp_replace(btrim("title"), '\s+', ' ', 'g')) || '|||' ||
    lower(regexp_replace(btrim("company"), '\s+', ' ', 'g')) || '|||' ||
    lower(regexp_replace(btrim("location"), '\s+', ' ', 'g')) || '|||' ||
    lower(regexp_replace(btrim(coalesce("posted_at", '')), '\s+', ' ', 'g'))
END;
--> statement-breakpoint
-- Keep the oldest job row when canonicalization reveals historical duplicates.
-- Repoint saved jobs first so users do not lose their saved offers.
WITH duplicate_jobs AS (
  SELECT
    "id",
    min("id") OVER (PARTITION BY "dedupe_key") AS "keep_id"
  FROM "jobs"
),
duplicate_saved_jobs AS (
  DELETE FROM "saved_jobs" AS saved
  USING duplicate_jobs AS duplicate
  WHERE saved."job_id" = duplicate."id"
    AND duplicate."id" <> duplicate."keep_id"
    AND EXISTS (
      SELECT 1
      FROM "saved_jobs" AS keeper_saved
      WHERE keeper_saved."job_id" = duplicate."keep_id"
        AND keeper_saved."profile_id" IS NOT DISTINCT FROM saved."profile_id"
    )
  RETURNING saved."id"
)
UPDATE "saved_jobs" AS saved
SET "job_id" = duplicate."keep_id"
FROM duplicate_jobs AS duplicate
WHERE saved."job_id" = duplicate."id"
  AND duplicate."id" <> duplicate."keep_id";
--> statement-breakpoint
WITH duplicate_jobs AS (
  SELECT
    "id",
    min("id") OVER (PARTITION BY "dedupe_key") AS "keep_id"
  FROM "jobs"
)
DELETE FROM "jobs" AS job
USING duplicate_jobs AS duplicate
WHERE job."id" = duplicate."id"
  AND duplicate."id" <> duplicate."keep_id";
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "dedupe_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "job_push_notifications" ADD CONSTRAINT "job_push_notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_push_notifications" ADD CONSTRAINT "job_push_notifications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_push_notifications_profile_job_unique" ON "job_push_notifications" USING btree ("profile_id","job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_dedupe_key_unique" ON "jobs" USING btree ("dedupe_key");