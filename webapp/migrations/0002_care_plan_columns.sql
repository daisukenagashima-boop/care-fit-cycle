-- 24時間シートの列追加
ALTER TABLE care_plans ADD COLUMN wishes TEXT DEFAULT '';
ALTER TABLE care_plans ADD COLUMN can_do TEXT DEFAULT '';
ALTER TABLE care_plans ADD COLUMN support_needed TEXT DEFAULT '';
ALTER TABLE care_plans ADD COLUMN medical_notes TEXT DEFAULT '';
ALTER TABLE care_plans ADD COLUMN remarks TEXT DEFAULT '';
