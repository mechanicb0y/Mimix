ALTER TABLE "dubbing_project" ADD COLUMN "cast" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "dubbing_project" ADD COLUMN "keep_background" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "dubbing_project" ADD COLUMN "background_key" text;--> statement-breakpoint
ALTER TABLE "dubbing_project" ADD COLUMN "job_id" text;--> statement-breakpoint
ALTER TABLE "dubbing_project" ADD COLUMN "error" text;