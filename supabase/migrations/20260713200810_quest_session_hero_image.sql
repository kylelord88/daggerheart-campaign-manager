-- Quests and Sessions never got a hero_image_url column, unlike every other
-- entity type — the generic entity list/detail UI already renders a thumb +
-- big photo for any config with a `hero_image_url` field, so this is the only
-- piece that was missing.
alter table quests add column hero_image_url text;
alter table sessions add column hero_image_url text;
