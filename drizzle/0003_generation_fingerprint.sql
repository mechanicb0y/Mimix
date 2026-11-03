ALTER TABLE "generation" ADD COLUMN "fingerprint" text;--> statement-breakpoint
CREATE INDEX "generation_fingerprint_idx" ON "generation" USING btree ("fingerprint");