-- Migration 084: add 'Dismissed' to cluster_status enum so pattern dismissal works (run non-transactionally)
ALTER TYPE cluster_status ADD VALUE IF NOT EXISTS 'Dismissed';
