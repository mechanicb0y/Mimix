ALTER TABLE "workspace" ADD COLUMN "comped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "comp_until" timestamp with time zone;