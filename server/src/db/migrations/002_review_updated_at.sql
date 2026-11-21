-- Objective 4: members can edit their reviews. NULL = never edited; otherwise the date of the last edit,
-- so the interface can say "(modifié)".
ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMPTZ;
