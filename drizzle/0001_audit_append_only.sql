-- The audit log is append-only: any UPDATE or DELETE is rejected, even by the app's own role.
CREATE OR REPLACE FUNCTION mimix_reject_audit_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION mimix_reject_audit_change();
--> statement-breakpoint
-- Ledger rows are never edited. They are deleted only with their workspace (account deletion).
CREATE TRIGGER credit_ledger_no_update BEFORE UPDATE ON "credit_ledger" FOR EACH ROW EXECUTE FUNCTION mimix_reject_audit_change();
