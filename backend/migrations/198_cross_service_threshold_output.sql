-- Bug fix (confirmed live, 23 Oct 2026): pattern.worker.ts's cross-service detection path inserts
-- threshold_events with output_type = 'Potential Cross-Service Pattern Flag', a value that was
-- never added to the threshold_output_type enum. Every cross-service evaluation reaching this
-- INSERT threw "invalid input value for enum threshold_output_type", surfacing to RMs as a
-- "Pattern evaluation failed" guided-work card after 5 retries, with no indication the actual
-- cause was a missing enum value.
ALTER TYPE threshold_output_type ADD VALUE IF NOT EXISTS 'Potential Cross-Service Pattern Flag';
