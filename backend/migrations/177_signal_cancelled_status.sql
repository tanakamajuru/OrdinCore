-- Allow a signal to be cancelled (e.g. raised in error): a new review_status value. Cancelled
-- signals leave every work queue (queues key off 'New'/active statuses) but remain in the audit
-- trail. ADD VALUE cannot run inside a transaction block, so this migration has no BEGIN/COMMIT.
ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'Cancelled';
