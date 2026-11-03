CREATE TABLE "upload" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text,
	"purpose" text NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"declared_type" text NOT NULL,
	"mime" text,
	"max_bytes" bigint NOT NULL,
	"bytes" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice" ADD COLUMN "speaker_embedding" real[];--> statement-breakpoint
ALTER TABLE "upload" ADD CONSTRAINT "upload_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload" ADD CONSTRAINT "upload_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_workspace_idx" ON "upload" USING btree ("workspace_id","created_at");