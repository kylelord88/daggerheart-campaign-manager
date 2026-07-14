-- Distinguishes GM-authored homebrew adversaries from the imported SRD
-- library within the same table/RLS setup, so the Adversaries page can
-- split them into two tabs without a second table to keep in sync.
alter table adversary_library add column is_homebrew boolean not null default false;
