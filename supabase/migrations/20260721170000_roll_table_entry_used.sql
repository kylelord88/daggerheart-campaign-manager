-- Per-row "used" flag for session roll table entries, so a GM can mark an
-- entry as already rolled (e.g. a travel/hazard table for a multi-leg
-- journey) and exclude it from future random picks without deleting it.
-- Reset via a bulk update back to false when the table is reused (next
-- session/trip).

alter table session_roll_table_entries
  add column is_used boolean not null default false;
