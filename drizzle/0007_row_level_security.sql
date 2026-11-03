-- Defense in depth for Supabase: RLS on every table with no policies, so the public anon and
-- authenticated roles (PostgREST) can read or write nothing. The app connects as the table owner,
-- which RLS does not restrict, and enforces authorization in server code.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "two_factor" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_member" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_invite" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "credit_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stripe_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "voice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "voice_sample" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consent_record" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "voice_lineage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_voice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocked_voice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "generation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pronunciation_rule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transcript" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dubbing_project" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "studio_project" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "studio_chapter" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "studio_block" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_key" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhook" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhook_delivery" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_pref" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "abuse_report" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "data_export" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "upload" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "system_setting" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feature_flag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plan_setting" ENABLE ROW LEVEL SECURITY;
