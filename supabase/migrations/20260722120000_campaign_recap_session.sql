-- Dashboard "last session recap" link: the GM picks which session's recap the
-- dashboard links to. Stored as a nullable pointer on the campaign rather than
-- a flag on sessions, since it's a single per-campaign choice.
--
-- on delete set null: if the chosen session is deleted, the link simply clears.
-- No RLS changes needed — campaigns already has "members can read" (players see
-- the pointer) and "gm can update" (the GM sets it), from the base rls policies.
alter table campaigns
  add column if not exists recap_session_id uuid references sessions(id) on delete set null;
